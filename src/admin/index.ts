import type { AdminClient, KeyMetadata } from "./types";

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
	return res.json() as Promise<T>;
}

/**
 * Creates a typed HTTP client for all CMS admin operations.
 * Use on the server (SSR loaders, server functions) — never expose the token to the browser
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
			/** Lists all pages available in the CMS with their basic status and metadata. */
			list: () => get("/cms/pages"),
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
		},
		media: {
			/**
			 * Generates a presigned S3 upload URL for a file.
			 * Use this to allow the browser to upload directly to storage.
			 */
			presign: (body) => post("/cms/media/presign", body),
		},
		locales: {
			/** Lists all active locales in the CMS. */
			list: () => get("/cms/admin/locales"),
			/** Adds or updates a locale definition. */
			upsert: (opts) => put("/cms/admin/locales", opts),
			/** Permanently removes a locale. */
			delete: (opts) =>
				apiFetch({
					cmsUrl,
					token,
					path: `/cms/admin/locales/${opts.code}`,
					init: {
						method: "DELETE",
					},
				}),
		},
	};
}

export { describeNamespace } from "./describe";
export type {
	AdminClient,
	InputHint,
	KeyMetadata,
	KeyType,
	NamespaceSummary,
} from "./types";
