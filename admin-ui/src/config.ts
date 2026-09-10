export interface CMSAdminConfig {
	apiBasePath: string;
	authBasePath: string;
	basePath: string;
	/** Base URL of the site that renders pages, e.g. `https://example.com`. Unset hides the per-page "open in new tab" link - see `adminPanelPlugin`'s `siteUrl` option. */
	siteUrl?: string;
}

declare global {
	interface Window {
		__CMS_ADMIN_CONFIG__?: CMSAdminConfig;
	}
}

const DEFAULT_CONFIG: CMSAdminConfig = {
	apiBasePath: "/cms",
	authBasePath: "/api/auth",
	basePath: "/admin",
};

export function getConfig(): CMSAdminConfig {
	return { ...DEFAULT_CONFIG, ...window.__CMS_ADMIN_CONFIG__ };
}
