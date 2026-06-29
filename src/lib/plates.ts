// Plate inventory and barbell-loading logic.
//
// This is the single source of truth for what plates exist on the rack. The UI
// (SetRow.svelte) and the tests (plates.test.ts) both read from here, so a change
// to the real-world setup only needs to happen in one place.

import type { EquipmentType } from './types';

export const BAR_WEIGHT_KG = 20;

export type PlateSpec = {
	size: number;
	/** Max usable per side. `Infinity` = effectively unlimited (we own plenty). */
	limit: number;
	/** Disc fill color, sampled from our actual plates (no official spec is published). */
	fill: string;
	/** Label color, chosen for contrast against `fill`. */
	text: string;
};

// Ordered largest-first — the greedy loader depends on this order.
// Big discs are effectively unlimited (greedy stacks singles, then doubles, …);
// change plates we own exactly one of each, so they only finish the last <5 kg.
export const PLATE_INVENTORY: PlateSpec[] = [
	{ size: 25, limit: Infinity, fill: '#854245', text: '#ffffff' },
	{ size: 20, limit: Infinity, fill: '#3A5775', text: '#ffffff' },
	{ size: 15, limit: Infinity, fill: '#CAAD3A', text: '#ffffff' },
	{ size: 10, limit: Infinity, fill: '#466F52', text: '#ffffff' },
	{ size: 5, limit: Infinity, fill: '#C5C5C7', text: '#ffffff' },
	{ size: 2.5, limit: 1, fill: '#9F3D37', text: '#ffffff' },
	{ size: 2, limit: 1, fill: '#0A538B', text: '#ffffff' },
	{ size: 1.5, limit: 1, fill: '#BCAB53', text: '#ffffff' },
	{ size: 1, limit: 1, fill: '#446E35', text: '#ffffff' },
	{ size: 0.5, limit: 1, fill: '#CECDD3', text: '#ffffff' }
];

const PLATE_BY_SIZE = new Map(PLATE_INVENTORY.map((plate) => [plate.size, plate]));
const FALLBACK_COLOR = { fill: '#e5e7eb', text: '#0f172a' };

/**
 * Smallest loadable change in total bar weight: the smallest plate, loaded on
 * both sides. With a 0.5 kg plate that's a 1 kg total step — anything finer
 * can't actually be put on the bar, so weight controls and progression snap
 * to this so every suggested weight is loadable.
 */
export const WEIGHT_INCREMENT_KG = Math.min(...PLATE_INVENTORY.map((plate) => plate.size)) * 2;

export type PlateBreakdown = {
	plates: number[];
	message: string;
	isValid: boolean;
};

const EPSILON = 0.01;

/** Greedy largest-first load for one side, each plate capped at `cap(size, limit)`. */
function greedyLoad(perSide: number, cap: (size: number, limit: number) => number) {
	const plates: number[] = [];
	let remaining = Number(perSide.toFixed(2));
	for (const { size, limit } of PLATE_INVENTORY) {
		const max = cap(size, limit);
		let used = 0;
		while (used < max && remaining + EPSILON >= size) {
			plates.push(size);
			remaining = Number((remaining - size).toFixed(2));
			used += 1;
		}
	}
	return { plates, remaining };
}

/**
 * Greedy load for a single end, prefering the whole set over doubled plates.
 *
 * Pass 1 tries one of every plate (largest-first) — spreads across distinct discs
 * (25+20+15+10…) and never doubles, covering everything up to one of each plate.
 * Pass 2 only runs when that isn't enough, repeating the big discs so doubles appear
 * only when truly necessary. (See plates.test.ts.)
 */
function loadFor(amount: number): { plates: number[]; remaining: number } {
	let { plates, remaining } = greedyLoad(amount, () => 1);
	if (remaining > EPSILON) {
		({ plates, remaining } = greedyLoad(amount, (_size, limit) => limit));
	}
	return { plates, remaining };
}

/**
 * Plate breakdown for a logged weight, given how the exercise is loaded. Both
 * plate-loaded types use the same 20 kg bar; they differ only in how it's split:
 *   - `barbell`   — symmetric: plates = (weight − bar) / 2 per side.
 *   - `one-sided` — landmine / T-bar / lever: same 20 kg bar, but all the plates
 *     go on the one end, so (weight − bar) with no halving.
 *   - everything else (dumbbell / machine / bodyweight / weighted) — no breakdown.
 */
export function buildPlateBreakdown(
	weight: number,
	equipment: EquipmentType = 'barbell',
	barWeight = BAR_WEIGHT_KG
): PlateBreakdown {
	if (equipment !== 'barbell' && equipment !== 'one-sided') {
		return { plates: [], message: '', isValid: false };
	}

	if (!Number.isFinite(weight) || weight <= 0) {
		return { plates: [], message: 'No load', isValid: false };
	}

	if (weight < barWeight) {
		return { plates: [], message: `Below ${barWeight} kg bar`, isValid: false };
	}

	const loaded = weight - barWeight;
	if (loaded <= 0) {
		return { plates: [], message: 'Bar only', isValid: true };
	}

	const perEnd = equipment === 'one-sided' ? loaded : loaded / 2;
	const { plates, remaining } = loadFor(perEnd);
	if (remaining > EPSILON) {
		return { plates: [], message: 'Cannot match plate sizes', isValid: false };
	}

	return {
		plates,
		message: equipment === 'one-sided' ? 'Plates loaded' : 'Plates per side',
		isValid: true
	};
}

export function getPlateColor(size: number) {
	const spec = PLATE_BY_SIZE.get(size);
	return spec ? { fill: spec.fill, text: spec.text } : FALLBACK_COLOR;
}

export function getPlateDiameter(size: number) {
	return size >= 5 ? 52 : 36;
}
