import { getConfig } from "@/config";

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(`API ${status}: ${message}`);
		this.name = "ApiError";
	}
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const { apiBasePath } = getConfig();
	const res = await fetch(`${apiBasePath}${path}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
		credentials: "include",
	});
	if (!res.ok) {
		const text = await res.text().catch(() => res.statusText);
		try {
			const parsed = JSON.parse(text);
			if (typeof parsed?.error === "string") {
				throw new ApiError(res.status, parsed.error);
			}
		} catch (e) {
			if (e instanceof ApiError) throw e;
		}
		throw new ApiError(res.status, text);
	}
	if (res.status === 204 || res.headers.get("content-length") === "0") {
		return undefined as T;
	}
	return res.json() as Promise<T>;
}

const get = <T>(path: string) => apiFetch<T>(path);

export interface SortParam {
	id: string;
	desc: boolean;
}

export interface PaginatedResult<T> {
	items: T[];
	total: number;
}

interface ListParams {
	page: number;
	pageSize: number;
	sort?: SortParam[];
}

function buildQuery(params: ListParams & object): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === "") continue;
		search.set(key, key === "sort" ? JSON.stringify(value) : String(value));
	}
	return search.toString();
}
const encodePath = (path: string) =>
	path.split("/").map(encodeURIComponent).join("/");

const put = <T>(path: string, body: unknown) =>
	apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
const post = <T>(path: string, body?: unknown) =>
	apiFetch<T>(path, {
		method: "POST",
		body: body != null ? JSON.stringify(body) : undefined,
	});
const del = <T>(path: string) => apiFetch<T>(path, { method: "DELETE" });
const patch = <T>(path: string, body: unknown) =>
	apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export interface Locale {
	code: string;
	name: string;
	isDefault: boolean;
	updatedAt: string;
}

export interface NamespaceSummary {
	name: string;
	keyCount: number;
	updatedAt: string | null;
	coverage: Record<string, number>;
}

export interface PermissionInfo {
	value: string;
	description: string;
}

export type BlockFieldType = "text" | "textarea" | "number" | "boolean";

export interface BlockFieldInfo {
	key: string;
	label: string;
	type: BlockFieldType;
	optional?: boolean;
}

export interface BlockPreview {
	icon?: string;
	image?: string;
}

export interface BlockInfo {
	type: string;
	label: string;
	fields: BlockFieldInfo[];
	preview?: BlockPreview;
}

export interface KeyMetadata {
	key: string;
	type: "key" | "vars" | "plural" | "rich";
	vars?: string[];
	tags?: string[];
	inputHint: "text" | "text+vars" | "text+count" | "rich-text";
}

/** "modified" = published, but the latest saved draft differs from what's live. */
export type PageStatus = "draft" | "published" | "modified";

export interface PageSummary {
	id: string;
	nodeId: string;
	parentId: string | null;
	slug: string;
	path: string;
	locale: string;
	status: PageStatus;
	updatedAt: string;
}

export interface PageVersionSummary {
	id: string;
	contentId: string;
	createdAt: string;
	publishedAt: string | null;
	createdBy: string | null;
}

export interface PageVersion extends PageVersionSummary {
	blocks: RawBlock[];
}

export interface PageNodeLocale {
	locale: string;
	contentId: string;
	status: PageStatus;
	updatedAt: string;
}

export interface PageTreeNode {
	id: string;
	parentId: string | null;
	slug: string;
	path: string;
	locales: PageNodeLocale[];
	children: PageTreeNode[];
}

export interface PageGrant {
	id: string;
	nodeId: string;
	subjectType: "user" | "group";
	subjectId: string;
	permission: string;
	/** null = applies to all locales of the node */
	locale: string | null;
}

export interface RawBlock {
	type: string;
	data: unknown;
}

export interface MediaAsset {
	id: string;
	key: string;
	filename: string;
	mimeType: string;
	size: number;
	publicUrl: string;
	uploadedBy?: string;
	confirmedAt: string | null;
	createdAt: string;
	status: PageStatus;
	metadata: Record<string, unknown>;
}

export interface MediaVersionSummary {
	id: string;
	assetId: string;
	createdAt: string;
	publishedAt: string | null;
	createdBy: string | null;
	fileChanged: boolean;
}

export interface MediaVersion extends MediaVersionSummary {
	key: string;
	filename: string;
	mimeType: string;
	size: number;
	publicUrl: string;
	metadata: Record<string, unknown>;
}

export interface CMSUserSummary {
	id: string;
	email: string;
	name: string;
	permissions: string[];
	groupIds: string[];
}

export interface CMSGroup {
	id: string;
	name: string;
	permissions: string[];
}

export interface ListPagesParams extends ListParams {
	status?: PageSummary["status"];
	locale?: string;
}

export interface ListUsersParams extends ListParams {
	search?: string;
	permission?: string;
}

export const api = {
	namespaces: {
		list: () => get<NamespaceSummary[]>("/admin/namespaces"),
		describe: (namespace: string) =>
			get<KeyMetadata[]>(`/admin/namespaces/${namespace}/describe`),
		getTranslations: (namespace: string, locale: string) =>
			get<Record<string, string>>(`/translations/${namespace}/${locale}`),
		updateTranslation: async (
			namespace: string,
			locale: string,
			key: string,
			value: string,
		) => {
			const current = await get<Record<string, string>>(
				`/translations/${namespace}/${locale}`,
			);
			await put(`/translations/${namespace}/${locale}`, {
				...current,
				[key]: value,
			});
		},
	},

	pages: {
		list: (params: ListPagesParams) =>
			get<PaginatedResult<PageSummary>>(`/pages?${buildQuery(params)}`),
		tree: () => get<PageTreeNode[]>("/pages/tree"),
		// `slug` here is a full path (e.g. "company/about") - encode each segment,
		// not the "/" separators, so the server's wildcard route still resolves it.
		get: (slug: string, locale: string, draft = false) =>
			get<RawBlock[]>(
				`/pages/${encodePath(slug)}?locale=${locale}&draft=${draft}`,
			),
		create: (slug: string, locale: string, parentId?: string | null) =>
			post<PageSummary>("/pages", { slug, locale, parentId }),
		// `nodeId` - move is a tree-node operation, independent of locale.
		move: (nodeId: string, parentId: string | null) =>
			post(`/pages/${nodeId}/move`, { parentId }),
		addLocale: (nodeId: string, locale: string, cloneFromLocale?: string) =>
			post<PageSummary>(`/pages/${nodeId}/locales`, {
				locale,
				cloneFromLocale,
			}),
		update: (id: string, blocks: RawBlock[]) => put(`/pages/${id}`, blocks),
		publish: (id: string) => post(`/pages/${id}/publish`),
		describeBlocks: () => get<BlockInfo[]>("/pages/blocks"),
		versions: {
			list: (contentId: string) =>
				get<PageVersionSummary[]>(`/pages/${contentId}/versions`),
			get: (versionId: string) =>
				get<PageVersion>(`/pages/versions/${versionId}`),
		},
		restore: (contentId: string, versionId: string) =>
			post<PageSummary>(`/pages/${contentId}/restore`, { versionId }),
		grants: {
			list: (nodeId: string) => get<PageGrant[]>(`/pages/${nodeId}/grants`),
			add: (
				nodeId: string,
				grant: {
					subjectType: "user" | "group";
					subjectId: string;
					permission: string;
					locale?: string | null;
				},
			) => post<PageGrant>(`/pages/${nodeId}/grants`, grant),
			remove: (grantId: string) => del(`/pages/grants/${grantId}`),
		},
	},

	media: {
		list: () => get<MediaAsset[]>("/media"),
		presign: (opts: { filename: string; mimeType: string; size: number }) =>
			post<{ uploadUrl: string; publicUrl: string; assetId: string }>(
				"/media/presign",
				opts,
			),
		upload: async (file: File, onProgress?: (percent: number) => void) => {
			if (file.size === 0) {
				throw new Error(`"${file.name}" is empty, there is nothing to upload.`);
			}

			const mimeType = file.type || "application/octet-stream";
			const presigned = await post<{
				uploadUrl?: string;
				publicUrl?: string;
				assetId?: string;
				ok?: boolean;
				error?: string;
			}>("/media/presign", {
				filename: file.name,
				mimeType,
				size: file.size,
			});
			if (!presigned.uploadUrl || !presigned.publicUrl || !presigned.assetId) {
				throw new Error(
					presigned.error ??
						"Couldn't start the upload. No storage adapter is configured on the server, ask an administrator to set one up.",
				);
			}
			const { uploadUrl, publicUrl, assetId } = presigned;

			// XHR (not fetch) so we get real upload progress events for the
			// per-file progress bar in the media grid.
			await new Promise<void>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open("PUT", uploadUrl);
				xhr.setRequestHeader("Content-Type", mimeType);
				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable)
						onProgress?.(Math.round((e.loaded / e.total) * 100));
				};
				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve();
					} else {
						reject(
							new Error(
								xhr.responseText ||
									`Upload of "${file.name}" failed (server responded with ${xhr.status}). The storage adapter may be misconfigured.`,
							),
						);
					}
				};
				xhr.onerror = () =>
					reject(
						new Error(
							`Couldn't reach the upload server for "${file.name}". Check your connection and try again.`,
						),
					);
				xhr.send(file);
			});
			await post(`/media/${assetId}/confirm`);
			return { publicUrl, assetId };
		},
		delete: (key: string) => del(`/media/${encodeURIComponent(key)}`),
		publish: (id: string) => post(`/media/${id}/publish`),
		updateMetadata: (id: string, metadata: Record<string, unknown>) =>
			patch<MediaAsset>(`/media/${id}`, { metadata }),
		restore: (id: string, versionId: string) =>
			post<MediaAsset>(`/media/${id}/restore`, { versionId }),
		versions: {
			list: (id: string) => get<MediaVersionSummary[]>(`/media/${id}/versions`),
			get: (versionId: string) =>
				get<MediaVersion>(`/media/versions/${versionId}`),
		},
	},

	locales: {
		list: () => get<Locale[]>("/admin/locales"),
		upsert: (opts: { code: string; name: string; isDefault?: boolean }) =>
			put("/admin/locales", opts),
		delete: (code: string) => del(`/admin/locales/${code}`),
	},

	users: {
		list: (params: ListUsersParams) =>
			get<PaginatedResult<CMSUserSummary>>(
				`/admin/users?${buildQuery(params)}`,
			),
		getPermissions: (userId: string) =>
			get<string[]>(`/admin/users/${userId}/permissions`),
		setPermissions: (userId: string, permissions: string[]) =>
			put(`/admin/users/${userId}/permissions`, { permissions }),
		getGroups: (userId: string) =>
			get<CMSGroup[]>(`/admin/users/${userId}/groups`),
		addToGroup: (userId: string, groupId: string) =>
			post(`/admin/users/${userId}/groups`, { groupId }),
		removeFromGroup: (userId: string, groupId: string) =>
			del(`/admin/users/${userId}/groups/${groupId}`),
	},

	groups: {
		list: () => get<CMSGroup[]>("/admin/groups"),
		create: (name: string, permissions: string[]) =>
			post<CMSGroup>("/admin/groups", { name, permissions }),
		update: (id: string, data: { name?: string; permissions?: string[] }) =>
			put<CMSGroup>(`/admin/groups/${id}`, data),
		delete: (id: string) => del(`/admin/groups/${id}`),
	},

	permissions: {
		list: () => get<PermissionInfo[]>("/admin/permissions"),
	},
};
