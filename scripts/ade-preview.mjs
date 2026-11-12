#!/usr/bin/env node
/**
 * Fetch an ADE screenshot and save it as the hover preview for its table row:
 * src/assets/ades/<id>.webp, at most 1200px wide (2x the largest display
 * size), quality 80.
 *
 * Usage: pnpm ades:preview <id> <image-url-or-path> [--frame=N]
 *   A local path (e.g. a browser screenshot) works as well as a URL.
 *   --frame: for animated images, which frame to keep (default 0).
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { parse } from "yaml";

const args = process.argv.slice(2);
const [id, url] = args.filter((a) => !a.startsWith("--"));
const frame = Number(args.find((a) => a.startsWith("--frame="))?.slice(8) ?? 0);
if (!id || !url) {
	console.error("usage: pnpm ades:preview <id> <image-url-or-path> [--frame=N]");
	process.exit(1);
}

const data = parse(readFileSync(new URL("../src/data/agentic-dev-envs.yml", import.meta.url), "utf8"));
if (!data.some((ade) => ade.id === id)) {
	console.error(`unknown id "${id}" (see src/data/agentic-dev-envs.yml)`);
	process.exit(1);
}

async function load(source) {
	if (existsSync(source)) return readFileSync(source);
	const res = await fetch(source);
	if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

const dir = fileURLToPath(new URL("../src/assets/ades/", import.meta.url));
mkdirSync(dir, { recursive: true });
const out = `${dir}${id}.webp`;
const info = await sharp(await load(url), { page: frame })
	.resize({ width: 1200, withoutEnlargement: true })
	.webp({ quality: 80 })
	.toFile(out);
console.log(`${id}: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`);
