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
	getTranslations(
		namespace: string,
		locale: string,
	): Promise<Record<string, string>>;
	upsertTranslations(
		namespace: string,
		locale: string,
		values: Record<string, string>,
	): Promise<void>;
	getPage(slug: string, locale: string, draft: boolean): Promise<Page | null>;
	upsertPage(id: string, blocks: RawBlock[]): Promise<void>;
	publishPage(id: string): Promise<void>;
	listPages(): Promise<PageSummary[]>;
	listLocales(): Promise<Locale[]>;
	upsertLocale(code: string, name: string, isDefault?: boolean): Promise<void>;
	deleteLocale(code: string): Promise<void>;
}
