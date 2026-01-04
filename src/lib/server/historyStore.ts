import { promises as fs } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { HistoryEntry } from '$lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'workout.db');

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

export async function readHistory(): Promise<HistoryEntry[]> {
	await ensureDbFile();
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
