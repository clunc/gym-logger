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
			exercise TEXT NOT NULL,
			setNumber INTEGER NOT NULL,
			weight REAL NOT NULL,
			reps INTEGER NOT NULL,
			timestamp TEXT NOT NULL,
			PRIMARY KEY (exercise, setNumber, timestamp)
		)
	`);
	return db;
}

export async function readHistory(): Promise<HistoryEntry[]> {
	await ensureDbFile();
	const db = initDb();
	const rows = db
		.prepare(
			`SELECT exercise, setNumber, weight, reps, timestamp FROM history ORDER BY datetime(timestamp) DESC`
		)
		.all();
	db.close();
	return rows as HistoryEntry[];
}

export async function appendHistory(entries: HistoryEntry[]): Promise<void> {
	await ensureDbFile();
	const db = initDb();
	const insert = db.prepare(
		`INSERT INTO history (exercise, setNumber, weight, reps, timestamp) VALUES (@exercise, @setNumber, @weight, @reps, @timestamp)`
	);

	const transaction = db.transaction((toInsert: HistoryEntry[]) => {
		for (const entry of toInsert) {
			insert.run(entry);
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
