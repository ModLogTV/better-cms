import {
	IconFileText,
	IconPencil,
	IconPlus,
	IconRocket,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api, type PageSummary } from "@/lib/api";

export const Route = createFileRoute("/_layout/pages/")({
	component: PagesPage,
});

function StatusBadge({ status }: { status: PageSummary["status"] }) {
	return (
		<Badge variant={status === "published" ? "success" : "warning"}>
			{status}
		</Badge>
	);
}

interface NewPageValues {
	slug: string;
	locale: string;
}

function NewPageDialog() {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);

	const { data: locales = [] } = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
	});

	const create = useMutation({
		mutationFn: (values: NewPageValues) =>
			api.pages.create(values.slug, values.locale),
		onSuccess: (page) => {
			toast.success("Page created");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
			setOpen(false);
			form.reset();
			navigate({
				to: "/pages/$pageId",
				params: { pageId: page.id },
				search: { slug: page.slug, locale: page.locale },
			});
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't create page"),
	});

	const form = useForm({
		defaultValues: { slug: "", locale: "" } as NewPageValues,
		onSubmit: async ({ value }) => {
			await create.mutateAsync(value);
		},
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				setOpen(o);
				if (!o) form.reset();
			}}
		>
			<DialogTrigger asChild>
				<Button size="lg">
					<IconPlus className="size-4" />
					New page
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>New page</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="contents"
				>
					<div className="space-y-4">
						<form.Field
							name="slug"
							validators={{
								onChange: ({ value }) =>
									!value.trim() ? "Required" : undefined,
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>Slug</Label>
									<Input
										id={field.name}
										placeholder="about-us"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										className="font-mono text-sm"
									/>
								</div>
							)}
						</form.Field>
						<form.Field
							name="locale"
							validators={{
								onChange: ({ value }) =>
									!value.trim() ? "Required" : undefined,
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>Locale</Label>
									<Select
										value={field.state.value}
										onValueChange={field.handleChange}
									>
										<SelectTrigger id={field.name} className="w-full">
											<SelectValue placeholder="Select locale" />
										</SelectTrigger>
										<SelectContent>
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
					<DialogFooter>
						<form.Subscribe
							selector={(state) =>
								[state.values.slug, state.values.locale] as const
							}
						>
							{([slug, locale]) => (
								<Button
									type="submit"
									disabled={create.isPending || !slug.trim() || !locale.trim()}
								>
									{create.isPending ? "Creating…" : "Create page"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function PagesPage() {
	const qc = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: ["cms", "pages"],
		queryFn: () => api.pages.list(),
	});

	const publish = useMutation({
		mutationFn: (id: string) => api.pages.publish(id),
		onSuccess: () => {
			toast.success("Page published");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
		},
		onError: () => toast.error("Publish failed"),
	});

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Pages</h2>
					<p className="text-muted-foreground">
						Manage page content and publish drafts.
					</p>
				</div>
				<NewPageDialog />
			</div>

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Slug</TableHead>
							<TableHead>Locale</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Updated</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
								<TableRow key={i}>
									{Array.from({ length: 5 }).map((_, j) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
										<TableCell key={j}>
											<Skeleton className="h-5 w-24" />
										</TableCell>
									))}
								</TableRow>
							))
						) : data?.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="py-10 text-center text-muted-foreground"
								>
									<IconFileText className="mx-auto mb-2 size-8 opacity-40" />
									No pages yet.
								</TableCell>
							</TableRow>
						) : (
							data?.map((page) => (
								<TableRow key={page.id}>
									<TableCell className="font-mono text-sm">
										{page.slug}
									</TableCell>
									<TableCell>
										<Badge variant="outline">{page.locale}</Badge>
									</TableCell>
									<TableCell>
										<StatusBadge status={page.status} />
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{new Date(page.updatedAt).toLocaleDateString()}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-2">
											{page.status === "draft" && (
												<Button
													size="sm"
													variant="outline"
													className="h-7 gap-1 text-xs"
													onClick={() => publish.mutate(page.id)}
													disabled={publish.isPending}
												>
													<IconRocket className="size-3" />
													Publish
												</Button>
											)}
											<Button
												size="sm"
												variant="outline"
												className="h-7 gap-1 text-xs"
												asChild
											>
												<Link
													to="/pages/$pageId"
													params={{ pageId: page.id }}
													search={{ slug: page.slug, locale: page.locale }}
												>
													<IconPencil className="size-3" />
													Edit
												</Link>
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
