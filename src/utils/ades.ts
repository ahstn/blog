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
	price: string | null;
	stars: number | null;
	source: string;
};
