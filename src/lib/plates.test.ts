// Zero-dependency regression test for the barbell loader.
// Run with: npm test  (Node 22+ strips the TS types natively).
//
// It proves two properties against whatever PLATE_INVENTORY is configured:
//   1. Loadability — every valid 0.5 kg-step total is loadable.
//   2. Minimality  — greedy uses the fewest possible plates every time.
// If you change the plate inventory and this still passes, the loader is still optimal.

import { BAR_WEIGHT_KG, PLATE_INVENTORY, buildPlateBreakdown } from './plates.ts';

let failures = 0;
function check(label: string, ok: boolean, detail = '') {
	if (!ok) {
		failures += 1;
		console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
	}
}

// --- Concrete cases (the bugs that started this) ---------------------------
const sortedPlates = (total: number) => buildPlateBreakdown(total).plates.slice().sort((a, b) => b - a);

check('94 kg collapses 1.5+0.5 into a single 2', JSON.stringify(sortedPlates(94)) === JSON.stringify([25, 10, 2]), JSON.stringify(sortedPlates(94)));
check('24 kg is a single 2 kg plate per side', JSON.stringify(sortedPlates(24)) === JSON.stringify([2]), JSON.stringify(sortedPlates(24)));
check('bar-only (20 kg) is valid with no plates', buildPlateBreakdown(20).isValid && buildPlateBreakdown(20).plates.length === 0);
check('below the bar (15 kg) is invalid', !buildPlateBreakdown(15).isValid);
check('heavy load uses doubled discs (124 kg)', JSON.stringify(sortedPlates(124)) === JSON.stringify([25, 25, 2]), JSON.stringify(sortedPlates(124)));

// --- Generic optimal-min solver (bounded knapsack, min plate count) --------
// Work in half-kg integer units so all plate sizes are whole numbers.
const UNIT = 2;
const coins = PLATE_INVENTORY.map((p) => ({ size: Math.round(p.size * UNIT), limit: p.limit }));

function optimalPlateCount(perSideHalfKg: number): number | null {
	const dp = new Array(perSideHalfKg + 1).fill(Infinity);
	dp[0] = 0;
	for (const { size, limit } of coins) {
		const copies = limit === Infinity ? Math.floor(perSideHalfKg / size) : limit;
		for (let c = 0; c < copies; c += 1) {
			for (let amount = perSideHalfKg; amount >= size; amount -= 1) {
				if (dp[amount - size] + 1 < dp[amount]) dp[amount] = dp[amount - size] + 1;
			}
		}
	}
	return dp[perSideHalfKg] === Infinity ? null : dp[perSideHalfKg];
}

// Loadable totals step by 1.0 kg: the smallest plate (0.5 kg) gives 0.5 kg/side,
// i.e. 1.0 kg total granularity. Sweep those and confirm loadable + minimal.
let unloadable = 0;
let nonMinimal = 0;
for (let total = BAR_WEIGHT_KG; total <= 420; total += 1) {
	const breakdown = buildPlateBreakdown(total);
	const perSideHalfKg = (total - BAR_WEIGHT_KG); // (total-bar)/2 kg, in half-kg units
	const optimal = optimalPlateCount(perSideHalfKg);

	if (!breakdown.isValid) {
		unloadable += 1;
		continue;
	}
	if (breakdown.plates.length !== optimal) nonMinimal += 1;
}
check('every 1 kg-step total up to 420 kg is loadable', unloadable === 0, `${unloadable} unloadable`);
check('greedy is plate-minimal for every total', nonMinimal === 0, `${nonMinimal} non-minimal`);

// Half-kg totals need 0.25 kg/side, which no plate can make — must be rejected.
let badHalfStep = 0;
for (let total = BAR_WEIGHT_KG + 0.5; total <= 200; total += 1) {
	if (buildPlateBreakdown(Number(total.toFixed(1))).isValid) badHalfStep += 1;
}
check('unloadable 0.5 kg half-steps are correctly rejected', badHalfStep === 0, `${badHalfStep} wrongly accepted`);

// --- Report ----------------------------------------------------------------
if (failures === 0) {
	console.log('✓ plate loader: all checks passed (loadable + minimal across 20–420 kg)');
} else {
	console.error(`\n✗ plate loader: ${failures} check(s) failed`);
	process.exit(1);
}
