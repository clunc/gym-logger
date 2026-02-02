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

export type SessionExercise = {
	name: string;
	sets: SetEntry[];
	defaultWeight: number;
	defaultReps: number;
	setCount?: number;
	optional?: boolean;
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
