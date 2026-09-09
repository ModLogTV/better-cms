import { IconPlus, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const WILDCARD = "cms:*";

function resourceLabel(permission: string) {
	const resource = permission.split(":")[1] ?? permission;
	return resource.charAt(0).toUpperCase() + resource.slice(1);
}

function groupByResource(catalog: { value: string; description: string }[]) {
	const groups = new Map<string, { value: string; description: string }[]>();
	for (const entry of catalog) {
		if (entry.value === WILDCARD) continue;
		const label = resourceLabel(entry.value);
		const group = groups.get(label) ?? [];
		group.push(entry);
		groups.set(label, group);
	}
	return groups;
}

export function PermissionPicker({
	value,
	onChange,
}: {
	value: string[];
	onChange: (next: string[]) => void;
}) {
	const [customPerm, setCustomPerm] = useState("");
	const { data: catalog, isLoading } = useQuery({
		queryKey: ["cms", "permissions"],
		queryFn: () => api.permissions.list(),
	});

	const hasWildcard = value.includes(WILDCARD);
	const groups = catalog
		? groupByResource(catalog)
		: new Map<string, { value: string; description: string }[]>();
	const knownValues = new Set(catalog?.map((p) => p.value) ?? []);
	const customValues = value.filter(
		(v) => v !== WILDCARD && !knownValues.has(v),
	);

	function toggle(permission: string, checked: boolean) {
		if (checked) {
			if (!value.includes(permission)) onChange([...value, permission]);
		} else {
			onChange(value.filter((v) => v !== permission));
		}
	}

	function addCustom() {
		const trimmed = customPerm.trim();
		if (!trimmed || value.includes(trimmed)) return;
		onChange([...value, trimmed]);
		setCustomPerm("");
	}

	function removeCustom(permission: string) {
		onChange(value.filter((v) => v !== permission));
	}

	if (isLoading) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-start gap-2.5 rounded-md border p-2.5">
				<Checkbox
					id="permission-wildcard"
					checked={hasWildcard}
					onCheckedChange={(checked) => toggle(WILDCARD, checked === true)}
				/>
				<Label
					htmlFor="permission-wildcard"
					className="grid gap-0.5 font-normal leading-none"
				>
					<span className="text-sm font-medium">Grant all permissions</span>
					<span className="text-xs text-muted-foreground">
						{catalog?.find((p) => p.value === WILDCARD)?.description}
					</span>
				</Label>
			</div>

			<div
				className={hasWildcard ? "space-y-4 opacity-50" : "space-y-4"}
				inert={hasWildcard || undefined}
			>
				{Array.from(groups.entries()).map(([resource, entries]) => (
					<div key={resource} className="space-y-1.5">
						<p className="text-xs font-medium text-muted-foreground">
							{resource}
						</p>
						<div className="grid gap-1.5 sm:grid-cols-2">
							{entries.map((entry) => {
								const id = `permission-${entry.value}`;
								return (
									<div
										key={entry.value}
										className="flex items-start gap-2 rounded-md border p-2"
									>
										<Checkbox
											id={id}
											checked={value.includes(entry.value)}
											onCheckedChange={(checked) =>
												toggle(entry.value, checked === true)
											}
										/>
										<Label
											htmlFor={id}
											className="grid gap-0.5 font-normal leading-none"
										>
											<span className="text-sm">{entry.description}</span>
											<code className="text-[10px] text-muted-foreground">
												{entry.value}
											</code>
										</Label>
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">
					Custom permission
				</Label>
				{customValues.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{customValues.map((p) => (
							<Badge
								key={p}
								variant="outline"
								className="gap-1 font-mono text-xs"
							>
								{p}
								<button type="button" onClick={() => removeCustom(p)}>
									<IconX className="size-2.5 opacity-60 hover:opacity-100" />
								</button>
							</Badge>
						))}
					</div>
				)}
				<div className="flex gap-2">
					<Input
						placeholder="cms:translations:write"
						value={customPerm}
						onChange={(e) => setCustomPerm(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addCustom();
							}
						}}
						className="font-mono text-xs"
					/>
					<Button size="sm" variant="outline" onClick={addCustom}>
						<IconPlus className="size-3.5" />
					</Button>
				</div>
			</div>
		</div>
	);
}
