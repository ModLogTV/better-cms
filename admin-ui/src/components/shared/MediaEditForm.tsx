import {
	IconPencil,
	IconPlus,
	IconTrash,
	IconUpload,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api, type MediaAsset } from "@/lib/api";
import { cn } from "@/lib/utils";

// Reserved metadata keys with dedicated fields/read-only display - everything
// else in an asset's metadata is a free-form custom field.
const KNOWN_KEYS = new Set(["alt", "caption", "width", "height", "duration"]);

interface CustomField {
	key: string;
	value: string;
}

function metadataToCustomFields(
	metadata: Record<string, unknown>,
): CustomField[] {
	return Object.entries(metadata)
		.filter(([key]) => !KNOWN_KEYS.has(key))
		.map(([key, value]) => ({ key, value: String(value) }));
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.round(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

interface FormValues {
	alt: string;
	caption: string;
	customFields: CustomField[];
}

export function MediaEditForm({
	asset,
	triggerClassName,
}: {
	asset: MediaAsset;
	/** Overrides the trigger button's default `size-7` square styling. */
	triggerClassName?: string;
}) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [reuploadProgress, setReuploadProgress] = useState<number | null>(null);
	const metadata = asset.metadata ?? {};
	const width = metadata.width;
	const height = metadata.height;
	const duration = metadata.duration;

	const update = useMutation({
		mutationFn: (values: FormValues) => {
			const nextMetadata: Record<string, unknown> = {
				...metadata,
				alt: values.alt,
				caption: values.caption,
			};
			for (const key of Object.keys(nextMetadata)) {
				if (!KNOWN_KEYS.has(key)) delete nextMetadata[key];
			}
			for (const field of values.customFields) {
				if (field.key.trim()) nextMetadata[field.key.trim()] = field.value;
			}
			return api.media.update(asset.id, { metadata: nextMetadata });
		},
		onSuccess: () => {
			toast.success("Metadata saved");
			qc.invalidateQueries({ queryKey: ["cms", "media"] });
			setOpen(false);
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't save metadata"),
	});

	const reupload = useMutation({
		mutationFn: (file: File) =>
			api.media.reupload(asset, file, (percent) =>
				setReuploadProgress(percent),
			),
		onSuccess: () => {
			toast.success("File replaced");
			qc.invalidateQueries({ queryKey: ["cms", "media"] });
			setReuploadProgress(null);
		},
		onError: (e) => {
			toast.error(e instanceof Error ? e.message : "Couldn't replace file");
			setReuploadProgress(null);
		},
	});

	function handleReuploadFile(files: FileList | null) {
		const file = files?.[0];
		if (!file) return;
		setReuploadProgress(0);
		reupload.mutate(file);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	const form = useForm({
		defaultValues: {
			alt: typeof metadata.alt === "string" ? metadata.alt : "",
			caption: typeof metadata.caption === "string" ? metadata.caption : "",
			customFields: metadataToCustomFields(metadata),
		} as FormValues,
		onSubmit: async ({ value }) => {
			await update.mutateAsync(value);
		},
	});

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<SheetTrigger asChild>
						<Button
							size="icon"
							variant="outline"
							className={cn("size-7", triggerClassName)}
						>
							<IconPencil className="size-3.5" />
						</Button>
					</SheetTrigger>
				</TooltipTrigger>
				<TooltipContent>Edit</TooltipContent>
			</Tooltip>
			<SheetContent className="overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>
						Edit <span className="font-mono">{asset.filename}</span>
					</SheetTitle>
				</SheetHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4 px-6 pb-6"
				>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border p-3 text-xs">
						<span className="text-muted-foreground">Filename</span>
						<span className="truncate font-mono">{asset.filename}</span>
						<span className="text-muted-foreground">Type</span>
						<span className="font-mono">{asset.mimeType}</span>
						<span className="text-muted-foreground">Size</span>
						<span>{formatBytes(asset.size)}</span>
						{typeof width === "number" && typeof height === "number" && (
							<>
								<span className="text-muted-foreground">Dimensions</span>
								<span>
									{width} × {height}
								</span>
							</>
						)}
						{typeof duration === "number" && (
							<>
								<span className="text-muted-foreground">Duration</span>
								<span>{formatDuration(duration)}</span>
							</>
						)}
						{asset.uploadedBy && (
							<>
								<span className="text-muted-foreground">Uploaded by</span>
								<span className="truncate font-mono">{asset.uploadedBy}</span>
							</>
						)}
						<span className="text-muted-foreground">Created</span>
						<span>{new Date(asset.createdAt).toLocaleString()}</span>
					</div>

					<div className="space-y-1.5">
						<Label>File</Label>
						<div className="flex items-center gap-2">
							<input
								ref={fileInputRef}
								type="file"
								className="hidden"
								onChange={(e) => handleReuploadFile(e.target.files)}
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => fileInputRef.current?.click()}
								disabled={reuploadProgress !== null}
							>
								<IconUpload className="size-3.5" />
								{reuploadProgress !== null
									? `Uploading… ${reuploadProgress}%`
									: "Replace file…"}
							</Button>
						</div>
						<p className="text-muted-foreground text-[11px]">
							Uploads a new file under this same filename and asset - the
							current version stays in history and can be restored later.
						</p>
					</div>

					<form.Field name="alt">
						{(field) => (
							<div className="space-y-1.5">
								<Label>Alt text</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Describes the asset for screen readers"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="caption">
						{(field) => (
							<div className="space-y-1.5">
								<Label>Caption</Label>
								<Textarea
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									rows={2}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="customFields" mode="array">
						{(field) => (
							<div className="space-y-1.5">
								<Label>Custom fields</Label>
								{field.state.value.map((_, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: rows are reordered by index only on add/remove, not by identity
									<div key={i} className="flex items-center gap-1.5">
										<Input
											value={field.state.value[i].key}
											onChange={(e) =>
												field.replaceValue(i, {
													...field.state.value[i],
													key: e.target.value,
												})
											}
											placeholder="key"
											className="font-mono text-xs"
										/>
										<Input
											value={field.state.value[i].value}
											onChange={(e) =>
												field.replaceValue(i, {
													...field.state.value[i],
													value: e.target.value,
												})
											}
											placeholder="value"
										/>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											className="size-7 shrink-0"
											onClick={() => field.removeValue(i)}
										>
											<IconTrash className="size-3.5" />
										</Button>
									</div>
								))}
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => field.pushValue({ key: "", value: "" })}
								>
									<IconPlus className="size-3.5" />
									Add field
								</Button>
							</div>
						)}
					</form.Field>

					<SheetFooter className="px-0">
						<Button type="submit" disabled={update.isPending}>
							{update.isPending ? "Saving…" : "Save"}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
