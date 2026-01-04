import type { HistoryEntry, ProgressionAdvice, SessionExercise, SetEntry } from './types';

export const SETS_PER_EXERCISE = 3;
export const REST_SECONDS = 90;

export type ExerciseNames = Record<string, string>;

export const workoutTemplate: SessionExercise[] = [
	{ name: 'Deadlifts', sets: [], defaultWeight: 90, defaultReps: 5 },
	{ name: 'Squats', sets: [], defaultWeight: 80, defaultReps: 5 },
	{ name: 'Shoulder Press', sets: [], defaultWeight: 50, defaultReps: 5 },
	{ name: 'Chin Up', sets: [], defaultWeight: 0, defaultReps: 5 },
	{ name: 'Bench Press', sets: [], defaultWeight: 63, defaultReps: 5 },
	{ name: 'Bent Over Rows', sets: [], defaultWeight: 64, defaultReps: 5 }
];

export const todayString = () => new Date().toDateString();
const tomorrowString = () => {
	const d = new Date();
	d.setDate(d.getDate() + 1);
	return d.toDateString();
};

export function resolveWorkoutTemplate(renames?: ExerciseNames): SessionExercise[] {
	if (!renames || Object.keys(renames).length === 0) return workoutTemplate;

	return workoutTemplate.map((exercise) => {
		const renamed = renames[exercise.name];
		return renamed ? { ...exercise, name: renamed } : exercise;
	});
}

export function createSession(
	history: HistoryEntry[],
	template: SessionExercise[] = workoutTemplate
): SessionExercise[] {
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

	return template.map(cloneSet);
}

type ExerciseSession = {
	dateKey: string;
	sets: HistoryEntry[];
	complete: boolean;
	averageWeight: number;
	minReps: number;
	maxReps: number;
};

type RepRange = {
	lower: number;
	upper: number;
};

function getRepRange(exerciseName: string): RepRange {
	const lowerFatigueGroup = ['Deadlifts', 'Squats'];
	if (lowerFatigueGroup.includes(exerciseName)) {
		return { lower: 5, upper: 8 };
	}
	return { lower: 6, upper: 10 };
}

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

	const repRange = getRepRange(template.name);
	const latestEntry = exerciseHistory[0];
	const lastReps = latestEntry ? latestEntry.reps : template.defaultReps;

	const todaysEntry = exerciseHistory.find((h) => new Date(h.timestamp).toDateString() === today);
	if (todaysEntry) {
		const weight = todaysEntry.weight;
		return {
			baseWeight: weight,
			defaultReps: clamp(lastReps, repRange.lower, repRange.upper),
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
	const [latestComplete] = completeSessions;

	const hitsUpperBound =
		latestComplete && latestComplete.minReps >= repRange.upper && latestComplete.complete;
	const belowLowerBound =
		latestComplete && latestComplete.maxReps <= repRange.lower && latestComplete.complete;

	let advice: ProgressionAdvice;

	if (hitsUpperBound) {
		const suggested = roundDownToIncrement(baseWeight * 1.025);
		advice = {
			action: 'increase',
			message: `All sets at ${repRange.upper}+ last session — nudged weight up by ~2.5%.`,
			previousWeight: baseWeight,
			suggestedWeight: suggested
		};
	} else if (belowLowerBound) {
		const suggested = roundDownToIncrement(baseWeight * 0.95);
		advice = {
			action: 'decrease',
			message: `All sets at ${repRange.lower} or below — reducing weight by ~5% to rebuild.`,
			previousWeight: baseWeight,
			suggestedWeight: suggested
		};
	} else if (latestComplete) {
		advice = {
			action: 'maintain',
			message: `Stay at this load until you hit the upper bound (${repRange.upper} reps) or drop below ${repRange.lower}.`,
			previousWeight: baseWeight,
			suggestedWeight: baseWeight
		};
	} else {
		advice = {
			action: 'maintain',
			message: 'No full sessions logged yet — start with the base weight.',
			previousWeight: baseWeight,
			suggestedWeight: baseWeight
		};
	}

	const defaultReps = (() => {
		if (advice.action === 'increase') return repRange.lower;
		if (advice.action === 'decrease') return repRange.upper;
		const repSource =
			latestComplete?.maxReps ??
			latestComplete?.minReps ??
			lastReps ??
			template.defaultReps;
		return clamp(repSource, repRange.lower, repRange.upper);
	})();

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
		const averageWeight =
			trimmedSets.reduce((total, set) => total + set.weight, 0) / (trimmedSets.length || 1);
		const reps = trimmedSets.map((set) => set.reps);
		const minReps = reps.length ? Math.min(...reps) : 0;
		const maxReps = reps.length ? Math.max(...reps) : 0;

		return {
			dateKey,
			sets: trimmedSets,
			complete,
			averageWeight: Number.isFinite(averageWeight) ? Number(averageWeight.toFixed(1)) : 0,
			minReps,
			maxReps
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

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
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
