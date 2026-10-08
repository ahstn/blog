// Shared constants and formatting for the Harness Bench page.

import type { BenchResult, BenchTask } from "../content.config";

/**
 * Harnesses in display order. The order also fixes each harness's chart
 * colour slot (--series-1 to --series-5), so a harness keeps its colour
 * whatever is filtered.
 */
export const HARNESSES = ["Claude Code", "Copilot", "OMP", "OpenCode v2", "Pi"] as const;
export type Harness = (typeof HARNESSES)[number];

export const MODEL = "deepseek/deepseek-v4.1-flash";
export const SOURCE_URL = "https://github.com/ahstn/harness-bench/tree/feat/resuming-tb4-evals";
/** The README's consolidated TB4 task tables, one section per task. */
export const README_URL = "https://github.com/ahstn/harness-bench/blob/feat/resuming-tb4-evals/README.md";
/** Newest cohort in src/data/harness-bench.yml; bump when regenerating it. */
export const LAST_RUN = "2026-10-06";

/** GitHub's anchor for a task's README heading, "<id> (best of three)". */
export const taskReportUrl = (id: string) => `${README_URL}#${id}-best-of-three`;

export const seriesSlot = (harness: Harness) => HARNESSES.indexOf(harness) + 1;
export const seriesColor = (harness: Harness) => `var(--series-${seriesSlot(harness)})`;

/** Numeric compare of dotted versions: 2.0.18 > 2.0.3. */
export function compareVersions(a: string, b: string): number {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff) return diff;
	}
	return 0;
}

export const formatScore = (score: number) => `${score.toFixed(2)}%`;

// null: no captured metric for the selected attempt.
export const formatTokens = (n: number | null, lowerBound: boolean) =>
	n === null ? "N/A" : `${lowerBound ? "≥" : ""}${n.toLocaleString("en-GB")}`;

export const formatPrice = (usd: number | null, lowerBound: boolean) =>
	usd === null ? "N/A" : `${lowerBound ? "≥" : ""}$${usd.toFixed(4)}`;

export interface PassRecord {
	attempts: number;
	passes: number;
}

export const formatPass = ({ attempts, passes }: PassRecord) => `${passes}/${attempts}`;

// Table rows. Per-task tables and the aggregate table share one row shape.

/**
 * When a row shows, relative to the "all versions" toggle: "default" rows
 * show only while it's off, "all" rows only while it's on, and rows without
 * a view always show.
 */
export type RowView = "default" | "all";

export interface BenchRow {
	harness: Harness;
	version: string;
	score: number;
	scoreNote?: string;
	passes: number;
	attempts: number;
	agentTime: string;
	totalTime: string;
	cachedTokens: number | null;
	totalTokens: number | null;
	price: number | null;
	lowerBound: boolean;
	escaped: boolean;
	view?: RowView;
}

const rank = (h: Harness) => HARNESSES.indexOf(h);

/** One task's results: harness order, newest version first. */
export function taskRows(task: BenchTask): BenchRow[] {
	return [...task.results]
		.sort((a, b) => rank(a.harness) - rank(b.harness) || compareVersions(b.version, a.version))
		.map((r) => ({
			harness: r.harness,
			version: r.version,
			score: r.score,
			scoreNote: `attempt ${r.best_attempt} of ${r.attempts}`,
			passes: r.passes,
			attempts: r.attempts,
			agentTime: r.agent_time,
			totalTime: r.total_time,
			cachedTokens: r.cached_tokens,
			totalTokens: r.total_tokens,
			price: r.price,
			lowerBound: r.lower_bound,
			escaped: r.escaped,
		}));
}

/** "m:ss" clock (minutes may exceed 59) to seconds. */
const clockSeconds = (clock: string) => {
	const [m, s] = clock.split(":").map(Number);
	return m * 60 + s;
};

/** Seconds to "8h 43m 41s", dropping leading zero units. */
export function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Mean score, summed passes/attempts, and totals for time, tokens and price.
 * The version is the newest one included. Missing metrics are skipped, which
 * makes those totals lower bounds.
 */
function aggregate(harness: Harness, results: BenchResult[], view?: RowView): BenchRow {
	const sum = (f: (r: BenchResult) => number | null) => results.reduce((n, r) => n + (f(r) ?? 0), 0);
	const versions = [...new Set(results.map((r) => r.version))].sort((a, b) => compareVersions(b, a));
	return {
		harness,
		version: versions[0],
		score: sum((r) => r.score) / results.length,
		scoreNote: `mean of ${results.length} task${results.length === 1 ? "" : "s"}`,
		passes: sum((r) => r.passes),
		attempts: sum((r) => r.attempts),
		agentTime: formatDuration(sum((r) => clockSeconds(r.agent_time))),
		totalTime: formatDuration(sum((r) => clockSeconds(r.total_time))),
		cachedTokens: sum((r) => r.cached_tokens),
		totalTokens: sum((r) => r.total_tokens),
		price: sum((r) => r.price),
		lowerBound: results.some((r) => r.lower_bound || r.total_tokens === null || r.price === null),
		escaped: false,
		view,
	};
}

/**
 * Aggregate rows across every task, following the chart's version logic.
 * By default each harness gets one row built from its newest version on
 * each task (as the chart's default bars are). With all versions on, each
 * harness version gets a row over the tasks it ran. When the default row is
 * exactly one version's row, it's a single always-visible row.
 */
export function aggregateRows(tasks: BenchTask[]): BenchRow[] {
	return HARNESSES.flatMap((harness) => {
		const perTask = tasks.map((t) => t.results.filter((r) => r.harness === harness));
		const latest = perTask
			.map((rs) => rs.sort((a, b) => compareVersions(b.version, a.version))[0])
			.filter((r): r is BenchResult => r !== undefined);
		if (latest.length === 0) return [];

		const versions = [...new Set(perTask.flat().map((r) => r.version))].sort((a, b) =>
			compareVersions(b, a),
		);
		const byVersion = versions.map((v) => perTask.flat().filter((r) => r.version === v));
		const same = (rs: BenchResult[]) => rs.length === latest.length && rs.every((r) => latest.includes(r));

		if (byVersion.some(same)) {
			return byVersion.map((rs) => aggregate(harness, rs, same(rs) ? undefined : "all"));
		}
		return [aggregate(harness, latest, "default"), ...byVersion.map((rs) => aggregate(harness, rs, "all"))];
	});
}
