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
	/** Derived from version history - see {@link Page.status}. */
	status: "draft" | "published" | "modified";
	/** Arbitrary metadata snapshot from the latest version (alt/caption/custom fields, extracted dimensions/duration). */
	metadata: Record<string, unknown>;
	tagIds: string[];
}

/** A flat (non-hierarchical) label media assets can be tagged with. */
export interface Tag {
	id: string;
	name: string;
	createdAt: Date;
}

/** A saved tag-filter combination, listed for quick re-selection. */
export interface SavedView {
	id: string;
	name: string;
	ownerId: string | null;
	operator: "AND" | "OR";
	tagIds: string[];
	createdAt: Date;
}

/** One entry in a media asset's append-only version history. */
export interface MediaVersionSummary {
	id: string;
	assetId: string;
	createdAt: Date;
	/** Set once this version was (or still is) the published one. */
	publishedAt: Date | null;
	createdBy: string | null;
	/** True when this version's file ref differs from the version before it. */
	fileChanged: boolean;
}

/** A version's full snapshot - used for diffing and restore previews. */
export interface MediaVersion extends MediaVersionSummary {
	key: string;
	filename: string;
	mimeType: string;
	size: number;
	publicUrl: string;
	metadata: Record<string, unknown>;
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
	/**
	 * Derived from version history, not a stored flag: "draft" (never
	 * published), "published" (published version matches the latest), or
	 * "modified" (latest version differs from what's published - shown in
	 * the admin UI as "Published (unpublished changes)").
	 */
	status: "draft" | "published" | "modified";
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
	/** Derived from version history - see {@link Page.status}. */
	status: "draft" | "published" | "modified";
	updatedAt: Date;
}

/** Per-locale content summary shown on a tree node - which locales exist and their status. */
export interface PageNodeLocale {
	locale: string;
	contentId: string;
	/** Derived from version history - see {@link Page.status}. */
	status: "draft" | "published" | "modified";
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

/** One entry in a page content's append-only version history. */
export interface PageVersionSummary {
	id: string;
	contentId: string;
	createdAt: Date;
	/** Set once this version was (or still is) the published one. */
	publishedAt: Date | null;
	createdBy: string | null;
}

/** A version's full snapshot - used for diffing and restore previews. */
export interface PageVersion extends PageVersionSummary {
	blocks: RawBlock[];
}

/** Optional version retention cap (adapter-level config) - disabled unless configured. The latest and currently-published versions are never pruned. */
export interface PageVersionRetention {
	maxVersions?: number;
	maxAgeDays?: number;
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
	/** Marks the content's latest version as published (creates one first if there's no version yet). */
	publishPage(opts: { id: string }): Promise<void>;
	/** Version history for a content id, newest first. */
	listPageVersions(opts: { id: string }): Promise<PageVersionSummary[]>;
	/** A single version's full snapshot, for diffing or a restore preview. */
	getPageVersion(opts: { versionId: string }): Promise<PageVersion | null>;
	/** Copies a past version's blocks into a new draft version - does not touch the published version. */
	restorePageVersion(opts: { id: string; versionId: string }): Promise<Page>;
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
	/**
	 * Lists media assets. `tagIds` narrows to assets carrying at least one
	 * (OR) or all (AND, the default) of the given tags - an asset with
	 * multiple tags matches on any one of them under OR. Omit to list all.
	 */
	listMediaAssets(opts?: {
		tagIds?: string[];
		tagOperator?: "AND" | "OR";
	}): Promise<MediaAsset[]>;
	deleteMediaAsset(opts: { key: string }): Promise<void>;
	/** Marks the asset's latest version as published (creates a metadata-only version first if none exists). */
	publishMediaAsset(opts: { id: string }): Promise<void>;
	/**
	 * Creates a new version - a metadata edit, and/or a file replacement when
	 * any of key/filename/mimeType/size/publicUrl are given (defaults to the
	 * previous version's values for anything omitted).
	 */
	updateMediaAsset(opts: {
		id: string;
		key?: string;
		filename?: string;
		mimeType?: string;
		size?: number;
		publicUrl?: string;
		metadata?: Record<string, unknown>;
		createdBy?: string;
	}): Promise<MediaAsset>;
	/** Version history for a media asset, newest first. */
	listMediaVersions(opts: { id: string }): Promise<MediaVersionSummary[]>;
	/** A single version's full snapshot, for diffing or a restore preview. */
	getMediaVersion(opts: { versionId: string }): Promise<MediaVersion | null>;
	/** Copies a past version's file ref + metadata into a new draft version - does not touch the published version. */
	restoreMediaVersion(opts: {
		id: string;
		versionId: string;
	}): Promise<MediaAsset>;
	/** Published-only lookup by key - the public-facing counterpart to the admin `listMediaAssets`/`:key/url` routes. Null if not found or not published. */
	getPublishedMediaAsset(opts: { key: string }): Promise<MediaAsset | null>;
	listTags(): Promise<Tag[]>;
	createTag(opts: { id: string; name: string }): Promise<Tag>;
	deleteTag(opts: { id: string }): Promise<void>;
	/** Replaces an asset's full tag set. */
	setAssetTags(opts: { assetId: string; tagIds: string[] }): Promise<void>;
	listSavedViews(): Promise<SavedView[]>;
	createSavedView(opts: {
		id: string;
		name: string;
		ownerId?: string;
		operator: "AND" | "OR";
		tagIds: string[];
	}): Promise<SavedView>;
	deleteSavedView(opts: { id: string }): Promise<void>;
}
