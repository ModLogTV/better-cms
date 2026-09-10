import type {
	CMSAdapter,
	ListPagesParams,
	Locale,
	MediaAsset,
	NamespaceLocaleMeta,
	Page,
	PageNodeLocale,
	PageSummary,
	PageTreeNode,
	RawBlock,
} from "../core/adapter";

interface PrismaPageNodeRow {
	id: string;
	parentId: string | null;
	slug: string;
	path: string;
}

interface PrismaPageContentRow {
	id: string;
	nodeId: string;
	locale: string;
	blocks: unknown;
	status: string;
	publishedAt: Date | null;
	updatedAt: Date;
}

interface PrismaPageContentWithNodeRow extends PrismaPageContentRow {
	node: PrismaPageNodeRow;
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
	pageNode: {
		findUnique(args: {
			where: {
				id?: string;
				path?: string;
				parentId_slug?: { parentId: string | null; slug: string };
			};
		}): Promise<PrismaPageNodeRow | null>;
		create(args: {
			data: { id: string; parentId: string | null; slug: string; path: string };
		}): Promise<PrismaPageNodeRow>;
		update(args: {
			where: { id: string };
			data: Partial<{ parentId: string | null; path: string }>;
		}): Promise<PrismaPageNodeRow>;
		findMany(args?: {
			where?: { parentId?: string | null };
		}): Promise<PrismaPageNodeRow[]>;
	};
	pageContent: {
		findUnique(args: {
			where: {
				id?: string;
				nodeId_locale?: { nodeId: string; locale: string };
			};
		}): Promise<PrismaPageContentRow | null>;
		create(args: {
			data: { id: string; nodeId: string; locale: string; blocks: unknown };
		}): Promise<PrismaPageContentRow>;
		update(args: {
			where: { id: string };
			data: Partial<{ blocks: unknown; status: string; publishedAt: Date }>;
		}): Promise<PrismaPageContentRow>;
		findMany(args: {
			where?: { status?: string; locale?: string };
			include?: { node: true };
			orderBy?: Record<string, "asc" | "desc">[];
			skip?: number;
			take?: number;
		}): Promise<PrismaPageContentWithNodeRow[]>;
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

function toPage(row: PrismaPageContentWithNodeRow): Page {
	return {
		id: row.id,
		nodeId: row.node.id,
		parentId: row.node.parentId,
		slug: row.node.slug,
		path: row.node.path,
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
	const parent = await prisma.pageNode.findUnique({
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
	const children = await prisma.pageNode.findMany({
		where: { parentId: opts.id },
	});
	for (const child of children) {
		const path = `${opts.path}/${child.slug}`;
		await prisma.pageNode.update({ where: { id: child.id }, data: { path } });
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
			const node = await prisma.pageNode.findUnique({ where: { path: slug } });
			if (!node) return null;
			const content = await prisma.pageContent.findUnique({
				where: { nodeId_locale: { nodeId: node.id, locale } },
			});
			if (!content) return null;
			if (!draft && content.status !== "published") return null;
			return toPage({ ...content, node });
		},

		async upsertPage({ id, blocks }) {
			await prisma.pageContent.update({ where: { id }, data: { blocks } });
		},

		async createPage({ id, slug, locale, parentId = null }) {
			const path = await computePath(prisma, { parentId, slug });
			const node = await prisma.pageNode.create({
				data: { id: crypto.randomUUID(), parentId, slug, path },
			});
			const content = await prisma.pageContent.create({
				data: { id, nodeId: node.id, locale, blocks: [] },
			});
			return toPage({ ...content, node });
		},

		async addPageLocale({ id, nodeId, locale, cloneFromLocale }) {
			const node = await prisma.pageNode.findUnique({ where: { id: nodeId } });
			if (!node) throw new Error(`No page found with id "${nodeId}"`);

			let blocks: unknown = [];
			if (cloneFromLocale) {
				const source = await prisma.pageContent.findUnique({
					where: { nodeId_locale: { nodeId, locale: cloneFromLocale } },
				});
				if (source) blocks = source.blocks;
			}

			const content = await prisma.pageContent.create({
				data: { id, nodeId, locale, blocks },
			});
			return toPage({ ...content, node });
		},

		async publishPage({ id }) {
			await prisma.pageContent.update({
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
				prisma.pageContent.findMany({
					where,
					include: { node: true },
					orderBy: orderBy.length > 0 ? orderBy : [{ updatedAt: "desc" }],
					skip: (params.page - 1) * params.pageSize,
					take: params.pageSize,
				}),
				prisma.pageContent.count({ where }),
			]);

			return {
				items: rows.map(
					(r): PageSummary => ({
						id: r.id,
						nodeId: r.node.id,
						parentId: r.node.parentId,
						slug: r.node.slug,
						path: r.node.path,
						locale: r.locale,
						status: r.status as "draft" | "published",
						updatedAt: r.updatedAt,
					}),
				),
				total,
			};
		},

		async listPageTree() {
			const [nodes, contents] = await Promise.all([
				prisma.pageNode.findMany(),
				prisma.pageContent.findMany({ where: {} }),
			]);

			const localesByNode = new Map<string, PageNodeLocale[]>();
			for (const c of contents) {
				const locales = localesByNode.get(c.nodeId) ?? [];
				locales.push({
					locale: c.locale,
					contentId: c.id,
					status: c.status as "draft" | "published",
					updatedAt: c.updatedAt,
				});
				localesByNode.set(c.nodeId, locales);
			}

			const byParent = new Map<string | null, PrismaPageNodeRow[]>();
			for (const node of nodes) {
				const siblings = byParent.get(node.parentId) ?? [];
				siblings.push(node);
				byParent.set(node.parentId, siblings);
			}
			const build = (parentId: string | null): PageTreeNode[] =>
				(byParent.get(parentId) ?? [])
					.map(
						(n): PageTreeNode => ({
							id: n.id,
							parentId: n.parentId,
							slug: n.slug,
							path: n.path,
							locales: (localesByNode.get(n.id) ?? []).sort((a, b) =>
								a.locale.localeCompare(b.locale),
							),
							children: build(n.id),
						}),
					)
					.sort((a, b) => a.slug.localeCompare(b.slug));
			return build(null);
		},

		async movePage({ nodeId, parentId }) {
			const node = await prisma.pageNode.findUnique({ where: { id: nodeId } });
			if (!node) throw new Error(`No page found with id "${nodeId}"`);
			if (parentId === nodeId) {
				throw new Error("A page cannot be moved into itself.");
			}

			// Reject moving a node into its own subtree (would orphan the loop).
			let cursor = parentId;
			while (cursor) {
				if (cursor === nodeId) {
					throw new Error(
						"Cannot move a page into one of its own descendants.",
					);
				}
				const ancestor = await prisma.pageNode.findUnique({
					where: { id: cursor },
				});
				cursor = ancestor?.parentId ?? null;
			}

			const existing = await prisma.pageNode.findUnique({
				where: { parentId_slug: { parentId, slug: node.slug } },
			});
			if (existing && existing.id !== nodeId) {
				throw new Error(
					`A page with slug "${node.slug}" already exists under the destination parent.`,
				);
			}

			const newPath = await computePath(prisma, {
				parentId,
				slug: node.slug,
			});
			await prisma.pageNode.update({
				where: { id: nodeId },
				data: { parentId, path: newPath },
			});
			await reparentDescendantPaths(prisma, { id: nodeId, path: newPath });
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
