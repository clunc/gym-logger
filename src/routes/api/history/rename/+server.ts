import { json } from '@sveltejs/kit';
import { readExerciseNames, readHistory, renameExercise } from '$lib/server/historyStore';
import { resolveWorkoutTemplate } from '$lib/workout';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const from = (body as { from?: unknown })?.from;
	const to = (body as { to?: unknown })?.to;

	if (typeof from !== 'string' || typeof to !== 'string') {
		return json({ error: 'Invalid rename payload' }, { status: 400 });
	}

	const trimmedFrom = from.trim();
	const trimmedTo = to.trim();

	if (!trimmedFrom || !trimmedTo) {
		return json({ error: 'Invalid rename payload' }, { status: 400 });
	}

	if (trimmedFrom === trimmedTo) {
		const exerciseNames = await readExerciseNames();
		const history = await readHistory();
		const template = resolveWorkoutTemplate(exerciseNames);
		return json({ ok: true, history, template });
	}

	try {
		await renameExercise(trimmedFrom, trimmedTo);
	} catch (error) {
		return json({ error: 'Failed to rename exercise', details: String(error) }, { status: 400 });
	}

	const [exerciseNames, history] = await Promise.all([readExerciseNames(), readHistory()]);
	const template = resolveWorkoutTemplate(exerciseNames);
	return json({ ok: true, history, template });
};
