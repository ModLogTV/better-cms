import { CMS_PERMISSIONS } from "../auth/permissions";
import type {
	CMSAdapter,
	ListPagesParams,
	Locale,
	MediaAsset,
	NamespaceLocaleMeta,
	Page,
	PageAclSubject,
	PageGrant,
	PageNodeLocale,
	PageSummary,
	PageTreeNode,
	PageVersionRetention,
	PageVersionSummary,
	RawBlock,
} from "../core/adapter";

interface PrismaPageNodeRow {
	id: string;
	parentId: string | null;
	slug: string;
	path: string;
}

interface PrismaPageGrantRow {
	id: string;
	nodeId: string;
	subjectType: string;
	subjectId: string;
	permission: string;
	locale: string | null;
}

interface PrismaPageContentRow {
	id: string;
	nodeId: string;
	locale: string;
	publishedVersionId: string | null;
	updatedAt: Date;
}

interface PrismaPageContentWithNodeRow extends PrismaPageContentRow {
	node: PrismaPageNodeRow;
	/** Latest version only, when fetched with `include.versions` (take 1, desc). */
	versions: PrismaPageVersionRow[];
}

interface PrismaPageVersionRow {
	id: string;
	contentId: string;
	blocks: unknown;
	createdAt: Date;
	publishedAt: Date | null;
	createdBy: string | null;
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
			data: { id: string; nodeId: string; locale: string };
		}): Promise<PrismaPageContentRow>;
		update(args: {
			where: { id: string };
			data: Partial<{ publishedVersionId: string | null }>;
		}): Promise<PrismaPageContentRow>;
		findMany(args: {
			where?: { locale?: string };
			include?: {
				node: true;
				versions: { orderBy: Record<string, "asc" | "desc">[]; take: number };
			};
		}): Promise<PrismaPageContentWithNodeRow[]>;
	};
	pageVersion: {
		findUnique(args: {
			where: { id: string };
		}): Promise<PrismaPageVersionRow | null>;
		create(args: {
			data: {
				id: string;
				contentId: string;
				blocks: unknown;
				createdBy?: string | null;
			};
		}): Promise<PrismaPageVersionRow>;
		update(args: {
			where: { id: string };
			data: { publishedAt: Date };
		}): Promise<PrismaPageVersionRow>;
		findMany(args: {
			where: { contentId: string };
			orderBy: Record<string, "asc" | "desc">[];
			take?: number;
		}): Promise<PrismaPageVersionRow[]>;
		delete(args: { where: { id: string } }): Promise<unknown>;
	};
	pageGrant: {
		findMany(args?: {
			where?: {
				nodeId?: string | { in: string[] };
				OR?: Array<{
					subjectType: string;
					subjectId: string | { in: string[] };
				}>;
			};
		}): Promise<PrismaPageGrantRow[]>;
		create(args: {
			data: {
				id: string;
				nodeId: string;
				subjectType: string;
				subjectId: string;
				permission: string;
				locale: string | null;
			};
		}): Promise<PrismaPageGrantRow>;
		delete(args: { where: { id: string } }): Promise<unknown>;
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

function deriveStatus(
	publishedVersionId: string | null,
	latestVersionId: string | undefined,
): Page["status"] {
	if (!publishedVersionId) return "draft";
	if (latestVersionId && publishedVersionId === latestVersionId)
		return "published";
	return "modified";
}

function toPageVersionSummary(row: PrismaPageVersionRow): PageVersionSummary {
	return {
		id: row.id,
		contentId: row.contentId,
		createdAt: row.createdAt,
		publishedAt: row.publishedAt,
		createdBy: row.createdBy,
	};
}

function buildPage(opts: {
	content: PrismaPageContentRow;
	node: PrismaPageNodeRow;
	blocks: unknown;
	status: Page["status"];
	publishedAt: Date | null;
}): Page {
	return {
		id: opts.content.id,
		nodeId: opts.node.id,
		parentId: opts.node.parentId,
		slug: opts.node.slug,
		path: opts.node.path,
		locale: opts.content.locale,
		blocks: opts.blocks as RawBlock[],
		status: opts.status,
		publishedAt: opts.publishedAt,
		updatedAt: opts.content.updatedAt,
	};
}

async function latestVersion(
	prisma: PrismaClient,
	contentId: string,
): Promise<PrismaPageVersionRow | undefined> {
	const rows = await prisma.pageVersion.findMany({
		where: { contentId },
		orderBy: [{ createdAt: "desc" }],
		take: 1,
	});
	return rows[0];
}

/** Prunes old versions per `retention`, if configured. Never removes the latest or currently-published version. */
async function pruneVersions(
	prisma: PrismaClient,
	contentId: string,
	retention: PageVersionRetention | undefined,
): Promise<void> {
	if (!retention?.maxVersions && !retention?.maxAgeDays) return;

	const [content, versions] = await Promise.all([
		prisma.pageContent.findUnique({ where: { id: contentId } }),
		prisma.pageVersion.findMany({
			where: { contentId },
			orderBy: [{ createdAt: "desc" }],
		}),
	]);
	if (versions.length === 0) return;

	const keep = new Set(
		[versions[0]?.id, content?.publishedVersionId ?? undefined].filter(
			(id): id is string => !!id,
		),
	);

	const toDelete = new Set<string>();
	if (retention.maxVersions && versions.length > retention.maxVersions) {
		for (const v of versions.slice(retention.maxVersions)) {
			if (!keep.has(v.id)) toDelete.add(v.id);
		}
	}
	if (retention.maxAgeDays) {
		const cutoff = Date.now() - retention.maxAgeDays * 24 * 60 * 60 * 1000;
		for (const v of versions) {
			if (!keep.has(v.id) && v.createdAt.getTime() < cutoff) toDelete.add(v.id);
		}
	}
	for (const id of toDelete) {
		await prisma.pageVersion.delete({ where: { id } });
	}
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

function toPageGrant(row: PrismaPageGrantRow): PageGrant {
	return {
		id: row.id,
		nodeId: row.nodeId,
		subjectType: row.subjectType as "user" | "group",
		subjectId: row.subjectId,
		permission: row.permission,
		locale: row.locale,
	};
}

/** Node ids from `nodeId` up to (and including) the root ancestor. */
async function getAncestorChain(
	prisma: PrismaClient,
	nodeId: string,
): Promise<string[]> {
	const chain = [nodeId];
	let cursor: string | null = nodeId;
	while (cursor) {
		const node: PrismaPageNodeRow | null = await prisma.pageNode.findUnique({
			where: { id: cursor },
		});
		cursor = node?.parentId ?? null;
		if (cursor) chain.push(cursor);
	}
	return chain;
}

function subjectGrantFilter(subject: PageAclSubject) {
	const OR: Array<{
		subjectType: string;
		subjectId: string | { in: string[] };
	}> = [];
	if (subject.userId)
		OR.push({ subjectType: "user", subjectId: subject.userId });
	if (subject.groupIds.length > 0) {
		OR.push({ subjectType: "group", subjectId: { in: subject.groupIds } });
	}
	return OR;
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

const PAGE_SORT_FIELDS = ["slug", "locale", "status", "updatedAt"] as const;
type PageSortField = (typeof PAGE_SORT_FIELDS)[number];

function applySort(
	items: PageSummary[],
	sort: { id: string; desc: boolean }[],
): PageSummary[] {
	const [primary] = sort.filter(
		(s): s is { id: PageSortField; desc: boolean } =>
			(PAGE_SORT_FIELDS as readonly string[]).includes(s.id),
	);
	if (!primary) {
		return [...items].sort(
			(a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
		);
	}
	const { id, desc } = primary;
	return [...items].sort((a, b) => {
		const av = id === "updatedAt" ? a.updatedAt.getTime() : a[id];
		const bv = id === "updatedAt" ? b.updatedAt.getTime() : b[id];
		const cmp = av < bv ? -1 : av > bv ? 1 : 0;
		return desc ? -cmp : cmp;
	});
}

function toPageSummary(row: PrismaPageContentWithNodeRow): PageSummary {
	const latest = row.versions[0];
	return {
		id: row.id,
		nodeId: row.node.id,
		parentId: row.node.parentId,
		slug: row.node.slug,
		path: row.node.path,
		locale: row.locale,
		status: deriveStatus(row.publishedVersionId, latest?.id),
		updatedAt: row.updatedAt,
	};
}

/**
 * Prisma adapter for better-cms.
 * Copy the schema snippet from the docs into your schema.prisma before generating.
 */
export function prismaAdapter(
	prisma: PrismaClient,
	opts?: { pageVersionRetention?: PageVersionRetention },
): CMSAdapter {
	const retention = opts?.pageVersionRetention;

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

			if (draft) {
				const latest = await latestVersion(prisma, content.id);
				if (!latest) return null;
				return buildPage({
					content,
					node,
					blocks: latest.blocks,
					status: deriveStatus(content.publishedVersionId, latest.id),
					publishedAt: latest.publishedAt,
				});
			}

			// Public/preview-off access always serves the PUBLISHED snapshot, never
			// whatever the latest draft happens to be - this is what makes a save
			// on a published page never clobber what's live (admin-ui/TODO.md #6).
			if (!content.publishedVersionId) return null;
			const published = await prisma.pageVersion.findUnique({
				where: { id: content.publishedVersionId },
			});
			if (!published) return null;
			const latest = await latestVersion(prisma, content.id);
			return buildPage({
				content,
				node,
				blocks: published.blocks,
				status: deriveStatus(content.publishedVersionId, latest?.id),
				publishedAt: published.publishedAt,
			});
		},

		async getPageById({ id }) {
			const content = await prisma.pageContent.findUnique({ where: { id } });
			if (!content) return null;
			const node = await prisma.pageNode.findUnique({
				where: { id: content.nodeId },
			});
			if (!node) return null;
			const latest = await latestVersion(prisma, id);
			return buildPage({
				content,
				node,
				blocks: latest?.blocks ?? [],
				status: deriveStatus(content.publishedVersionId, latest?.id),
				publishedAt: latest?.publishedAt ?? null,
			});
		},

		async upsertPage({ id, blocks }) {
			const content = await prisma.pageContent.findUnique({ where: { id } });
			if (!content) throw new Error(`No page found with id "${id}"`);
			await prisma.pageVersion.create({
				data: { id: crypto.randomUUID(), contentId: id, blocks },
			});
			// Touches `updatedAt` (@updatedAt refreshes on any update() call to the row).
			await prisma.pageContent.update({ where: { id }, data: {} });
			await pruneVersions(prisma, id, retention);
		},

		async createPage({ id, slug, locale, parentId = null }) {
			const path = await computePath(prisma, { parentId, slug });
			const node = await prisma.pageNode.create({
				data: { id: crypto.randomUUID(), parentId, slug, path },
			});
			const content = await prisma.pageContent.create({
				data: { id, nodeId: node.id, locale },
			});
			await prisma.pageVersion.create({
				data: { id: crypto.randomUUID(), contentId: id, blocks: [] },
			});
			return buildPage({
				content,
				node,
				blocks: [],
				status: "draft",
				publishedAt: null,
			});
		},

		async addPageLocale({ id, nodeId, locale, cloneFromLocale }) {
			const node = await prisma.pageNode.findUnique({ where: { id: nodeId } });
			if (!node) throw new Error(`No page found with id "${nodeId}"`);

			let blocks: unknown = [];
			if (cloneFromLocale) {
				const source = await prisma.pageContent.findUnique({
					where: { nodeId_locale: { nodeId, locale: cloneFromLocale } },
				});
				if (source) {
					const sourceLatest = await latestVersion(prisma, source.id);
					if (sourceLatest) blocks = sourceLatest.blocks;
				}
			}

			const content = await prisma.pageContent.create({
				data: { id, nodeId, locale },
			});
			await prisma.pageVersion.create({
				data: { id: crypto.randomUUID(), contentId: id, blocks },
			});
			return buildPage({
				content,
				node,
				blocks,
				status: "draft",
				publishedAt: null,
			});
		},

		async publishPage({ id }) {
			const content = await prisma.pageContent.findUnique({ where: { id } });
			if (!content) throw new Error(`No page found with id "${id}"`);
			const latest = await latestVersion(prisma, id);
			if (!latest)
				throw new Error(`Page "${id}" has no saved content to publish.`);
			if (!latest.publishedAt) {
				await prisma.pageVersion.update({
					where: { id: latest.id },
					data: { publishedAt: new Date() },
				});
			}
			await prisma.pageContent.update({
				where: { id },
				data: { publishedVersionId: latest.id },
			});
		},

		async listPageVersions({ id }) {
			const rows = await prisma.pageVersion.findMany({
				where: { contentId: id },
				orderBy: [{ createdAt: "desc" }],
			});
			return rows.map(toPageVersionSummary);
		},

		async getPageVersion({ versionId }) {
			const row = await prisma.pageVersion.findUnique({
				where: { id: versionId },
			});
			if (!row) return null;
			return { ...toPageVersionSummary(row), blocks: row.blocks as RawBlock[] };
		},

		async restorePageVersion({ id, versionId }) {
			const content = await prisma.pageContent.findUnique({ where: { id } });
			if (!content) throw new Error(`No page found with id "${id}"`);
			const node = await prisma.pageNode.findUnique({
				where: { id: content.nodeId },
			});
			if (!node) throw new Error(`No page found with id "${id}"`);
			const source = await prisma.pageVersion.findUnique({
				where: { id: versionId },
			});
			if (!source || source.contentId !== id) {
				throw new Error(`No version "${versionId}" found for page "${id}"`);
			}

			const restored = await prisma.pageVersion.create({
				data: { id: crypto.randomUUID(), contentId: id, blocks: source.blocks },
			});
			await prisma.pageContent.update({ where: { id }, data: {} });
			await pruneVersions(prisma, id, retention);

			return buildPage({
				content,
				node,
				blocks: restored.blocks,
				status: deriveStatus(content.publishedVersionId, restored.id),
				publishedAt: restored.publishedAt,
			});
		},

		async listPages(params: ListPagesParams) {
			const where: { locale?: string } = {};
			if (params.locale) where.locale = params.locale;

			// Status is derived (not a DB column), so it's computed and filtered
			// here rather than in the query - fine at the scale this adapter
			// targets (a single team's page tree), less so at very large scale.
			const rows = await prisma.pageContent.findMany({
				where,
				include: {
					node: true,
					versions: { orderBy: [{ createdAt: "desc" }], take: 1 },
				},
			});
			let items = rows.map(toPageSummary);
			if (params.status)
				items = items.filter((i) => i.status === params.status);
			items = applySort(
				items,
				params.sort ?? [{ id: "updatedAt", desc: true }],
			);

			const total = items.length;
			const start = (params.page - 1) * params.pageSize;
			return { items: items.slice(start, start + params.pageSize), total };
		},

		async listPageTree({ subject } = {}) {
			const [nodes, contents] = await Promise.all([
				prisma.pageNode.findMany(),
				prisma.pageContent.findMany({
					where: {},
					include: {
						node: true,
						versions: { orderBy: [{ createdAt: "desc" }], take: 1 },
					},
				}),
			]);

			const localesByNode = new Map<string, PageNodeLocale[]>();
			for (const c of contents) {
				const latest = c.versions[0];
				const locales = localesByNode.get(c.nodeId) ?? [];
				locales.push({
					locale: c.locale,
					contentId: c.id,
					status: deriveStatus(c.publishedVersionId, latest?.id),
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

			// Node visibility for a subject without the global read permission -
			// additive-only inheritance: a node is readable if it (or an ancestor)
			// has a matching node-level (locale: null) read grant.
			let readableIds: Set<string> | null = null;
			if (subject && (subject.userId || subject.groupIds.length > 0)) {
				const OR = subjectGrantFilter(subject);
				const grants =
					OR.length > 0
						? await prisma.pageGrant.findMany({ where: { OR } })
						: [];
				const ownReadGrant = new Set(
					grants
						.filter(
							(g) =>
								g.locale === null &&
								g.permission === CMS_PERMISSIONS.PAGES_READ,
						)
						.map((g) => g.nodeId),
				);
				readableIds = new Set();
				const visit = (parentId: string | null, inherited: boolean) => {
					for (const n of byParent.get(parentId) ?? []) {
						const readable = inherited || ownReadGrant.has(n.id);
						if (readable) readableIds?.add(n.id);
						visit(n.id, readable);
					}
				};
				visit(null, false);
			}

			const build = (parentId: string | null): PageTreeNode[] => {
				// Nodes whose actual parent is filtered out get promoted to this
				// level so they stay reachable, rather than disappearing entirely.
				const candidates = (byParent.get(parentId) ?? []).concat(
					readableIds && parentId === null
						? nodes.filter(
								(n) =>
									readableIds?.has(n.id) &&
									n.parentId !== null &&
									!readableIds?.has(n.parentId),
							)
						: [],
				);
				return candidates
					.filter((n) => !readableIds || readableIds.has(n.id))
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
			};
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

		async listPageGrants({ nodeId }) {
			const rows = await prisma.pageGrant.findMany({ where: { nodeId } });
			return rows.map(toPageGrant);
		},

		async addPageGrant({
			id,
			nodeId,
			subjectType,
			subjectId,
			permission,
			locale = null,
		}) {
			const row = await prisma.pageGrant.create({
				data: { id, nodeId, subjectType, subjectId, permission, locale },
			});
			return toPageGrant(row);
		},

		async removePageGrant({ id }) {
			await prisma.pageGrant.delete({ where: { id } });
		},

		async getEffectivePagePermissions({ userId, groupIds, nodeId, locale }) {
			const OR = subjectGrantFilter({ userId, groupIds });
			if (OR.length === 0) return [];

			const chain = await getAncestorChain(prisma, nodeId);
			const grants = await prisma.pageGrant.findMany({
				where: { nodeId: { in: chain }, OR },
			});
			const matching = grants.filter((g) =>
				locale !== undefined
					? g.locale === null || g.locale === locale
					: g.locale === null,
			);
			return [...new Set(matching.map((g) => g.permission))];
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
