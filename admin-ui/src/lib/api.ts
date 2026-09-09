import { getConfig } from "@/config";

class ApiError extends Error {
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
		throw new ApiError(res.status, text);
	}
	if (res.status === 204 || res.headers.get("content-length") === "0") {
		return undefined as T;
	}
	return res.json() as Promise<T>;
}

const get = <T>(path: string) => apiFetch<T>(path);
const put = <T>(path: string, body: unknown) =>
	apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
const post = <T>(path: string, body?: unknown) =>
	apiFetch<T>(path, {
		method: "POST",
		body: body != null ? JSON.stringify(body) : undefined,
	});
const del = <T>(path: string) => apiFetch<T>(path, { method: "DELETE" });

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

export interface BlockInfo {
	type: string;
	label: string;
	fields: BlockFieldInfo[];
}

export interface KeyMetadata {
	key: string;
	type: "key" | "vars" | "plural" | "rich";
	vars?: string[];
	tags?: string[];
	inputHint: "text" | "text+vars" | "text+count" | "rich-text";
}

export interface PageSummary {
	id: string;
	slug: string;
	locale: string;
	status: "draft" | "published";
	updatedAt: string;
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
		list: () => get<PageSummary[]>("/pages"),
		get: (slug: string, locale: string, draft = false) =>
			get<RawBlock[]>(
				`/pages/${encodeURIComponent(slug)}?locale=${locale}&draft=${draft}`,
			),
		update: (id: string, blocks: RawBlock[]) => put(`/pages/${id}`, blocks),
		publish: (id: string) => post(`/pages/${id}/publish`),
		describeBlocks: () => get<BlockInfo[]>("/pages/blocks"),
	},

	media: {
		list: () => get<MediaAsset[]>("/media"),
		presign: (opts: { filename: string; mimeType: string; size: number }) =>
			post<{ uploadUrl: string; publicUrl: string; assetId: string }>(
				"/media/presign",
				opts,
			),
		upload: async (file: File) => {
			const { uploadUrl, publicUrl, assetId } = await post<{
				uploadUrl: string;
				publicUrl: string;
				assetId: string;
			}>("/media/presign", {
				filename: file.name,
				mimeType: file.type,
				size: file.size,
			});
			const res = await fetch(uploadUrl, {
				method: "PUT",
				body: file,
				headers: { "Content-Type": file.type },
			});
			if (!res.ok) throw new ApiError(res.status, "Upload failed");
			await post(`/media/${assetId}/confirm`);
			return { publicUrl, assetId };
		},
		delete: (key: string) => del(`/media/${encodeURIComponent(key)}`),
	},

	locales: {
		list: () => get<Locale[]>("/admin/locales"),
		upsert: (opts: { code: string; name: string; isDefault?: boolean }) =>
			put("/admin/locales", opts),
		delete: (code: string) => del(`/admin/locales/${code}`),
	},

	users: {
		list: () => get<CMSUserSummary[]>("/admin/users"),
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
