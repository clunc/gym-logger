import { json } from '@sveltejs/kit';
import { appendHistory, deleteTodayEntry, readHistory } from '$lib/server/historyStore';
import type { RequestHandler } from './$types';
import type { HistoryEntry } from '$lib/types';

const isValidEntry = (entry: unknown): entry is HistoryEntry => {
	if (!entry || typeof entry !== 'object') return false;

	const candidate = entry as Record<string, unknown>;
	return (
		typeof candidate.exercise === 'string' &&
		typeof candidate.setNumber === 'number' &&
		typeof candidate.weight === 'number' &&
		typeof candidate.reps === 'number' &&
		typeof candidate.timestamp === 'string'
	);
};

export const GET: RequestHandler = async () => {
	const history = await readHistory();
	return json({ history });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const entries = (body as { entries?: unknown })?.entries;

	if (!Array.isArray(entries) || !entries.every(isValidEntry)) {
		return json({ error: 'Invalid entries payload' }, { status: 400 });
	}

	await appendHistory(entries);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const entry = (body as { entry?: unknown })?.entry;

	if (
		!entry ||
		typeof entry !== 'object' ||
		typeof (entry as Record<string, unknown>).exercise !== 'string' ||
		typeof (entry as Record<string, unknown>).timestamp !== 'string' ||
		typeof (entry as Record<string, unknown>).setNumber !== 'number'
	) {
		return json({ error: 'Invalid delete payload' }, { status: 400 });
	}

	const { exercise, setNumber, timestamp } = entry as {
		exercise: string;
		setNumber: number;
		timestamp: string;
	};

	const tsDate = new Date(timestamp);
	const today = new Date();
	if (Number.isNaN(tsDate.getTime()) || tsDate.toDateString() !== today.toDateString()) {
		return json({ error: 'Can only delete entries from today' }, { status: 400 });
	}

	const deleted = await deleteTodayEntry({ exercise, setNumber, timestamp });
	return json({ ok: true, deleted });
};
