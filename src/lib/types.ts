export type HistoryEntry = {
	type?: 'workout' | 'sick' | 'vacation';
	exercise: string;
	setNumber: number;
	weight: number;
	reps: number;
	timestamp: string;
};

export type SetEntry = {
	setNumber: number;
	weight: number;
	reps: number;
	completed: boolean;
	timestamp: string | null;
};

// How an exercise is loaded. Drives the plate breakdown and what `weight` means:
//   barbell    — total bar load; plates = (total - bar) / 2 per side
//   one-sided  — same 20 kg bar, plates on one end only; (total - bar), no halving
//   dumbbell   — per hand; no plate breakdown
//   machine    — stack / cable setting; no plate breakdown
//   bodyweight — no external load; no plate breakdown
//   weighted   — added load on top of bodyweight (vest / dip belt); no plate breakdown
export type EquipmentType =
	| 'barbell'
	| 'one-sided'
	| 'dumbbell'
	| 'machine'
	| 'bodyweight'
	| 'weighted';

export type SessionExercise = {
	name: string;
	sets: SetEntry[];
	defaultWeight: number;
	defaultReps: number;
	setCount?: number;
	optional?: boolean;
	/** Defaults to `barbell` when omitted. */
	equipment?: EquipmentType;
	progression?: ProgressionAdvice;
};

export type ProgressionAdvice = {
	action: 'increase' | 'maintain' | 'decrease';
	message: string;
	previousWeight: number;
	suggestedWeight: number;
	consecutiveHigh?: number;
	consecutiveLow?: number;
	recentHigh?: boolean;
	recentLow?: boolean;
};
