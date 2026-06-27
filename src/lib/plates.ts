// Plate inventory and barbell-loading logic.
//
// This is the single source of truth for what plates exist on the rack. The UI
// (SetRow.svelte) and the tests (plates.test.ts) both read from here, so a change
// to the real-world setup only needs to happen in one place.

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
 * Barbell loading, prefering the whole set over doubled plates.
 *
 * First we try one of every plate (largest-first) — this spreads across distinct
 * discs (25+20+15+10…) and never doubles. That covers everything up to one of each
 * plate (82.5 kg per side / 185 kg total). Only when a weight can't be made that way
 * do we fall back to repeating the big discs, so doubles appear only when truly
 * necessary. (See plates.test.ts.)
 */
export function buildPlateBreakdown(
	totalWeight: number,
	barWeight = BAR_WEIGHT_KG
): PlateBreakdown {
	if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
		return { plates: [], message: 'No load', isValid: false };
	}

	if (totalWeight < barWeight) {
		return { plates: [], message: `Below ${barWeight} kg bar`, isValid: false };
	}

	const perSide = (totalWeight - barWeight) / 2;
	if (perSide <= 0) {
		return { plates: [], message: 'Bar only', isValid: true };
	}

	// Pass 1: one of each plate — spreads across the set, never doubles.
	let { plates, remaining } = greedyLoad(perSide, () => 1);

	// Pass 2 (heavy loads only): one of each isn't enough, so let the big discs
	// repeat per their `limit`. Change plates stay capped at one.
	if (remaining > EPSILON) {
		({ plates, remaining } = greedyLoad(perSide, (_size, limit) => limit));
	}

	if (remaining > EPSILON) {
		return { plates: [], message: 'Cannot match plate sizes', isValid: false };
	}

	return { plates, message: 'Plates per side', isValid: true };
}

export function getPlateColor(size: number) {
	const spec = PLATE_BY_SIZE.get(size);
	return spec ? { fill: spec.fill, text: spec.text } : FALLBACK_COLOR;
}

export function getPlateDiameter(size: number) {
	return size >= 5 ? 52 : 36;
}
