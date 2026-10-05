/** Resolved media reference from getSiteSettings() */
export interface MediaReference {
	mediaId: string;
	alt?: string;
	url?: string;
}

export interface BlogSiteIdentitySettings {
	title?: string;
	tagline?: string;
	logo?: MediaReference;
	favicon?: MediaReference;
}

const DEFAULT_SITE_TITLE = "My Blog";
const DEFAULT_SITE_TAGLINE = "Thoughts, stories, and ideas.";
const DEFAULT_FAVICON = "/favicon.svg";

export function resolveBlogSiteIdentity(settings?: BlogSiteIdentitySettings) {
	return {
		siteTitle: settings?.title ?? DEFAULT_SITE_TITLE,
		siteTagline: settings?.tagline ?? DEFAULT_SITE_TAGLINE,
		siteLogo: settings?.logo?.url ? settings.logo : null,
		siteFavicon: settings?.favicon?.url ?? DEFAULT_FAVICON,
	};
}

// Browser tab titles read "<page> | Adam Houston", independent of the site
// name in Site Settings. Pages without their own title use the fallback.
export const TITLE_SUFFIX = "Adam Houston";
const FALLBACK_PAGE_TITLE = "Personal";

export function documentTitle(title?: string | null) {
	const suffix = ` | ${TITLE_SUFFIX}`;
	if (title?.endsWith(suffix)) return title;
	return `${title || FALLBACK_PAGE_TITLE}${suffix}`;
}
