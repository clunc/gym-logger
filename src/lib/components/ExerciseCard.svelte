<script lang="ts">
	import type { ProgressionAdvice, SessionExercise } from '$lib/types';
	import type { OneRmEstimate } from '$lib/workout';
	import SetRow from './SetRow.svelte';

	export let exercise: SessionExercise;
	export let exerciseIdx: number;
	export let nextProgression: ProgressionAdvice | null = null;
	export let onAdjustWeight: (exerciseIdx: number, setIdx: number, delta: number) => void;
	export let onAdjustReps: (exerciseIdx: number, setIdx: number, delta: number) => void;
	export let onSetWeight: (exerciseIdx: number, setIdx: number, value: number | null) => void;
	export let onSetReps: (exerciseIdx: number, setIdx: number, value: number | null) => void;
	export let onLogSet: (exerciseIdx: number, setIdx: number) => void;
	export let onUndoSet: (exerciseIdx: number, setIdx: number) => void;
	export let oneRmEstimate: OneRmEstimate | null = null;


	const roundDownToIncrement = (value: number, increment = 0.5) => {
		const factor = Math.floor(value / increment);
		return Number((factor * increment).toFixed(1));
	};

	const formatDelta = (delta: number) => {
		const value = Number(delta.toFixed(1));
		return value > 0 ? `+${value}` : `${value}`;
	};

	$: nextDelta =
		nextProgression && nextProgression.suggestedWeight !== nextProgression.previousWeight
			? Number((nextProgression.suggestedWeight - nextProgression.previousWeight).toFixed(1))
			: 0;
	$: nextLabel = buildNextLabel(nextProgression, nextDelta);
	$: nextStatusClass = buildNextStatusClass(nextProgression, nextDelta);

	function computeHoldDelta(progress: ProgressionAdvice | null) {
		if (!progress) return 0;
		const base = progress.previousWeight;

		if (progress.recentHigh || progress.consecutiveHigh === 1) {
			const target = roundDownToIncrement(base * 1.025);
			return Number((target - base).toFixed(1));
		}

		if (progress.recentLow || progress.consecutiveLow === 1) {
			const target = roundDownToIncrement(base * 0.95);
			return Number((target - base).toFixed(1));
		}

		return 0;
	}

	function buildNextLabel(progress: ProgressionAdvice | null, delta: number) {
		if (!progress) return '';
		if (delta > 0) return `⬆️ +${delta} kg`;
		if (delta < 0) return `⬇️ ${delta} kg`;

		const holdDelta = computeHoldDelta(progress);

		if (progress.recentLow || progress.consecutiveLow === 1) {
			return `⬇️ ${formatDelta(holdDelta)} kg`;
		}

		if (progress.recentHigh || progress.consecutiveHigh === 1) {
			return `⬆️ ${formatDelta(holdDelta)} kg`;
		}

		return '⏸️';
	}

	function buildNextStatusClass(progress: ProgressionAdvice | null, delta: number) {
		if (!progress) return '';
		if (delta !== 0) return '';

		if (progress.recentLow || progress.consecutiveLow === 1) {
			return 'hold-low';
		}

		if (progress.recentHigh || progress.consecutiveHigh === 1) {
			return 'hold-high';
		}

		return '';
	}

	const formatOneRm = (value: number) => Number(value.toFixed(1));
</script>

<section class="card">
	<header class="card-header">
		<div class="title-wrap">
			<div class="title-row">
				<div class="card-title">{exercise.name}</div>
				{#if oneRmEstimate}
					<div
						class="one-rm-inline"
						title={`Median of last ${oneRmEstimate.sessionCount} sessions: ${oneRmEstimate.medianWeight} kg x ${oneRmEstimate.medianReps} reps`}
					>
						{formatOneRm(oneRmEstimate.estimate)} ± {formatOneRm(oneRmEstimate.ciHalf)} kg (1RM)
					</div>
				{/if}
			</div>
			<div class="card-subtitle">
				{exercise.sets.filter((set) => set.completed).length} of {exercise.sets.length} sets completed
			</div>
		</div>
		<div class="pill-group">
			{#if nextProgression}
				<div class={`next-pill ${nextProgression.action} ${nextStatusClass}`}>
					{nextLabel}
				</div>
			{/if}
		</div>
	</header>

	<div class="card-body">
		{#each exercise.sets as set, setIdx}
			<SetRow
				{set}
				{setIdx}
				{exerciseIdx}
				{onAdjustWeight}
				{onAdjustReps}
				{onSetWeight}
				{onSetReps}
				{onLogSet}
				{onUndoSet}
			/>
		{/each}
	</div>
</section>

<style>
	.card {
		background: white;
		border-radius: 12px;
		margin-bottom: 15px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		border: 1px solid #eef1f6;
	}

	.card-header {
		padding: 14px 16px;
		border-bottom: 1px solid #f3f4f6;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
	}

	.title-wrap {
		display: grid;
		gap: 4px;
		flex: 1;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.card-title {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 4px;
		color: #172133;
	}

	.pill-group {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.card-subtitle {
		font-size: 13px;
		color: #999;
	}

	.card-body {
		padding: 8px 12px 4px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.next-pill {
		font-size: 12px;
		font-weight: 800;
		padding: 8px 10px;
		border-radius: 999px;
		border: 1px solid #e2e8f0;
		background: #eff6ff;
		color: #1d4ed8;
		white-space: nowrap;
	}

	.one-rm-inline {
		font-size: 12px;
		font-weight: 700;
		padding: 7px 10px;
		border-radius: 999px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		color: #0f172a;
		white-space: nowrap;
		width: fit-content;
	}

	.next-pill.increase {
		background: #ecfdf3;
		border-color: #bbf7d0;
		color: #166534;
	}

	.next-pill.decrease {
		background: #fef2f2;
		border-color: #fecdd3;
		color: #b91c1c;
	}

	.next-pill.hold-low {
		background: #fff1f2;
		border-color: #fecdd3;
		color: #b91c1c;
	}

	.next-pill.hold-high {
		background: #ecfdf3;
		border-color: #bbf7d0;
		color: #166534;
	}
</style>
