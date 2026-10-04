// Worker entry: Astro's fetch handler plus EmDash's scheduled() handler, which
// the Cron Trigger in wrangler.jsonc drives. PluginBridge is the sandbox
// Durable Object, re-exported here so its binding resolves.
import handler from "@emdash-cms/cloudflare/worker";

export { PluginBridge } from "@emdash-cms/cloudflare/worker";

const CANONICAL_HOST = "ahstn.io";

type FetchArgs = Parameters<NonNullable<typeof handler.fetch>>;

export default {
	...handler,
	// Everything is served from the apex (passkeys are bound to siteUrl), so
	// www.ahstn.io redirects there.
	fetch(...[request, env, ctx]: FetchArgs) {
		const url = new URL(request.url);
		if (url.hostname === `www.${CANONICAL_HOST}`) {
			url.hostname = CANONICAL_HOST;
			return Response.redirect(url.toString(), 301);
		}
		return handler.fetch!(request, env, ctx);
	},
};
