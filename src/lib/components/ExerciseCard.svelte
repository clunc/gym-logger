<script lang="ts">
	import type { SessionExercise } from '$lib/types';
	import SetRow from './SetRow.svelte';

	export let exercise: SessionExercise;
	export let exerciseIdx: number;
	export let onAdjustWeight: (exerciseIdx: number, setIdx: number, delta: number) => void;
	export let onAdjustReps: (exerciseIdx: number, setIdx: number, delta: number) => void;
	export let onLogSet: (exerciseIdx: number, setIdx: number) => void;
	export let onUndoSet: (exerciseIdx: number, setIdx: number) => void;
</script>

<section class="card">
	<header class="card-header">
		<div>
			<div class="card-title">{exercise.name}</div>
			<div class="card-subtitle">
				{exercise.sets.filter((set) => set.completed).length} of {exercise.sets.length} sets completed
			</div>
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
	}

	.card-header {
		padding: 15px;
		border-bottom: 1px solid #f0f0f0;
	}

	.card-title {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 4px;
	}

	.card-subtitle {
		font-size: 13px;
		color: #999;
	}

	.card-body {
		padding: 8px;
	}
</style>
