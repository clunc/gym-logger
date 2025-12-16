<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	type HistoryEntry = {
		exercise: string;
		setNumber: number;
		weight: number;
		reps: number;
		timestamp: string;
	};

	type SetEntry = {
		setNumber: number;
		weight: number;
		reps: number;
		completed: boolean;
		timestamp: string | null;
	};

	type SessionExercise = {
		name: string;
		sets: SetEntry[];
		defaultWeight: number;
		defaultReps: number;
	};

	const workoutTemplate: SessionExercise[] = [
		{ name: 'Deadlifts', sets: [], defaultWeight: 90, defaultReps: 5 },
		{ name: 'Squats', sets: [], defaultWeight: 80, defaultReps: 5 },
		{ name: 'Shoulder Press', sets: [], defaultWeight: 50, defaultReps: 5 },
		{ name: 'Chin Up', sets: [], defaultWeight: 0, defaultReps: 5 },
		{ name: 'Bench Press', sets: [], defaultWeight: 63, defaultReps: 5 },
		{ name: 'Bent Over Rows', sets: [], defaultWeight: 64, defaultReps: 5 }
	];

	const SETS_PER_EXERCISE = 3;
	const REST_SECONDS = 90;

	let currentSession: SessionExercise[] = [];
	let history: HistoryEntry[] = [];
	let restTimeRemaining = REST_SECONDS;
	let restTimerStatus: 'idle' | 'active' | 'warning' | 'done' = 'idle';
	let restTimerInterval: ReturnType<typeof setInterval> | null = null;
	let restHideTimeout: ReturnType<typeof setTimeout> | null = null;
	let ready = false;

	const todayString = () => new Date().toDateString();

	onMount(() => {
		history = loadHistory();
		initializeSession();
		ready = true;
	});

	onDestroy(() => {
		if (restTimerInterval) clearInterval(restTimerInterval);
		if (restHideTimeout) clearTimeout(restHideTimeout);
	});

	function loadHistory(): HistoryEntry[] {
		if (typeof localStorage === 'undefined') return [];

		try {
			const stored = localStorage.getItem('workoutHistory');
			const parsed = stored ? JSON.parse(stored) : [];
			return Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			console.error('Failed to load workout history', error);
			return [];
		}
	}

	function persistHistory() {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem('workoutHistory', JSON.stringify(history));
	}

	function initializeSession() {
		const today = todayString();

		currentSession = workoutTemplate.map((exercise) => {
			const lastLogged = history.find((h) => h.exercise === exercise.name);
			const defaultWeight = lastLogged ? lastLogged.weight : exercise.defaultWeight;
			const defaultReps = lastLogged ? lastLogged.reps : exercise.defaultReps;

			const sets = Array.from({ length: SETS_PER_EXERCISE }, (_, idx) => {
				const setNumber = idx + 1;
				const todaysLog = history.find(
					(h) =>
						h.exercise === exercise.name &&
						h.setNumber === setNumber &&
						new Date(h.timestamp).toDateString() === today
				);

				if (todaysLog) {
					return {
						setNumber,
						weight: todaysLog.weight,
						reps: todaysLog.reps,
						completed: true,
						timestamp: todaysLog.timestamp
					};
				}

				return {
					setNumber,
					weight: defaultWeight,
					reps: defaultReps,
					completed: false,
					timestamp: null
				};
			});

			return { ...exercise, sets };
		});
	}

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

		history = history.filter(
			(h) =>
				!(
					h.exercise === exercise.name &&
					h.setNumber === set.setNumber &&
					new Date(h.timestamp).toDateString() === today
				)
		);

		set.completed = true;
		set.timestamp = new Date().toISOString();

		history = [
			{
				exercise: exercise.name,
				setNumber: set.setNumber,
				weight: set.weight,
				reps: set.reps,
				timestamp: set.timestamp
			},
			...history
		];

		const nextSet = exercise.sets[setIdx + 1];
		if (nextSet && !nextSet.completed) {
			nextSet.weight = set.weight;
			nextSet.reps = set.reps;
		}

		currentSession = [...currentSession];
		persistHistory();
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
			persistHistory();
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

	function formatTimestamp(isoString: string) {
		const date = new Date(isoString);
		const today = todayString();

		if (date.toDateString() === today) {
			return `Today, ${date.toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit'
			})}`;
		}

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
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
		<div class="content" id="content">
			{#each currentSession as exercise, exerciseIdx}
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
							<div class="set-row">
								<div class="set-number">Set {set.setNumber}</div>

								<div class="set-input-group">
									<label class="set-input-label" for={`weight-${exerciseIdx}-${setIdx}`}>
										Weight (kg)
									</label>
									<div class="input-with-buttons">
										<button
											class="adjust-btn"
											on:click={() => adjustWeight(exerciseIdx, setIdx, -0.5)}
											disabled={set.completed}
											type="button"
										>
											−
										</button>
										<input
											type="number"
											step="0.5"
											class:completed={set.completed}
											class="set-input"
											bind:value={set.weight}
											min="0"
											readonly={set.completed}
											id={`weight-${exerciseIdx}-${setIdx}`}
										/>
										<button
											class="adjust-btn"
											on:click={() => adjustWeight(exerciseIdx, setIdx, 0.5)}
											disabled={set.completed}
											type="button"
										>
											+
										</button>
									</div>
								</div>

								<div class="set-input-group">
									<label class="set-input-label" for={`reps-${exerciseIdx}-${setIdx}`}>
										Reps
									</label>
									<div class="input-with-buttons">
										<button
											class="adjust-btn"
											on:click={() => adjustReps(exerciseIdx, setIdx, -1)}
											disabled={set.completed}
											type="button"
										>
											−
										</button>
										<input
											type="number"
											class="set-input"
											class:completed={set.completed}
											bind:value={set.reps}
											min="0"
											readonly={set.completed}
											id={`reps-${exerciseIdx}-${setIdx}`}
										/>
										<button
											class="adjust-btn"
											on:click={() => adjustReps(exerciseIdx, setIdx, 1)}
											disabled={set.completed}
											type="button"
										>
											+
										</button>
									</div>
								</div>

								<div class="set-input-group">
									<span class="set-input-label spacer" aria-hidden="true">&nbsp;</span>
									{#if set.completed}
										<button class="log-btn undo-btn" on:click={() => undoSet(exerciseIdx, setIdx)} type="button">
											❌
										</button>
									{:else}
										<button class="log-btn" on:click={() => logSet(exerciseIdx, setIdx)} type="button">
											✓
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/each}

			{#if todaysHistory.length > 0}
				<section class="history-section">
					<div class="history-title">Today's Sets</div>
					{#each todaysHistory as entry}
						<article class="history-card">
							<div class="history-header">
								<span class="history-exercise">{entry.exercise} - Set {entry.setNumber}</span>
								<span class="history-date">{formatTimestamp(entry.timestamp)}</span>
							</div>
							<div class="history-set">{entry.weight} kg × {entry.reps} reps</div>
						</article>
					{/each}
				</section>
			{/if}
		</div>
	{/if}

	<div
		class={`rest-timer ${restTimerStatus !== 'idle' ? 'active' : ''} ${restTimerStatus}`}
		aria-live="polite"
	>
		{restTimerLabel}
	</div>
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

	.history-section {
		margin-top: 30px;
	}

	.history-title {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 15px;
		color: #333;
	}

	.history-card {
		background: white;
		border-radius: 12px;
		margin-bottom: 10px;
		padding: 15px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}

	.history-exercise {
		font-weight: 600;
		color: #333;
	}

	.history-date {
		font-size: 13px;
		color: #999;
	}

	.history-set {
		font-size: 14px;
		color: #666;
		padding: 4px 0;
	}

	.rest-timer {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		background: #007aff;
		color: white;
		padding: 15px 30px;
		border-radius: 50px;
		font-size: 24px;
		font-weight: 600;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 1000;
		display: none;
		min-width: 120px;
		text-align: center;
	}

	.rest-timer.active {
		display: block;
	}

	.rest-timer.warning {
		background: #ff9500;
	}

	.rest-timer.done {
		background: #4caf50;
	}
</style>
