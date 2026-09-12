/**
 * Mirrors the permission hierarchy in the core library's
 * `src/auth/permissions.ts` (write implies read, publish implies write and
 * read - pages only, media's view gate is intentionally independent).
 * Admin-ui doesn't import the library package at runtime (it's a
 * pre-built SPA shipped alongside it, decoupled from any one consumer's
 * version), so this stays a small local duplicate, same pattern already
 * used for the `PAGE_PERMISSIONS` label lists.
 */
const PERMISSION_IMPLICATIONS: Record<string, string[]> = {
	"cms:pages:write": ["cms:pages:read"],
	"cms:pages:publish": ["cms:pages:write", "cms:pages:read"],
};

/** Every permission implied by holding `permission` (not including itself). */
export function impliedByPermission(permission: string): string[] {
	return PERMISSION_IMPLICATIONS[permission] ?? [];
}

/** Expands `permissions` to also include everything each one implies. */
export function expandImpliedPermissions(permissions: string[]): string[] {
	const result = new Set(permissions);
	for (const p of permissions) {
		for (const implied of impliedByPermission(p)) result.add(implied);
	}
	return [...result];
}
