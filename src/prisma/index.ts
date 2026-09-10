import type {
	CMSAdapter,
	ListPagesParams,
	Locale,
	MediaAsset,
	NamespaceLocaleMeta,
	Page,
	PageSummary,
	PageTreeNode,
	RawBlock,
} from "../core/adapter";

interface PrismaPageRow {
	id: string;
	parentId: string | null;
	slug: string;
	path: string;
	locale: string;
	blocks: unknown;
	status: string;
	publishedAt: Date | null;
	updatedAt: Date;
}

interface PrismaClient {
	translationNamespace: {
		findUnique(args: {
			where: { name_locale: { name: string; locale: string } };
		}): Promise<{ values: unknown } | null>;
		upsert(args: {
			where: { name_locale: { name: string; locale: string } };
			create: { name: string; locale: string; values: unknown };
			update: { values: unknown };
		}): Promise<unknown>;
		findMany(args: {
			where: { name: string };
		}): Promise<{ locale: string; updatedAt: Date; values: unknown }[]>;
	};
	page: {
		findUnique(args: {
			where: {
				id?: string;
				path_locale?: { path: string; locale: string };
				parentId_slug_locale?: {
					parentId: string | null;
					slug: string;
					locale: string;
				};
			};
		}): Promise<PrismaPageRow | null>;
		upsert(args: {
			where: { id: string };
			create: { id: string; slug: string; locale: string; blocks: unknown };
			update: { blocks: unknown };
		}): Promise<unknown>;
		create(args: {
			data: {
				id: string;
				parentId: string | null;
				slug: string;
				path: string;
				locale: string;
				blocks: unknown;
			};
		}): Promise<PrismaPageRow>;
		update(args: {
			where: { id: string };
			data: Partial<{
				status: string;
				publishedAt: Date;
				parentId: string | null;
				path: string;
			}>;
		}): Promise<PrismaPageRow>;
		findMany(args: {
			where?: {
				status?: string;
				locale?: string;
				parentId?: string | null;
			};
			orderBy?: Record<string, "asc" | "desc">[];
			skip?: number;
			take?: number;
		}): Promise<PrismaPageRow[]>;
		count(args: {
			where?: { status?: string; locale?: string };
		}): Promise<number>;
	};
	locale: {
		findMany(): Promise<
			{ code: string; name: string; isDefault: boolean; updatedAt: Date }[]
		>;
		upsert(args: {
			where: { code: string };
			create: { code: string; name: string; isDefault: boolean };
			update: { name?: string; isDefault?: boolean };
		}): Promise<unknown>;
		updateMany(args: {
			where: { code: { not: string } };
			data: { isDefault: boolean };
		}): Promise<unknown>;
		delete(args: { where: { code: string } }): Promise<unknown>;
	};
	mediaAsset: {
		create(args: {
			data: {
				id: string;
				key: string;
				filename: string;
				mimeType: string;
				size: number;
				publicUrl: string;
				uploadedBy?: string;
				confirmedAt: Date | null;
			};
		}): Promise<{
			id: string;
			key: string;
			filename: string;
			mimeType: string;
			size: number;
			publicUrl: string;
			uploadedBy: string | null;
			confirmedAt: Date | null;
			createdAt: Date;
		}>;
		update(args: {
			where: { id: string };
			data: { confirmedAt: Date };
		}): Promise<unknown>;
		findMany(): Promise<
			{
				id: string;
				key: string;
				filename: string;
				mimeType: string;
				size: number;
				publicUrl: string;
				uploadedBy: string | null;
				confirmedAt: Date | null;
				createdAt: Date;
			}[]
		>;
		deleteMany(args: { where: { key: string } }): Promise<unknown>;
	};
}

function toPage(row: PrismaPageRow): Page {
	return {
		id: row.id,
		parentId: row.parentId,
		slug: row.slug,
		path: row.path,
		locale: row.locale,
		blocks: row.blocks as RawBlock[],
		status: row.status as "draft" | "published",
		publishedAt: row.publishedAt,
		updatedAt: row.updatedAt,
	};
}

async function computePath(
	prisma: PrismaClient,
	opts: { parentId: string | null; slug: string },
): Promise<string> {
	if (!opts.parentId) return opts.slug;
	const parent = await prisma.page.findUnique({
		where: { id: opts.parentId },
	});
	if (!parent) throw new Error(`No page found with id "${opts.parentId}"`);
	return `${parent.path}/${opts.slug}`;
}

/** Recomputes `path` for every descendant of `id` after it (or an ancestor) moved/renamed. */
async function reparentDescendantPaths(
	prisma: PrismaClient,
	opts: { id: string; path: string },
): Promise<void> {
	const children = await prisma.page.findMany({ where: { parentId: opts.id } });
	for (const child of children) {
		const path = `${opts.path}/${child.slug}`;
		await prisma.page.update({ where: { id: child.id }, data: { path } });
		await reparentDescendantPaths(prisma, { id: child.id, path });
	}
}

/**
 * Prisma adapter for better-cms.
 * Copy the schema snippet from the docs into your schema.prisma before generating.
 */
export function prismaAdapter(prisma: PrismaClient): CMSAdapter {
	return {
		async getTranslations({ namespace, locale }) {
			const row = await prisma.translationNamespace.findUnique({
				where: { name_locale: { name: namespace, locale } },
			});
			return (row?.values as Record<string, string> | undefined) ?? {};
		},

		async upsertTranslations({ namespace, locale, values }) {
			await prisma.translationNamespace.upsert({
				where: { name_locale: { name: namespace, locale } },
				create: { name: namespace, locale, values },
				update: { values },
			});
		},

		async listNamespaceLocaleMeta({ namespace }) {
			const rows = await prisma.translationNamespace.findMany({
				where: { name: namespace },
			});
			return rows.map(
				(r): NamespaceLocaleMeta => ({
					locale: r.locale,
					updatedAt: r.updatedAt,
					keyCount: Object.keys((r.values as Record<string, string>) ?? {})
						.length,
				}),
			);
		},

		async getPage({ slug, locale, draft }) {
			const row = await prisma.page.findUnique({
				where: { path_locale: { path: slug, locale } },
			});
			if (!row) return null;
			if (!draft && row.status !== "published") return null;
			return toPage(row);
		},

		async upsertPage({ id, blocks }) {
			await prisma.page.upsert({
				where: { id },
				create: { id, slug: id, locale: "en", blocks },
				update: { blocks },
			});
		},

		async createPage({ id, slug, locale, parentId = null }) {
			const path = await computePath(prisma, { parentId, slug });
			const row = await prisma.page.create({
				data: { id, parentId, slug, path, locale, blocks: [] },
			});
			return toPage(row);
		},

		async publishPage({ id }) {
			await prisma.page.update({
				where: { id },
				data: { status: "published", publishedAt: new Date() },
			});
		},

		async listPages(params: ListPagesParams) {
			const where: { status?: string; locale?: string } = {};
			if (params.status) where.status = params.status;
			if (params.locale) where.locale = params.locale;

			const orderBy = (params.sort ?? []).map((s) => ({
				[s.id]: s.desc ? ("desc" as const) : ("asc" as const),
			}));

			const [rows, total] = await Promise.all([
				prisma.page.findMany({
					where,
					orderBy: orderBy.length > 0 ? orderBy : [{ updatedAt: "desc" }],
					skip: (params.page - 1) * params.pageSize,
					take: params.pageSize,
				}),
				prisma.page.count({ where }),
			]);

			return {
				items: rows.map(
					(r): PageSummary => ({
						id: r.id,
						parentId: r.parentId,
						slug: r.slug,
						path: r.path,
						locale: r.locale,
						status: r.status as "draft" | "published",
						updatedAt: r.updatedAt,
					}),
				),
				total,
			};
		},

		async listPageTree({ locale } = {}) {
			const rows = await prisma.page.findMany({
				where: locale ? { locale } : undefined,
			});
			const byParent = new Map<string | null, PrismaPageRow[]>();
			for (const row of rows) {
				const siblings = byParent.get(row.parentId) ?? [];
				siblings.push(row);
				byParent.set(row.parentId, siblings);
			}
			const build = (parentId: string | null): PageTreeNode[] =>
				(byParent.get(parentId) ?? [])
					.map(
						(r): PageTreeNode => ({
							id: r.id,
							parentId: r.parentId,
							slug: r.slug,
							path: r.path,
							locale: r.locale,
							status: r.status as "draft" | "published",
							updatedAt: r.updatedAt,
							children: build(r.id),
						}),
					)
					.sort((a, b) => a.slug.localeCompare(b.slug));
			return build(null);
		},

		async movePage({ id, parentId }) {
			const node = await prisma.page.findUnique({ where: { id } });
			if (!node) throw new Error(`No page found with id "${id}"`);
			if (parentId === id) {
				throw new Error("A page cannot be moved into itself.");
			}

			// Reject moving a node into its own subtree (would orphan the loop).
			let cursor = parentId;
			while (cursor) {
				if (cursor === id) {
					throw new Error(
						"Cannot move a page into one of its own descendants.",
					);
				}
				const ancestor = await prisma.page.findUnique({
					where: { id: cursor },
				});
				cursor = ancestor?.parentId ?? null;
			}

			const existing = await prisma.page.findUnique({
				where: {
					parentId_slug_locale: {
						parentId,
						slug: node.slug,
						locale: node.locale,
					},
				},
			});
			if (existing && existing.id !== id) {
				throw new Error(
					`A page with slug "${node.slug}" already exists under the destination parent.`,
				);
			}

			const newPath = await computePath(prisma, {
				parentId,
				slug: node.slug,
			});
			const updated = await prisma.page.update({
				where: { id },
				data: { parentId, path: newPath },
			});
			await reparentDescendantPaths(prisma, { id, path: newPath });
			return toPage(updated);
		},

		async listLocales() {
			const rows = await prisma.locale.findMany();
			return rows.map(
				(r): Locale => ({
					code: r.code,
					name: r.name,
					isDefault: r.isDefault,
					updatedAt: r.updatedAt,
				}),
			);
		},

		async upsertLocale({ code, name, isDefault = false }) {
			// Only one locale may be default - docs/getting-started/database-schema.md
			// already documented this as unenforced; enforce it here instead of
			// leaving it as a silent data-integrity trap for admin UI callers.
			if (isDefault) {
				await prisma.locale.updateMany({
					where: { code: { not: code } },
					data: { isDefault: false },
				});
			}
			await prisma.locale.upsert({
				where: { code },
				create: { code, name, isDefault },
				update: { name, isDefault },
			});
		},

		async deleteLocale({ code }) {
			await prisma.locale.delete({
				where: { code },
			});
		},

		async createMediaAsset({
			id,
			key,
			filename,
			mimeType,
			size,
			publicUrl,
			uploadedBy,
		}) {
			const row = await prisma.mediaAsset.create({
				data: {
					id,
					key,
					filename,
					mimeType,
					size,
					publicUrl,
					uploadedBy,
					confirmedAt: null,
				},
			});
			return {
				id: row.id,
				key: row.key,
				filename: row.filename,
				mimeType: row.mimeType,
				size: row.size,
				publicUrl: row.publicUrl,
				uploadedBy: row.uploadedBy ?? undefined,
				confirmedAt: row.confirmedAt,
				createdAt: row.createdAt,
			};
		},

		async confirmMediaAsset({ id }) {
			await prisma.mediaAsset.update({
				where: { id },
				data: { confirmedAt: new Date() },
			});
		},

		async listMediaAssets() {
			const rows = await prisma.mediaAsset.findMany();
			return rows.map(
				(r): MediaAsset => ({
					id: r.id,
					key: r.key,
					filename: r.filename,
					mimeType: r.mimeType,
					size: r.size,
					publicUrl: r.publicUrl,
					uploadedBy: r.uploadedBy ?? undefined,
					confirmedAt: r.confirmedAt,
					createdAt: r.createdAt,
				}),
			);
		},

		async deleteMediaAsset({ key }) {
			await prisma.mediaAsset.deleteMany({ where: { key } });
		},
	};
}
