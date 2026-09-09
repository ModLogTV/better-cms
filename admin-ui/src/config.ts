export interface CMSAdminConfig {
	apiBasePath: string;
	authBasePath: string;
	basePath: string;
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
