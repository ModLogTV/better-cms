import {
	IconChevronLeft,
	IconChevronRight,
	IconHistory,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { formatAuditAction } from "@/lib/audit";

export const Route = createFileRoute("/_layout/audit-log/")({
	component: AuditLogPage,
});

const TARGET_TYPES = [
	{ value: "group", label: "Group" },
	{ value: "user", label: "User" },
	{ value: "pageGrant", label: "Page grant" },
	{ value: "mediaTagGrant", label: "Tag grant" },
];

const ALL_TARGET_TYPES = "__all__";
const PAGE_SIZE = 20;

function AuditLogPage() {
	const [page, setPage] = useState(1);
	const [targetType, setTargetType] = useState(ALL_TARGET_TYPES);

	// No dedicated user-lookup-by-id endpoint - fetch generously (admin-scale)
	// and resolve actor names client-side, same idiom used on the group
	// detail page for its members list.
	const { data: usersPage } = useQuery({
		queryKey: ["cms", "users", "all"],
		queryFn: () => api.users.list({ page: 1, pageSize: 1000 }),
	});
	const actorLabel = (actorId: string | null) => {
		if (!actorId) return "System";
		const user = usersPage?.items.find((u) => u.id === actorId);
		return user ? user.name || user.email : actorId;
	};

	const { data, isLoading } = useQuery({
		queryKey: ["cms", "audit-log", page, targetType],
		queryFn: () =>
			api.auditLog.list({
				page,
				pageSize: PAGE_SIZE,
				targetType: targetType === ALL_TARGET_TYPES ? undefined : targetType,
			}),
	});

	const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
				<p className="text-muted-foreground">
					Every change to groups, nesting, grants and permissions - who, what,
					when.
				</p>
			</div>

			<div className="flex items-center gap-2">
				<Select
					value={targetType}
					onValueChange={(v) => {
						setTargetType(v);
						setPage(1);
					}}
				>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_TARGET_TYPES}>All targets</SelectItem>
						{TARGET_TYPES.map((t) => (
							<SelectItem key={t.value} value={t.value}>
								{t.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 6 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
						<Skeleton key={i} className="h-10 rounded-md" />
					))}
				</div>
			) : !data || data.items.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
					<IconHistory className="mb-3 size-12 opacity-30" />
					<p className="text-sm">No activity recorded yet.</p>
				</div>
			) : (
				<>
					<div className="overflow-hidden rounded-md border">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead>Time</TableHead>
									<TableHead>Actor</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Target</TableHead>
									<TableHead>Detail</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((entry) => (
									<TableRow key={entry.id}>
										<TableCell className="whitespace-nowrap text-muted-foreground text-xs">
											{new Date(entry.createdAt).toLocaleString()}
										</TableCell>
										<TableCell className="text-sm">
											{actorLabel(entry.actorId)}
										</TableCell>
										<TableCell>
											<Tooltip>
												<TooltipTrigger asChild>
													<Badge variant="outline" className="text-[10px]">
														{formatAuditAction(entry.action)}
													</Badge>
												</TooltipTrigger>
												<TooltipContent className="font-mono text-[10px]">
													{entry.action}
												</TooltipContent>
											</Tooltip>
										</TableCell>
										<TableCell className="font-mono text-xs">
											{entry.targetType} · {entry.targetId}
										</TableCell>
										<TableCell className="max-w-64">
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="block truncate font-mono text-[10px] text-muted-foreground">
														{JSON.stringify(entry.detail)}
													</span>
												</TooltipTrigger>
												<TooltipContent className="max-w-sm">
													<pre className="whitespace-pre-wrap text-[10px]">
														{JSON.stringify(entry.detail, null, 2)}
													</pre>
												</TooltipContent>
											</Tooltip>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<div className="flex items-center justify-between">
						<p className="text-muted-foreground text-xs">
							Page {page} of {totalPages} · {data.total} entries
						</p>
						<div className="flex gap-1">
							<Button
								size="icon"
								variant="outline"
								className="size-7"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<IconChevronLeft className="size-3.5" />
							</Button>
							<Button
								size="icon"
								variant="outline"
								className="size-7"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								<IconChevronRight className="size-3.5" />
							</Button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
