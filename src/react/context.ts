import { createContext, useContext } from "react";
import type { RawBlock } from "../core/adapter";

export interface CMSContextValue {
	locale: string;
	translations: Record<string, Record<string, string>>;
	content: Record<string, RawBlock[]>;
	setTranslations: (opts: { namespace: string; values: Record<string, string> }) => void;
	setContent: (opts: { slug: string; blocks: RawBlock[] }) => void;
	setLocale: (locale: string) => void;
}

export const CMSContext = createContext<CMSContextValue | null>(null);

export function useCMSContext(): CMSContextValue {
	const ctx = useContext(CMSContext);
	if (!ctx) throw new Error("useCMSContext: must be used inside <CMSProvider>");
	return ctx;
}
