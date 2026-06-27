// Zero-dependency regression test for the barbell loader.
// Run with: npm test  (Node 22+ strips the TS types natively).
//
// It checks three properties against whatever PLATE_INVENTORY is configured:
//   1. Loadability — every valid 1 kg-step total is loadable.
//   2. Prefer the set — while one of each plate can make the weight, never double a
//      plate (spread 25+20+15+10… instead of 25+25).
//   3. Half-steps — 0.5 kg totals (0.25 kg/side) can't be loaded and are rejected.

import { BAR_WEIGHT_KG, PLATE_INVENTORY, buildPlateBreakdown } from './plates.ts';

let failures = 0;
function check(label: string, ok: boolean, detail = '') {
	if (!ok) {
		failures += 1;
		console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
	}
}

const sortedPlates = (total: number) => buildPlateBreakdown(total).plates.slice().sort((a, b) => b - a);
const maxCount = (plates: number[]) =>
	Math.max(0, ...[...new Set(plates)].map((p) => plates.filter((x) => x === p).length));

// One of every plate, per side — the most a no-doubles load can reach.
const ONE_OF_EACH_PER_SIDE = PLATE_INVENTORY.reduce((sum, p) => sum + p.size, 0);
const NO_DOUBLE_MAX_TOTAL = BAR_WEIGHT_KG + 2 * ONE_OF_EACH_PER_SIDE;

// --- Concrete cases --------------------------------------------------------
check('94 kg collapses 1.5+0.5 into a single 2', JSON.stringify(sortedPlates(94)) === JSON.stringify([25, 10, 2]), JSON.stringify(sortedPlates(94)));
check('24 kg is a single 2 kg plate per side', JSON.stringify(sortedPlates(24)) === JSON.stringify([2]), JSON.stringify(sortedPlates(24)));
check('bar-only (20 kg) is valid with no plates', buildPlateBreakdown(20).isValid && buildPlateBreakdown(20).plates.length === 0);
check('below the bar (15 kg) is invalid', !buildPlateBreakdown(15).isValid);
check('124 kg spreads the set instead of doubling (25+20+5+2)', JSON.stringify(sortedPlates(124)) === JSON.stringify([25, 20, 5, 2]), JSON.stringify(sortedPlates(124)));

// --- Sweep every loadable total --------------------------------------------
// Loadable totals step by 1 kg (smallest plate 0.5 kg/side = 1 kg total granularity).
let unloadable = 0;
let eagerDouble = 0;
let heavyLoadable = 0;
let heavyTotals = 0;
for (let total = BAR_WEIGHT_KG; total <= 420; total += 1) {
	const b = buildPlateBreakdown(total);
	if (!b.isValid) {
		unloadable += 1;
		continue;
	}
	if (total <= NO_DOUBLE_MAX_TOTAL && maxCount(b.plates) > 1) eagerDouble += 1;
	if (total > NO_DOUBLE_MAX_TOTAL) {
		heavyTotals += 1;
		if (b.isValid) heavyLoadable += 1;
	}
}
check('every 1 kg-step total up to 420 kg is loadable', unloadable === 0, `${unloadable} unloadable`);
check(`no doubled plate while one of each still fits (<= ${NO_DOUBLE_MAX_TOTAL} kg)`, eagerDouble === 0, `${eagerDouble} eager doubles`);
check('heavy loads above the set still load (with doubles)', heavyLoadable === heavyTotals, `${heavyTotals - heavyLoadable} of ${heavyTotals} failed`);

// Half-kg totals need 0.25 kg/side, which no plate can make — must be rejected.
let badHalfStep = 0;
for (let total = BAR_WEIGHT_KG + 0.5; total <= 200; total += 1) {
	if (buildPlateBreakdown(Number(total.toFixed(1))).isValid) badHalfStep += 1;
}
check('unloadable 0.5 kg half-steps are correctly rejected', badHalfStep === 0, `${badHalfStep} wrongly accepted`);

// --- Report ----------------------------------------------------------------
if (failures === 0) {
	console.log(`✓ plate loader: all checks passed (loadable + spread-before-double, 20–420 kg)`);
} else {
	console.error(`\n✗ plate loader: ${failures} check(s) failed`);
	process.exit(1);
}
