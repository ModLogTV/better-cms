import {
	IconChevronDown,
	IconChevronRight,
	IconFileText,
	IconLanguage,
	IconPhoto,
	IconRocket,
	IconShield,
	IconUsers,
	IconWorld,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { TranslationRow } from "@/components/shared/TranslationRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
	api,
	type MediaAsset,
	type NamespaceSummary,
	type PageSummary,
} from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";

export const Route = createFileRoute("/_layout/")({
	component: DashboardPage,
});

function StatCard({
	title,
	value,
	icon: Icon,
	to,
	loading,
}: {
	title: string;
	value: number | undefined;
	icon: React.ElementType;
	to: string;
	loading: boolean;
}) {
	return (
		<Link to={to}>
			<Card className="cursor-pointer transition-shadow hover:shadow-md">
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{title}
					</CardTitle>
					<Icon className="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{loading ? (
						<Skeleton className="h-8 w-16" />
					) : (
						<div className="text-3xl font-bold">{value ?? 0}</div>
					)}
				</CardContent>
			</Card>
		</Link>
	);
}

function RecentPagesCard({
	pages,
	isLoading,
}: {
	pages?: PageSummary[];
	isLoading: boolean;
}) {
	const qc = useQueryClient();
	const publish = useMutation({
		mutationFn: (id: string) => api.pages.publish(id),
		onSuccess: () => {
			toast.success("Page published");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
		},
		onError: () => toast.error("Publish failed"),
	});

	const recent = [...(pages ?? [])]
		.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		)
		.slice(0, 5);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Recent pages</CardTitle>
			</CardHeader>
			<CardContent className="space-y-1">
				{isLoading ? (
					Array.from({ length: 3 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
						<Skeleton key={i} className="h-10 w-full" />
					))
				) : recent.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No pages yet.
					</p>
				) : (
					recent.map((page) => (
						<div
							key={page.id}
							className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50"
						>
							<Link
								to="/pages/$pageId"
								params={{ pageId: page.id }}
								search={{ path: page.path, locale: page.locale }}
								className="flex items-center gap-2 truncate"
							>
								<span className="truncate font-mono text-sm">{page.path}</span>
								<Badge variant="outline" className="shrink-0">
									{page.locale}
								</Badge>
							</Link>
							{page.status === "draft" ? (
								<Button
									size="sm"
									variant="outline"
									className="h-7 shrink-0 gap-1 text-xs"
									onClick={() => publish.mutate(page.id)}
									disabled={publish.isPending}
								>
									<IconRocket className="size-3" />
									Publish
								</Button>
							) : (
								<Badge variant="success" className="shrink-0">
									published
								</Badge>
							)}
						</div>
					))
				)}
			</CardContent>
		</Card>
	);
}

function NamespaceQuickEditRow({
	ns,
	defaultLocale,
}: {
	ns: NamespaceSummary;
	defaultLocale: string;
}) {
	const [expanded, setExpanded] = useState(false);

	const metadata = useQuery({
		queryKey: ["cms", "namespace", ns.name, "describe"],
		queryFn: () => api.namespaces.describe(ns.name),
		enabled: expanded,
	});
	const translations = useQuery({
		queryKey: ["cms", "translations", ns.name, defaultLocale],
		queryFn: () => api.namespaces.getTranslations(ns.name, defaultLocale),
		enabled: expanded,
	});

	return (
		<div className="rounded-md">
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-muted/50"
			>
				<span className="flex items-center gap-2">
					{expanded ? (
						<IconChevronDown className="size-3.5 text-muted-foreground" />
					) : (
						<IconChevronRight className="size-3.5 text-muted-foreground" />
					)}
					<span className="font-mono text-sm">{ns.name}</span>
				</span>
				<span className="text-xs text-muted-foreground">
					{ns.updatedAt
						? new Date(ns.updatedAt).toLocaleDateString()
						: "never edited"}
				</span>
			</button>
			{expanded && (
				<div className="rounded-lg border ml-6 mb-2">
					<Table>
						<TableBody>
							{metadata.isLoading || translations.isLoading ? (
								<TableRow>
									<TableCell colSpan={2}>
										<Skeleton className="h-16 w-full" />
									</TableCell>
								</TableRow>
							) : (
								metadata.data
									?.slice(0, 5)
									.map((meta) => (
										<TranslationRow
											key={meta.key}
											meta={meta}
											value={translations.data?.[meta.key] ?? ""}
											namespace={ns.name}
											locale={defaultLocale}
										/>
									))
							)}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}

function RecentNamespacesCard({
	namespaces,
	isLoading,
	defaultLocale,
}: {
	namespaces?: NamespaceSummary[];
	isLoading: boolean;
	defaultLocale: string;
}) {
	const recent = [...(namespaces ?? [])]
		.sort((a, b) => {
			if (!a.updatedAt) return 1;
			if (!b.updatedAt) return -1;
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		})
		.slice(0, 5);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Recently updated namespaces</CardTitle>
			</CardHeader>
			<CardContent className="space-y-1">
				{isLoading ? (
					Array.from({ length: 3 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
						<Skeleton key={i} className="h-10 w-full" />
					))
				) : recent.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No namespaces configured.
					</p>
				) : (
					recent.map((ns) => (
						<NamespaceQuickEditRow
							key={ns.name}
							ns={ns}
							defaultLocale={defaultLocale}
						/>
					))
				)}
			</CardContent>
		</Card>
	);
}

function MediaOverviewCard({
	media,
	isLoading,
}: {
	media?: MediaAsset[];
	isLoading: boolean;
}) {
	const totalSize = (media ?? []).reduce((sum, asset) => sum + asset.size, 0);
	const pending = (media ?? []).filter((asset) => !asset.confirmedAt).length;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Media storage</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-14 w-full" />
				) : (media?.length ?? 0) === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No media uploaded yet.
					</p>
				) : (
					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-2xl font-bold">{formatBytes(totalSize)}</p>
							<p className="text-xs text-muted-foreground">
								across {media?.length ?? 0} assets
							</p>
						</div>
						<div>
							<p className="text-2xl font-bold">{pending}</p>
							<p className="text-xs text-muted-foreground">
								pending confirmation
							</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function localeCoverageAverages(namespaces: NamespaceSummary[]) {
	const sums = new Map<string, { total: number; count: number }>();
	for (const ns of namespaces) {
		for (const [locale, pct] of Object.entries(ns.coverage)) {
			const entry = sums.get(locale) ?? { total: 0, count: 0 };
			entry.total += pct;
			entry.count += 1;
			sums.set(locale, entry);
		}
	}
	return Array.from(sums.entries())
		.map(([locale, { total, count }]) => ({
			locale,
			avg: Math.round(total / count),
		}))
		.sort((a, b) => b.avg - a.avg);
}

function CoverageOverviewCard({
	namespaces,
	isLoading,
}: {
	namespaces?: NamespaceSummary[];
	isLoading: boolean;
}) {
	const coverage = localeCoverageAverages(namespaces ?? []);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">
					Translation coverage by locale
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{isLoading ? (
					Array.from({ length: 2 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
						<Skeleton key={i} className="h-6 w-full" />
					))
				) : coverage.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No translation data yet.
					</p>
				) : (
					coverage.map(({ locale, avg }) => (
						<div key={locale} className="space-y-1">
							<div className="flex items-center justify-between text-xs">
								<span className="font-mono">{locale}</span>
								<span className="text-muted-foreground">{avg}%</span>
							</div>
							<div className="h-1.5 overflow-hidden rounded-full bg-muted">
								<div
									className={cn(
										"h-full rounded-full",
										avg >= 100
											? "bg-emerald-500"
											: avg >= 50
												? "bg-amber-500"
												: "bg-destructive",
									)}
									style={{ width: `${avg}%` }}
								/>
							</div>
						</div>
					))
				)}
			</CardContent>
		</Card>
	);
}

function DashboardPage() {
	const namespaces = useQuery({
		queryKey: ["cms", "namespaces"],
		queryFn: () => api.namespaces.list(),
	});
	const pages = useQuery({
		queryKey: ["cms", "pages", "recent"],
		queryFn: () =>
			api.pages.list({
				page: 1,
				pageSize: 5,
				sort: [{ id: "updatedAt", desc: true }],
			}),
	});
	const media = useQuery({
		queryKey: ["cms", "media"],
		queryFn: () => api.media.list(),
	});
	const locales = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
	});
	const users = useQuery({
		queryKey: ["cms", "users", "count"],
		queryFn: () => api.users.list({ page: 1, pageSize: 1 }),
	});
	const groups = useQuery({
		queryKey: ["cms", "groups"],
		queryFn: () => api.groups.list(),
	});

	const defaultLocale =
		locales.data?.find((l) => l.isDefault)?.code ??
		locales.data?.[0]?.code ??
		"en";

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
				<p className="text-muted-foreground">Overview of your CMS content.</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
				<StatCard
					title="Namespaces"
					value={namespaces.data?.length}
					icon={IconLanguage}
					to="/translations"
					loading={namespaces.isLoading}
				/>
				<StatCard
					title="Pages"
					value={pages.data?.total}
					icon={IconFileText}
					to="/pages"
					loading={pages.isLoading}
				/>
				<StatCard
					title="Media"
					value={media.data?.length}
					icon={IconPhoto}
					to="/media"
					loading={media.isLoading}
				/>
				<StatCard
					title="Locales"
					value={locales.data?.length}
					icon={IconWorld}
					to="/locales"
					loading={locales.isLoading}
				/>
				<StatCard
					title="Users"
					value={users.data?.total}
					icon={IconUsers}
					to="/users"
					loading={users.isLoading}
				/>
				<StatCard
					title="Groups"
					value={groups.data?.length}
					icon={IconShield}
					to="/groups"
					loading={groups.isLoading}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<RecentPagesCard
					pages={pages.data?.items}
					isLoading={pages.isLoading}
				/>
				<RecentNamespacesCard
					namespaces={namespaces.data}
					isLoading={namespaces.isLoading}
					defaultLocale={defaultLocale}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<MediaOverviewCard media={media.data} isLoading={media.isLoading} />
				<CoverageOverviewCard
					namespaces={namespaces.data}
					isLoading={namespaces.isLoading}
				/>
			</div>
		</div>
	);
}
