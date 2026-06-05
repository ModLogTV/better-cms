export const CMS_PERMISSIONS = {
	TRANSLATIONS_READ: "cms:translations:read",
	TRANSLATIONS_WRITE: "cms:translations:write",
	LOCALES_READ: "cms:locales:read",
	LOCALES_WRITE: "cms:locales:write",
	LOCALES_DELETE: "cms:locales:delete",
	PAGES_READ: "cms:pages:read",
	PAGES_WRITE: "cms:pages:write",
	PAGES_PUBLISH: "cms:pages:publish",
	MEDIA_UPLOAD: "cms:media:upload",
	MEDIA_DELETE: "cms:media:delete",
	ADMIN_READ: "cms:admin:read",
	USERS_MANAGE: "cms:users:manage",
	GROUPS_MANAGE: "cms:groups:manage",
} as const;

export type CMSPermission = (typeof CMS_PERMISSIONS)[keyof typeof CMS_PERMISSIONS];

/** All hard-coded permission strings. Useful for seeding an admin role. */
export const ALL_CMS_PERMISSIONS: CMSPermission[] = Object.values(CMS_PERMISSIONS);

/** Wildcard that grants every CMS permission. */
export const CMS_WILDCARD_PERMISSION = "cms:*" as const;

/**
 * Returns true if `userPerms` satisfies `required`.
 * A wildcard entry ("cms:*") grants all permissions.
 */
export function hasPermission(opts: {
	userPerms: readonly string[];
	required: CMSPermission;
}): boolean {
	return opts.userPerms.includes(CMS_WILDCARD_PERMISSION) || opts.userPerms.includes(opts.required);
}

/** Returns true if `userPerms` satisfies every permission in `required`. */
export function hasAllPermissions(opts: {
	userPerms: readonly string[];
	required: readonly CMSPermission[];
}): boolean {
	return opts.required.every((p) => hasPermission({ userPerms: opts.userPerms, required: p }));
}

/** Returns true if `userPerms` satisfies at least one permission in `required`. */
export function hasAnyPermission(opts: {
	userPerms: readonly string[];
	required: readonly CMSPermission[];
}): boolean {
	return opts.required.some((p) => hasPermission({ userPerms: opts.userPerms, required: p }));
}
