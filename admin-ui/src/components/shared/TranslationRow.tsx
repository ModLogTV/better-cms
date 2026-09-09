import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, type KeyMetadata } from "@/lib/api";

function inputHintBadge(hint: KeyMetadata["inputHint"]) {
	const map: Record<KeyMetadata["inputHint"], string> = {
		text: "text",
		"text+vars": "vars",
		"text+count": "plural",
		"rich-text": "rich",
	};
	return map[hint];
}

/** A single translation key + inline-editable value, saved on blur. Must be rendered inside a <Table>. */
export function TranslationRow({
	meta,
	value,
	namespace,
	locale,
}: {
	meta: KeyMetadata;
	value: string;
	namespace: string;
	locale: string;
}) {
	const qc = useQueryClient();
	const [draft, setDraft] = useState(value);
	const [dirty, setDirty] = useState(false);

	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			api.namespaces.updateTranslation(namespace, locale, meta.key, draft),
		onSuccess: () => {
			setDirty(false);
			qc.invalidateQueries({
				queryKey: ["cms", "translations", namespace, locale],
			});
			qc.invalidateQueries({ queryKey: ["cms", "namespaces"] });
		},
		onError: () => toast.error("Failed to save translation"),
	});

	function handleChange(val: string) {
		setDraft(val);
		setDirty(val !== value);
	}

	function handleBlur() {
		if (dirty) mutate();
	}

	const isMultiline = meta.inputHint === "rich-text";

	return (
		<TableRow>
			<TableCell className="align-top">
				<div className="flex flex-col gap-1">
					<code className="text-xs text-foreground">{meta.key}</code>
					<Badge variant="outline" className="w-fit text-[10px]">
						{inputHintBadge(meta.inputHint)}
					</Badge>
					{meta.vars && meta.vars.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{meta.vars.map((v) => (
								<code
									key={v}
									className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
								>
									{"{"}
									{v}
									{"}"}
								</code>
							))}
						</div>
					)}
				</div>
			</TableCell>
			<TableCell className="relative">
				{isMultiline ? (
					<Textarea
						value={draft}
						onChange={(e) => handleChange(e.target.value)}
						onBlur={handleBlur}
						className="min-h-20 font-mono text-sm"
					/>
				) : (
					<Input
						value={draft}
						onChange={(e) => handleChange(e.target.value)}
						onBlur={handleBlur}
						className="font-mono text-sm"
					/>
				)}
				{isPending && (
					<IconLoader2 className="absolute right-2 top-1/2 size-3 -translate-y-1/2 animate-spin text-muted-foreground" />
				)}
			</TableCell>
		</TableRow>
	);
}
