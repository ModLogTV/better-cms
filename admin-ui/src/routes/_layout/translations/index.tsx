import { IconClock, IconKey, IconLanguage } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_layout/translations/")({
	component: TranslationsIndexPage,
});

function coverageVariant(pct: number): "success" | "warning" | "destructive" {
	if (pct >= 100) return "success";
	if (pct >= 50) return "warning";
	return "destructive";
}

function TranslationsIndexPage() {
	const { data, isLoading } = useQuery({
		queryKey: ["cms", "namespaces"],
		queryFn: () => api.namespaces.list(),
	});
	const [search, setSearch] = useState("");

	const filtered = (data ?? []).filter((ns) =>
		ns.name.toLowerCase().includes(search.trim().toLowerCase()),
	);

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Translations</h2>
				<p className="text-muted-foreground">
					Manage translation keys across all namespaces.
				</p>
			</div>

			{!isLoading && (data?.length ?? 0) > 0 && (
				<Input
					placeholder="Filter namespaces"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-xs"
				/>
			)}

			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton card count, never reordered
						<Skeleton key={i} className="h-40 rounded-lg" />
					))}
				</div>
			) : data?.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
					<IconLanguage className="mb-3 size-12 opacity-30" />
					<p className="text-sm">No namespaces configured.</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
					<IconLanguage className="mb-3 size-12 opacity-30" />
					<p className="text-sm">No namespaces match "{search}".</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((ns) => (
						<Link
							key={ns.name}
							to="/translations/$namespace"
							params={{ namespace: ns.name }}
						>
							<Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
								<CardHeader>
									<CardTitle className="flex items-center justify-between font-mono text-base">
										{ns.name}
										<IconLanguage className="size-4 text-muted-foreground" />
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-4 text-sm text-muted-foreground">
										<span className="flex items-center gap-1">
											<IconKey className="size-3.5" />
											{ns.keyCount} keys
										</span>
										<span className="flex items-center gap-1">
											<IconClock className="size-3.5" />
											{ns.updatedAt
												? new Date(ns.updatedAt).toLocaleDateString()
												: "never edited"}
										</span>
									</div>
									{Object.keys(ns.coverage).length > 0 && (
										<div className="flex flex-wrap gap-1.5">
											{Object.entries(ns.coverage).map(([locale, pct]) => (
												<Badge
													key={locale}
													variant={coverageVariant(pct)}
													className="font-mono text-[10px]"
												>
													{locale} {pct}%
												</Badge>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
