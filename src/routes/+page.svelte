<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import ExerciseCard from '$lib/components/ExerciseCard.svelte';
	import HistoryList from '$lib/components/HistoryList.svelte';
	import RestTimer from '$lib/components/RestTimer.svelte';
	import { appendHistory, fetchHistory } from '$lib/api/history';
	import { createSession, REST_SECONDS, todayString } from '$lib/workout';
	import type { HistoryEntry, SessionExercise } from '$lib/types';

	let history: HistoryEntry[] = [];
	let currentSession: SessionExercise[] = [];
	let restTimeRemaining = REST_SECONDS;
	let restTimerStatus: 'idle' | 'active' | 'warning' | 'done' = 'idle';
	let restTimerInterval: ReturnType<typeof setInterval> | null = null;
	let restHideTimeout: ReturnType<typeof setTimeout> | null = null;
	let ready = false;
	let loadError = '';

	onMount(async () => {
		try {
			history = await fetchHistory();
		} catch (error) {
			console.error(error);
			loadError = 'Could not load history. Changes will not be saved.';
		} finally {
			currentSession = createSession(history);
			ready = true;
		}
	});

	onDestroy(() => {
		if (restTimerInterval) clearInterval(restTimerInterval);
		if (restHideTimeout) clearTimeout(restHideTimeout);
	});

	function adjustWeight(exerciseIdx: number, setIdx: number, delta: number) {
		const set = currentSession[exerciseIdx].sets[setIdx];
		if (set.completed) return;

		const next = Math.max(0, (set.weight || 0) + delta);
		set.weight = Number(next.toFixed(1));
		currentSession = [...currentSession];
	}

	function adjustReps(exerciseIdx: number, setIdx: number, delta: number) {
		const set = currentSession[exerciseIdx].sets[setIdx];
		if (set.completed) return;

		set.reps = Math.max(0, (set.reps || 0) + delta);
		currentSession = [...currentSession];
	}

	function logSet(exerciseIdx: number, setIdx: number) {
		const exercise = currentSession[exerciseIdx];
		const set = exercise.sets[setIdx];

		if (!Number.isFinite(set.weight) || !Number.isFinite(set.reps)) {
			alert('Please enter valid weight and reps');
			return;
		}

		const today = todayString();

		set.completed = true;
		set.timestamp = new Date().toISOString();

		const entry: HistoryEntry = {
			exercise: exercise.name,
			setNumber: set.setNumber,
			weight: set.weight,
			reps: set.reps,
			timestamp: set.timestamp
		};

		history = [entry, ...history];

		const nextSet = exercise.sets[setIdx + 1];
		if (nextSet && !nextSet.completed) {
			nextSet.weight = set.weight;
			nextSet.reps = set.reps;
		}

		currentSession = [...currentSession];
		if (!loadError) {
			appendHistory([entry]).catch((error) => {
				console.error(error);
				loadError = 'Could not save history. Changes will not be saved.';
			});
		}
		startRestTimer();
	}

	function undoSet(exerciseIdx: number, setIdx: number) {
		const exercise = currentSession[exerciseIdx];
		const set = exercise.sets[setIdx];
		if (!set.completed || !set.timestamp) return;

		const index = history.findIndex(
			(h) =>
				h.exercise === exercise.name &&
				h.setNumber === set.setNumber &&
				h.timestamp === set.timestamp
		);

		if (index !== -1) {
			history.splice(index, 1);
			history = [...history];
			// Append-only persistence: keep DB entries for audit; UI remains accurate.
		}

		set.completed = false;
		set.timestamp = null;
		currentSession = [...currentSession];
	}

	function startRestTimer() {
		if (restTimerInterval) clearInterval(restTimerInterval);
		if (restHideTimeout) clearTimeout(restHideTimeout);

		restTimeRemaining = REST_SECONDS;
		restTimerStatus = 'active';

		restTimerInterval = setInterval(() => {
			restTimeRemaining -= 1;

			if (restTimeRemaining <= 0) {
				restTimeRemaining = 0;
				restTimerStatus = 'done';
				clearInterval(restTimerInterval!);
				restTimerInterval = null;

				if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
					navigator.vibrate([200, 100, 200]);
				}

				restHideTimeout = setTimeout(() => {
					restTimerStatus = 'idle';
				}, 3000);
			} else if (restTimeRemaining <= 10) {
				restTimerStatus = 'warning';
			}
		}, 1000);
	}

	$: todaysHistory = history.filter(
		(entry) => new Date(entry.timestamp).toDateString() === todayString()
	);

	$: restTimerLabel =
		restTimerStatus === 'done'
			? 'Ready!'
			: `${Math.floor(restTimeRemaining / 60)}:${String(restTimeRemaining % 60).padStart(2, '0')}`;
</script>

<svelte:head>
	<title>Training Logger</title>
</svelte:head>

<div class="page">
	<nav class="navbar">
		<h1>💪 Training Logger</h1>
	</nav>

	{#if !ready}
		<div class="content">
			<p class="loading">Loading your session...</p>
		</div>
	{:else}
		<div class="content">
			{#if loadError}
				<div class="alert">{loadError}</div>
			{/if}
			{#each currentSession as exercise, exerciseIdx}
				<ExerciseCard
					{exercise}
					{exerciseIdx}
					onAdjustWeight={adjustWeight}
					onAdjustReps={adjustReps}
					onLogSet={logSet}
					onUndoSet={undoSet}
				/>
			{/each}

			<HistoryList entries={todaysHistory} />
		</div>
	{/if}

	<RestTimer status={restTimerStatus} label={restTimerLabel} />
</div>

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		background: #f5f5f5;
		padding-bottom: 20px;
	}

	.page {
		min-height: 100vh;
	}

	.navbar {
		background: #007aff;
		color: white;
		padding: 15px 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.navbar h1 {
		font-size: 20px;
		font-weight: 600;
	}

	.content {
		padding: 15px 8px;
		max-width: 600px;
		margin: 0 auto;
	}

	.loading {
		color: #666;
		text-align: center;
	}

	.alert {
		background: #fff4e5;
		color: #9c4a00;
		border: 1px solid #ffd7a8;
		border-radius: 8px;
		padding: 10px 12px;
		margin-bottom: 12px;
		font-size: 14px;
	}
</style>
