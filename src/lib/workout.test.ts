// Zero-config regression test for progression. Run with: npm test
import { computeProgression } from './workout.ts';
import { WEIGHT_INCREMENT_KG } from './plates.ts';
import type { HistoryEntry, SessionExercise } from './types.ts';

let failures = 0;
function check(label: string, ok: boolean, detail = '') {
	if (!ok) {
		failures += 1;
		console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
	}
}

// A completed past session (not "today"), all sets at the same weight/reps.
const PAST = new Date('2026-06-01T18:00:00.000Z');
const TODAY = new Date('2026-06-28T18:00:00.000Z').toDateString();
const history = (exercise: string, weight: number, reps: number, sets = 3): HistoryEntry[] =>
	Array.from({ length: sets }, (_, i) => ({
		type: 'workout',
		exercise,
		setNumber: i + 1,
		weight,
		reps,
		timestamp: PAST.toISOString()
	}));
const lift = (name: string, defaultWeight: number): SessionExercise => ({
	name,
	sets: [],
	defaultWeight,
	defaultReps: 10
});

// The bug: 0 kg (bodyweight start) hitting the upper rep bound must still progress.
const r0 = computeProgression(lift('Ab Rollout', 0), history('Ab Rollout', 0, 10), TODAY);
check(
	'0 kg at upper reps increases by one loadable increment (not stuck at 0)',
	r0.progression.action === 'increase' && r0.progression.suggestedWeight === WEIGHT_INCREMENT_KG,
	JSON.stringify(r0.progression)
);

// Normal load still gets the ~2.5% percentage bump.
const r100 = computeProgression(lift('Bench Press', 100), history('Bench Press', 100, 10), TODAY);
check(
	'100 kg at upper reps uses the ~2.5% bump (→ 103)',
	r100.progression.action === 'increase' && r100.progression.suggestedWeight === 103,
	JSON.stringify(r100.progression)
);

// Mid reps: no change.
const rHold = computeProgression(lift('Bench Press', 100), history('Bench Press', 100, 8), TODAY);
check('mid-range reps hold the weight', rHold.progression.action === 'maintain', JSON.stringify(rHold.progression));

if (failures === 0) {
	console.log('✓ progression: all checks passed (0 kg progresses, ~2.5% bump, mid-range holds)');
} else {
	console.error(`\n✗ progression: ${failures} check(s) failed`);
	process.exit(1);
}
