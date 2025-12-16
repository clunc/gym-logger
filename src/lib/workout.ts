import type { HistoryEntry, SessionExercise, SetEntry } from './types';

export const SETS_PER_EXERCISE = 3;
export const REST_SECONDS = 90;

export const workoutTemplate: SessionExercise[] = [
	{ name: 'Deadlifts', sets: [], defaultWeight: 90, defaultReps: 5 },
	{ name: 'Squats', sets: [], defaultWeight: 80, defaultReps: 5 },
	{ name: 'Shoulder Press', sets: [], defaultWeight: 50, defaultReps: 5 },
	{ name: 'Chin Up', sets: [], defaultWeight: 0, defaultReps: 5 },
	{ name: 'Bench Press', sets: [], defaultWeight: 63, defaultReps: 5 },
	{ name: 'Bent Over Rows', sets: [], defaultWeight: 64, defaultReps: 5 }
];

export const todayString = () => new Date().toDateString();

export function createSession(history: HistoryEntry[]): SessionExercise[] {
	const today = todayString();

	const cloneSet = (template: SessionExercise): SessionExercise => {
		const lastLogged = history.find((h) => h.exercise === template.name);
		const defaultWeight = lastLogged ? lastLogged.weight : template.defaultWeight;
		const defaultReps = lastLogged ? lastLogged.reps : template.defaultReps;

		const sets: SetEntry[] = Array.from({ length: SETS_PER_EXERCISE }, (_, idx) => {
			const setNumber = idx + 1;
			const todaysLog = history.find(
				(h) =>
					h.exercise === template.name &&
					h.setNumber === setNumber &&
					new Date(h.timestamp).toDateString() === today
			);

			if (todaysLog) {
				return {
					setNumber,
					weight: todaysLog.weight,
					reps: todaysLog.reps,
					completed: true,
					timestamp: todaysLog.timestamp
				};
			}

			return {
				setNumber,
				weight: defaultWeight,
				reps: defaultReps,
				completed: false,
				timestamp: null
			};
		});

		return { ...template, sets };
	};

	return workoutTemplate.map(cloneSet);
}

export function formatTimestamp(isoString: string) {
	const date = new Date(isoString);
	const today = todayString();

	if (date.toDateString() === today) {
		return `Today, ${date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		})}`;
	}

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}
