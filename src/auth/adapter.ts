export interface CMSAuthResult {
	authorized: boolean;
	permissions: string[];
	userId?: string;
}

export interface CMSAdminUser {
	email: string;
	name: string;
	password: string;
}

export interface CMSUserSummary {
	id: string;
	email: string;
	name: string;
	permissions: string[];
	groupIds: string[];
}

export interface CMSGroup {
	id: string;
	name: string;
	permissions: string[];
}

/** Optional management interface for user/group CRUD in the admin UI. */
export interface CMSAuthManagement {
	listUsers(): Promise<CMSUserSummary[]>;
	getUserPermissions(opts: { userId: string }): Promise<string[]>;
	setUserPermissions(opts: { userId: string; permissions: string[] }): Promise<void>;
	getUserGroups(opts: { userId: string }): Promise<CMSGroup[]>;
	addUserToGroup(opts: { userId: string; groupId: string }): Promise<void>;
	removeUserFromGroup(opts: { userId: string; groupId: string }): Promise<void>;
	listGroups(): Promise<CMSGroup[]>;
	createGroup(opts: { name: string; permissions: string[] }): Promise<CMSGroup>;
	updateGroup(opts: {
		id: string;
		name?: string;
		permissions?: string[];
	}): Promise<CMSGroup>;
	deleteGroup(opts: { id: string }): Promise<void>;
}

/**
 * Framework-agnostic auth adapter interface for better-cms.
 *
 * Implement this interface to plug in any auth system.
 * Built-in implementations: `tokenAuthAdapter`, `betterAuthCMSAdapter`.
 */
export interface CMSAuthAdapter {
	/**
	 * Verify an incoming request and return the resolved permissions.
	 * Called on every protected route.
	 */
	verifyRequest(
		headers: Record<string, string | undefined>,
	): Promise<CMSAuthResult>;

	/**
	 * Called by `createCMS()` when `initialAdminUser` is set.
	 * Upsert the admin user in the auth backend and grant wildcard permissions.
	 */
	upsertAdminUser?(user: CMSAdminUser): Promise<void>;

	/**
	 * Optional management interface for user/group CRUD.
	 * When present, the CMS will expose admin routes for user and group management.
	 */
	management?: CMSAuthManagement;
}
