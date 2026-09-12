/** Human-readable label per audit log `action` string - falls back to a prettified version of the raw action for anything not listed here. */
const AUDIT_ACTION_LABELS: Record<string, string> = {
	"group.created": "Group created",
	"group.updated": "Group updated",
	"group.deleted": "Group deleted",
	"group.membership.added": "Nested inside another group",
	"group.membership.removed": "Removed from a parent group",
	"user.permissions.updated": "User permissions updated",
	"user.group.added": "User added to group",
	"user.group.removed": "User removed from group",
	"pageGrant.added": "Page access granted",
	"pageGrant.removed": "Page access revoked",
	"mediaTagGrant.added": "Tag access granted",
	"mediaTagGrant.removed": "Tag access revoked",
};

export function formatAuditAction(action: string): string {
	if (action in AUDIT_ACTION_LABELS) return AUDIT_ACTION_LABELS[action];
	return action
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[._]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^./, (c) => c.toUpperCase());
}
