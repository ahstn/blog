"""Export published v4.1 rows. Run with the locked harness-bench Python environment.

uv run --project /path/to/harness-bench --locked python -B scripts/export-tb41.py /path/to/harness-bench
"""

import argparse
import json
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path
from tempfile import TemporaryDirectory

HARNESSES = {
    "claude-code": "Claude Code", "copilot": "Copilot", "omp": "OMP",
    "opencode-v2": "OpenCode v2", "pi": "Pi",
}
DESCRIPTIONS = {
    "batched-eval-parity": "Make batched evaluation match the single-example model while preserving the CLI, data format and prompts.",
    "bun-sourcemap-leak": "Repair the Bun release pipeline so it preserves public behavior without shipping private source files or provenance.",
    "cargo-flight-dispatch": "Correct a cargo flight planner's fuel, weight and approach limits.",
    "embedding-drift-monitor": "Repair the statistical tests and alert logic for stable and drifting embedding windows.",
    "foodstuff-beta-activity": "Calculate detector efficiency, detection limits and beta activity in a food sample from measured data.",
    "formal-crypto": "Reconstruct a synthetic plaintext from benchmark inputs for an academic cipher using Sage.",
    "freecad-platform-drawing": "Recreate a part from an engineering drawing as a FreeCAD model.",
    "html-js-filter": "Remove executable JavaScript from HTML while keeping safe markup and attributes.",
    "layout-config-recreation2": "Recreate a graphic layout from its reference image and component assets.",
    "legacy-utility-triage": "Resolve an electric utility's billing exceptions using a local operating manual.",
    "mvcc-lsm-compaction": "Repair post-crash data visibility in a model of an MVCC storage engine.",
    "nextjs-performance": "Improve the performance and responsiveness of a Next.js warehouse app.",
    "ontology-kg-querying": "Map railway reports into an OWL ontology and answer questions from the resulting knowledge graph.",
    "pretrain-shard-corruption": "Diagnose corrupted pretraining data that raises a model's validation loss.",
    "production-planning": "Build a five-day rolling production plan from the supplied databases and constraints.",
    "react-lead-form": "Repair a shared lead form and submission pipeline, from validation to ledger reconciliation and CRM export.",
    "retro-console-soc": "Implement an 8-bit game console system-on-chip in synthesizable Verilog.",
    "risk-scorer-replay": "Rebuild a legacy model-risk scoring report and its parity audit.",
    "roy-polymorph-cn": "Predict nitrile stretch wavenumbers from crystal geometry and color for ROY polymorphs.",
    "satb-audio-transcription": "Transcribe a four-part chorale from audio to MusicXML.",
    "session-window-debug": "Correct event grouping, aggregate output and state cleanup in a session window processor.",
    "sglang-qwen-burst": "Restore parity between speculative and baseline decoding in a local SGLang setup.",
    "sound-change-cascade": "Recover the ordered sound changes that map a proto-language to its modern forms.",
    "vba-userform-port": "Port a legacy Excel/VBA user form and workflow to a web app.",
    "wal-recovery-ordering": "Repair write-ahead log recovery so updates replay in the correct order.",
}


def export(repo, revision):
    sys.path.insert(0, str(repo))
    from tools import readme_tables as tables
    from tools.tb4_best_of_three import best_row, duration, lower_bound, pair_rows, token_source_bound
    from tools.tb4_refresh_publish import tracked_projection

    def git(*args):
        return subprocess.check_output(["git", "-C", str(repo), *args])

    revision = git("rev-parse", "--verify", revision + "^{commit}").decode().strip()
    tracked = set(git("ls-tree", "-r", "--name-only", "-z", revision).decode().split("\0")) - {""}
    with TemporaryDirectory() as temp:
        projection = Path(temp)
        tracked_projection(projection, "README.md", tracked, lambda name: git("show", f"{revision}:{name}"))
        root = projection / "results"
        winners = {}
        for spec, data, _ in tables._report_sources(root):
            for row in data.get("pairs", []):
                if not tables.is_tb41_task(row["task"]):
                    continue
                pair = tables._best_pair(row, data, publication_root=root / spec.cohort)
                if pair is None:
                    continue
                key = pair["task"], pair["agent"], pair["harness_version"]
                rank = tables._source_rank(spec.cohort, pair, data)
                if key not in winners or rank >= winners[key][0]:
                    winners[key] = rank, spec, data, pair

        published = (projection / "README.md").read_text().split("<!-- tb41-task-results:start -->")[1]
        published = published.split("<!-- tb41-task-results:end -->")[0]
        expected = Counter(tables._normalized_row(row) for table in tables.tables(published.splitlines()) for row in table.rows)
        actual = Counter(tables._normalized_row(pair_rows(spec, data, [pair])[0])
                         for _, spec, data, pair in winners.values())
        if actual != expected:
            raise ValueError("Export must reproduce every published v4.1 row")

        results = defaultdict(list)
        for (task, agent, version), (_, spec, _, pair) in sorted(winners.items()):
            best = best_row(pair)
            first = min(pair["samples"], key=lambda attempt: attempt["attempt"])
            metrics = best["metrics"]
            results[task.removesuffix("-v4-1")].append({
                "harness": HARNESSES[agent], "version": version,
                "score": pair["best_of_n_fractional_score"] * 100,
                "first_score": first["score"] * 100, "first_attempt": first["attempt"],
                "best_attempt": pair["best_attempt_index"], "attempts": pair["attempts_run"],
                "passes": pair["official_successes"], "agent_time": duration(metrics["wall_time_seconds"]),
                "total_time": duration(metrics["trial_time_seconds"]), "cached_tokens": metrics["cached_input_tokens"],
                "input_tokens": metrics["input_tokens"], "total_tokens": metrics["total_tokens"],
                "price": best["reference_price_usd"], "lower_bound": bool(lower_bound(best) or token_source_bound(spec, best)),
                "escaped": bool(pair["escaped"]), "cohort": spec.cohort,
            })
    return [{"id": task, "description": DESCRIPTIONS[task], "revision": revision, "results": rows}
            for task, rows in results.items()]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("benchmark_repo", type=Path)
    parser.add_argument("--revision", default="HEAD")
    args = parser.parse_args()
    sys.stdout.write(json.dumps(export(args.benchmark_repo.resolve(), args.revision), indent=2) + "\n")


if __name__ == "__main__":
    main()
