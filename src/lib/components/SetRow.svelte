<script lang="ts">
	import type { SetEntry } from '$lib/types';

	export let set: SetEntry;
	export let exerciseIdx: number;
	export let setIdx: number;
	export let onAdjustWeight: (exerciseIdx: number, setIdx: number, delta: number) => void;
	export let onAdjustReps: (exerciseIdx: number, setIdx: number, delta: number) => void;
	export let onSetWeight: (exerciseIdx: number, setIdx: number, value: number | null) => void;
	export let onSetReps: (exerciseIdx: number, setIdx: number, value: number | null) => void;
	export let onLogSet: (exerciseIdx: number, setIdx: number) => void;
	export let onUndoSet: (exerciseIdx: number, setIdx: number) => void;

	const weightId = `weight-${exerciseIdx}-${setIdx}`;
	const repsId = `reps-${exerciseIdx}-${setIdx}`;
	const BAR_WEIGHT_KG = 20;
	const PLATE_SIZES_KG = [25, 20, 15, 10, 5, 2.5, 1.5, 1, 0.5, 0.25];
	const PLATE_PAIRS: Record<number, number> = {
		25: 1,
		20: 1,
		15: 1,
		10: 1,
		5: 1,
		2.5: 1,
		1.5: 1,
		1: 1,
		0.5: 1,
		0.25: 1
	};

	type PlateSvgItem = {
		size: number;
		x: number;
		diameter: number;
		fill: string;
		text: string;
	};

	type PlateBreakdown = {
		plates: number[];
		message: string;
		isValid: boolean;
	};

	const toNumberOrNull = (value: string) => {
		if (value.trim() === '') return null;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	};

	function handleWeightInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		onSetWeight(exerciseIdx, setIdx, toNumberOrNull(target.value));
	}

	function handleRepsInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		onSetReps(exerciseIdx, setIdx, toNumberOrNull(target.value));
	}

	function buildPlateBreakdown(totalWeight: number): PlateBreakdown {
		if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
			return { plates: [], message: 'No load', isValid: false };
		}

		if (totalWeight < BAR_WEIGHT_KG) {
			return { plates: [], message: `Below ${BAR_WEIGHT_KG} kg bar`, isValid: false };
		}

		const perSide = (totalWeight - BAR_WEIGHT_KG) / 2;
		if (perSide <= 0) {
			return { plates: [], message: 'Bar only', isValid: true };
		}

		const plates: number[] = [];
		let remaining = Number(perSide.toFixed(2));
		const epsilon = 0.01;

		for (const size of PLATE_SIZES_KG) {
			const maxPerSide = PLATE_PAIRS[size] ?? Infinity;
			while (plates.filter((plate) => plate === size).length < maxPerSide && remaining + epsilon >= size) {
				plates.push(size);
				remaining = Number((remaining - size).toFixed(2));
			}
		}

		if (remaining > epsilon) {
			return { plates: [], message: 'Cannot match plate sizes', isValid: false };
		}

		return { plates, message: 'Plates per side', isValid: true };
	}

	function getPlateColor(size: number) {
		if (size === 25) return { fill: '#ef4444', text: '#ffffff' };
		if (size === 20) return { fill: '#2563eb', text: '#ffffff' };
		if (size === 15) return { fill: '#f59e0b', text: '#1f2937' };
		if (size === 10) return { fill: '#22c55e', text: '#0f172a' };
		if (size === 5) return { fill: '#9ca3af', text: '#0f172a' };
		if (size === 2.5) return { fill: '#ef4444', text: '#ffffff' };
		if (size === 1.5) return { fill: '#f59e0b', text: '#1f2937' };
		if (size === 1) return { fill: '#22c55e', text: '#0f172a' };
		if (size === 0.5) return { fill: '#f8fafc', text: '#0f172a' };
		if (size === 0.25) return { fill: '#9ca3af', text: '#0f172a' };
		return { fill: '#e5e7eb', text: '#0f172a' };
	}

	function getPlateDiameter(size: number) {
		if (size >= 5) return 52;
		return 36;
	}

	function buildPlateLayout(plates: number[]) {
		let x = 0;
		const gap = 12;
		const items: PlateSvgItem[] = plates.map((size) => {
			const diameter = getPlateDiameter(size);
			const colors = getPlateColor(size);
			const item = {
				size,
				x,
				diameter,
				fill: colors.fill,
				text: colors.text
			};
			x += diameter + gap;
			return item;
		});
		return { items, totalWidth: Math.max(x - gap, 0) };
	}

	$: plateBreakdown =
		Number.isFinite(set.weight) && set.weight >= BAR_WEIGHT_KG
			? buildPlateBreakdown(set.weight)
			: { plates: [], message: '', isValid: false };
</script>

<div class="set-row">
	<div class="set-header">
		<div class="set-number">Set {set.setNumber}</div>
	</div>

	<div class="set-inputs">
		<div class="set-input-group">
			<label class="set-input-label" for={weightId}>Weight (kg)</label>
			<div class="input-with-buttons">
				<button class="adjust-btn" on:click={() => onAdjustWeight(exerciseIdx, setIdx, -0.5)} disabled={set.completed} type="button">
					−
				</button>
				<input
					type="number"
					step="0.5"
					class="set-input"
					class:completed={set.completed}
					value={Number.isFinite(set.weight) ? set.weight : ''}
					min="0"
					readonly={set.completed}
					inputmode="decimal"
					id={weightId}
					on:input={handleWeightInput}
				/>
				<button class="adjust-btn" on:click={() => onAdjustWeight(exerciseIdx, setIdx, 0.5)} disabled={set.completed} type="button">
					+
				</button>
			</div>
		</div>

		<div class="set-input-group">
			<label class="set-input-label" for={repsId}>Reps</label>
			<div class="input-with-buttons">
				<button class="adjust-btn" on:click={() => onAdjustReps(exerciseIdx, setIdx, -1)} disabled={set.completed} type="button">
					−
				</button>
				<input
					type="number"
					class="set-input"
					class:completed={set.completed}
					value={Number.isFinite(set.reps) ? set.reps : ''}
					min="0"
					readonly={set.completed}
					inputmode="numeric"
					id={repsId}
					on:input={handleRepsInput}
				/>
				<button class="adjust-btn" on:click={() => onAdjustReps(exerciseIdx, setIdx, 1)} disabled={set.completed} type="button">
					+
				</button>
			</div>
		</div>

		<div class="set-actions">
			{#if set.completed}
				<button class="log-btn undo-btn" aria-label="Undo set" on:click={() => onUndoSet(exerciseIdx, setIdx)} type="button"></button>
			{:else}
				<button class="log-btn" aria-label="Log set" on:click={() => onLogSet(exerciseIdx, setIdx)} type="button"></button>
			{/if}
		</div>
	</div>

	{#if plateBreakdown.isValid}
		<div class="plate-row">
			<span class="plate-label">{plateBreakdown.message}</span>
			{#if plateBreakdown.plates.length === 0}
				<span class="plate-bar">Bar only</span>
			{:else}
				{@const layout = buildPlateLayout(plateBreakdown.plates)}
				<div class="plate-visual">
				<svg class="plate-stack" viewBox={`0 0 ${layout.totalWidth} 72`} role="img" aria-label="Plates per side">
					{#each layout.items as item (`${item.x}-${item.size}`)}
						<circle
							cx={item.x + item.diameter / 2}
							cy="36"
							r={item.diameter / 2}
							fill={item.fill}
							stroke="rgba(15, 23, 42, 0.2)"
							stroke-width="1"
						/>
						<text
							x={item.x + item.diameter / 2}
							y="40"
							text-anchor="middle"
							font-size="11"
							font-weight="800"
							fill="#ffffff"
							stroke="rgba(0, 0, 0, 0.45)"
							stroke-width="1.2"
							paint-order="stroke"
							>
								{item.size}
							</text>
						{/each}
					</svg>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.set-row {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px 6px;
		border-bottom: 1px solid #f0f0f0;
	}

	.set-row:last-child {
		border-bottom: none;
	}

	.set-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.set-number {
		font-weight: 700;
		color: #233143;
		font-size: 14px;
		letter-spacing: 0.02em;
	}

	.set-actions {
		display: flex;
		justify-content: center;
		align-items: center;
		align-self: stretch;
		min-width: 52px;
	}

	.set-inputs {
		display: grid;
		grid-template-columns: minmax(88px, 1fr) minmax(88px, 1fr) 60px;
		gap: 8px;
		width: 100%;
		align-items: center;
	}

	.plate-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		padding: 2px 2px 4px;
	}

	.plate-label {
		font-size: 11px;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-right: 4px;
	}

	.plate-bar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 3px 8px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
		color: #0f172a;
		border: 1px solid rgba(15, 23, 42, 0.12);
		background: #e2e8f0;
	}

	.plate-stack {
		height: 72px;
		width: auto;
		max-width: 100%;
		overflow: visible;
	}

	.plate-visual {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 10px 12px;
		border-radius: 14px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		width: 100%;
		overflow-x: auto;
	}

	.set-input-group {
		display: flex;
		flex-direction: column;
		position: relative;
		gap: 6px;
		min-width: 0;
	}

	.set-input-label {
		font-size: 12px;
		color: #5f6b7a;
		font-weight: 600;
	}

	.input-with-buttons {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.adjust-btn {
		background: #007aff;
		color: white;
		border: none;
		width: 44px;
		height: 44px;
		border-radius: 10px;
		font-size: 18px;
		font-weight: 700;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
		transition: transform 0.08s ease, box-shadow 0.12s ease;
	}

	.adjust-btn:active {
		background: #0051d5;
		transform: translateY(1px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14);
	}

	.adjust-btn:disabled {
		background: #c8cdd6;
		cursor: not-allowed;
		box-shadow: none;
	}

	.set-input {
		flex: 1;
		padding: 12px 10px;
		border: 1px solid #d8dde6;
		border-radius: 12px;
		font-size: 18px;
		text-align: center;
		min-width: 90px;
		width: 100%;
		min-height: 48px;
		color: #18212f;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
		appearance: textfield;
		box-sizing: border-box;
	}

	.set-input::-webkit-outer-spin-button,
	.set-input::-webkit-inner-spin-button {
		appearance: none;
		margin: 0;
	}

	.set-input:focus {
		outline: none;
		border-color: #007aff;
		box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
	}

	.set-input.completed {
		background: #e8f5e9;
		border-color: #4caf50;
	}

	.log-btn {
		background: #007aff;
		color: white;
		border: none;
		padding: 0;
		width: 44px;
		height: 44px;
		border-radius: 10px;
		font-size: 18px;
		font-weight: 700;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
		transition: transform 0.08s ease, box-shadow 0.12s ease;
		position: relative;
	}

	.log-btn:active {
		background: #0051d5;
		transform: translateY(1px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14);
	}

	.log-btn.undo-btn {
		background: #ff3b30;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
	}

	.log-btn.undo-btn:active {
		background: #d32f2f;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14);
	}

	.log-btn:disabled {
		background: #c8cdd6;
		cursor: not-allowed;
		box-shadow: none;
	}

	.log-btn::after {
		content: '✓';
		font-size: 18px;
	}

	.log-btn.undo-btn::after {
		content: '✕';
	}

	@media (max-width: 540px) {
		.set-inputs {
			grid-template-columns: minmax(90px, 1fr) minmax(90px, 1fr) 56px;
			column-gap: 6px;
			row-gap: 8px;
		}


		.set-actions {
			align-self: center;
		}

		.adjust-btn,
		.log-btn {
			width: 44px;
			height: 44px;
			border-radius: 10px;
			font-size: 18px;
		}

		.set-input {
			font-size: 17px;
			min-height: 46px;
			min-width: 80px;
		}
	}

	@media (max-width: 420px) {
		.set-inputs {
			grid-template-columns: minmax(132px, 1fr) minmax(132px, 1fr) 40px;
			column-gap: 4px;
		}


		.input-with-buttons {
			gap: 4px;
		}

		.adjust-btn,
		.log-btn {
			width: 32px;
			height: 44px;
			border-radius: 9px;
			font-size: 16px;
		}

		.set-input {
			min-width: 60px;
			min-height: 44px;
			font-size: 16px;
			padding: 10px 8px;
		}
	}
</style>
