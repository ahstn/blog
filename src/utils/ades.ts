export const PLATFORMS = ["macos", "windows", "linux", "web", "ios", "android"] as const;

export const PLATFORM_LABELS: Record<(typeof PLATFORMS)[number], string> = {
	macos: "macOS",
	windows: "Windows",
	linux: "Linux",
	web: "Web",
	ios: "iOS",
	android: "Android",
};

export const FEATURES = [
	"worktrees",
	"kanban",
	"remote-control",
	"automations",
	"plugins",
	"browser",
	"diff-review",
	"terminal",
	"mobile-app",
	"cloud-sandboxes",
] as const;

/**
 * Tech tags: the implementation language(s), then the UI layer. Each gets a
 * chip colour (roughly the language/project's own brand colour), as a
 * light-dark() pair so it stays legible in both themes.
 */
export const TECH = {
	// Languages
	TypeScript: "light-dark(#2f6db3, #6fa8ee)",
	Rust: "light-dark(#b0470f, #eb946a)",
	Go: "light-dark(#007a99, #4dc9e6)",
	Swift: "light-dark(#d4401c, #f58160)",
	// UI layers
	Electron: "light-dark(#3d7580, #7fc3cf)",
	Tauri: "light-dark(#9a6b00, #ffc54d)",
	GPUI: "light-dark(#6a45c2, #a88cf5)",
	Metal: "light-dark(#be2d6e, #f07aac)",
	Ratatui: "light-dark(#2e7d32, #72c476)",
} as const;

export type Tech = keyof typeof TECH;

/** "Actively maintained" means a release within this many months. */
export const MAINTAINED_MONTHS = 3;

/**
 * Whether the latest release (YYYY-MM-DD) falls inside the maintenance
 * window, or null if there's no release data to judge by.
 */
export function isMaintained(releaseDate: string | undefined, now = new Date()): boolean | null {
	if (!releaseDate) return null;
	const cutoff = new Date(now);
	cutoff.setUTCMonth(cutoff.getUTCMonth() - MAINTAINED_MONTHS);
	return releaseDate >= cutoff.toISOString().slice(0, 10);
}

export const featureLabel = (f: string) => f.replaceAll("-", " ");

export const sourceLabel = (ade: { open_source: boolean; license?: string }) =>
	ade.open_source ? (ade.license ?? "Open") : "Proprietary";

/** Table columns, in display order. `name` can't be hidden. */
export const COLUMNS = [
	{ key: "name", label: "Name", locked: true },
	{ key: "platforms", label: "Works on", hidden: true },
	{ key: "tech", label: "Tech" },
	{ key: "agents", label: "Agents" },
	{ key: "features", label: "Features" },
	{ key: "first-seen", label: "First seen" },
	{ key: "release", label: "Latest release" },
	{ key: "maintained", label: "Maintained", hidden: true },
	{ key: "price", label: "Price" },
	{ key: "stars", label: "Stars" },
	{ key: "source", label: "Source" },
] as const satisfies readonly { key: string; label: string; locked?: boolean; hidden?: boolean }[];

export type ColumnKey = (typeof COLUMNS)[number]["key"];

export const isColumnHiddenByDefault = (key: ColumnKey) =>
	COLUMNS.some((c) => c.key === key && "hidden" in c && c.hidden);

export type FilterFieldType = "text" | "multi" | "option" | "date" | "number";

export interface FilterField {
	key: ColumnKey;
	label: string;
	type: FilterFieldType;
	/** Name of an icon in the page's icon <template>. */
	icon: string;
	options?: { value: string; label: string }[];
}

/**
 * The values each filter field matches against. Serialised onto every table
 * row as `data-filter`; keys line up with FilterField.key.
 */
export type FilterRecord = {
	name: string;
	platforms: string[];
	tech: string[];
	agents: string[];
	features: string[];
	"first-seen": string | null;
	/** YYYY-MM of the latest release, matching the "date" filter format. */
	release: string | null;
	/** null when there's no release data (e.g. closed source). */
	maintained: boolean | null;
	price: string | null;
	stars: number | null;
	source: string;
};
