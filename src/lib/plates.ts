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
	{ size: 25, limit: Infinity, fill: '#7D3A3E', text: '#ffffff' },
	{ size: 20, limit: Infinity, fill: '#324F6C', text: '#ffffff' },
	{ size: 15, limit: Infinity, fill: '#C4A732', text: '#1f2937' },
	{ size: 10, limit: Infinity, fill: '#40694C', text: '#ffffff' },
	{ size: 5, limit: Infinity, fill: '#C5C5C7', text: '#0f172a' },
	{ size: 2.5, limit: 1, fill: '#93362F', text: '#ffffff' },
	{ size: 2, limit: 1, fill: '#02487E', text: '#ffffff' },
	{ size: 1.5, limit: 1, fill: '#B4A34A', text: '#1f2937' },
	{ size: 1, limit: 1, fill: '#3E6730', text: '#ffffff' },
	{ size: 0.5, limit: 1, fill: '#CECDD3', text: '#0f172a' }
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

/**
 * Greedy barbell loading: largest plate first, capped by each plate's `limit`.
 * For our inventory this is provably both exact and plate-minimal for every
 * loadable weight (see plates.test.ts).
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

	const plates: number[] = [];
	let remaining = Number(perSide.toFixed(2));
	const epsilon = 0.01;

	for (const { size, limit } of PLATE_INVENTORY) {
		let used = 0;
		while (used < limit && remaining + epsilon >= size) {
			plates.push(size);
			remaining = Number((remaining - size).toFixed(2));
			used += 1;
		}
	}

	if (remaining > epsilon) {
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
