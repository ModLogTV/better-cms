import { useEffect, useState } from "react";
import { loadPageContent } from "../client/pages";
import { loadTranslations } from "../client/translations";
import type { RawBlock } from "../core/adapter";
import type { NamespaceDef } from "../i18n/namespace";
import { createRichTranslator, createTranslator } from "../i18n/translator";
import type {
	NamespaceDefinition,
	RichTranslatorFn,
	TranslatorFn,
} from "../i18n/types";
import { useCMSContext } from "./context";

/**
 * Returns typed `t()` and `tRich()` functions for the given namespace.
 * Reads from CMSProvider context — no fetch if namespace was pre-loaded server-side.
 * Falls back to loadTranslations() if namespace is missing from context.
 */
export function useTranslations<T extends NamespaceDefinition>(
	ns: NamespaceDef<T>,
): { t: TranslatorFn<T>; tRich: RichTranslatorFn<T> } {
	const ctx = useCMSContext();
	const existing = ctx.translations[ns.name];

	const [translations, setLocalTranslations] = useState<Record<string, string>>(
		existing ?? {},
	);

	useEffect(() => {
		if (existing) {
			setLocalTranslations(existing);
			return;
		}
		void loadTranslations(ns.name, ctx.locale).then((data) => {
			ctx.setTranslations(ns.name, data);
			setLocalTranslations(data);
		});
	}, [ns.name, ctx.locale, existing, ctx.setTranslations]);

	const t = createTranslator(ns, translations, ctx.locale);
	const tRich = createRichTranslator(ns, translations, ctx.locale);

	return { t, tRich };
}

/**
 * Returns page blocks for the given slug.
 * Reads from CMSProvider context — no fetch if slug was pre-loaded server-side.
 */
export function usePageContent(slug: string): RawBlock[] {
	const ctx = useCMSContext();
	const existing = ctx.content[slug];

	const [blocks, setBlocks] = useState<RawBlock[]>(existing ?? []);

	useEffect(() => {
		if (existing) {
			setBlocks(existing);
			return;
		}
		void loadPageContent(slug, ctx.locale).then((data) => {
			ctx.setContent(slug, data);
			setBlocks(data);
		});
	}, [slug, ctx.locale, existing, ctx.setContent]);

	return blocks;
}

/**
 * Returns the current locale and a setter that persists the choice in a cookie.
 * Calling `setLocale` sets `document.cookie` — wire up a page refresh or router.refresh() as needed.
 */
export function useLocale(): {
	locale: string;
	setLocale: (locale: string) => void;
} {
	const ctx = useCMSContext();

	const setLocale = (locale: string) => {
		const cookie = [
			`locale=${encodeURIComponent(locale)}`,
			"path=/",
			"max-age=31536000",
			"SameSite=Lax",
		].join("; ");
		// biome-ignore lint/suspicious/noDocumentCookie: no cookie API alternative for cross-browser compatibility
		document.cookie = cookie;
		ctx.setLocale(locale);
	};

	return { locale: ctx.locale, setLocale };
}
