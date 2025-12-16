<script lang="ts">
	import type { SetEntry } from '$lib/types';

	export let set: SetEntry;
	export let exerciseIdx: number;
	export let setIdx: number;
	export let onAdjustWeight: (exerciseIdx: number, setIdx: number, delta: number) => void;
	export let onAdjustReps: (exerciseIdx: number, setIdx: number, delta: number) => void;
	export let onLogSet: (exerciseIdx: number, setIdx: number) => void;
	export let onUndoSet: (exerciseIdx: number, setIdx: number) => void;

	const weightId = `weight-${exerciseIdx}-${setIdx}`;
	const repsId = `reps-${exerciseIdx}-${setIdx}`;
</script>

<div class="set-row">
	<div class="set-number">Set {set.setNumber}</div>

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
				bind:value={set.weight}
				min="0"
				readonly={set.completed}
				id={weightId}
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
				bind:value={set.reps}
				min="0"
				readonly={set.completed}
				id={repsId}
			/>
			<button class="adjust-btn" on:click={() => onAdjustReps(exerciseIdx, setIdx, 1)} disabled={set.completed} type="button">
				+
			</button>
		</div>
	</div>

	<div class="set-input-group">
		<span class="set-input-label spacer" aria-hidden="true">&nbsp;</span>
		{#if set.completed}
			<button class="log-btn undo-btn" on:click={() => onUndoSet(exerciseIdx, setIdx)} type="button">
				❌
			</button>
		{:else}
			<button class="log-btn" on:click={() => onLogSet(exerciseIdx, setIdx)} type="button">
				✓
			</button>
		{/if}
	</div>
</div>

<style>
	.set-row {
		display: grid;
		grid-template-columns: 40px 1.3fr 1.3fr 40px;
		gap: 4px;
		align-items: center;
		padding: 10px 0;
		border-bottom: 1px solid #f0f0f0;
	}

	.set-row:last-child {
		border-bottom: none;
	}

	.set-number {
		font-weight: 600;
		color: #666;
		font-size: 13px;
	}

	.set-input-group {
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.set-input-label {
		font-size: 11px;
		color: #999;
		margin-bottom: 4px;
	}

	.input-with-buttons {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.adjust-btn {
		background: #007aff;
		color: white;
		border: none;
		width: 22px;
		height: 22px;
		border-radius: 4px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0;
	}

	.adjust-btn:active {
		background: #0051d5;
	}

	.adjust-btn:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.set-input {
		flex: 1;
		padding: 4px 2px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
		text-align: center;
		min-width: 0;
	}

	.set-input:focus {
		outline: none;
		border-color: #007aff;
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
		width: 30px;
		height: 30px;
		border-radius: 6px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.log-btn:active {
		background: #0051d5;
	}

	.log-btn.undo-btn {
		background: #ff3b30;
	}

	.log-btn.undo-btn:active {
		background: #d32f2f;
	}

	.log-btn:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.spacer {
		display: inline-block;
	}
</style>
