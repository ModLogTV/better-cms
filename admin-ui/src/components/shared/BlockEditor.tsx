import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	IconCode,
	IconGripVertical,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
	api,
	type BlockFieldInfo,
	type BlockInfo,
	type RawBlock,
} from "@/lib/api";

function defaultValueFor(field: BlockFieldInfo) {
	if (field.optional) return undefined;
	switch (field.type) {
		case "boolean":
			return false;
		case "number":
			return 0;
		default:
			return "";
	}
}

function defaultDataFor(block: BlockInfo) {
	const data: Record<string, unknown> = {};
	for (const field of block.fields) {
		const value = defaultValueFor(field);
		if (value !== undefined) data[field.key] = value;
	}
	return data;
}

function FieldInput({
	field,
	value,
	onChange,
}: {
	field: BlockFieldInfo;
	value: unknown;
	onChange: (value: unknown) => void;
}) {
	const id = `block-field-${field.key}`;

	if (field.type === "boolean") {
		return (
			<div className="flex items-center gap-2">
				<Checkbox
					id={id}
					checked={value === true}
					onCheckedChange={(checked) => onChange(checked === true)}
				/>
				<Label htmlFor={id} className="font-normal">
					{field.label}
					{field.optional && (
						<span className="ml-1 text-xs text-muted-foreground">
							(optional)
						</span>
					)}
				</Label>
			</div>
		);
	}

	return (
		<div className="space-y-1.5">
			<Label htmlFor={id}>
				{field.label}
				{field.optional && (
					<span className="ml-1 text-xs text-muted-foreground">(optional)</span>
				)}
			</Label>
			{field.type === "textarea" ? (
				<Textarea
					id={id}
					value={typeof value === "string" ? value : ""}
					onChange={(e) => onChange(e.target.value)}
				/>
			) : (
				<Input
					id={id}
					type={field.type === "number" ? "number" : "text"}
					value={
						typeof value === "string" || typeof value === "number" ? value : ""
					}
					onChange={(e) =>
						onChange(
							field.type === "number" ? e.target.valueAsNumber : e.target.value,
						)
					}
				/>
			)}
		</div>
	);
}

/** RawBlock + a stable client-side id for dnd-kit (not persisted). */
type EditableBlock = RawBlock & { __id: string };

let nextId = 0;
function withIds(blocks: RawBlock[]): EditableBlock[] {
	return blocks.map((b) => ({ ...b, __id: `block-${nextId++}` }));
}
function stripIds(blocks: EditableBlock[]): RawBlock[] {
	return blocks.map(({ __id, ...rest }) => rest);
}

function BlockCard({
	block,
	info,
	onChange,
	onRemove,
}: {
	block: EditableBlock;
	info: BlockInfo | undefined;
	onChange: (data: unknown) => void;
	onRemove: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: block.__id });
	const [rawJson, setRawJson] = useState(() =>
		JSON.stringify(block.data, null, 2),
	);
	const [jsonError, setJsonError] = useState<string | null>(null);

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const useRawEditor = !info || info.fields.length === 0;
	const data = (block.data ?? {}) as Record<string, unknown>;

	function handleRawChange(val: string) {
		setRawJson(val);
		try {
			onChange(JSON.parse(val));
			setJsonError(null);
		} catch (e) {
			setJsonError(e instanceof Error ? e.message : "Invalid JSON");
		}
	}

	return (
		<div ref={setNodeRef} style={style} className="rounded-lg border bg-card">
			<div className="flex items-center gap-2 border-b px-3 py-2">
				<button
					type="button"
					className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
					{...attributes}
					{...listeners}
				>
					<IconGripVertical className="size-4" />
				</button>
				<Badge variant="outline">{info?.label ?? block.type}</Badge>
				{useRawEditor && (
					<span className="flex items-center gap-1 text-xs text-muted-foreground">
						<IconCode className="size-3" />
						raw JSON - no field metadata registered for this block type
					</span>
				)}
				<Button
					size="sm"
					variant="ghost"
					className="ml-auto h-7 text-muted-foreground hover:text-destructive"
					onClick={onRemove}
				>
					<IconTrash className="size-3.5" />
				</Button>
			</div>
			<div className="space-y-3 p-3">
				{useRawEditor ? (
					<div className="space-y-1">
						<Textarea
							value={rawJson}
							onChange={(e) => handleRawChange(e.target.value)}
							className="min-h-24 font-mono text-xs"
							spellCheck={false}
						/>
						{jsonError && (
							<p className="text-xs text-destructive">{jsonError}</p>
						)}
					</div>
				) : (
					info.fields.map((field) => (
						<FieldInput
							key={field.key}
							field={field}
							value={data[field.key]}
							onChange={(value) => onChange({ ...data, [field.key]: value })}
						/>
					))
				)}
			</div>
		</div>
	);
}

export function BlockEditor({
	blocks,
	onChange,
}: {
	blocks: RawBlock[];
	onChange: (next: RawBlock[]) => void;
}) {
	const [items, setItems] = useState<EditableBlock[]>(() => withIds(blocks));
	const [addType, setAddType] = useState("");

	const { data: catalog, isLoading } = useQuery({
		queryKey: ["cms", "blocks"],
		queryFn: () => api.pages.describeBlocks(),
	});
	const catalogByType = new Map((catalog ?? []).map((b) => [b.type, b]));

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function commit(next: EditableBlock[]) {
		setItems(next);
		onChange(stripIds(next));
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = items.findIndex((b) => b.__id === active.id);
		const newIndex = items.findIndex((b) => b.__id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;
		const next = [...items];
		const [moved] = next.splice(oldIndex, 1);
		next.splice(newIndex, 0, moved);
		commit(next);
	}

	function addBlock() {
		const info = catalogByType.get(addType);
		if (!info) return;
		commit([
			...items,
			{
				type: info.type,
				data: defaultDataFor(info),
				__id: `block-${nextId++}`,
			},
		]);
		setAddType("");
	}

	function updateBlock(id: string, data: unknown) {
		commit(items.map((b) => (b.__id === id ? { ...b, data } : b)));
	}

	function removeBlock(id: string) {
		commit(items.filter((b) => b.__id !== id));
	}

	if (isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={items.map((b) => b.__id)}
					strategy={verticalListSortingStrategy}
				>
					{items.map((block) => (
						<BlockCard
							key={block.__id}
							block={block}
							info={catalogByType.get(block.type)}
							onChange={(data) => updateBlock(block.__id, data)}
							onRemove={() => removeBlock(block.__id)}
						/>
					))}
				</SortableContext>
			</DndContext>

			{items.length === 0 && (
				<div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
					No blocks yet. Add one below.
				</div>
			)}

			<div className="flex gap-2">
				<Select value={addType} onValueChange={setAddType}>
					<SelectTrigger className="flex-1">
						<SelectValue placeholder="Add a block…" />
					</SelectTrigger>
					<SelectContent>
						{(catalog ?? []).map((b) => (
							<SelectItem key={b.type} value={b.type}>
								{b.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button variant="outline" onClick={addBlock} disabled={!addType}>
					<IconPlus className="size-4" />
					Add block
				</Button>
			</div>
		</div>
	);
}
