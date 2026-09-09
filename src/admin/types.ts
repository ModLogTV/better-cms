import type { CMSGroup, CMSUserSummary } from "../auth/adapter";
import type { MediaAsset, Page, PageSummary, RawBlock } from "../core/adapter";

export type { CMSGroup, CMSUserSummary, MediaAsset };

export interface NamespaceSummary {
	name: string;
	/** Total keys defined for this namespace (from its definition, not stored data). */
	keyCount: number;
	/** Most recent write across all locales for this namespace, if any exist yet. */
	updatedAt: string | null;
	/** Percentage (0-100) of `keyCount` present per locale code. */
	coverage: Record<string, number>;
}

export interface PermissionInfo {
	value: string;
	description: string;
}

export interface BlockFieldInfo {
	key: string;
	label: string;
	type: "text" | "textarea" | "number" | "boolean";
	optional?: boolean;
}

export interface BlockInfo {
	type: string;
	label: string;
	fields: BlockFieldInfo[];
}

export type KeyType = "key" | "vars" | "plural" | "rich";
export type InputHint = "text" | "text+vars" | "text+count" | "rich-text";

export interface KeyMetadata {
	/** Flat dot-key e.g. "topNav.aboutUs" */
	key: string;
	type: KeyType;
	/** Variable names extracted from VarsMarker/PluralMarker */
	vars?: string[];
	/** Tag names extracted from RichMarker */
	tags?: string[];
	/** Hint for admin UI input widget */
	inputHint: InputHint;
}

export interface AdminClient {
	namespaces: {
		/** Lists all registered namespaces in the CMS. */
		list(): Promise<NamespaceSummary[]>;
		/**
		 * Returns metadata for all keys in a namespace, including their types (rich, vars, etc.)
		 * and suggested UI input hints.
		 */
		describe(opts: { namespace: string }): Promise<KeyMetadata[]>;
		/** Fetches all raw translation key-value pairs for a specific namespace and locale. */
		getTranslations(opts: {
			namespace: string;
			locale: string;
		}): Promise<Record<string, string>>;
		/**
		 * Updates a single translation key. Fetches the current state, merges the change,
		 * and persists it back to the adapter.
		 */
		updateTranslation(opts: {
			namespace: string;
			locale: string;
			key: string;
			value: string;
		}): Promise<void>;
	};
	pages: {
		/** Lists all pages available in the CMS with their basic status and metadata. */
		list(): Promise<PageSummary[]>;
		/**
		 * Fetches a single page by its slug.
		 * @param draft If true, fetches the latest saved draft instead of the published version.
		 */
		get(opts: { slug: string; locale: string; draft?: boolean }): Promise<Page>;
		/** Updates the blocks of a page. Validates blocks against the registered schema. */
		update(opts: { id: string; blocks: RawBlock[] }): Promise<void>;
		/** Promotes the current draft of a page to the published status. */
		publish(opts: { id: string }): Promise<void>;
		/** Lists registered block types with their admin-editable field metadata. */
		describeBlocks(): Promise<BlockInfo[]>;
	};
	media: {
		/** Lists all recorded media assets. */
		list(): Promise<MediaAsset[]>;
		/**
		 * Generates a presigned S3 upload URL for a file.
		 * Use this to allow the browser to upload directly to storage.
		 */
		presign(opts: {
			filename: string;
			mimeType: string;
			size: number;
		}): Promise<{ uploadUrl: string; publicUrl: string; assetId: string }>;
		/**
		 * High-level helper that presigns, uploads, and confirms the asset in one call.
		 * Uses the global `fetch` API.
		 */
		upload(opts: {
			file: { name: string; type: string; size: number } | File;
			body: BodyInit;
		}): Promise<{ publicUrl: string; assetId: string }>;
		/**
		 * Returns a short-lived read URL for private-bucket assets.
		 * Falls back to the stored publicUrl when the storage adapter does not support presigned reads.
		 */
		getReadUrl(opts: { key: string }): Promise<{ url: string }>;
		/**
		 * Permanently removes a file from storage and the asset registry by its key.
		 */
		delete(opts: { key: string }): Promise<void>;
	};
	locales: {
		/** Lists all active locales in the CMS. */
		list(): Promise<import("../core/adapter").Locale[]>;
		/** Adds or updates a locale definition. */
		upsert(opts: {
			code: string;
			name: string;
			isDefault?: boolean;
		}): Promise<void>;
		/** Permanently removes a locale. */
		delete(opts: { code: string }): Promise<void>;
	};
	users: {
		/** Lists all CMS users with their direct permissions and group memberships. */
		list(): Promise<CMSUserSummary[]>;
		/** Returns the resolved permission set for a user (direct + inherited from groups). */
		getPermissions(opts: { userId: string }): Promise<string[]>;
		/** Replaces the direct permissions on a user. Does not affect group-inherited permissions. */
		setPermissions(opts: {
			userId: string;
			permissions: string[];
		}): Promise<void>;
		/** Lists all groups the user belongs to. */
		getGroups(opts: { userId: string }): Promise<CMSGroup[]>;
		/** Adds a user to a group. */
		addToGroup(opts: { userId: string; groupId: string }): Promise<void>;
		/** Removes a user from a group. */
		removeFromGroup(opts: { userId: string; groupId: string }): Promise<void>;
	};
	groups: {
		/** Lists all CMS groups. */
		list(): Promise<CMSGroup[]>;
		/** Creates a new group with the given name and permissions. */
		create(opts: { name: string; permissions: string[] }): Promise<CMSGroup>;
		/** Updates the name and/or permissions of an existing group. */
		update(opts: {
			id: string;
			name?: string;
			permissions?: string[];
		}): Promise<CMSGroup>;
		/** Permanently removes a group. All user memberships are removed via cascade. */
		delete(opts: { id: string }): Promise<void>;
	};
	/** Catalog of all valid CMS permission strings, for building a permission picker UI. */
	permissions: {
		list(): Promise<PermissionInfo[]>;
	};
}
