// Lucide icons for each feature tag. Mono, so they follow the theme via
// currentColor.
import Cloud from "@lucide/astro/icons/cloud";
import FileDiff from "@lucide/astro/icons/file-diff";
import GitBranch from "@lucide/astro/icons/git-branch";
import Globe from "@lucide/astro/icons/globe";
import MonitorSmartphone from "@lucide/astro/icons/monitor-smartphone";
import Puzzle from "@lucide/astro/icons/puzzle";
import Smartphone from "@lucide/astro/icons/smartphone";
import SquareKanban from "@lucide/astro/icons/square-kanban";
import SquareTerminal from "@lucide/astro/icons/square-terminal";
import Workflow from "@lucide/astro/icons/workflow";
import { FEATURES } from "./ades";

type Feature = (typeof FEATURES)[number];

export const FEATURE_ICONS: Record<Feature, typeof Cloud> = {
	worktrees: GitBranch,
	kanban: SquareKanban,
	"remote-control": MonitorSmartphone,
	automations: Workflow,
	plugins: Puzzle,
	browser: Globe,
	"diff-review": FileDiff,
	terminal: SquareTerminal,
	"mobile-app": Smartphone,
	"cloud-sandboxes": Cloud,
};

/** Features in canonical FEATURES order, so icons line up across rows. */
export const sortFeatures = (features: readonly Feature[]): Feature[] =>
	FEATURES.filter((f) => features.includes(f));
