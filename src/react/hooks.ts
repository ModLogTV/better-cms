import { useEffect, useState } from "react";
import { cmsEvents } from "../client/events";
import { loadPageContent } from "../client/pages";
import { loadTranslations } from "../client/translations";
import type { RawBlock } from "../core/adapter";
import type { CMSEventEmitter } from "../core/events";
import type { NamespaceDef } from "../i18n/namespace";
import { createRichTranslator, createTranslator } from "../i18n/translator";
import type {
	NamespaceDefinition,
	RichTranslatorFn,
	TranslatorFn,
} from "../i18n/types";
import { useCMSContext } from "./context";

/**
 * Hook to subscribe to CMS client-side events.
 * Automatically cleans up the listener on unmount.
 *
 * @example
 * ```ts
 * useCMSClientEvents("client:fetch:error", ({ error }) => {
 *   toast.error(`CMS Fetch failed: ${error.message}`);
 * });
 * ```
 */
export function useCMSClientEvents<
	K extends keyof Parameters<CMSEventEmitter["on"]>[0] | string,
>(
	event: K,
	// @ts-ignore - dynamic event map typing is complex with the emitter
	handler: Parameters<CMSEventEmitter["on"]>[1],
) {
	useEffect(() => {
		// @ts-ignore
		cmsEvents.on(event, handler);
		return () => {
			// @ts-ignore
			cmsEvents.off(event, handler);
		};
	}, [event, handler]);
}

/**
 * Returns typed `t()` and `tRich()` functions for the given namespace.
 * Reads from CMSProvider context — no fetch if namespace was pre-loaded server-side.
 * Falls back to loadTranslations() if namespace is missing from context.
 */
export function useTranslations<T extends NamespaceDefinition>(
	ns: NamespaceDef<T>,
	options?: {
		onSuccess?: (data: Record<string, string>) => void;
		onError?: (error: Error) => void;
	},
): {
	t: TranslatorFn<T>;
	tRich: RichTranslatorFn<T>;
	isLoading: boolean;
	error: Error | null;
} {
	const ctx = useCMSContext();
	const existing = ctx.translations[ns.name];

	const [translations, setLocalTranslations] = useState<Record<string, string>>(
		existing ?? {},
	);
	const [isLoading, setIsLoading] = useState(!existing);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		if (existing) {
			setLocalTranslations(existing);
			setIsLoading(false);
			setError(null);
			return;
		}

		setIsLoading(true);
		loadTranslations({ namespace: ns.name, locale: ctx.locale })
			.then((data) => {
				ctx.setTranslations({ namespace: ns.name, values: data });
				setLocalTranslations(data);
				setError(null);
				options?.onSuccess?.(data);
			})
			.catch((err) => {
				const error = err instanceof Error ? err : new Error(String(err));
				setError(error);
				options?.onError?.(error);
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [ns.name, ctx.locale, existing, ctx.setTranslations, options?.onSuccess, options?.onError]);

	const t = createTranslator({ ns, translations, locale: ctx.locale });
	const tRich = createRichTranslator({ ns, translations, locale: ctx.locale });

	return { t, tRich, isLoading, error };
}

/**
 * Returns page blocks for the given slug.
 * Reads from CMSProvider context — no fetch if slug was pre-loaded server-side.
 */
export function usePageContent(opts: {
	slug: string;
	onSuccess?: (data: RawBlock[]) => void;
	onError?: (error: Error) => void;
}): {
	data: RawBlock[];
	isLoading: boolean;
	error: Error | null;
} {
	const { slug, onSuccess, onError } = opts;
	const ctx = useCMSContext();
	const existing = ctx.content[slug];

	const [blocks, setBlocks] = useState<RawBlock[]>(existing ?? []);
	const [isLoading, setIsLoading] = useState(!existing);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		if (existing) {
			setBlocks(existing);
			setIsLoading(false);
			setError(null);
			return;
		}

		setIsLoading(true);
		loadPageContent({ slug, locale: ctx.locale })
			.then((data) => {
				ctx.setContent({ slug, blocks: data });
				setBlocks(data);
				setError(null);
				onSuccess?.(data);
			})
			.catch((err) => {
				const error = err instanceof Error ? err : new Error(String(err));
				setError(error);
				onError?.(error);
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [slug, ctx.locale, existing, ctx.setContent, onSuccess, onError]);

	return { data: blocks, isLoading, error };
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
