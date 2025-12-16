import type { HistoryEntry } from '$lib/types';

const HISTORY_ENDPOINT = '/api/history';

export async function fetchHistory(): Promise<HistoryEntry[]> {
	const res = await fetch(HISTORY_ENDPOINT);

	if (!res.ok) {
		throw new Error(`Failed to load history (${res.status})`);
	}

	const data = (await res.json()) as { history: HistoryEntry[] };
	return Array.isArray(data.history) ? data.history : [];
}

export async function saveHistory(history: HistoryEntry[]): Promise<void> {
	const res = await fetch(HISTORY_ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ history })
	});

	if (!res.ok) {
		throw new Error(`Failed to save history (${res.status})`);
	}
}
