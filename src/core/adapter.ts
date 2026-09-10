import type {
	PaginatedResult,
	PaginationParams,
	SortParam,
} from "./pagination";

export type {
	PaginatedResult,
	PaginationParams,
	SortParam,
} from "./pagination";

export interface MediaAsset {
	id: string;
	key: string;
	filename: string;
	mimeType: string;
	size: number;
	publicUrl: string;
	uploadedBy?: string;
	/** null until the browser confirms the upload completed */
	confirmedAt: Date | null;
	createdAt: Date;
}

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

export interface NamespaceLocaleMeta {
	locale: string;
	updatedAt: Date;
	/** Number of keys present in the stored `values` blob for this locale. */
	keyCount: number;
}

export interface ListPagesParams extends PaginationParams {
	sort?: SortParam[];
	status?: Page["status"];
	locale?: string;
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
	/** Per-locale key count and last-updated timestamp for a namespace - powers the admin dashboard/namespace list. */
	listNamespaceLocaleMeta(opts: {
		namespace: string;
	}): Promise<NamespaceLocaleMeta[]>;
	getPage(opts: {
		slug: string;
		locale: string;
		draft: boolean;
	}): Promise<Page | null>;
	upsertPage(opts: { id: string; blocks: RawBlock[] }): Promise<void>;
	createPage(opts: { id: string; slug: string; locale: string }): Promise<Page>;
	publishPage(opts: { id: string }): Promise<void>;
	listPages(params: ListPagesParams): Promise<PaginatedResult<PageSummary>>;
	listLocales(): Promise<Locale[]>;
	upsertLocale(opts: {
		code: string;
		name: string;
		isDefault?: boolean;
	}): Promise<void>;
	deleteLocale(opts: { code: string }): Promise<void>;
	createMediaAsset(opts: {
		id: string;
		key: string;
		filename: string;
		mimeType: string;
		size: number;
		publicUrl: string;
		uploadedBy?: string;
	}): Promise<MediaAsset>;
	confirmMediaAsset(opts: { id: string }): Promise<void>;
	listMediaAssets(): Promise<MediaAsset[]>;
	deleteMediaAsset(opts: { key: string }): Promise<void>;
}
