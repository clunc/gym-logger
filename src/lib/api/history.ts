import type { HistoryEntry, SessionExercise } from '$lib/types';

const HISTORY_ENDPOINT = '/api/history';
const RENAME_ENDPOINT = '/api/history/rename';

export async function fetchHistory(): Promise<{
	history: HistoryEntry[];
	template?: SessionExercise[];
}> {
	const res = await fetch(HISTORY_ENDPOINT);

	if (!res.ok) {
		throw new Error(`Failed to load history (${res.status})`);
	}

	const data = (await res.json()) as {
		history: HistoryEntry[];
		template?: SessionExercise[];
	};

	return {
		history: Array.isArray(data.history) ? data.history : [],
		template: data.template
	};
}

export async function appendHistory(entries: HistoryEntry[]): Promise<void> {
	const res = await fetch(HISTORY_ENDPOINT, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ entries })
	});

	if (!res.ok) {
		throw new Error(`Failed to append history (${res.status})`);
	}
}

export async function deleteHistoryEntry(entry: {
	exercise: string;
	setNumber: number;
	timestamp: string;
}): Promise<void> {
	const res = await fetch(HISTORY_ENDPOINT, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ entry })
	});

	if (!res.ok) {
		throw new Error(`Failed to delete history entry (${res.status})`);
	}
}

export async function renameExercise(
	from: string,
	to: string
): Promise<{
	ok: boolean;
	template?: SessionExercise[];
	history?: HistoryEntry[];
}> {
	const res = await fetch(RENAME_ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ from, to })
	});

	if (!res.ok) {
		throw new Error(`Failed to rename exercise (${res.status})`);
	}

	return (await res.json()) as {
		ok: boolean;
		template?: SessionExercise[];
		history?: HistoryEntry[];
	};
}
