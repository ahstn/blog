/**
 * Screenshot previews shown when hovering an ADE's name, keyed by entry id.
 * Files live in src/assets/ades/<id>.webp and are fetched/resized by
 * `pnpm ades:preview <id> <image-url>` (scripts/ade-preview.mjs).
 */
const files = import.meta.glob<string>("../assets/ades/*.webp", {
	eager: true,
	query: "?url",
	import: "default",
});

const PREVIEWS: Record<string, string> = Object.fromEntries(
	Object.entries(files).map(([path, url]) => [path.split("/").pop()!.replace(/\.webp$/, ""), url]),
);

export const previewUrl = (id: string): string | undefined => PREVIEWS[id];
