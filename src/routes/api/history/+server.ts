import { json } from '@sveltejs/kit';
import { readHistory, writeHistory } from '$lib/server/historyStore';
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

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const history = (body as { history?: unknown })?.history;

	if (!Array.isArray(history) || !history.every(isValidEntry)) {
		return json({ error: 'Invalid history payload' }, { status: 400 });
	}

	await writeHistory(history);
	return json({ ok: true });
};
