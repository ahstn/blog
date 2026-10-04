import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { cloudflareEmail } from "@emdash-cms/cloudflare/plugins";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import webhookNotifier from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

// `astro check` / `astro build` start their own Vite instance, which
// re-optimises deps into the shared cache and deletes files a running dev
// server still references ("file does not exist ... optimize deps directory").
// Giving dev its own cache dir lets them run side by side.
const isDev = process.argv.includes("dev");

export default defineConfig({
	site: "https://ahstn.io",
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			// Canonical origin: passkeys, auth emails, and CSRF checks are bound to it.
			siteUrl: "https://ahstn.io",
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [
				formsPlugin(),
				// Magic links, invites, and account recovery. The sender domain
				// must be onboarded under Cloudflare Email Service > Email Sending.
				cloudflareEmail({
					from: { email: "noreply@mail.ahstn.io", name: "ahstn.io" },
					replyTo: "ahstn22@gmail.com",
				}),
			],
			sandboxed: [webhookNotifier],
			sandboxRunner: sandbox(),
			marketplace: "https://marketplace.emdashcms.com",
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-body",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
	vite: {
		cacheDir: isDev ? "node_modules/.vite-dev" : "node_modules/.vite",
	},
});
