import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

/** Inline-edit-on-blur state/mutation for a single translation key, shared by TranslationRow and the namespace editor table's value cell. */
export function useTranslationEditor(opts: {
	namespace: string;
	locale: string;
	keyName: string;
	value: string;
}) {
	const { namespace, locale, keyName, value } = opts;
	const qc = useQueryClient();
	const [draft, setDraft] = useState(value);
	const [dirty, setDirty] = useState(false);

	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			api.namespaces.updateTranslation(namespace, locale, keyName, draft),
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

	return { draft, handleChange, handleBlur, isPending };
}
