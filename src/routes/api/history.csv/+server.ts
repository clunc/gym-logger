import { text } from '@sveltejs/kit';
import { readHistory } from '$lib/server/historyStore';
import type { RequestHandler } from './$types';

function toCsv(rows: { exercise: string; setNumber: number; weight: number; bodyweight?: number; reps: number; timestamp: string }[]) {
	const header = 'exercise,setNumber,weight,bodyweight,reps,timestamp';
	const lines = rows.map((row) =>
		[
			row.exercise,
			row.setNumber.toString(),
			row.weight.toString(),
			Number.isFinite(row.bodyweight ?? NaN) ? (row.bodyweight as number).toString() : '',
			row.reps.toString(),
			row.timestamp
		].join(',')
	);

	return [header, ...lines].join('\n');
}

export const GET: RequestHandler = async () => {
	const history = await readHistory();
	return text(toCsv(history), {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': 'attachment; filename="history.csv"'
		}
	});
};
