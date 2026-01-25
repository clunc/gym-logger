import { promises as fs } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { dev } from '$app/environment';
import { workoutTemplate } from '$lib/workout';
import type { HistoryEntry, SessionExercise } from '$lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'workout.db');
const DEV_SEED_FILE = path.join(DATA_DIR, 'dev-history.json');
const SHOULD_SEED_DEV = dev || process.env.NODE_ENV === 'development';

type DevSeed = {
	history?: HistoryEntry[];
	template?: SessionExercise[];
};

let cachedDevSeed: DevSeed | null | undefined;
let devSeedPromise: Promise<void> | null = null;

async function ensureDbFile() {
	await fs.mkdir(DATA_DIR, { recursive: true });
	await fs.access(DB_FILE).catch(async () => {
		await fs.writeFile(DB_FILE, '');
	});
}

function initDb() {
	const db = new Database(DB_FILE);
	db.pragma('journal_mode = WAL');
	db.exec(`
		CREATE TABLE IF NOT EXISTS history (
			type TEXT NOT NULL DEFAULT 'workout',
			exercise TEXT NOT NULL,
			setNumber INTEGER NOT NULL,
			weight REAL NOT NULL,
			reps INTEGER NOT NULL,
			timestamp TEXT NOT NULL,
			PRIMARY KEY (exercise, setNumber, timestamp)
		)
	`);

	const columns = db.prepare(`PRAGMA table_info(history)`).all() as { name: string }[];
	const hasType = columns.some((col) => col.name === 'type');
	if (!hasType) {
		db.exec(`ALTER TABLE history ADD COLUMN type TEXT NOT NULL DEFAULT 'workout'`);
	}

	db.exec(`
		CREATE TABLE IF NOT EXISTS exercise_names (
			canonical TEXT PRIMARY KEY,
			current TEXT NOT NULL
		)
	`);
	db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_names_current ON exercise_names(current)`);

	return db;
}

function computeRenamesFromTemplate(template?: SessionExercise[]): Record<string, string> {
	if (!template || template.length === 0) return {};

	const renames: Record<string, string> = {};
	for (let idx = 0; idx < workoutTemplate.length; idx += 1) {
		const canonical = workoutTemplate[idx];
		const candidate = template[idx];
		if (!canonical || !candidate) continue;
		if (candidate.name && candidate.name !== canonical.name) {
			renames[canonical.name] = candidate.name;
		}
	}

	return renames;
}

async function loadDevSeed(): Promise<DevSeed | null> {
	if (!SHOULD_SEED_DEV) return null;
	if (cachedDevSeed !== undefined) return cachedDevSeed ?? null;

	const raw = await fs.readFile(DEV_SEED_FILE, 'utf-8').catch(() => null);
	if (!raw) {
		cachedDevSeed = null;
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as DevSeed;
		cachedDevSeed = parsed;
		return parsed;
	} catch (error) {
		console.warn('Failed to parse dev seed data', error);
		cachedDevSeed = null;
		return null;
	}
}

async function seedDevData(db: ReturnType<typeof initDb>) {
	if (!SHOULD_SEED_DEV) return;
	const seed = await loadDevSeed();
	if (!seed) return;

	const hasHistory = (
		db.prepare(`SELECT COUNT(*) as count FROM history`).get() as { count?: number }
	).count;
	if (!hasHistory && Array.isArray(seed.history) && seed.history.length > 0) {
		const insert = db.prepare(
			`INSERT INTO history (type, exercise, setNumber, weight, reps, timestamp) VALUES (@type, @exercise, @setNumber, @weight, @reps, @timestamp)`
		);
		const transaction = db.transaction((entries: HistoryEntry[]) => {
			for (const entry of entries) {
				insert.run({ ...entry, type: entry.type ?? 'workout' });
			}
		});
		transaction(seed.history);
	}

	const hasExerciseNames = (
		db.prepare(`SELECT COUNT(*) as count FROM exercise_names`).get() as { count?: number }
	).count;
	const renames = computeRenamesFromTemplate(seed.template);
	if (!hasExerciseNames && Object.keys(renames).length > 0) {
		const upsert = db.prepare(
			`INSERT INTO exercise_names (canonical, current) VALUES (?, ?)
			 ON CONFLICT(canonical) DO UPDATE SET current=excluded.current`
		);
		const transaction = db.transaction((entries: [string, string][]) => {
			for (const [canonical, current] of entries) {
				upsert.run(canonical, current);
			}
		});
		transaction(Object.entries(renames));
	}
}

async function ensureDevSeeded(): Promise<void> {
	if (!SHOULD_SEED_DEV) return;
	if (!devSeedPromise) {
		devSeedPromise = (async () => {
			await ensureDbFile();
			const db = initDb();
			try {
				await seedDevData(db);
			} finally {
				db.close();
			}
		})().catch((error) => {
			devSeedPromise = null;
			throw error;
		});
	}
	await devSeedPromise;
}

export async function readHistory(): Promise<HistoryEntry[]> {
	await ensureDbFile();
	await ensureDevSeeded();
	const db = initDb();
	const rows = db
		.prepare(
			`SELECT type, exercise, setNumber, weight, reps, timestamp FROM history ORDER BY datetime(timestamp) DESC`
		)
		.all();
	db.close();
	return rows as HistoryEntry[];
}

export async function appendHistory(entries: HistoryEntry[]): Promise<void> {
	await ensureDbFile();
	const db = initDb();
	const insert = db.prepare(
		`INSERT INTO history (type, exercise, setNumber, weight, reps, timestamp) VALUES (@type, @exercise, @setNumber, @weight, @reps, @timestamp)`
	);

	const transaction = db.transaction((toInsert: HistoryEntry[]) => {
		for (const entry of toInsert) {
			insert.run({ ...entry, type: entry.type ?? 'workout' });
		}
	});

	transaction(entries);
	db.close();
}

export async function deleteTodayEntry({
	exercise,
	setNumber,
	timestamp
}: {
	exercise: string;
	setNumber: number;
	timestamp: string;
}): Promise<number> {
	await ensureDbFile();
	const db = initDb();

	const stmt = db.prepare(
		`DELETE FROM history WHERE exercise = ? AND setNumber = ? AND timestamp = ?`
	);
	const result = stmt.run(exercise, setNumber, timestamp);
	db.close();

	return result.changes ?? 0;
}

export async function renameExercise(current: string, next: string): Promise<void> {
	await ensureDbFile();
	const db = initDb();

	const hasConflict = db
		.prepare(
			`SELECT 1 FROM exercise_names WHERE (current = ? OR canonical = ?) AND canonical != ? LIMIT 1`
		)
		.get(next, next, current);
	if (hasConflict) {
		db.close();
		throw new Error('Target name already exists');
	}

	const updateHistory = db.prepare(`UPDATE history SET exercise = ? WHERE exercise = ?`);
	const upsertName = db.prepare(
		`INSERT INTO exercise_names (canonical, current) VALUES (?, ?)
		 ON CONFLICT(canonical) DO UPDATE SET current=excluded.current`
	);
	const updateExisting = db.prepare(
		`UPDATE exercise_names SET current = ? WHERE current = ? OR canonical = ?`
	);

	const transaction = db.transaction(() => {
		updateHistory.run(next, current);
		const existing = db
			.prepare(
				`SELECT canonical, current FROM exercise_names WHERE current = ? OR canonical = ? LIMIT 1`
			)
			.get(current, current) as { canonical: string; current: string } | undefined;

		if (existing) {
			updateExisting.run(next, current, current);
		} else {
			upsertName.run(current, next);
		}
	});

	transaction();
	db.close();
}

export async function readExerciseNames(): Promise<Record<string, string>> {
	await ensureDbFile();
	await ensureDevSeeded();
	const db = initDb();
	const rows = db
		.prepare(`SELECT canonical, current FROM exercise_names`)
		.all() as { canonical: string; current: string }[];
	db.close();

	return rows.reduce<Record<string, string>>((map, row) => {
		map[row.canonical] = row.current;
		return map;
	}, {});
}
