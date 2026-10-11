#!/usr/bin/env node
/**
 * Refresh GitHub-derived fields in src/data/agentic-dev-envs.yml:
 *
 * - `stars` / `stars_updated_at`: `stars_updated_at` only changes when the
 *   count changes, so re-running with no upstream movement produces no diff.
 * - `latest_release` ({ version, date }): the repo's latest stable release
 *   (GitHub excludes drafts and pre-releases), e.g. `desktop-v0.44.0` is
 *   stored as version `0.44.0`. Repos without releases are left untouched.
 *   An entry's `release_tag_prefix` narrows this to tags with that prefix.
 * - `last_commit`: date of the repo's most recent push (GitHub's `pushed_at`,
 *   which covers any branch, not just the default one).
 * - `archived`: written as `true` while the repo is archived, removed otherwise.
 *
 * Warns when a repo has been renamed or transferred (GitHub redirects the old
 * path, so the fetch still succeeds); update `repo:` by hand.
 *
 * Comments, ordering and every other field are preserved. Also lists entries
 * without a hover preview (src/assets/ades/<id>.webp); those are added by hand
 * with `pnpm ades:preview`, never fetched here.
 *
 * Auth: GITHUB_TOKEN / GH_TOKEN env var, falling back to `gh auth token`.
 * Required: two requests per repo soon exceeds the 60/h unauthenticated limit.
 * Usage: pnpm ades:update [--dry-run]
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

const FILE = fileURLToPath(new URL("../src/data/agentic-dev-envs.yml", import.meta.url));
const dryRun = process.argv.includes("--dry-run");

function token() {
	const env = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
	if (env) return env;
	try {
		return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim() || undefined;
	} catch {
		return undefined;
	}
}

const auth = token();
if (!auth) {
	console.error("error: no GitHub token. Set GITHUB_TOKEN / GH_TOKEN or run `gh auth login`.");
	process.exit(1);
}

/** GET a GitHub API path; resolves to undefined on 404. */
async function github(path) {
	const res = await fetch(`https://api.github.com/${path}`, {
		headers: {
			accept: "application/vnd.github+json",
			"x-github-api-version": "2022-11-28",
			authorization: `Bearer ${auth}`,
		},
	});
	if (res.status === 404) return undefined;
	if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
	return res.json();
}

async function fetchRepo(repo) {
	const data = await github(`repos/${repo}`);
	if (!data) throw new Error(`${repo}: not found`);
	return {
		fullName: data.full_name,
		stars: data.stargazers_count,
		lastCommit: data.pushed_at.slice(0, 10),
		archived: data.archived,
	};
}

/**
 * `tagPrefix` (the entry's `release_tag_prefix`) is for monorepos whose
 * "latest" release is a side package (e.g. `cli-v0.10.0`): it picks the newest
 * stable release whose tag starts with the prefix instead.
 */
async function fetchRelease(repo, tagPrefix) {
	const release = tagPrefix
		? (await github(`repos/${repo}/releases?per_page=100`))?.find(
				(r) => !r.draft && !r.prerelease && r.tag_name.startsWith(tagPrefix),
			)
		: await github(`repos/${repo}/releases/latest`);
	if (!release) return undefined;
	return {
		// Drop tag prefixes like "v" or "desktop-v".
		version: release.tag_name.replace(/^\D+/, ""),
		date: release.published_at.slice(0, 10),
	};
}

const doc = parseDocument(readFileSync(FILE, "utf8"));
const today = new Date().toISOString().slice(0, 10);
let changed = 0;
let failed = 0;
const renamed = [];

for (const item of doc.contents.items) {
	const repo = item.get("repo");
	if (!repo) continue;
	try {
		const [{ fullName, stars, lastCommit, archived }, release] = await Promise.all([
			fetchRepo(repo),
			fetchRelease(repo, item.get("release_tag_prefix")),
		]);

		if (fullName.toLowerCase() !== repo.toLowerCase()) renamed.push(`${repo} → ${fullName}`);

		const prevStars = item.get("stars");
		if (stars !== prevStars) {
			item.set("stars", stars);
			item.set("stars_updated_at", today);
			changed++;
			console.log(`${repo}: stars ${prevStars ?? "—"} → ${stars}`);
		}

		const prev = item.get("latest_release")?.toJSON();
		if (release && (release.version !== String(prev?.version) || release.date !== prev?.date)) {
			item.set("latest_release", doc.createNode(release));
			changed++;
			console.log(`${repo}: release ${prev?.version ?? "—"} → ${release.version} (${release.date})`);
		}

		const prevCommit = item.get("last_commit");
		if (lastCommit !== prevCommit) {
			item.set("last_commit", lastCommit);
			changed++;
			console.log(`${repo}: last commit ${prevCommit ?? "—"} → ${lastCommit}`);
		}

		if (archived !== item.has("archived")) {
			if (archived) item.set("archived", true);
			else item.delete("archived");
			changed++;
			console.log(`${repo}: ${archived ? "archived" : "unarchived"}`);
		}
	} catch (err) {
		failed++;
		console.error(`warn: ${err.message}`);
	}
}

if (renamed.length) {
	console.warn(`warn: renamed or transferred, update \`repo:\`: ${renamed.join(", ")}`);
}

const missingPreviews = doc.contents.items
	.map((item) => item.get("id"))
	.filter((id) => !existsSync(fileURLToPath(new URL(`../src/assets/ades/${id}.webp`, import.meta.url))));
if (missingPreviews.length) {
	console.log(`no preview (add with \`pnpm ades:preview <id> <image-url>\`): ${missingPreviews.join(", ")}`);
}

if (changed && !dryRun) writeFileSync(FILE, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
console.log(`${changed} updated, ${failed} failed${dryRun ? " (dry run)" : ""}`);
if (failed) process.exitCode = 1;
