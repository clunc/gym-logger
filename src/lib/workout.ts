import type { HistoryEntry, ProgressionAdvice, SessionExercise, SetEntry } from './types';

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
const LOW_REP_CEILING = 5;
const tomorrowString = () => {
	const d = new Date();
	d.setDate(d.getDate() + 1);
	return d.toDateString();
};

export function createSession(history: HistoryEntry[]): SessionExercise[] {
	const today = todayString();
	const workoutHistory = history.filter((h) => (h.type ?? 'workout') === 'workout');

	const cloneSet = (template: SessionExercise): SessionExercise => {
		const { baseWeight, defaultReps, progression } = computeProgression(template, workoutHistory, today);
		const defaultWeight = baseWeight;

		const sets: SetEntry[] = Array.from({ length: SETS_PER_EXERCISE }, (_, idx) => {
			const setNumber = idx + 1;
			const todaysLog = workoutHistory.find(
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

		return { ...template, sets, progression };
	};

	return workoutTemplate.map(cloneSet);
}

type ExerciseSession = {
	dateKey: string;
	sets: HistoryEntry[];
	complete: boolean;
	allAtLeastTwelve: boolean;
	allAtMostLow: boolean;
	averageWeight: number;
};

export function getNextSessionProgression(
	template: SessionExercise,
	workoutHistory: HistoryEntry[]
): ProgressionAdvice {
	return computeProgression(template, workoutHistory, tomorrowString()).progression;
}

export function computeProgression(
	template: SessionExercise,
	workoutHistory: HistoryEntry[],
	today: string = todayString()
): {
	baseWeight: number;
	defaultReps: number;
	progression: ProgressionAdvice;
} {
	const exerciseHistory = workoutHistory
		.filter((h) => h.exercise === template.name)
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

	const latestEntry = exerciseHistory[0];
	const defaultReps = latestEntry ? latestEntry.reps : template.defaultReps;

	const todaysEntry = exerciseHistory.find((h) => new Date(h.timestamp).toDateString() === today);
	if (todaysEntry) {
		const weight = todaysEntry.weight;
		return {
			baseWeight: weight,
			defaultReps,
			progression: {
				action: 'maintain',
				message: "Continuing today's session with the same load.",
				previousWeight: weight,
				suggestedWeight: weight
			}
		};
	}

	const sessions = summarizeExerciseSessions(exerciseHistory);
	const lastComplete = sessions.find((session) => session.complete);
	const baseWeight = lastComplete
		? lastComplete.averageWeight
		: latestEntry
			? latestEntry.weight
			: template.defaultWeight;

	const completeSessions = sessions.filter((session) => session.complete);
	const [latestComplete, previousComplete] = completeSessions;

	let advice: ProgressionAdvice;
	const consecutiveHigh = countConsecutive(completeSessions, (session) => session.allAtLeastTwelve);
	const consecutiveLow = countConsecutive(completeSessions, (session) => session.allAtMostLow);
	const recentHigh = latestComplete?.allAtLeastTwelve ?? false;
	const recentLow = latestComplete?.allAtMostLow ?? false;

	if (latestComplete && previousComplete && latestComplete.allAtLeastTwelve && previousComplete.allAtLeastTwelve) {
		const suggested = roundDownToIncrement(baseWeight * 1.025);
		advice = {
			action: 'increase',
			message: '2 sessions with all sets at 12+ reps — nudged weight up by ~2.5%.',
			previousWeight: baseWeight,
			suggestedWeight: suggested,
			consecutiveHigh,
			consecutiveLow,
			recentHigh,
			recentLow
		};
	} else if (
		latestComplete &&
		previousComplete &&
		latestComplete.allAtMostLow &&
		previousComplete.allAtMostLow
	) {
		const suggested = roundDownToIncrement(baseWeight * 0.95);
		advice = {
			action: 'decrease',
			message: '2 sessions stuck at 5 reps or fewer — reducing weight by ~5% for better form.',
			previousWeight: baseWeight,
			suggestedWeight: suggested,
			consecutiveHigh,
			consecutiveLow,
			recentHigh,
			recentLow
		};
	} else if (latestComplete?.allAtLeastTwelve) {
		advice = {
			action: 'maintain',
			message: 'Hit 12+ reps last session; repeat once more before adding weight.',
			previousWeight: baseWeight,
			suggestedWeight: baseWeight,
			consecutiveHigh,
			consecutiveLow,
			recentHigh,
			recentLow
		};
	} else if (latestComplete?.allAtMostLow) {
		advice = {
			action: 'maintain',
			message: 'Under 5 reps last time — stay at this load and focus on form before dropping.',
			previousWeight: baseWeight,
			suggestedWeight: baseWeight,
			consecutiveHigh,
			consecutiveLow,
			recentHigh,
			recentLow
		};
	} else if (latestComplete) {
		advice = {
			action: 'maintain',
			message: 'Keep pushing this load until you can hit 12 reps across all 3 sets twice.',
			previousWeight: baseWeight,
			suggestedWeight: baseWeight,
			consecutiveHigh,
			consecutiveLow,
			recentHigh,
			recentLow
		};
	} else {
		advice = {
			action: 'maintain',
			message: 'No full sessions logged yet — start with the base weight.',
			previousWeight: baseWeight,
			suggestedWeight: baseWeight,
			consecutiveHigh,
			consecutiveLow,
			recentHigh,
			recentLow
		};
	}

	return { baseWeight: advice.suggestedWeight, defaultReps, progression: advice };
}

function summarizeExerciseSessions(history: HistoryEntry[]): ExerciseSession[] {
	const byDate = new Map<string, HistoryEntry[]>();

	for (const entry of history) {
		const key = new Date(entry.timestamp).toDateString();
		const existing = byDate.get(key) ?? [];
		existing.push(entry);
		byDate.set(key, existing);
	}

	const sessions: ExerciseSession[] = Array.from(byDate.entries()).map(([dateKey, sets]) => {
		const sortedSets = sets.sort((a, b) => a.setNumber - b.setNumber);
		const trimmedSets = sortedSets.slice(0, SETS_PER_EXERCISE);
		const complete = trimmedSets.length >= SETS_PER_EXERCISE;
		const allAtLeastTwelve = complete && trimmedSets.every((set) => set.reps >= 12);
		const allAtMostLow = complete && trimmedSets.every((set) => set.reps <= LOW_REP_CEILING);
		const averageWeight =
			trimmedSets.reduce((total, set) => total + set.weight, 0) / (trimmedSets.length || 1);

		return {
			dateKey,
			sets: trimmedSets,
			complete,
			allAtLeastTwelve,
			allAtMostLow,
			averageWeight: Number.isFinite(averageWeight) ? Number(averageWeight.toFixed(1)) : 0
		};
	});

	return sessions.sort(
		(a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
	);
}

function roundDownToIncrement(value: number, increment = 0.5) {
	const factor = Math.floor(value / increment);
	return Number((factor * increment).toFixed(1));
}

function countConsecutive(
	sessions: ExerciseSession[],
	predicate: (session: ExerciseSession) => boolean
): number {
	let count = 0;
	for (const session of sessions) {
		if (predicate(session)) {
			count += 1;
		} else {
			break;
		}
	}
	return count;
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
