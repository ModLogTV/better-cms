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
	IconClock,
	IconFileText,
	IconFolder,
	IconGripVertical,
	IconPencil,
	IconPlus,
	IconRocket,
	IconWorld,
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
import { ApiError, api, type PageTreeNode } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_layout/pages/")({
	component: PagesPage,
});

const ROOT_DROP_ID = "__root__";

interface NewPageValues {
	slug: string;
}

function NewPageDialog({
	parentId,
	parentPath,
	locale,
	trigger,
}: {
	parentId: string | null;
	parentPath?: string;
	locale: string;
	trigger: React.ReactNode;
}) {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);

	const create = useMutation({
		mutationFn: (values: NewPageValues) =>
			api.pages.create(values.slug, locale, parentId),
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

	const form = useForm({
		defaultValues: { slug: "" } as NewPageValues,
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
						<div className="text-muted-foreground text-sm">
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
							{" · "}
							<Badge variant="outline" className="align-middle">
								{locale}
							</Badge>
						</div>
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
					</div>
					<DialogFooter>
						<form.Subscribe selector={(state) => state.values.slug}>
							{(slug) => (
								<Button
									type="submit"
									disabled={create.isPending || !slug.trim()}
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

function StatusBadge({ status }: { status: PageTreeNode["status"] }) {
	return (
		<Badge variant={status === "published" ? "success" : "warning"}>
			{status}
		</Badge>
	);
}

function TreeRow({
	node,
	depth,
	expanded,
	onToggle,
	onPublish,
	publishingId,
}: {
	node: PageTreeNode;
	depth: number;
	expanded: Set<string>;
	onToggle: (id: string) => void;
	onPublish: (id: string) => void;
	publishingId: string | undefined;
}) {
	const hasChildren = node.children.length > 0;
	const isExpanded = expanded.has(node.id);

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		isDragging,
	} = useDraggable({ id: node.id });
	const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id });

	return (
		<div>
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
						!hasChildren && "invisible",
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
				<StatusBadge status={node.status} />
				<span className="ml-auto flex items-center gap-2">
					<span className="hidden text-muted-foreground text-xs sm:inline">
						{new Date(node.updatedAt).toLocaleDateString()}
					</span>
					<NewPageDialog
						parentId={node.id}
						parentPath={node.path}
						locale={node.locale}
						trigger={
							<Button
								size="icon"
								variant="ghost"
								className="size-6 opacity-0 group-hover:opacity-100"
								title="Add child page"
							>
								<IconPlus className="size-3.5" />
							</Button>
						}
					/>
					{node.status === "draft" && (
						<Button
							size="sm"
							variant="outline"
							className="h-6 gap-1 text-xs"
							onClick={() => onPublish(node.id)}
							disabled={publishingId === node.id}
						>
							<IconRocket className="size-3" />
							Publish
						</Button>
					)}
					<Button
						size="sm"
						variant="outline"
						className="h-6 gap-1 text-xs"
						asChild
					>
						<Link
							to="/pages/$pageId"
							params={{ pageId: node.id }}
							search={{ path: node.path, locale: node.locale }}
						>
							<IconPencil className="size-3" />
							Edit
						</Link>
					</Button>
				</span>
			</div>
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

	const [locale, setLocale] = useState<string | undefined>(undefined);
	const activeLocale =
		locale ?? locales.find((l) => l.isDefault)?.code ?? locales[0]?.code;

	const { data: tree, isLoading } = useQuery({
		queryKey: ["cms", "pages", "tree", activeLocale],
		queryFn: () => api.pages.tree(activeLocale),
		enabled: !!activeLocale,
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
		mutationFn: (id: string) => api.pages.publish(id),
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
				<div className="flex items-center gap-2">
					<Select value={activeLocale} onValueChange={setLocale}>
						<SelectTrigger className="w-40">
							<IconWorld className="size-4 text-muted-foreground" />
							<SelectValue placeholder="Locale" />
						</SelectTrigger>
						<SelectContent>
							{locales.map((l) => (
								<SelectItem key={l.code} value={l.code}>
									{l.name} ({l.code})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{activeLocale && (
						<NewPageDialog
							parentId={null}
							locale={activeLocale}
							trigger={
								<Button size="lg">
									<IconPlus className="size-4" />
									New page
								</Button>
							}
						/>
					)}
				</div>
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
					No pages yet for this locale.
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
							/>
						))}
					</RootDropZone>
					<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
						<IconClock className="size-3.5" />
						Drag the handle to reparent a page - drop on a folder to nest it, or
						anywhere empty to move it to the root.
					</p>
				</DndContext>
			)}
		</div>
	);
}
