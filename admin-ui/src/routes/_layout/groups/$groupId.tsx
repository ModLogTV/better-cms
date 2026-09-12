import {
	IconChevronLeft,
	IconHistory,
	IconPlus,
	IconTag,
	IconTrash,
	IconUserCircle,
	IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmPopover } from "@/components/shared/ConfirmPopover";
import { GroupCombobox } from "@/components/shared/GroupCombobox";
import { PageTreePicker } from "@/components/shared/PageTreePicker";
import { PermissionPicker } from "@/components/shared/PermissionPicker";
import { UserCombobox } from "@/components/shared/UserCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	api,
	type CMSGroup,
	type GroupMembershipEdge,
	type MediaTagAction,
} from "@/lib/api";
import { formatAuditAction } from "@/lib/audit";
import {
	expandImpliedPermissions,
	impliedByPermission,
} from "@/lib/permissions";

export const Route = createFileRoute("/_layout/groups/$groupId")({
	component: GroupDetailPage,
});

const ALL_LOCALES = "__all__";

const PAGE_PERMISSIONS = [
	{ value: "cms:pages:read", label: "Read" },
	{ value: "cms:pages:write", label: "Write" },
	{ value: "cms:pages:publish", label: "Publish" },
];

const TAG_PERMISSIONS: { value: MediaTagAction; label: string }[] = [
	{ value: "view", label: "View" },
	{ value: "upload", label: "Upload" },
	{ value: "edit", label: "Edit" },
	{ value: "delete", label: "Delete" },
	{ value: "publish", label: "Publish" },
];

interface EffectivePermission {
	permission: string;
	source: string;
}

/**
 * BFS ancestor walk over the nesting graph, unioning each ancestor's
 * permissions - mirrors the backend's `expandGroupAncestors`, done here
 * client-side over already-fetched data so this is purely a read-only
 * preview (no extra endpoint needed).
 */
function computeEffectivePermissions(
	groupId: string,
	groups: CMSGroup[],
	edges: GroupMembershipEdge[],
): EffectivePermission[] {
	const byId = new Map(groups.map((g) => [g.id, g]));
	const seen = new Set<string>();
	const results: EffectivePermission[] = [];

	const self = byId.get(groupId);
	if (self) {
		for (const p of expandImpliedPermissions(self.permissions)) {
			if (!seen.has(p)) {
				seen.add(p);
				results.push({ permission: p, source: "Direct" });
			}
		}
	}

	const visited = new Set<string>([groupId]);
	const queue = [groupId];
	while (queue.length > 0) {
		const current = queue.shift() as string;
		for (const edge of edges) {
			if (edge.childGroupId !== current || visited.has(edge.parentGroupId)) {
				continue;
			}
			visited.add(edge.parentGroupId);
			queue.push(edge.parentGroupId);
			const parent = byId.get(edge.parentGroupId);
			if (!parent) continue;
			for (const p of expandImpliedPermissions(parent.permissions)) {
				if (!seen.has(p)) {
					seen.add(p);
					results.push({ permission: p, source: parent.name });
				}
			}
		}
	}
	return results;
}

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-3 rounded-lg border p-4">
			<div>
				<h3 className="font-medium text-sm">{title}</h3>
				{description && (
					<p className="text-muted-foreground text-xs">{description}</p>
				)}
			</div>
			{children}
		</div>
	);
}

function GroupDetailPage() {
	const { groupId } = Route.useParams();
	const navigate = useNavigate();
	const qc = useQueryClient();

	const { data: groups = [], isLoading: groupsLoading } = useQuery({
		queryKey: ["cms", "groups"],
		queryFn: () => api.groups.list(),
	});
	const group = groups.find((g) => g.id === groupId);

	const { data: memberships = [] } = useQuery({
		queryKey: ["cms", "group-memberships"],
		queryFn: () => api.groups.listMemberships(),
	});

	// No dedicated "users in group X" endpoint - fetch generously (admin-scale)
	// and filter client-side, same idiom already used for the page-by-id
	// lookup in pages/$pageId.tsx.
	const { data: usersPage } = useQuery({
		queryKey: ["cms", "users", "all"],
		queryFn: () => api.users.list({ page: 1, pageSize: 1000 }),
	});
	const members = (usersPage?.items ?? []).filter((u) =>
		u.groupIds.includes(groupId),
	);

	const { data: pageGrants = [] } = useQuery({
		queryKey: ["cms", "pages", "grants", "group", groupId],
		queryFn: () => api.pages.grants.listBySubject("group", groupId),
	});
	const { data: tagGrants = [] } = useQuery({
		queryKey: ["cms", "media", "tag-grants", "group", groupId],
		queryFn: () => api.media.tags.grants.listBySubject("group", groupId),
	});
	const { data: tags = [] } = useQuery({
		queryKey: ["cms", "media", "tags"],
		queryFn: () => api.media.tags.list(),
	});
	const { data: locales = [] } = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
	});
	const { data: auditLog } = useQuery({
		queryKey: ["cms", "audit-log", "group", groupId],
		queryFn: () =>
			api.auditLog.list({
				page: 1,
				pageSize: 10,
				targetType: "group",
				targetId: groupId,
			}),
	});

	const parentGroups = memberships
		.filter((e) => e.childGroupId === groupId)
		.map((e) => groups.find((g) => g.id === e.parentGroupId))
		.filter((g): g is CMSGroup => !!g);
	const childGroups = memberships
		.filter((e) => e.parentGroupId === groupId)
		.map((e) => groups.find((g) => g.id === e.childGroupId))
		.filter((g): g is CMSGroup => !!g);

	const effectivePermissions = useMemo(
		() =>
			group ? computeEffectivePermissions(groupId, groups, memberships) : [],
		[group, groups, memberships, groupId],
	);

	const [name, setName] = useState(group?.name ?? "");
	const nameDirty = group !== undefined && name !== group.name && name.trim();

	const updateGroup = useMutation({
		mutationFn: (data: { name?: string; permissions?: string[] }) =>
			api.groups.update(groupId, data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["cms", "groups"] });
		},
		onError: () => toast.error("Save failed"),
	});

	const addParent = useMutation({
		mutationFn: (parentGroupId: string) =>
			api.groups.addMembership(groupId, parentGroupId),
		onSuccess: () => {
			toast.success("Nested");
			qc.invalidateQueries({ queryKey: ["cms", "group-memberships"] });
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't nest group"),
	});
	const removeParent = useMutation({
		mutationFn: (parentGroupId: string) =>
			api.groups.removeMembership(groupId, parentGroupId),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["cms", "group-memberships"] }),
	});
	const addChild = useMutation({
		mutationFn: (childGroupId: string) =>
			api.groups.addMembership(childGroupId, groupId),
		onSuccess: () => {
			toast.success("Nested");
			qc.invalidateQueries({ queryKey: ["cms", "group-memberships"] });
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't nest group"),
	});
	const removeChild = useMutation({
		mutationFn: (childGroupId: string) =>
			api.groups.removeMembership(childGroupId, groupId),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["cms", "group-memberships"] }),
	});

	const addMember = useMutation({
		mutationFn: (userId: string) => api.users.addToGroup(userId, groupId),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["cms", "users", "all"] }),
		onError: () => toast.error("Couldn't add member"),
	});
	const removeMember = useMutation({
		mutationFn: (userId: string) => api.users.removeFromGroup(userId, groupId),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["cms", "users", "all"] }),
	});

	const deleteGroup = useMutation({
		mutationFn: () => api.groups.delete(groupId),
		onSuccess: () => {
			toast.success("Group deleted");
			navigate({ to: "/groups" });
		},
		onError: () => toast.error("Delete failed"),
	});

	const [pageNodeId, setPageNodeId] = useState<string | null>(null);
	const [pagePermission, setPagePermission] = useState("cms:pages:read");
	const [pageLocale, setPageLocale] = useState(ALL_LOCALES);
	const addPageGrant = useMutation({
		mutationFn: () => {
			if (!pageNodeId) throw new Error("Select a page first");
			return api.pages.grants.add(pageNodeId, {
				subjectType: "group",
				subjectId: groupId,
				permission: pagePermission,
				locale: pageLocale === ALL_LOCALES ? null : pageLocale,
			});
		},
		onSuccess: () => {
			toast.success("Grant added");
			qc.invalidateQueries({
				queryKey: ["cms", "pages", "grants", "group", groupId],
			});
			setPageNodeId(null);
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't add grant"),
	});
	const removePageGrant = useMutation({
		mutationFn: (grantId: string) => api.pages.grants.remove(grantId),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: ["cms", "pages", "grants", "group", groupId],
			}),
	});

	const [tagId, setTagId] = useState("");
	const [tagPermission, setTagPermission] = useState<MediaTagAction>("view");
	const addTagGrant = useMutation({
		mutationFn: () => {
			if (!tagId) throw new Error("Select a tag first");
			return api.media.tags.grants.add(tagId, {
				subjectType: "group",
				subjectId: groupId,
				permission: tagPermission,
			});
		},
		onSuccess: () => {
			toast.success("Grant added");
			qc.invalidateQueries({
				queryKey: ["cms", "media", "tag-grants", "group", groupId],
			});
			setTagId("");
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't add grant"),
	});
	const removeTagGrant = useMutation({
		mutationFn: (grantId: string) => api.media.tags.grants.remove(grantId),
		onSuccess: () =>
			qc.invalidateQueries({
				queryKey: ["cms", "media", "tag-grants", "group", groupId],
			}),
	});

	if (groupsLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		);
	}

	if (!group) {
		return (
			<div className="rounded-lg border py-10 text-center text-muted-foreground">
				Group not found.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Link
					to="/groups"
					className="text-muted-foreground hover:text-foreground"
				>
					<IconChevronLeft className="size-4" />
				</Link>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					onBlur={() => {
						if (nameDirty) updateGroup.mutate({ name: name.trim() });
					}}
					className="h-8 max-w-xs font-bold text-xl"
				/>
				<div className="flex-1" />
				<ConfirmPopover
					trigger={
						<Button
							variant="outline"
							className="text-destructive hover:bg-destructive/10"
						>
							<IconTrash className="size-4" />
							Delete group
						</Button>
					}
					title={`Delete "${group.name}"?`}
					description="Members lose these permissions immediately. This cannot be undone."
					confirmLabel="Delete"
					variant="destructive"
					loading={deleteGroup.isPending}
					onConfirm={() => deleteGroup.mutate()}
				/>
			</div>

			<Section
				title="Permissions"
				description="Granted directly to this group."
			>
				<PermissionPicker
					value={group.permissions}
					onChange={(permissions) => updateGroup.mutate({ permissions })}
				/>
			</Section>

			<Section
				title="Effective permissions"
				description="Direct permissions plus everything inherited from nested-in groups."
			>
				{effectivePermissions.length === 0 ? (
					<p className="text-muted-foreground text-xs">No permissions yet.</p>
				) : (
					<div className="flex flex-wrap gap-1.5">
						{effectivePermissions.map((p) => (
							<Badge
								key={p.permission}
								variant={p.source === "Direct" ? "default" : "secondary"}
								className="gap-1 font-mono text-[10px]"
							>
								{p.permission}
								<span className="font-sans opacity-70">via {p.source}</span>
							</Badge>
						))}
					</div>
				)}
			</Section>

			<Section
				title="Belongs to"
				description="Groups this group is nested inside - their permissions and grants flow down."
			>
				<div className="flex flex-wrap items-center gap-1.5">
					{parentGroups.map((g) => (
						<Badge key={g.id} variant="outline" className="gap-1 py-0.5 pl-2.5">
							<Link to="/groups/$groupId" params={{ groupId: g.id }}>
								{g.name}
							</Link>
							<button
								type="button"
								onClick={() => removeParent.mutate(g.id)}
								className="cursor-pointer px-1 opacity-60 hover:text-destructive hover:opacity-100"
							>
								<IconX className="size-3" />
							</button>
						</Badge>
					))}
					<GroupCombobox
						groups={groups}
						exclude={[groupId, ...parentGroups.map((g) => g.id)]}
						onSelect={(parentId) => addParent.mutate(parentId)}
						triggerLabel="Add parent"
					/>
				</div>
			</Section>

			<Section
				title="Contains"
				description="Groups nested inside this one - they inherit its permissions and grants."
			>
				<div className="flex flex-wrap items-center gap-1.5">
					{childGroups.map((g) => (
						<Badge key={g.id} variant="outline" className="gap-1 py-0.5 pl-2.5">
							<Link to="/groups/$groupId" params={{ groupId: g.id }}>
								{g.name}
							</Link>
							<button
								type="button"
								onClick={() => removeChild.mutate(g.id)}
								className="cursor-pointer px-1 opacity-60 hover:text-destructive hover:opacity-100"
							>
								<IconX className="size-3" />
							</button>
						</Badge>
					))}
					<GroupCombobox
						groups={groups}
						exclude={[groupId, ...childGroups.map((g) => g.id)]}
						onSelect={(childId) => addChild.mutate(childId)}
						triggerLabel="Add child"
					/>
				</div>
			</Section>

			<Section
				title="Page access"
				description="Grants this group read/write/publish access to a page and its whole subtree."
			>
				<div className="space-y-1.5">
					{pageGrants.length === 0 ? (
						<p className="text-muted-foreground text-xs">No page grants yet.</p>
					) : (
						pageGrants.map((grant) => (
							<div
								key={grant.id}
								className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
							>
								<span className="truncate font-mono text-xs">
									{grant.nodeId}
								</span>
								<div className="flex shrink-0 items-center gap-2">
									<Badge>
										{PAGE_PERMISSIONS.find((p) => p.value === grant.permission)
											?.label ?? grant.permission}
									</Badge>
									{impliedByPermission(grant.permission).map((implied) => (
										<Badge key={implied} variant="secondary">
											{PAGE_PERMISSIONS.find((p) => p.value === implied)
												?.label ?? implied}
										</Badge>
									))}
									<Badge variant="outline">
										{grant.locale ?? "all locales"}
									</Badge>
									<Button
										size="icon"
										variant="ghost"
										className="size-6"
										onClick={() => removePageGrant.mutate(grant.id)}
									>
										<IconTrash className="size-3.5" />
									</Button>
								</div>
							</div>
						))
					)}
				</div>
				<div className="space-y-3 rounded-lg border border-dashed p-3">
					<div className="grid grid-cols-2 gap-2">
						<div className="col-span-2 space-y-1.5">
							<Label>Page</Label>
							<PageTreePicker
								value={pageNodeId}
								onChange={(id) => setPageNodeId(id)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Permission</Label>
							<Select value={pagePermission} onValueChange={setPagePermission}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAGE_PERMISSIONS.map((p) => (
										<SelectItem key={p.value} value={p.value}>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label>Locale</Label>
							<Select value={pageLocale} onValueChange={setPageLocale}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ALL_LOCALES}>All locales</SelectItem>
									{locales.map((l) => (
										<SelectItem key={l.code} value={l.code}>
											{l.name} ({l.code})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<Button
						size="sm"
						disabled={!pageNodeId || addPageGrant.isPending}
						onClick={() => addPageGrant.mutate()}
					>
						<IconPlus className="size-3.5" />
						Add grant
					</Button>
				</div>
			</Section>

			<Section
				title="Tag access"
				description="Grants this group an action on every media asset carrying a tag."
			>
				<div className="space-y-1.5">
					{tagGrants.length === 0 ? (
						<p className="text-muted-foreground text-xs">No tag grants yet.</p>
					) : (
						tagGrants.map((grant) => (
							<div
								key={grant.id}
								className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
							>
								<span className="flex items-center gap-1.5 text-xs">
									<IconTag className="size-3.5 text-muted-foreground" />
									{tags.find((t) => t.id === grant.tagId)?.name ?? grant.tagId}
								</span>
								<div className="flex shrink-0 items-center gap-2">
									<Badge>
										{TAG_PERMISSIONS.find((p) => p.value === grant.permission)
											?.label ?? grant.permission}
									</Badge>
									<Button
										size="icon"
										variant="ghost"
										className="size-6"
										onClick={() => removeTagGrant.mutate(grant.id)}
									>
										<IconTrash className="size-3.5" />
									</Button>
								</div>
							</div>
						))
					)}
				</div>
				<div className="space-y-3 rounded-lg border border-dashed p-3">
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<Label>Tag</Label>
							<Select value={tagId} onValueChange={setTagId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select tag" />
								</SelectTrigger>
								<SelectContent>
									{tags.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											{t.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label>Permission</Label>
							<Select
								value={tagPermission}
								onValueChange={(v) => setTagPermission(v as MediaTagAction)}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TAG_PERMISSIONS.map((p) => (
										<SelectItem key={p.value} value={p.value}>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<Button
						size="sm"
						disabled={!tagId || addTagGrant.isPending}
						onClick={() => addTagGrant.mutate()}
					>
						<IconPlus className="size-3.5" />
						Add grant
					</Button>
				</div>
			</Section>

			<Section title="Members" description="Users directly in this group.">
				<div className="space-y-1.5">
					{members.length === 0 ? (
						<p className="text-muted-foreground text-xs">No members yet.</p>
					) : (
						members.map((u) => (
							<div
								key={u.id}
								className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
							>
								<span className="flex items-center gap-2 text-sm">
									<IconUserCircle className="size-4 text-muted-foreground" />
									{u.name || u.email}
								</span>
								<Button
									size="icon"
									variant="ghost"
									className="size-6"
									onClick={() => removeMember.mutate(u.id)}
								>
									<IconX className="size-3.5" />
								</Button>
							</div>
						))
					)}
				</div>
				<UserCombobox
					value={null}
					onChange={(u) => addMember.mutate(u.id)}
					placeholder="Add member…"
				/>
			</Section>

			<Section
				title="Recent activity"
				description="Authority changes to this group."
			>
				{!auditLog || auditLog.items.length === 0 ? (
					<p className="text-muted-foreground text-xs">No activity yet.</p>
				) : (
					<div className="space-y-1.5">
						{auditLog.items.map((entry) => (
							<div
								key={entry.id}
								className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs"
							>
								<span className="flex items-center gap-1.5">
									<IconHistory className="size-3.5 text-muted-foreground" />
									{formatAuditAction(entry.action)}
								</span>
								<span className="text-muted-foreground">
									{new Date(entry.createdAt).toLocaleString()}
								</span>
							</div>
						))}
					</div>
				)}
			</Section>
		</div>
	);
}
