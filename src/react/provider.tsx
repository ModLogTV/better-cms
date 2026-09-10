import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { loadPageContent } from "../client/pages";
import { loadTranslations } from "../client/translations";
import type { RawBlock } from "../core/adapter";
import { CMSContext, type CMSContextValue } from "./context";

interface CMSProviderProps {
	initialLocale: string;
	/** Pre-fetched translations keyed by namespace - avoids client fetch on first render */
	initialTranslations?: Record<string, Record<string, string>>;
	/** Pre-fetched page content keyed by slug - avoids client fetch on first render */
	initialContent?: Record<string, RawBlock[]>;
	/** Background refetch interval in seconds. Default: off */
	refetchInterval?: number;
	children: ReactNode;
}

/**
 * Seeds client components with server-fetched translations and page content.
 * Nested providers merge their data into the parent context.
 * Pass `refetchInterval` to enable background polling.
 */
export function CMSProvider({
	initialLocale,
	initialTranslations = {},
	initialContent = {},
	refetchInterval,
	children,
}: CMSProviderProps) {
	const [translations, setAllTranslations] =
		useState<Record<string, Record<string, string>>>(initialTranslations);
	const [content, setAllContent] =
		useState<Record<string, RawBlock[]>>(initialContent);
	const [currentLocale, setCurrentLocale] = useState(initialLocale);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Sync state with prop when it changes (e.g. URL navigation)
	useEffect(() => {
		setCurrentLocale(initialLocale);
	}, [initialLocale]);

	const setTranslations = useCallback(
		({
			namespace,
			values,
		}: {
			namespace: string;
			values: Record<string, string>;
		}) => {
			// loadTranslations() resolves the same cached object reference on a
			// TTL cache hit - skip the update so revalidation on every hook mount
			// doesn't churn context identity when nothing actually changed.
			setAllTranslations((prev) =>
				prev[namespace] === values ? prev : { ...prev, [namespace]: values },
			);
		},
		[],
	);

	const setContent = useCallback(
		({ slug, blocks }: { slug: string; blocks: RawBlock[] }) => {
			setAllContent((prev) =>
				prev[slug] === blocks ? prev : { ...prev, [slug]: blocks },
			);
		},
		[],
	);

	const translationsRef = useRef(translations);
	const contentRef = useRef(content);
	translationsRef.current = translations;
	contentRef.current = content;

	useEffect(() => {
		if (!refetchInterval) return;
		intervalRef.current = setInterval(async () => {
			const namespaces = Object.keys(translationsRef.current);
			const slugs = Object.keys(contentRef.current);
			await Promise.all([
				...namespaces.map(async (ns) => {
					const data = await loadTranslations({
						namespace: ns,
						locale: currentLocale,
					});
					setTranslations({ namespace: ns, values: data });
				}),
				...slugs.map(async (slug) => {
					const data = await loadPageContent({ slug, locale: currentLocale });
					setContent({ slug, blocks: data });
				}),
			]);
		}, refetchInterval * 1000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [refetchInterval, currentLocale, setTranslations, setContent]);

	const value: CMSContextValue = {
		locale: currentLocale,
		translations,
		content,
		setTranslations,
		setContent,
		setLocale: setCurrentLocale,
	};

	return <CMSContext.Provider value={value}>{children}</CMSContext.Provider>;
}
