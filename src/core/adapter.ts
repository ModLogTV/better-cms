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

/** A page's content for one locale - `id` identifies this content row (what editor routes operate on). */
export interface Page {
	id: string;
	nodeId: string;
	parentId: string | null;
	slug: string;
	/** Materialized full path (ancestor slugs joined by "/"). Root pages: path === slug. */
	path: string;
	locale: string;
	blocks: RawBlock[];
	status: "draft" | "published";
	publishedAt: Date | null;
	updatedAt: Date;
}

export interface PageSummary {
	id: string;
	nodeId: string;
	parentId: string | null;
	slug: string;
	path: string;
	locale: string;
	status: "draft" | "published";
	updatedAt: Date;
}

/** Per-locale content summary shown on a tree node - which locales exist and their status. */
export interface PageNodeLocale {
	locale: string;
	contentId: string;
	status: "draft" | "published";
	updatedAt: Date;
}

/** A tree node is locale-independent - `locales` says which locales have content, and their status. */
export interface PageTreeNode {
	id: string;
	parentId: string | null;
	slug: string;
	path: string;
	locales: PageNodeLocale[];
	children: PageTreeNode[];
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

/**
 * A page-level ACL grant: `subjectId` (a user or group id) may `permission`
 * on `nodeId` and its whole subtree, scoped to `locale` (null = all locales).
 * Grants are additive-only - there's no "deny" or inheritance-break.
 */
export interface PageGrant {
	id: string;
	nodeId: string;
	subjectType: "user" | "group";
	subjectId: string;
	/** A CMS_PERMISSIONS value (cms:pages:read/write/publish), scoped to this node. */
	permission: string;
	locale: string | null;
}

/** Identifies the requester for page-ACL checks - omit userId for anonymous/service callers. */
export interface PageAclSubject {
	userId?: string;
	groupIds: string[];
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
		/** Full materialized path, e.g. "company/about". */
		slug: string;
		locale: string;
		draft: boolean;
	}): Promise<Page | null>;
	/** Fetches a page by its own content id - used to resolve the node for a permission check before mutating. */
	getPageById(opts: { id: string }): Promise<Page | null>;
	upsertPage(opts: { id: string; blocks: RawBlock[] }): Promise<void>;
	/** Creates a new page node with exactly one starting locale's content - no other locale rows are created implicitly. */
	createPage(opts: {
		id: string;
		slug: string;
		locale: string;
		parentId?: string | null;
	}): Promise<Page>;
	/**
	 * Adds content for a locale to an existing node. Defaults to cloning
	 * `cloneFromLocale`'s current draft when given, otherwise starts blank.
	 */
	addPageLocale(opts: {
		id: string;
		nodeId: string;
		locale: string;
		cloneFromLocale?: string;
	}): Promise<Page>;
	publishPage(opts: { id: string }): Promise<void>;
	listPages(params: ListPagesParams): Promise<PaginatedResult<PageSummary>>;
	/**
	 * Full page tree (nested by parentId) - each node lists which locales have
	 * content and their status. When `subject` is given, the tree is pruned to
	 * nodes the subject can at least read via ACL grants (nodes without their
	 * own qualifying grant are promoted to root so descendants stay reachable).
	 * Callers only pass `subject` when the requester lacks the global read
	 * permission - this filtering is purely additive on top of that.
	 */
	listPageTree(opts?: { subject?: PageAclSubject }): Promise<PageTreeNode[]>;
	/** Reparents a page node (locale-independent), revalidating slug uniqueness at the destination and recomputing path for its whole subtree. */
	movePage(opts: { nodeId: string; parentId: string | null }): Promise<void>;
	/** Grants for one node (not including inherited ancestor grants) - powers the admin "Access" panel. */
	listPageGrants(opts: { nodeId: string }): Promise<PageGrant[]>;
	addPageGrant(opts: {
		id: string;
		nodeId: string;
		subjectType: "user" | "group";
		subjectId: string;
		permission: string;
		locale?: string | null;
	}): Promise<PageGrant>;
	removePageGrant(opts: { id: string }): Promise<void>;
	/**
	 * The subject's effective page permissions on `nodeId`, from ACL grants
	 * only (own node + every ancestor's grants, unioned). `locale` narrows to
	 * grants that apply to that locale or to all locales (locale: null).
	 * Purely additive - callers should OR this with the subject's global
	 * CMS permissions, never use it to restrict a subject who already has
	 * the equivalent global permission.
	 */
	getEffectivePagePermissions(
		opts: PageAclSubject & { nodeId: string; locale?: string },
	): Promise<string[]>;
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
