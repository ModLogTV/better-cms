import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import type { AdminClient, KeyMetadata } from "../admin/types";
import type { PageSummary, RawBlock } from "../core/adapter";

export { QueryClientProvider };

/** Mount this at your admin app root — wraps TanStack Query's QueryClientProvider. */
export function AdminQueryProvider({
	children,
	client,
}: {
	children: ReactNode;
	client?: QueryClient;
}) {
	const qc = client ?? new QueryClient();
	return createElement(QueryClientProvider, { client: qc }, children);
}

interface UpdateTranslationArgs {
	namespace: string;
	locale: string;
	key: string;
	value: string;
}

/**
 * Creates React hooks bound to an AdminClient instance.
 * All hooks require `AdminQueryProvider` in the component tree.
 */
export function createAdminHooks(admin: AdminClient) {
	return {
		useNamespaceTranslations(namespace: string, locale: string) {
			return useQuery({
				queryKey: ["cms", "translations", namespace, locale],
				queryFn: () => admin.namespaces.getTranslations(namespace, locale),
			});
		},

		useUpdateTranslation() {
			const qc = useQueryClient();
			return useMutation<
				void,
				Error,
				UpdateTranslationArgs,
				{ prev?: Record<string, string> }
			>({
				mutationFn: ({
					namespace,
					locale,
					key,
					value,
				}: UpdateTranslationArgs) =>
					admin.namespaces.updateTranslation(namespace, locale, key, value),
				onMutate: async ({
					namespace,
					locale,
					key,
					value,
				}: UpdateTranslationArgs) => {
					const qKey = ["cms", "translations", namespace, locale];
					await qc.cancelQueries({ queryKey: qKey });
					const prev = qc.getQueryData<Record<string, string>>(qKey);
					qc.setQueryData(qKey, (old: Record<string, string> = {}) => ({
						...old,
						[key]: value,
					}));
					return { prev };
				},
				onError: (
					_err: Error,
					{ namespace, locale }: UpdateTranslationArgs,
					ctx: { prev?: Record<string, string> } | undefined,
				) => {
					if (ctx?.prev) {
						qc.setQueryData(
							["cms", "translations", namespace, locale],
							ctx.prev,
						);
					}
				},
				onSettled: (
					// biome-ignore lint/suspicious/noConfusingVoidType: matches TanStack Query onSettled signature
					_: void | undefined,
					__: Error | null,
					{ namespace, locale }: UpdateTranslationArgs,
				) => {
					void qc.invalidateQueries({
						queryKey: ["cms", "translations", namespace, locale],
					});
				},
			});
		},

		usePages() {
			return useQuery<PageSummary[]>({
				queryKey: ["cms", "pages"],
				queryFn: () => admin.pages.list(),
			});
		},

		usePage(slug: string, locale: string, draft = false) {
			return useQuery({
				queryKey: ["cms", "page", slug, locale, draft],
				queryFn: () => admin.pages.get(slug, locale, draft),
			});
		},

		useUpdatePage() {
			const qc = useQueryClient();
			return useMutation<void, Error, { id: string; blocks: RawBlock[] }>({
				mutationFn: ({ id, blocks }: { id: string; blocks: RawBlock[] }) =>
					admin.pages.update(id, blocks),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "pages"] }),
			});
		},

		usePublishPage() {
			const qc = useQueryClient();
			return useMutation<void, Error, string>({
				mutationFn: (pageId: string) => admin.pages.publish(pageId),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "pages"] }),
			});
		},

		useDescribeNamespace(namespace: string) {
			return useQuery<KeyMetadata[]>({
				queryKey: ["cms", "namespace", namespace, "describe"],
				queryFn: () => admin.namespaces.describe(namespace),
			});
		},

		useMediaUpload() {
			const mutation = useMutation<{ publicUrl: string }, Error, File>({
				mutationFn: async (file: File) => {
					const { uploadUrl, publicUrl } = await admin.media.presign({
						filename: file.name,
						mimeType: file.type,
						size: file.size,
					});
					await fetch(uploadUrl, { method: "PUT", body: file });
					return { publicUrl };
				},
			});

			return {
				upload: (file: File) => mutation.mutateAsync(file),
				isPending: mutation.isPending,
			};
		},

		useLocales() {
			return useQuery({
				queryKey: ["cms", "locales"],
				queryFn: () => admin.locales.list(),
			});
		},

		useUpsertLocale() {
			const qc = useQueryClient();
			return useMutation<
				void,
				Error,
				{ code: string; name: string; isDefault?: boolean }
			>({
				mutationFn: (data) =>
					admin.locales.upsert(data.code, data.name, data.isDefault),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "locales"] }),
			});
		},

		useDeleteLocale() {
			const qc = useQueryClient();
			return useMutation<void, Error, string>({
				mutationFn: (code: string) => admin.locales.delete(code),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "locales"] }),
			});
		},
	};
}
