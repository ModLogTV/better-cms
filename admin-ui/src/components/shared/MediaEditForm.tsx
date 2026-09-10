import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { api, type MediaAsset } from "@/lib/api";

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

export function MediaEditForm({ asset }: { asset: MediaAsset }) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
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
			return api.media.updateMetadata(asset.id, nextMetadata);
		},
		onSuccess: () => {
			toast.success("Metadata saved");
			qc.invalidateQueries({ queryKey: ["cms", "media"] });
			setOpen(false);
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't save metadata"),
	});

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
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="icon" variant="outline" className="size-7" title="Edit">
					<IconPencil className="size-3.5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						Edit <span className="font-mono">{asset.filename}</span>
					</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
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

					<DialogFooter>
						<Button type="submit" disabled={update.isPending}>
							{update.isPending ? "Saving…" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
