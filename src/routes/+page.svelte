<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import ExerciseCard from '$lib/components/ExerciseCard.svelte';
	import HistoryList from '$lib/components/HistoryList.svelte';
	import RestTimer from '$lib/components/RestTimer.svelte';
	import { appendHistory, deleteHistoryEntry, fetchHistory } from '$lib/api/history';
	import {
		createSession,
		getNextSessionProgression,
		REST_SECONDS,
		todayString,
		workoutTemplate
	} from '$lib/workout';
	import type { HistoryEntry, ProgressionAdvice, SessionExercise } from '$lib/types';

	let history: HistoryEntry[] = [];
	let currentSession: SessionExercise[] = [];
	let restTimeRemaining = REST_SECONDS;
	let restTimerStatus: 'idle' | 'active' | 'warning' | 'done' = 'idle';
	let restTimerInterval: ReturnType<typeof setInterval> | null = null;
	let restHideTimeout: ReturnType<typeof setTimeout> | null = null;
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let ready = false;
	let loadError = '';
	let totalHolds = 0;
	let completedHolds = 0;
	let todayProgress = 0;
	let streakCount = 0;
	let weeklyTargetMet = false;
	let hasToday = false;
	let monthlyAccordance = 0;
	let monthlyPlannedWorkouts = 0;
	let monthlyWorkouts = 0;
	let todaySickEntry: HistoryEntry | undefined;
	let nextProgressions: (ProgressionAdvice | null)[] = [];

	function computeNextProgressions() {
		return currentSession.map((exercise) => {
			const template = workoutTemplate.find((t) => t.name === exercise.name);
			if (!template) return null;
			return getNextSessionProgression(template, history);
		});
	}

	onMount(async () => {
		try {
			history = await fetchHistory();
		} catch (error) {
			console.error(error);
			loadError = 'Could not load history. Changes will not be saved.';
		} finally {
			currentSession = createSession(history);
			ready = true;
			pollInterval = setInterval(syncHistory, 15000);
		}
	});

	onDestroy(() => {
		if (restTimerInterval) clearInterval(restTimerInterval);
		if (restHideTimeout) clearTimeout(restHideTimeout);
		if (pollInterval) clearInterval(pollInterval);
	});

	async function syncHistory() {
		try {
			const latest = await fetchHistory();
			history = latest;
			currentSession = mergeInProgressSession(createSession(history));
		} catch (error) {
			console.error('Failed to refresh history', error);
			loadError = 'Could not refresh history from server.';
		}
	}

	function adjustWeight(exerciseIdx: number, setIdx: number, delta: number) {
		const set = currentSession[exerciseIdx].sets[setIdx];
		if (set.completed) return;

		const next = Math.max(0, (set.weight || 0) + delta);
		set.weight = Number(next.toFixed(1));
		currentSession = [...currentSession];
	}

	function setWeightFromInput(exerciseIdx: number, setIdx: number, value: number | null) {
		const set = currentSession[exerciseIdx].sets[setIdx];
		if (set.completed) return;

		set.weight = value === null ? NaN : value;
		currentSession = [...currentSession];
	}

	function adjustReps(exerciseIdx: number, setIdx: number, delta: number) {
		const set = currentSession[exerciseIdx].sets[setIdx];
		if (set.completed) return;

		set.reps = Math.max(0, (set.reps || 0) + delta);
		currentSession = [...currentSession];
	}

	function setRepsFromInput(exerciseIdx: number, setIdx: number, value: number | null) {
		const set = currentSession[exerciseIdx].sets[setIdx];
		if (set.completed) return;

		set.reps = value === null ? NaN : value;
		currentSession = [...currentSession];
	}

	async function logSet(exerciseIdx: number, setIdx: number) {
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
			try {
				await appendHistory([entry]);
				await syncHistory();
			} catch (error) {
				console.error(error);
				loadError = 'Could not save history. Changes will not be saved.';
			}
		}
		startRestTimer();
	}

	async function undoSet(exerciseIdx: number, setIdx: number) {
		const exercise = currentSession[exerciseIdx];
		const set = exercise.sets[setIdx];
		if (!set.completed || !set.timestamp) return;

		const entry = {
			exercise: exercise.name,
			setNumber: set.setNumber,
			timestamp: set.timestamp
		};

		try {
			await deleteHistoryEntry(entry);
		} catch (error) {
			console.error(error);
			loadError = 'Could not delete entry. History remains unchanged.';
			return;
		}

		const index = history.findIndex(
			(h) =>
				h.exercise === entry.exercise &&
				h.setNumber === entry.setNumber &&
				h.timestamp === entry.timestamp
		);

		if (index !== -1) {
			history.splice(index, 1);
			history = [...history];
		}

		set.completed = false;
		set.timestamp = null;
		currentSession = [...currentSession];

		if (!loadError) {
			await syncHistory();
		}
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

	function mergeInProgressSession(newSession: SessionExercise[]): SessionExercise[] {
		return newSession.map((exercise) => {
			const current = currentSession.find((e) => e.name === exercise.name);
			if (!current) return exercise;

			const sets = exercise.sets.map((set) => {
				const currentSet = current.sets.find((s) => s.setNumber === set.setNumber);
				if (!currentSet) return set;

				if (!set.completed && !currentSet.completed) {
					const weight = Number.isFinite(currentSet.weight) ? currentSet.weight : set.weight;
					const reps = Number.isFinite(currentSet.reps) ? currentSet.reps : set.reps;
					return { ...set, weight, reps };
				}

				return set;
			});

			return { ...exercise, sets };
		});
	}

	$: {
		// fallback reactive update to catch any other state changes
		currentSession;
		history;
		nextProgressions = computeNextProgressions();
	}

	$: todaysHistory = history.filter(
		(entry) => new Date(entry.timestamp).toDateString() === todayString()
	);

	$: todaySickEntry = history.find(
		(entry) =>
			(entry.type ?? 'workout') === 'sick' &&
			new Date(entry.timestamp).toDateString() === todayString()
	);

	async function logSickDay() {
		if (todaySickEntry) return;
		const entry: HistoryEntry = {
			type: 'sick',
			exercise: SICK_EXERCISE,
			setNumber: 0,
			weight: 0,
			reps: 0,
			timestamp: new Date().toISOString()
		};

		history = [entry, ...history];

		if (!loadError) {
			try {
				await appendHistory([entry]);
				await syncHistory();
			} catch (error) {
				console.error(error);
				loadError = 'Could not save sick day. Changes will not be saved.';
			}
		}
	}

	async function undoSickDay() {
		if (!todaySickEntry) return;

		try {
			await deleteHistoryEntry({
				exercise: todaySickEntry.exercise,
				setNumber: todaySickEntry.setNumber,
				timestamp: todaySickEntry.timestamp
			});
		} catch (error) {
			console.error(error);
			loadError = 'Could not delete sick day. History remains unchanged.';
			return;
		}

		history = history.filter(
			(h) =>
				!(
					h.exercise === todaySickEntry?.exercise &&
					h.setNumber === todaySickEntry?.setNumber &&
					h.timestamp === todaySickEntry?.timestamp
				)
		);

		if (!loadError) {
			await syncHistory();
		}
	}

	const WEEKLY_STREAK_TARGET = 2;
	const WEEKLY_PLANNED_WORKOUTS = 3;
	const SICK_EXERCISE = 'Sick Day';

	const dateKey = (timestamp: string) => new Date(timestamp).toDateString();
	const startOfWeek = (date: Date) => {
		const copy = new Date(date);
		const day = copy.getDay();
		const diffToMonday = (day + 6) % 7;
		copy.setHours(0, 0, 0, 0);
		copy.setDate(copy.getDate() - diffToMonday);
		return copy;
	};

	const weekKey = (date: Date) => startOfWeek(date).toDateString();

	$: {
		const allSets = currentSession.flatMap((exercise) => exercise.sets);
		completedHolds = allSets.filter((set) => set.completed).length;
		totalHolds = allSets.length;
		todayProgress = totalHolds === 0 ? 0 : Math.round((completedHolds / totalHolds) * 100);
	}

	$: {
		const dateSet = history.reduce((set, entry) => {
			set.add(dateKey(entry.timestamp));
			return set;
		}, new Set<string>());

		hasToday = dateSet.has(todayString());

		const weekCounts = Array.from(dateSet).reduce((map, day) => {
			const key = weekKey(new Date(day));
			map.set(key, (map.get(key) || 0) + 1);
			return map;
		}, new Map<string, number>());

		const today = new Date();
		const thisWeekKey = weekKey(today);
		const thisWeekCount = weekCounts.get(thisWeekKey) || 0;
		weeklyTargetMet = thisWeekCount >= WEEKLY_STREAK_TARGET;

		const orderedDates = Array.from(dateSet)
			.map((value) => new Date(value))
			.sort((a, b) => b.getTime() - a.getTime());

		let count = 0;
		let cursor = orderedDates[0];
		while (cursor && true) {
			const key = cursor.toDateString();
			if (!dateSet.has(key)) break;

			const weekOk = (weekCounts.get(weekKey(cursor)) || 0) >= WEEKLY_STREAK_TARGET;
			if (!weekOk) break;

			count += 1;
			const previous = new Date(cursor);
			previous.setDate(cursor.getDate() - 1);
			cursor = previous;
		}
		streakCount = count;

		const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
		const monthDates = Array.from(dateSet).filter((key) => {
			const date = new Date(key);
			return date.getMonth() === monthStart.getMonth() && date.getFullYear() === monthStart.getFullYear();
		});

		monthlyWorkouts = monthDates.length;

		const weeks: string[] = [];
		let weekCursor = new Date(startOfWeek(monthStart));
		while (weekCursor <= today) {
			weeks.push(weekKey(weekCursor));
			weekCursor.setDate(weekCursor.getDate() + 7);
		}
		const uniqueWeeks = Array.from(new Set(weeks));
		monthlyPlannedWorkouts = uniqueWeeks.length * WEEKLY_PLANNED_WORKOUTS;
		monthlyAccordance =
			monthlyPlannedWorkouts === 0
				? 0
				: Math.round((monthlyWorkouts / monthlyPlannedWorkouts) * 100);
	}

	$: restTimerLabel =
		restTimerStatus === 'done'
			? 'Ready!'
			: `${Math.floor(restTimeRemaining / 60)}:${String(restTimeRemaining % 60).padStart(2, '0')}`;
</script>

<svelte:head>
	<title>Gym Logger</title>
</svelte:head>

<div class="page">
	<nav class="navbar">
		<h1>💪 Gym Logger</h1>
		<div class="nav-badges">
			<div class={`pill streak ${weeklyTargetMet ? 'on' : 'off'}`}>
				<span class="pill-icon">{weeklyTargetMet ? '🔥' : '🕯️'}</span>
				<span class="pill-text">{streakCount} day{streakCount === 1 ? '' : 's'} streak</span>
			</div>
			<div class="pill neutral">
				<span class="pill-icon">📅</span>
				<span class="pill-text">{monthlyAccordance}% month</span>
			</div>
		</div>
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
			<div class="summary-cards">
				<div class="summary-card">
					<div class="card-label">Today</div>
					<div class="card-value">{todayProgress}%</div>
					<div class="card-sub">
						{completedHolds} / {totalHolds} holds
					</div>
				</div>
				<div class="summary-card">
					<div class="card-label">Streak</div>
					<div class="card-value">
						{streakCount} day{streakCount === 1 ? '' : 's'}
					</div>
					<div class="card-sub">
						{weeklyTargetMet ? 'Weekly rule met (2+ days logged)' : 'Log 2 days to protect streak'}
					</div>
				</div>
				<div class="summary-card">
					<div class="card-label">Monthly Accordance</div>
					<div class="card-value">{monthlyAccordance}%</div>
					<div class="card-sub">
						{monthlyWorkouts} / {monthlyPlannedWorkouts} planned workouts
					</div>
				</div>
			</div>
			{#each currentSession as exercise, exerciseIdx}
				<ExerciseCard
					{exercise}
					{exerciseIdx}
					nextProgression={nextProgressions[exerciseIdx]}
					onAdjustWeight={adjustWeight}
					onAdjustReps={adjustReps}
					onSetWeight={setWeightFromInput}
					onSetReps={setRepsFromInput}
					onLogSet={logSet}
					onUndoSet={undoSet}
				/>
			{/each}

			<HistoryList entries={todaysHistory} />
			<div class="sick-row">
				<button class={`sick-button ${todaySickEntry ? 'active' : ''}`} on:click={todaySickEntry ? undoSickDay : logSickDay}>
					{#if todaySickEntry}
						🤒 Sick leave active
					{:else}
						🚑 Mark today as sick leave
					{/if}
				</button>
			</div>
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
		background: linear-gradient(180deg, #f8fbff 0%, #f4f7fb 40%, #eef2f7 100%);
		padding-bottom: 120px;
		color: #0f172a;
	}

	.page {
		min-height: 100vh;
	}

	.navbar {
		background: #ffffff;
		color: #0f172a;
		padding: 14px 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08);
		border-bottom: 1px solid #e2e8f0;
	}

	.navbar h1 {
		font-size: 19px;
		font-weight: 700;
	}

	.nav-badges {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 600;
		background: #e2e8f0;
		color: #334155;
		box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
		border: 1px solid rgba(148, 163, 184, 0.4);
	}

	.pill.streak.on {
		background: #fff4e5;
		color: #b45309;
		border-color: #fed7aa;
	}

	.pill.streak.off {
		background: #e2e8f0;
		color: #475569;
		border-color: #cbd5e1;
	}

	.pill.neutral {
		background: #eef2ff;
		color: #4338ca;
		border-color: #c7d2fe;
	}

	.pill-icon {
		font-size: 16px;
		line-height: 1;
	}

	.pill-text {
		line-height: 1.1;
	}

	.content {
		padding: 16px 12px;
		max-width: 720px;
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

	.sick-row {
		display: flex;
		justify-content: flex-end;
		margin: 6px 0 10px;
	}

	.sick-button {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		border-radius: 10px;
		padding: 10px 12px;
		font-weight: 700;
		color: #0f172a;
		cursor: pointer;
		box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
		transition: transform 0.05s ease, box-shadow 0.1s ease;
		width: 100%;
		text-align: center;
	}

	.sick-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
	}

	.sick-button.active {
		background: #fef2f2;
		border-color: #fecdd3;
		color: #b91c1c;
	}

	.summary-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
		margin: 14px 0 18px;
	}

	.summary-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 14px 16px;
		box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
	}

	.card-label {
		color: #475569;
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 6px;
	}

	.card-value {
		font-size: 28px;
		font-weight: 800;
		color: #0f172a;
	}

	.card-sub {
		color: #64748b;
		font-size: 13px;
		margin-top: 4px;
	}

	@media (max-width: 540px) {
		.navbar h1 {
			font-size: 17px;
		}

		.navbar {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		.nav-badges {
			width: 100%;
			justify-content: flex-start;
			flex-wrap: wrap;
		}

		.content {
			padding: 14px 10px;
		}
	}
</style>
