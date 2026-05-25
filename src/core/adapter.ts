export interface Page {
	id: string;
	slug: string;
	locale: string;
	blocks: RawBlock[];
	status: "draft" | "published";
	publishedAt: Date | null;
	updatedAt: Date;
}

export interface PageSummary {
	id: string;
	slug: string;
	locale: string;
	status: "draft" | "published";
	updatedAt: Date;
}

export interface RawBlock {
	type: string;
	data: unknown;
}

export interface Locale {
	code: string;
	name: string;
	isDefault: boolean;
	updatedAt: Date;
}

export interface CMSAdapter {
	getTranslations(opts: {
		namespace: string;
		locale: string;
	}): Promise<Record<string, string>>;
	upsertTranslations(opts: {
		namespace: string;
		locale: string;
		values: Record<string, string>;
	}): Promise<void>;
	getPage(opts: {
		slug: string;
		locale: string;
		draft: boolean;
	}): Promise<Page | null>;
	upsertPage(opts: { id: string; blocks: RawBlock[] }): Promise<void>;
	publishPage(opts: { id: string }): Promise<void>;
	listPages(): Promise<PageSummary[]>;
	listLocales(): Promise<Locale[]>;
	upsertLocale(opts: {
		code: string;
		name: string;
		isDefault?: boolean;
	}): Promise<void>;
	deleteLocale(opts: { code: string }): Promise<void>;
}
