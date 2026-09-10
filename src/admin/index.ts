import type {
	AdminClient,
	BlockInfo,
	KeyMetadata,
	PermissionInfo,
} from "./types";

function buildQuery(params: object): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === "") continue;
		search.set(key, key === "sort" ? JSON.stringify(value) : String(value));
	}
	return search.toString();
}

export class CMSError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(`CMS ${status}: ${message}`);
		this.name = "CMSError";
	}
}

interface AdminClientOptions {
	cmsUrl: string;
	token: string;
}

async function apiFetch<T>(opts: {
	cmsUrl: string;
	token: string;
	path: string;
	init?: RequestInit;
}): Promise<T> {
	const { cmsUrl, token, path, init } = opts;
	const res = await fetch(`${cmsUrl}${path}`, {
		...init,
		headers: {
			"x-internal-token": token,
			"Content-Type": "application/json",
			...init?.headers,
		},
	});
	if (!res.ok) {
		const text = await res.text().catch(() => res.statusText);
		throw new CMSError(res.status, text);
	}
	if (res.status === 204 || res.headers.get("content-length") === "0") {
		return undefined as T;
	}
	return res.json() as Promise<T>;
}

/**
 * Creates a typed HTTP client for all CMS admin operations.
 * Use on the server (SSR loaders, server functions) - never expose the token to the browser
 *
 * @example
 * ```ts
 * const admin = createAdminClient({
 *   cmsUrl: process.env.CMS_URL,
 *   token: process.env.CMS_ADMIN_TOKEN,
 * })
 * ```
 */
export function createAdminClient(opts: AdminClientOptions): AdminClient {
	const { cmsUrl, token } = opts;
	const get = <T>(path: string) => apiFetch<T>({ cmsUrl, token, path });
	const put = <T>(path: string, body: unknown) =>
		apiFetch<T>({
			cmsUrl,
			token,
			path,
			init: {
				method: "PUT",
				body: JSON.stringify(body),
			},
		});
	const post = <T>(path: string, body?: unknown) =>
		apiFetch<T>({
			cmsUrl,
			token,
			path,
			init: {
				method: "POST",
				body: body != null ? JSON.stringify(body) : undefined,
			},
		});
	const del = <T>(path: string) =>
		apiFetch<T>({
			cmsUrl,
			token,
			path,
			init: {
				method: "DELETE",
			},
		});

	return {
		namespaces: {
			/** Lists all registered namespaces in the CMS. */
			list: () => get("/cms/admin/namespaces"),
			/**
			 * Returns metadata for all keys in a namespace, including their types (rich, vars, etc.)
			 * and suggested UI input hints.
			 */
			describe: (opts) =>
				get<KeyMetadata[]>(`/cms/admin/namespaces/${opts.namespace}/describe`),
			/** Fetches all raw translation key-value pairs for a specific namespace and locale. */
			getTranslations: (opts) =>
				get(`/cms/translations/${opts.namespace}/${opts.locale}`),
			/**
			 * Updates a single translation key. Fetches the current state, merges the change,
			 * and persists it back to the adapter.
			 */
			updateTranslation: async (opts) => {
				const { namespace, locale, key, value } = opts;
				const current = await get<Record<string, string>>(
					`/cms/translations/${namespace}/${locale}`,
				);
				await put(`/cms/translations/${namespace}/${locale}`, {
					...current,
					[key]: value,
				});
			},
		},
		pages: {
			/** Lists pages available in the CMS with their basic status and metadata, paginated server-side. */
			list: (params) => get(`/cms/pages?${buildQuery(params)}`),
			/**
			 * Fetches a single page by its slug.
			 * @param draft If true, fetches the latest saved draft instead of the published version.
			 */
			get: (opts) => {
				const { slug, locale, draft = false } = opts;
				return get(
					`/cms/pages/${encodeURIComponent(slug)}?locale=${locale}&draft=${draft}`,
				);
			},
			/** Updates the blocks of a page. Validates blocks against the registered schema. */
			update: (opts) => put(`/cms/pages/${opts.id}`, opts.blocks),
			/** Promotes the current draft of a page to the published status. */
			publish: (opts) => post(`/cms/pages/${opts.id}/publish`),
			/** Lists registered block types with their admin-editable field metadata. */
			describeBlocks: () => get<BlockInfo[]>("/cms/pages/blocks"),
		},
		media: {
			/** Lists all recorded media assets. */
			list: () => get("/cms/media"),
			/**
			 * Generates a presigned S3 upload URL for a file.
			 * Use this to allow the browser to upload directly to storage.
			 */
			presign: (body) => post("/cms/media/presign", body),
			/**
			 * High-level helper that presigns, uploads, and confirms the asset in one call.
			 * Uses the global `fetch` API.
			 */
			upload: async ({ file, body }) => {
				const { uploadUrl, publicUrl, assetId } = await post<{
					uploadUrl: string;
					publicUrl: string;
					assetId: string;
				}>("/cms/media/presign", {
					filename: file.name,
					mimeType: file.type,
					size: file.size,
				});
				const res = await fetch(uploadUrl, {
					method: "PUT",
					body,
					headers: { "Content-Type": file.type },
				});
				if (!res.ok) {
					throw new CMSError(res.status, `Upload failed: ${res.statusText}`);
				}
				await post(`/cms/media/${assetId}/confirm`);
				return { publicUrl, assetId };
			},
			/** Returns a short-lived read URL for private-bucket assets. */
			getReadUrl: ({ key }) =>
				get<{ url: string }>(`/cms/media/${encodeURIComponent(key)}/url`),
			/**
			 * Permanently removes a file from storage and the asset registry by its key.
			 */
			delete: ({ key }) => del(`/cms/media/${encodeURIComponent(key)}`),
		},
		locales: {
			/** Lists all active locales in the CMS. */
			list: () => get("/cms/admin/locales"),
			/** Adds or updates a locale definition. */
			upsert: (opts) => put("/cms/admin/locales", opts),
			/** Permanently removes a locale. */
			delete: (opts) => del(`/cms/admin/locales/${opts.code}`),
		},
		users: {
			/** Lists CMS users with their direct permissions and group memberships, paginated server-side. */
			list: (params) => get(`/cms/admin/users?${buildQuery(params)}`),
			/** Returns the resolved permission set for a user (direct + inherited from groups). */
			getPermissions: ({ userId }) =>
				get(`/cms/admin/users/${userId}/permissions`),
			/** Replaces the direct permissions on a user. Does not affect group-inherited permissions. */
			setPermissions: ({ userId, permissions }) =>
				put(`/cms/admin/users/${userId}/permissions`, { permissions }),
			/** Lists all groups the user belongs to. */
			getGroups: ({ userId }) => get(`/cms/admin/users/${userId}/groups`),
			/** Adds a user to a group. */
			addToGroup: ({ userId, groupId }) =>
				post(`/cms/admin/users/${userId}/groups`, { groupId }),
			/** Removes a user from a group. */
			removeFromGroup: ({ userId, groupId }) =>
				del(`/cms/admin/users/${userId}/groups/${groupId}`),
		},
		groups: {
			/** Lists all CMS groups. */
			list: () => get("/cms/admin/groups"),
			/** Creates a new group with the given name and permissions. */
			create: ({ name, permissions }) =>
				post("/cms/admin/groups", { name, permissions }),
			/** Updates the name and/or permissions of an existing group. */
			update: ({ id, ...rest }) => put(`/cms/admin/groups/${id}`, rest),
			/** Permanently removes a group. All user memberships are removed via cascade. */
			delete: ({ id }) => del(`/cms/admin/groups/${id}`),
		},
		permissions: {
			/** Catalog of all valid CMS permission strings, for building a permission picker UI. */
			list: () => get<PermissionInfo[]>("/cms/admin/permissions"),
		},
	};
}

export { describeNamespace } from "./describe";
export type {
	AdminClient,
	BlockFieldInfo,
	BlockInfo,
	CMSGroup,
	CMSUserSummary,
	InputHint,
	KeyMetadata,
	KeyType,
	MediaAsset,
	NamespaceSummary,
	PermissionInfo,
} from "./types";
