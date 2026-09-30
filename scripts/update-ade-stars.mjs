#!/usr/bin/env node
/**
 * Refresh GitHub star counts in src/data/agentic-dev-envs.yml.
 *
 * Only `stars` and `stars_updated_at` are touched; comments, ordering and
 * every other field are preserved. `stars_updated_at` only changes when the
 * count changes, so re-running with no upstream movement produces no diff.
 *
 * Auth: GITHUB_TOKEN / GH_TOKEN env var, falling back to `gh auth token`.
 * Usage: pnpm ades:update [--dry-run]
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

const FILE = fileURLToPath(new URL("../src/data/agentic-dev-envs.yml", import.meta.url));
const dryRun = process.argv.includes("--dry-run");

function token() {
	const env = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
	if (env) return env;
	try {
		return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
	} catch {
		return undefined; // unauthenticated: 60 req/h, fine for a small list
	}
}

async function fetchStars(repo, auth) {
	const res = await fetch(`https://api.github.com/repos/${repo}`, {
		headers: {
			accept: "application/vnd.github+json",
			"x-github-api-version": "2022-11-28",
			...(auth && { authorization: `Bearer ${auth}` }),
		},
	});
	if (!res.ok) throw new Error(`${repo}: HTTP ${res.status}`);
	return (await res.json()).stargazers_count;
}

const doc = parseDocument(readFileSync(FILE, "utf8"));
const auth = token();
const today = new Date().toISOString().slice(0, 10);
let changed = 0;
let failed = 0;

for (const item of doc.contents.items) {
	const repo = item.get("repo");
	if (!repo) continue;
	try {
		const stars = await fetchStars(repo, auth);
		const prev = item.get("stars");
		if (stars === prev) continue;
		item.set("stars", stars);
		item.set("stars_updated_at", today);
		changed++;
		console.log(`${repo}: ${prev ?? "—"} → ${stars}`);
	} catch (err) {
		failed++;
		console.error(`warn: ${err.message}`);
	}
}

if (changed && !dryRun) writeFileSync(FILE, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
console.log(`${changed} updated, ${failed} failed${dryRun ? " (dry run)" : ""}`);
if (failed) process.exitCode = 1;
