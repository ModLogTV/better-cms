import { IconPlus, IconStar, IconTrash } from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { cn } from "cn";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { ConfirmPopover } from "@/components/shared/ConfirmPopover";
import { LocaleCombobox, LocaleFlag } from "@/components/shared/LocaleCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { api, type Locale } from "@/lib/api";
import { countryFromLocaleCode } from "@/lib/locales";

export const Route = createFileRoute("/_layout/locales/")({
	component: LocalesPage,
});

interface AddLocaleValues {
	code: string;
	name: string;
	isDefault: boolean;
}

type LocaleSourceMode = "preset" | "custom";

function AddLocaleDialog() {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<LocaleSourceMode>("preset");

	const upsert = useMutation({
		mutationFn: (values: AddLocaleValues) => api.locales.upsert(values),
		onSuccess: () => {
			toast.success("Locale saved");
			qc.invalidateQueries({ queryKey: ["cms", "locales"] });
			setOpen(false);
		},
		onError: () => toast.error("Failed to save locale"),
	});

	const form = useForm({
		defaultValues: { code: "", name: "", isDefault: false } as AddLocaleValues,
		onSubmit: async ({ value }) => {
			await upsert.mutateAsync(value);
		},
	});

	function resetAll() {
		form.reset();
		setMode("preset");
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				setOpen(o);
				if (!o) resetAll();
			}}
		>
			<DialogTrigger asChild>
				<Button size="lg">
					<IconPlus className="size-4" />
					Add locale
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Add locale</DialogTitle>
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
						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								onClick={() => setMode("preset")}
								className={cn(
									"rounded-lg border p-3 text-left text-sm transition-colors",
									mode === "preset"
										? "border-primary text-primary"
										: "border-border text-muted-foreground hover:text-foreground",
								)}
							>
								<p className="font-medium">Use common preset</p>
								<p className="text-xs opacity-80">Pick a curated locale</p>
							</button>
							<button
								type="button"
								onClick={() => setMode("custom")}
								className={cn(
									"rounded-lg border p-3 text-left text-sm transition-colors",
									mode === "custom"
										? "border-primary text-primary"
										: "border-border text-muted-foreground hover:text-foreground",
								)}
							>
								<p className="font-medium">Custom configuration</p>
								<p className="text-xs opacity-80">Enter code and name</p>
							</button>
						</div>

						{mode === "preset" ? (
							<div className="space-y-1.5">
								<Label>Search common locales</Label>
								<LocaleCombobox
									onSelect={(locale) => {
										form.setFieldValue("code", locale.code);
										form.setFieldValue("name", locale.name);
									}}
								/>
								<form.Subscribe
									selector={(state) =>
										[state.values.code, state.values.name] as const
									}
								>
									{([code, name]) =>
										code ? (
											<p className="text-xs text-muted-foreground">
												Selected{" "}
												<span className="font-medium text-foreground">
													{name}
												</span>{" "}
												(<code className="font-mono">{code}</code>)
											</p>
										) : null
									}
								</form.Subscribe>
							</div>
						) : (
							<>
								<form.Field
									name="code"
									validators={{
										onChange: ({ value }) =>
											!value.trim() ? "Required" : undefined,
									}}
								>
									{(field) => (
										<div className="space-y-1.5">
											<Label htmlFor={field.name}>Code</Label>
											<Input
												id={field.name}
												placeholder="en"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
										</div>
									)}
								</form.Field>
								<form.Field
									name="name"
									validators={{
										onChange: ({ value }) =>
											!value.trim() ? "Required" : undefined,
									}}
								>
									{(field) => (
										<div className="space-y-1.5">
											<Label htmlFor={field.name}>Name</Label>
											<Input
												id={field.name}
												placeholder="English"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
										</div>
									)}
								</form.Field>
							</>
						)}

						<form.Field name="isDefault">
							{(field) => (
								<label
									htmlFor={field.name}
									className="flex items-center gap-2 text-sm"
								>
									<Checkbox
										id={field.name}
										checked={field.state.value}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
									/>
									Set as default
								</label>
							)}
						</form.Field>
					</div>
					<DialogFooter>
						<form.Subscribe
							selector={(state) =>
								[state.values.code, state.values.name] as const
							}
						>
							{([code, name]) => (
								<Button
									type="submit"
									disabled={upsert.isPending || !code.trim() || !name.trim()}
								>
									{upsert.isPending ? "Saving…" : "Save"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function LocalesPage() {
	const qc = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
	});

	const remove = useMutation({
		mutationFn: (code: string) => api.locales.delete(code),
		onSuccess: () => {
			toast.success("Locale deleted");
			qc.invalidateQueries({ queryKey: ["cms", "locales"] });
		},
		onError: () => toast.error("Delete failed"),
	});

	const setDefault = useMutation({
		mutationFn: ({ code, name }: { code: string; name: string }) =>
			api.locales.upsert({ code, name, isDefault: true }),
		onSuccess: () => {
			toast.success("Default locale updated");
			qc.invalidateQueries({ queryKey: ["cms", "locales"] });
		},
	});

	const columns = useMemo<ColumnDef<Locale>[]>(
		() => [
			{
				id: "code",
				accessorKey: "code",
				header: "Code",
				cell: ({ row }) => {
					const country = countryFromLocaleCode(row.original.code);
					return (
						<Badge variant="outline" className="gap-1.5 font-mono">
							{country && <LocaleFlag country={country} />}
							{row.original.code}
						</Badge>
					);
				},
			},
			{
				id: "name",
				accessorKey: "name",
				header: "Name",
				cell: ({ row }) => (
					<span className="font-medium">{row.original.name}</span>
				),
			},
			{
				id: "isDefault",
				header: "Default",
				cell: ({ row }) =>
					row.original.isDefault && <Badge variant="success">default</Badge>,
			},
			{
				id: "updatedAt",
				accessorKey: "updatedAt",
				header: "Updated",
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{new Date(row.original.updatedAt).toLocaleDateString()}
					</span>
				),
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => {
					const locale = row.original;
					return (
						<div className="flex items-center justify-end gap-2">
							{!locale.isDefault && (
								<ConfirmPopover
									trigger={
										<Button
											size="sm"
											variant="outline"
											className="h-7 gap-1 text-xs"
										>
											<IconStar className="size-3" />
											Set default
										</Button>
									}
									title={`Make "${locale.name}" the default locale?`}
									description="Content without an explicit locale will fall back to this one."
									confirmLabel="Set default"
									loading={setDefault.isPending}
									onConfirm={() =>
										setDefault.mutate({ code: locale.code, name: locale.name })
									}
								/>
							)}
							<Button
								size="sm"
								variant="outline"
								className="h-7 text-destructive hover:bg-destructive/10"
								onClick={() => remove.mutate(locale.code)}
								disabled={locale.isDefault || remove.isPending}
							>
								<IconTrash className="size-3" />
							</Button>
						</div>
					);
				},
			},
		],
		[remove, setDefault],
	);

	const table = useReactTable({
		data: data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Locales</h2>
					<p className="text-muted-foreground">
						Manage languages supported by your CMS.
					</p>
				</div>
				<AddLocaleDialog />
			</div>

			{isLoading ? (
				<DataTableSkeleton
					columnCount={columns.length}
					withViewOptions={false}
					rowCount={3}
				/>
			) : (
				<DataTable table={table} />
			)}
		</div>
	);
}
