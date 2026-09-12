import { IconLock, IconPlus, IconTrash } from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { UserCombobox } from "@/components/shared/UserCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api, type PageGrant } from "@/lib/api";
import { impliedByPermission } from "@/lib/permissions";

const PAGE_PERMISSIONS = [
	{ value: "cms:pages:read", label: "Read" },
	{ value: "cms:pages:write", label: "Write" },
	{ value: "cms:pages:publish", label: "Publish" },
];

const ALL_LOCALES = "__all__";

interface GrantFormValues {
	subjectType: "user" | "group";
	groupId: string;
	userId: string;
	permission: string;
	locale: string;
}

function GrantRow({
	grant,
	groupName,
	onRemove,
	removing,
}: {
	grant: PageGrant;
	groupName?: string;
	onRemove: () => void;
	removing: boolean;
}) {
	const permLabel =
		PAGE_PERMISSIONS.find((p) => p.value === grant.permission)?.label ??
		grant.permission;
	return (
		<div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
			<div className="flex items-center gap-2">
				<Badge variant="outline">{grant.subjectType}</Badge>
				<span className="font-mono text-xs">
					{grant.subjectType === "group"
						? (groupName ?? grant.subjectId)
						: grant.subjectId}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<Badge>{permLabel}</Badge>
				{impliedByPermission(grant.permission).map((implied) => (
					<Badge key={implied} variant="secondary">
						{PAGE_PERMISSIONS.find((p) => p.value === implied)?.label ??
							implied}
					</Badge>
				))}
				<Badge variant="outline">{grant.locale ?? "all locales"}</Badge>
				<Button
					size="icon"
					variant="ghost"
					className="size-6"
					onClick={onRemove}
					disabled={removing}
				>
					<IconTrash className="size-3.5" />
				</Button>
			</div>
		</div>
	);
}

export function PageAccessPanel({
	nodeId,
	path,
}: {
	nodeId: string;
	path: string;
}) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);

	const { data: grants = [], isLoading } = useQuery({
		queryKey: ["cms", "pages", "grants", nodeId],
		queryFn: () => api.pages.grants.list(nodeId),
		enabled: open,
	});
	const { data: groups = [] } = useQuery({
		queryKey: ["cms", "groups"],
		queryFn: () => api.groups.list(),
		enabled: open,
	});
	const { data: locales = [] } = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
		enabled: open,
	});
	const groupName = (id: string) => groups.find((g) => g.id === id)?.name;

	const addGrant = useMutation({
		mutationFn: (values: GrantFormValues) =>
			api.pages.grants.add(nodeId, {
				subjectType: values.subjectType,
				subjectId:
					values.subjectType === "group" ? values.groupId : values.userId,
				permission: values.permission,
				locale: values.locale === ALL_LOCALES ? null : values.locale,
			}),
		onSuccess: () => {
			toast.success("Grant added");
			qc.invalidateQueries({ queryKey: ["cms", "pages", "grants", nodeId] });
			form.reset();
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't add grant"),
	});

	const removeGrant = useMutation({
		mutationFn: (grantId: string) => api.pages.grants.remove(grantId),
		onSuccess: () => {
			toast.success("Grant removed");
			qc.invalidateQueries({ queryKey: ["cms", "pages", "grants", nodeId] });
		},
		onError: () => toast.error("Couldn't remove grant"),
	});

	const form = useForm({
		defaultValues: {
			subjectType: "group",
			groupId: "",
			userId: "",
			permission: "cms:pages:read",
			locale: ALL_LOCALES,
		} as GrantFormValues,
		onSubmit: async ({ value }) => {
			await addGrant.mutateAsync(value);
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<IconLock className="size-4" />
					Access
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						Access to <span className="font-mono">{path}</span>
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-2">
					{isLoading ? (
						<p className="text-muted-foreground text-sm">Loading…</p>
					) : grants.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No grants yet - only users/groups with the global page permissions
							can access this page and its subtree.
						</p>
					) : (
						grants.map((grant) => (
							<GrantRow
								key={grant.id}
								grant={grant}
								groupName={groupName(grant.subjectId)}
								onRemove={() => removeGrant.mutate(grant.id)}
								removing={
									removeGrant.isPending && removeGrant.variables === grant.id
								}
							/>
						))
					)}
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-3 rounded-lg border border-dashed p-3"
				>
					<form.Field name="subjectType">
						{(field) => (
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1.5">
									<Label>Subject</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as GrantFormValues["subjectType"])
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="group">Group</SelectItem>
											<SelectItem value="user">User</SelectItem>
										</SelectContent>
									</Select>
								</div>
								{field.state.value === "group" ? (
									<form.Field name="groupId">
										{(groupField) => (
											<div className="space-y-1.5">
												<Label>Group</Label>
												<Select
													value={groupField.state.value}
													onValueChange={groupField.handleChange}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select group" />
													</SelectTrigger>
													<SelectContent>
														{groups.map((g) => (
															<SelectItem key={g.id} value={g.id}>
																{g.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										)}
									</form.Field>
								) : (
									<form.Field name="userId">
										{(userField) => (
											<div className="space-y-1.5">
												<Label>User</Label>
												<UserCombobox
													value={userField.state.value || null}
													onChange={(user) => userField.handleChange(user.id)}
												/>
											</div>
										)}
									</form.Field>
								)}
							</div>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-2">
						<form.Field name="permission">
							{(field) => (
								<div className="space-y-1.5">
									<Label>Permission</Label>
									<Select
										value={field.state.value}
										onValueChange={field.handleChange}
									>
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
							)}
						</form.Field>
						<form.Field name="locale">
							{(field) => (
								<div className="space-y-1.5">
									<Label>Locale</Label>
									<Select
										value={field.state.value}
										onValueChange={field.handleChange}
									>
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
							)}
						</form.Field>
					</div>

					<form.Subscribe
						selector={(state) =>
							[
								state.values.subjectType,
								state.values.groupId,
								state.values.userId,
							] as const
						}
					>
						{([subjectType, groupId, userId]) => {
							const subjectMissing =
								subjectType === "group" ? !groupId : !userId.trim();
							return (
								<Button
									type="submit"
									size="sm"
									disabled={addGrant.isPending || subjectMissing}
								>
									<IconPlus className="size-4" />
									{addGrant.isPending ? "Adding…" : "Add grant"}
								</Button>
							);
						}}
					</form.Subscribe>
				</form>
			</DialogContent>
		</Dialog>
	);
}
