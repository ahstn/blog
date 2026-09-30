// Agent logos from Lobe Icons (https://icons.lobehub.com), via the static SVG
// package so no React runtime is needed. Coloured variants are used where
// Lobe ships one; mono icons use currentColor and follow the theme.
// Explicit imports (not a glob) so only these files end up in the bundle.
import amp from "@lobehub/icons-static-svg/icons/amp-color.svg?raw";
import antigravity from "@lobehub/icons-static-svg/icons/antigravity-color.svg?raw";
import claudeCode from "@lobehub/icons-static-svg/icons/claudecode-color.svg?raw";
import codex from "@lobehub/icons-static-svg/icons/codex-color.svg?raw";
import cursor from "@lobehub/icons-static-svg/icons/cursor.svg?raw";
import geminiCli from "@lobehub/icons-static-svg/icons/geminicli-color.svg?raw";
import githubCopilot from "@lobehub/icons-static-svg/icons/githubcopilot.svg?raw";
import grok from "@lobehub/icons-static-svg/icons/grok.svg?raw";
import kimi from "@lobehub/icons-static-svg/icons/kimi-color.svg?raw";
import opencode from "@lobehub/icons-static-svg/icons/opencode.svg?raw";
import pi from "@lobehub/icons-static-svg/icons/pi.svg?raw";

/** Keyed by the agent names used in src/data/agentic-dev-envs.yml. */
const AGENT_ICONS: Record<string, string> = {
	Amp: amp,
	Antigravity: antigravity,
	"Claude Code": claudeCode,
	Codex: codex,
	"Copilot CLI": githubCopilot,
	"Cursor CLI": cursor,
	"Gemini CLI": geminiCli,
	"Grok Build": grok,
	"Kimi CLI": kimi,
	OpenCode: opencode,
	Pi: pi,
	// OMP (Oh My Pi), Droid and Aider have no Lobe icon yet; they fall back
	// to a lettered badge.
};

/**
 * Inline SVG markup for an agent, or undefined if there's no icon. The SVG's
 * <title> is stripped: the wrapper carries the accessible name and tooltip.
 */
export function agentIcon(name: string): string | undefined {
	return AGENT_ICONS[name]?.replace(/<title>.*?<\/title>/, "");
}

/** Agents shown first, in this order; the rest keep their data order. */
const PRIORITY = ["Codex", "Claude Code", "OpenCode", "Pi", "OMP", "Copilot CLI"];

export function sortAgents(agents: string[]): string[] {
	const rank = (a: string) => {
		const i = PRIORITY.indexOf(a);
		return i === -1 ? PRIORITY.length : i;
	};
	// Array.prototype.sort is stable, so unprioritised agents keep their order.
	return [...agents].sort((a, b) => rank(a) - rank(b));
}
