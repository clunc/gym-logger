export type HistoryEntry = {
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
};
