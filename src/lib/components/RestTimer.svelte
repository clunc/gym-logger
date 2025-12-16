<script lang="ts">
	export let status: 'idle' | 'active' | 'warning' | 'done' = 'idle';
	export let label: string;
</script>

{#if status !== 'idle'}
	<div class={`rest-timer ${status}`} aria-live="polite">
		{label}
	</div>
{/if}

<style>
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
		min-width: 120px;
		text-align: center;
	}

	.rest-timer.warning {
		background: #ff9500;
	}

	.rest-timer.done {
		background: #4caf50;
	}
</style>
