import {
	DndContext,
	type DragEndEvent,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	IconChevronRight,
	IconFileText,
	IconFolder,
	IconGripVertical,
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	ApiError,
	api,
	type Locale,
	type PageNodeLocale,
	type PageTreeNode,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_layout/pages/")({
	component: PagesPage,
});

const ROOT_DROP_ID = "__root__";

interface NewPageValues {
	slug: string;
	locale: string;
}

function NewPageDialog({
	parentId,
	parentPath,
	locales,
	trigger,
}: {
	parentId: string | null;
	parentPath?: string;
	locales: Locale[];
	trigger: React.ReactNode;
}) {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);

	const create = useMutation({
		mutationFn: (values: NewPageValues) =>
			api.pages.create(values.slug, values.locale, parentId),
		onSuccess: (page) => {
			toast.success("Page created");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
			setOpen(false);
			form.reset();
			navigate({
				to: "/pages/$pageId",
				params: { pageId: page.id },
				search: { path: page.path, locale: page.locale },
			});
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't create page"),
	});

	const defaultLocale = locales.find((l) => l.isDefault)?.code ?? "";
	const form = useForm({
		defaultValues: { slug: "", locale: defaultLocale } as NewPageValues,
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
			<DialogTrigger asChild>{trigger}</DialogTrigger>
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
						<p className="text-muted-foreground text-sm">
							{parentPath ? (
								<>
									Creating under{" "}
									<span className="font-mono text-foreground">
										{parentPath}
									</span>
								</>
							) : (
								"Creating at the root"
							)}
						</p>
						<form.Field
							name="slug"
							validators={{
								onChange: ({ value }) =>
									!value.trim()
										? "Required"
										: /[/\s]/.test(value)
											? "Slug can't contain spaces or slashes"
											: undefined,
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
									{field.state.meta.errors.length > 0 && (
										<p className="text-destructive text-xs">
											{field.state.meta.errors.join(", ")}
										</p>
									)}
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
									<Label htmlFor={field.name}>Starting locale</Label>
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
									<p className="text-muted-foreground text-xs">
										Other locales can be added to this page afterwards.
									</p>
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

function AddLocaleDialog({
	nodeId,
	path,
	locale,
	existingLocales,
	trigger,
}: {
	nodeId: string;
	path: string;
	locale: string;
	existingLocales: PageNodeLocale[];
	trigger: React.ReactNode;
}) {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [cloneFrom, setCloneFrom] = useState<string>("__blank__");

	const addLocale = useMutation({
		mutationFn: () =>
			api.pages.addLocale(
				nodeId,
				locale,
				cloneFrom === "__blank__" ? undefined : cloneFrom,
			),
		onSuccess: (page) => {
			toast.success(`Added ${locale} to "${path}"`);
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
			setOpen(false);
			navigate({
				to: "/pages/$pageId",
				params: { pageId: page.id },
				search: { path: page.path, locale: page.locale },
			});
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't add locale"),
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>
						Add <span className="font-mono">{locale}</span> to{" "}
						<span className="font-mono">{path}</span>
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-1.5">
					<Label>Start from</Label>
					<Select value={cloneFrom} onValueChange={setCloneFrom}>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__blank__">Blank page</SelectItem>
							{existingLocales.map((l) => (
								<SelectItem key={l.locale} value={l.locale}>
									Copy of {l.locale} (draft)
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<DialogFooter>
					<Button
						onClick={() => addLocale.mutate()}
						disabled={addLocale.isPending}
					>
						{addLocale.isPending ? "Adding…" : "Add locale"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function LocaleBadge({ node, locale }: { node: PageTreeNode; locale: Locale }) {
	const content = node.locales.find((l) => l.locale === locale.code);

	if (!content) {
		return (
			<AddLocaleDialog
				nodeId={node.id}
				path={node.path}
				locale={locale.code}
				existingLocales={node.locales}
				trigger={
					<button
						type="button"
						className="cursor-pointer rounded-full border border-dashed px-1.5 py-0.5 text-[0.625rem] text-muted-foreground uppercase tracking-wide hover:border-foreground hover:text-foreground"
						title={`Add ${locale.code}`}
					>
						+{locale.code}
					</button>
				}
			/>
		);
	}

	return (
		<Link
			to="/pages/$pageId"
			params={{ pageId: content.contentId }}
			search={{ path: node.path, locale: locale.code }}
		>
			<Badge
				variant={
					content.status === "published"
						? "success"
						: content.status === "modified"
							? "warning"
							: "secondary"
				}
				className="uppercase"
				title={content.status}
			>
				{locale.code}
			</Badge>
		</Link>
	);
}

function TreeRow({
	node,
	depth,
	expanded,
	onToggle,
	onPublish,
	publishingId,
	locales,
}: {
	node: PageTreeNode;
	depth: number;
	expanded: Set<string>;
	onToggle: (id: string) => void;
	onPublish: (contentId: string) => void;
	publishingId: string | undefined;
	locales: Locale[];
}) {
	const hasChildren = node.children.length > 0;
	const isExpanded = expanded.has(node.id);
	const publishableContent = node.locales.find((l) => l.status !== "published");

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		isDragging,
	} = useDraggable({ id: node.id });
	const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id });

	return (
		<div>
			<Tooltip open={isOver}>
				<TooltipTrigger asChild>
					<div
						ref={setDropRef}
						className={cn(
							"group flex items-center gap-1.5 rounded-md py-1.5 pr-2",
							isOver && "bg-accent ring-1 ring-primary",
							isDragging && "opacity-40",
						)}
						style={{ paddingLeft: depth * 20 + 4 }}
					>
						<button
							type="button"
							ref={setDragRef}
							{...listeners}
							{...attributes}
							className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 active:cursor-grabbing"
							aria-label="Drag to move"
						>
							<IconGripVertical className="size-3.5" />
						</button>
						<button
							type="button"
							onClick={() => hasChildren && onToggle(node.id)}
							className={cn(
								"flex size-4 items-center justify-center text-muted-foreground",
								hasChildren ? "cursor-pointer" : "invisible",
							)}
							aria-label={isExpanded ? "Collapse" : "Expand"}
						>
							<IconChevronRight
								className={cn(
									"size-3.5 transition-transform",
									isExpanded && "rotate-90",
								)}
							/>
						</button>
						{hasChildren ? (
							<IconFolder className="size-4 text-muted-foreground" />
						) : (
							<IconFileText className="size-4 text-muted-foreground" />
						)}
						<span className="font-mono text-sm">{node.slug}</span>
						<span className="flex items-center gap-1">
							{locales.map((l) => (
								<LocaleBadge key={l.code} node={node} locale={l} />
							))}
						</span>
						<span className="ml-auto flex items-center gap-2">
							<Tooltip>
								<TooltipTrigger asChild>
									<span>
										<NewPageDialog
											parentId={node.id}
											parentPath={node.path}
											locales={locales}
											trigger={
												<Button
													size="icon"
													variant="ghost"
													className="size-6 opacity-0 group-hover:opacity-100"
												>
													<IconPlus className="size-3.5" />
												</Button>
											}
										/>
									</span>
								</TooltipTrigger>
								<TooltipContent>Add child page</TooltipContent>
							</Tooltip>
							{publishableContent && (
								<Button
									size="sm"
									variant="outline"
									className="h-6 gap-1 text-xs"
									onClick={() => onPublish(publishableContent.contentId)}
									disabled={publishingId === publishableContent.contentId}
								>
									<IconRocket className="size-3" />
									Publish {publishableContent.locale}
								</Button>
							)}
							{node.locales[0] && (
								<Button
									size="sm"
									variant="outline"
									className="h-6 gap-1 text-xs"
									asChild
								>
									<Link
										to="/pages/$pageId"
										params={{ pageId: node.locales[0].contentId }}
										search={{ path: node.path, locale: node.locales[0].locale }}
									>
										<IconPencil className="size-3" />
										Edit
									</Link>
								</Button>
							)}
						</span>
					</div>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					Drop to nest under <span className="font-mono">{node.slug}</span>
				</TooltipContent>
			</Tooltip>
			{hasChildren && isExpanded && (
				<div>
					{node.children.map((child) => (
						<TreeRow
							key={child.id}
							node={child}
							depth={depth + 1}
							expanded={expanded}
							onToggle={onToggle}
							onPublish={onPublish}
							publishingId={publishingId}
							locales={locales}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function RootDropZone({ children }: { children: React.ReactNode }) {
	const { setNodeRef, isOver } = useDroppable({ id: ROOT_DROP_ID });
	return (
		<div
			ref={setNodeRef}
			className={cn(
				"min-h-full rounded-lg border p-2",
				isOver && "bg-accent/50 ring-1 ring-primary",
			)}
		>
			{children}
		</div>
	);
}

function PagesPage() {
	const qc = useQueryClient();

	const { data: locales = [] } = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
	});

	const { data: tree, isLoading } = useQuery({
		queryKey: ["cms", "pages", "tree"],
		queryFn: () => api.pages.tree(),
	});

	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const toggle = (id: string) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const publish = useMutation({
		mutationFn: (contentId: string) => api.pages.publish(contentId),
		onSuccess: () => {
			toast.success("Page published");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
		},
		onError: () => toast.error("Publish failed"),
	});

	const move = useMutation({
		mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
			api.pages.move(id, parentId),
		onSuccess: () => {
			toast.success("Page moved");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
		},
		onError: (e) =>
			toast.error(e instanceof ApiError ? e.message : "Couldn't move page"),
	});

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const parentId = over.id === ROOT_DROP_ID ? null : String(over.id);
		move.mutate({ id: String(active.id), parentId });
	};

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Pages</h2>
					<p className="text-muted-foreground">
						Manage page content and publish drafts.
					</p>
				</div>
				<NewPageDialog
					parentId={null}
					locales={locales}
					trigger={
						<Button size="lg" disabled={locales.length === 0}>
							<IconPlus className="size-4" />
							New page
						</Button>
					}
				/>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 4 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
						<div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
					))}
				</div>
			) : !tree || tree.length === 0 ? (
				<div className="rounded-lg border py-10 text-center text-muted-foreground">
					<IconFileText className="mx-auto mb-2 size-8 opacity-40" />
					No pages yet.
				</div>
			) : (
				<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
					<RootDropZone>
						{tree.map((node) => (
							<TreeRow
								key={node.id}
								node={node}
								depth={0}
								expanded={expanded}
								onToggle={toggle}
								onPublish={(id) => publish.mutate(id)}
								publishingId={publish.isPending ? publish.variables : undefined}
								locales={locales}
							/>
						))}
					</RootDropZone>
				</DndContext>
			)}
		</div>
	);
}
