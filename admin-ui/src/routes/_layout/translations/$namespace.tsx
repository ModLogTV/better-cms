import { IconChevronLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TranslationRow } from "@/components/shared/TranslationRow";
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
import { api } from "@/lib/api";

export const Route = createFileRoute("/_layout/translations/$namespace")({
	component: TranslationEditorPage,
});

function TranslationEditorPage() {
	const { namespace } = Route.useParams();
	const [locale, setLocale] = useState("en");

	const locales = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
	});

	const metadata = useQuery({
		queryKey: ["cms", "namespace", namespace, "describe"],
		queryFn: () => api.namespaces.describe(namespace),
	});

	const translations = useQuery({
		queryKey: ["cms", "translations", namespace, locale],
		queryFn: () => api.namespaces.getTranslations(namespace, locale),
		enabled: !!locale,
	});

	const isLoading = metadata.isLoading || translations.isLoading;

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Link
					to="/translations"
					className="text-muted-foreground hover:text-foreground"
				>
					<IconChevronLeft className="size-4" />
				</Link>
				<div className="flex-1">
					<h2 className="text-2xl font-bold tracking-tight font-mono">
						{namespace}
					</h2>
					<p className="text-muted-foreground text-sm">
						{metadata.data?.length ?? 0} keys
					</p>
				</div>
				<Select value={locale} onValueChange={setLocale}>
					<SelectTrigger className="w-36">
						<SelectValue placeholder="Select locale" />
					</SelectTrigger>
					<SelectContent>
						{locales.data?.map((l) => (
							<SelectItem key={l.code} value={l.code}>
								{l.name} ({l.code})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-64">Key</TableHead>
							<TableHead>Value ({locale})</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading
							? Array.from({ length: 6 }).map((_, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
									<TableRow key={i}>
										<TableCell>
											<Skeleton className="h-5 w-40" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-9 w-full" />
										</TableCell>
									</TableRow>
								))
							: metadata.data?.map((meta) => (
									<TranslationRow
										key={meta.key}
										meta={meta}
										value={translations.data?.[meta.key] ?? ""}
										namespace={namespace}
										locale={locale}
									/>
								))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
