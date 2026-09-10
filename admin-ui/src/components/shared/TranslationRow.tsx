import { IconLoader2 } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useTranslationEditor } from "@/hooks/use-translation-editor";
import type { KeyMetadata } from "@/lib/api";

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
	const { draft, handleChange, handleBlur, isPending } = useTranslationEditor({
		namespace,
		locale,
		keyName: meta.key,
		value,
	});

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
