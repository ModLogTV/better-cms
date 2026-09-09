import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import type {
	AdminClient,
	CMSGroup,
	CMSUserSummary,
	KeyMetadata,
	MediaAsset,
} from "../admin/types";
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
		useNamespaceTranslations(opts: { namespace: string; locale: string }) {
			const { namespace, locale } = opts;
			return useQuery({
				queryKey: ["cms", "translations", namespace, locale],
				queryFn: () => admin.namespaces.getTranslations({ namespace, locale }),
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
				mutationFn: (args: UpdateTranslationArgs) =>
					admin.namespaces.updateTranslation(args),
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

		usePage(opts: { slug: string; locale: string; draft?: boolean }) {
			const { slug, locale, draft = false } = opts;
			return useQuery({
				queryKey: ["cms", "page", slug, locale, draft],
				queryFn: () => admin.pages.get({ slug, locale, draft }),
			});
		},

		useUpdatePage() {
			const qc = useQueryClient();
			return useMutation<void, Error, { id: string; blocks: RawBlock[] }>({
				mutationFn: (args: { id: string; blocks: RawBlock[] }) =>
					admin.pages.update(args),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "pages"] }),
			});
		},

		usePublishPage() {
			const qc = useQueryClient();
			return useMutation<void, Error, { id: string }>({
				mutationFn: (args: { id: string }) => admin.pages.publish(args),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "pages"] }),
			});
		},

		useDescribeNamespace(opts: { namespace: string }) {
			const { namespace } = opts;
			return useQuery<KeyMetadata[]>({
				queryKey: ["cms", "namespace", namespace, "describe"],
				queryFn: () => admin.namespaces.describe({ namespace }),
			});
		},

		useMediaList() {
			return useQuery<MediaAsset[]>({
				queryKey: ["cms", "media"],
				queryFn: () => admin.media.list(),
			});
		},

		useMediaUpload() {
			const qc = useQueryClient();
			const mutation = useMutation<
				{ publicUrl: string; assetId: string },
				Error,
				{ file: File }
			>({
				mutationFn: async ({ file }: { file: File }) => {
					return admin.media.upload({ file, body: file });
				},
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "media"] }),
			});

			return {
				upload: (opts: { file: File }) => mutation.mutateAsync(opts),
				isPending: mutation.isPending,
			};
		},

		useMediaDelete() {
			const qc = useQueryClient();
			return useMutation<void, Error, { key: string }>({
				mutationFn: (opts: { key: string }) => admin.media.delete(opts),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "media"] }),
			});
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
				mutationFn: (data) => admin.locales.upsert(data),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "locales"] }),
			});
		},

		useDeleteLocale() {
			const qc = useQueryClient();
			return useMutation<void, Error, { code: string }>({
				mutationFn: (opts: { code: string }) => admin.locales.delete(opts),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "locales"] }),
			});
		},

		useUsers() {
			return useQuery<CMSUserSummary[]>({
				queryKey: ["cms", "users"],
				queryFn: () => admin.users.list(),
			});
		},

		useUserPermissions(opts: { userId: string }) {
			const { userId } = opts;
			return useQuery<string[]>({
				queryKey: ["cms", "users", userId, "permissions"],
				queryFn: () => admin.users.getPermissions({ userId }),
			});
		},

		useSetUserPermissions() {
			const qc = useQueryClient();
			return useMutation<
				void,
				Error,
				{ userId: string; permissions: string[] }
			>({
				mutationFn: (args) => admin.users.setPermissions(args),
				onSettled: (_d, _e, { userId }) => {
					void qc.invalidateQueries({
						queryKey: ["cms", "users", userId, "permissions"],
					});
					void qc.invalidateQueries({ queryKey: ["cms", "users"] });
				},
			});
		},

		useUserGroups(opts: { userId: string }) {
			const { userId } = opts;
			return useQuery<CMSGroup[]>({
				queryKey: ["cms", "users", userId, "groups"],
				queryFn: () => admin.users.getGroups({ userId }),
			});
		},

		useAddUserToGroup() {
			const qc = useQueryClient();
			return useMutation<void, Error, { userId: string; groupId: string }>({
				mutationFn: (args) => admin.users.addToGroup(args),
				onSettled: (_d, _e, { userId }) => {
					void qc.invalidateQueries({
						queryKey: ["cms", "users", userId, "groups"],
					});
					void qc.invalidateQueries({ queryKey: ["cms", "users"] });
				},
			});
		},

		useRemoveUserFromGroup() {
			const qc = useQueryClient();
			return useMutation<void, Error, { userId: string; groupId: string }>({
				mutationFn: (args) => admin.users.removeFromGroup(args),
				onSettled: (_d, _e, { userId }) => {
					void qc.invalidateQueries({
						queryKey: ["cms", "users", userId, "groups"],
					});
					void qc.invalidateQueries({ queryKey: ["cms", "users"] });
				},
			});
		},

		useGroups() {
			return useQuery<CMSGroup[]>({
				queryKey: ["cms", "groups"],
				queryFn: () => admin.groups.list(),
			});
		},

		useCreateGroup() {
			const qc = useQueryClient();
			return useMutation<
				CMSGroup,
				Error,
				{ name: string; permissions: string[] }
			>({
				mutationFn: (args) => admin.groups.create(args),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "groups"] }),
			});
		},

		useUpdateGroup() {
			const qc = useQueryClient();
			return useMutation<
				CMSGroup,
				Error,
				{ id: string; name?: string; permissions?: string[] }
			>({
				mutationFn: (args) => admin.groups.update(args),
				onSettled: () =>
					void qc.invalidateQueries({ queryKey: ["cms", "groups"] }),
			});
		},

		useDeleteGroup() {
			const qc = useQueryClient();
			return useMutation<void, Error, { id: string }>({
				mutationFn: (args) => admin.groups.delete(args),
				onSettled: () => {
					void qc.invalidateQueries({ queryKey: ["cms", "groups"] });
					void qc.invalidateQueries({ queryKey: ["cms", "users"] });
				},
			});
		},
	};
}
