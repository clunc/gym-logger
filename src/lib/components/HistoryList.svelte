<script lang="ts">
	import type { HistoryEntry } from '$lib/types';
	import { formatTimestamp } from '$lib/workout';

	export let entries: HistoryEntry[] = [];
</script>

{#if entries.length > 0}
	<section class="history-section">
		<div class="history-title">Today's Sets</div>
		{#each entries as entry}
			<article class="history-card">
				<div class="history-header">
					{#if (entry.type ?? 'workout') === 'sick'}
						<span class="history-exercise sick">🤒 Sick Day</span>
					{:else if (entry.type ?? 'workout') === 'vacation'}
						<span class="history-exercise vacation">🏖️ Vacation</span>
					{:else}
						<span class="history-exercise">{entry.exercise} - Set {entry.setNumber}</span>
					{/if}
					<span class="history-date">{formatTimestamp(entry.timestamp)}</span>
				</div>
				{#if (entry.type ?? 'workout') === 'sick' || (entry.type ?? 'workout') === 'vacation'}
					<div class="history-set sick-note">Counts toward plan</div>
				{:else}
					<div class="history-set">{entry.weight} kg × {entry.reps} reps</div>
				{/if}
			</article>
		{/each}
	</section>
{/if}

<style>
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
		padding: 15px 16px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}

	.history-exercise {
		font-weight: 600;
		color: #333;
	}

	.history-exercise.sick {
		color: #b91c1c;
	}

	.history-exercise.vacation {
		color: #1d4ed8;
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

	.history-set.sick-note {
		color: #b91c1c;
		font-weight: 600;
	}

	@media (max-width: 540px) {
		.history-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.history-date {
			font-size: 12px;
		}
	}
</style>
