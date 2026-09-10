# Admin UI TODO Tickets

## Pages Management

Rework of page creation, organization, permissioning, and publishing in the admin UI. Current model is flat (no real nesting), forces awkward multi-locale handling, has no page-level access control, uses a plain `<Select>` to add blocks, and only exposes a binary draft/published status that hides whether a published page has unpublished changes sitting on top of it.

---

### 1. Page hierarchy: turn flat pages into a real folder-style tree

**Description**
Introduce real parent/child structure for pages instead of the current flat, globally-unique-slug model. Add a `parentId` on the page node so pages can be nested arbitrarily deep, scope slug uniqueness to the parent (so `about` can exist once under `company/` and again under `products/`), and expose the tree in the admin UI as a folder/explorer view (expand/collapse, drag-to-reparent) instead of the current flat list. Maintain a materialized `path` field derived from the tree so the existing public `getPage({ slug, locale })` adapter contract keeps working unchanged for consuming apps.

**Acceptance Criteria**
- [ ] Page node has a nullable `parentId`; root pages have `parentId = null`.
- [ ] Slug uniqueness is enforced per-parent (`[parentId, slug]`), not globally.
- [ ] Materialized `path` is computed/stored per node and kept in sync when a node is renamed or moved (reparented).
- [ ] Public adapter API (`getPage`, etc.) still accepts the full path string exactly as before — no breaking change for consumer apps.
- [ ] Admin UI pages list renders as an expandable folder tree, not a flat table.
- [ ] Pages can be moved to a new parent via drag-and-drop (or an equivalent explicit "move" action); moving revalidates slug uniqueness at the destination and updates the materialized path for the node and all descendants.
- [ ] Existing pages are migrated as root-level nodes (`parentId = null`) with no data loss.

---

### 2. Per-locale page content: make single-locale pages the default, not the exception

**Description**
Split the page identity (tree position, slug, node) from its per-locale content. Introduce a locale-independent `PageNode` for tree/slug identity and a separate `PageContent` per `(node, locale)` holding blocks, status, and versions. This lets a page be created for a single locale without any of the other locales existing yet, and makes adding a locale later an explicit, opt-in action rather than an implicit requirement of creating the page.

**Acceptance Criteria**
- [ ] Page node (tree identity, slug, path) is stored separately from per-locale content.
- [ ] Creating a new page requires choosing exactly one starting locale; no other locale rows are created implicitly.
- [ ] Admin UI shows, per page node, which locales currently have content and which don't ("Add locale" affordance for missing ones).
- [ ] Adding a new locale to an existing node defaults to cloning the current draft of an existing locale (selectable if more than one exists) as the starting content; a "start blank" option remains available.
- [ ] Each locale's content has its own independent draft/published lifecycle (publishing `fr` does not affect `en`'s status).

---

### 3. Page-level permissions for users and groups

**Description**
Add an ACL layer so specific users or groups can be granted access to a specific page node and, by inheritance, its descendants. Grants are per-action (read / write / publish — reusing the existing global `CMS_PERMISSIONS` values, just scoped to a node) and can optionally be scoped to a single locale (a grant with no locale applies to all locales of that node). Inheritance is additive-only: a grant on a node applies to the whole subtree below it, with no mechanism to revoke access for a sub-branch.

**Acceptance Criteria**
- [ ] New ACL table: `(nodeId, subjectType: user|group, subjectId, permission, locale?)`.
- [ ] Permission checks walk up the node's ancestor chain and union all applicable grants (node's own + all ancestors').
- [ ] A grant with `locale = null` applies to all locales of the node; a grant with a specific locale applies only to that locale's content.
- [ ] Admin UI: on a page, an "Access" panel lists current grants (user/group, permission, locale scope) and lets an authorized admin add/remove grants.
- [ ] Users/groups without at least read access to a node cannot see it in the tree, open it, or act on it via the API.
- [ ] No "deny" or inheritance-break capability — this ticket is additive-grants only.

---

### 4. Drag-and-drop block library with previews

**Description**
Replace the current `<Select>`-based block picker in `BlockEditor.tsx` with a visual block library: a panel of available block types, each shown as a small card with a static preview (icon/label/thumbnail — supplied by the block author via new optional `preview` metadata on `BlockDefinition`, since there's no live-render capability available to admin-ui across the framework boundary). Blocks can be added either by dragging a card from the library into the page's block list at the desired position, or via a "+" button at any position in the list that opens the same library.

**Acceptance Criteria**
- [ ] `BlockDefinition` gains optional `preview` metadata (e.g. icon + label, or a small static image/SVG reference); blocks without it fall back to their `label`/`type` as today.
- [ ] Admin UI renders a block library panel (fed by the existing `describeBlocks()` query) showing each block type as a card with its preview.
- [ ] A block can be added by dragging its card into the block list at a specific position.
- [ ] A block can also be added via a "+" button inserted between existing blocks (or at the start/end), opening the same library to pick from.
- [ ] Existing block field-editing behavior (`BlockCard`, per-field inputs, raw-JSON fallback) is unchanged — this ticket only replaces how a block is *added*, not how it's edited.
- [ ] Existing blocks can still be reordered within the list (drag existing block cards, not just library cards).

---

### 5. Full version history for page content, with transparent publish state

**Description**
Replace the single-`blocks`-column model with an append-only `PageVersion` history per `(node, locale)`. A new version row is created on every explicit Save and every Publish. Page status becomes derived from version data rather than a single flag: **draft** (never published), **published** (published version's content matches the latest version), or **published — unpublished changes** (latest version differs from the currently published one). Admin UI exposes version history with diffs (data-level diff, since there's no cross-app visual renderer available) and a "restore" action that copies an old version's content into the current draft. By default all versions are retained indefinitely; an admin can optionally configure a retention cap (max N versions, or max age in days) per project, below which older versions are pruned.

**Acceptance Criteria**
- [ ] `PageVersion(id, contentId, blocks, createdAt, publishedAt?, createdBy)` — append-only, one row per save and per publish.
- [ ] Saving a draft creates a new version; publishing creates a new version and marks it (or the just-created draft version) as the published one via `publishedAt`/pointer.
- [ ] Page status is derived and shown in the UI as one of: Draft / Published / Published (unpublished changes) — no more silent "published" badge when the live content differs from what's saved.
- [ ] Admin UI has a version history view per page/locale: list of versions with timestamp + author, and a diff view between any two versions (or a version and the current draft).
- [ ] "Restore" on a past version copies its content into the current draft (does not touch the published version until explicitly re-published) and itself creates a new version entry.
- [ ] No automatic garbage collection of versions by default.
- [ ] Admins can optionally configure a retention cap (max version count and/or max age) that prunes older versions when exceeded; disabled unless explicitly configured.

---

### 6. Bug: page saving is unreliable, especially for published pages

**Description**
Users report that saving a page's content doesn't reliably persist, and the problem is worse for already-published pages. Current implementation writes Save and Publish to the same single `blocks` column in place (`src/prisma/index.ts` `upsertPage`/`publishPage`), with no snapshot boundary between "what's being edited" and "what's live" — this is a strong candidate root cause (in-place overwrite of the same row both actions touch, no transactional separation). The version-history rework in ticket #5 structurally removes this shared-column contention, but this ticket is to verify the fix and regression-test the save path specifically, independent of the larger feature work.

**Acceptance Criteria**
- [ ] Reproduce the current failure: identify concrete steps where a save on a published page is lost or not reflected.
- [ ] Confirm whether root cause is the shared-column write path described above, or something else (e.g. a race in the admin UI mutation/query cache) — document findings.
- [ ] After ticket #5 lands, verify saving a draft on a published page reliably creates a new draft version without affecting the currently published version.
- [ ] Add a regression test covering: save on a published page, save on a plain draft page, and rapid consecutive saves, asserting no lost writes.

## Media Management

Rework of media management in the admin UI. Current model (`MediaAsset` in `demo/api/prisma/schema.prisma`) is flat: no tags, no folders, no publish/version state, and only `filename`/`mimeType`/`size`/`uploadedBy`/`createdAt` as metadata. The upload flow (`admin-ui/src/routes/_layout/media/index.tsx`) blocks the upload button for the whole batch and gives no per-item progress. Permissions (`src/auth/permissions.ts`) are flat/global only — there's no per-resource scoping precedent for media (mirrors the still-unbuilt page ACL in ticket #3 above).

---

### 7. Non-blocking uploads with progress placeholders

**Description**
Stop disabling the upload button for the duration of a batch upload (`admin-ui/src/routes/_layout/media/index.tsx` lines 168-171) — users should be able to kick off additional uploads while others are still in flight. Each file in a batch should appear immediately in the grid as a placeholder/skeleton card reflecting its own upload progress, replaced by the real `MediaCard` once the upload + confirm step completes. Per-file failures should surface on that file's own card, not just a toast, and must not block or roll back sibling uploads in the same batch.

**Acceptance Criteria**
- [ ] Upload button/input remains enabled while uploads are in progress; a new batch can be started before a previous one finishes.
- [ ] Each in-flight file renders as a placeholder card in the media grid immediately on selection, with per-file progress (not just a single global `isPending` flag).
- [ ] Placeholder card is replaced by the real `MediaCard` once that file's upload + confirm completes.
- [ ] A failed upload shows its error state on its own card and does not affect other files in the same or a concurrent batch.
- [ ] Existing single-file and multi-file selection both work as today.

---

### 8. Media publishing state with version history

**Description**
Give each media item its own publish lifecycle, independent of any page referencing it, using the same version-history pattern as the pages rework (ticket #5 above). Every metadata edit and every file replacement creates a new append-only `MediaVersion`. Status is derived: **draft** (never published), **published** (published version matches latest), or **published — unpublished changes** (latest version differs from the published one). Draft media is not servable via the public-facing media/storage API — only published versions are publicly reachable; draft/unpublished versions remain visible via the admin API to authorized users.

**Acceptance Criteria**
- [ ] `MediaVersion(id, assetId, key/file ref, metadata snapshot, createdAt, publishedAt?, createdBy)` — append-only, one row per metadata save and per file replacement.
- [ ] Publish status is derived and shown as Draft / Published / Published (unpublished changes) — never a static badge disconnected from version state.
- [ ] Draft (or not-yet-published) content is excluded from the public media-serving API/URL; only the published version is publicly servable.
- [ ] Version history view per media item: list of versions (timestamp, author), with a diff between any two versions — metadata fields shown as a field-level diff, and if the underlying file changed between versions, an old-vs-new side-by-side file preview (thumbnail/player).
- [ ] "Restore" on a past version copies its metadata (and/or file reference) into the current draft and itself creates a new version entry; does not touch the published version until explicitly re-published.
- [ ] No automatic garbage collection of versions by default; admins can optionally configure a retention cap (max version count and/or max age) that prunes older versions, same mechanism as pages ticket #5.

---

### 9. Tag system replacing folders, with saved views

**Description**
Introduce a flat tag model for media (no folder hierarchy) — each media item can have zero or more tags. Replace any folder-based organization with tag-based filtering: users combine tags to filter the library, and can save a named combination as a persisted, shareable **View** (name, tag filter, owner), listed for quick access, similar to Paperless-ngx's saved views.

**Acceptance Criteria**
- [ ] `Tag(id, name, ...)` model; `MediaAsset` (or its current version) can be associated with any number of tags via a join table.
- [ ] Media library UI supports filtering by one or more tags (AND/OR as needed for the UI's filter builder).
- [ ] Users can save a tag-filter combination as a named `SavedView`, persisted server-side and listed in the UI (e.g. a sidebar) for quick re-selection.
- [ ] No folder/hierarchical grouping is introduced — tags are flat.
- [ ] Existing untagged media remains fully visible/manageable (see ticket #4 for who can see what).

---

### 10. Tag-scoped media permissions

**Description**
Extend the flat, global `CMS_PERMISSIONS` model with a per-tag ACL, without removing the global permissions. A new baseline permission (`MEDIA_VIEW`) is required to open the media library UI at all — this is a hard prerequisite for every user, tag-scoped or not. Beyond that baseline, a new ACL grants a user or group specific actions (view/upload/edit/delete/publish) scoped to one or more tags, additive on top of whatever global `MEDIA_*` permissions they already hold. A media item with multiple tags is accessible if the user has a matching grant on *any* one of its tags (OR logic, not AND). Untagged media continues to be governed purely by the existing global `MEDIA_UPLOAD`/`MEDIA_DELETE` permissions (visible to any `MEDIA_VIEW` holder, writable only with the relevant global permission). Tag creation/rename/deletion is itself gated behind a new `MEDIA_TAG_MANAGE` permission, separate from tag *assignment*, since tags now double as an access-control boundary.

**Acceptance Criteria**
- [ ] New `MEDIA_VIEW` permission added to `CMS_PERMISSIONS`; required to open the media library route/API at all (no bypass via tag grants).
- [ ] New ACL table: `(subjectType: user|group, subjectId, tagId, permission: view|upload|edit|delete|publish)`.
- [ ] A user/group can act on a tagged item if they hold a matching per-tag grant for that action on *any* tag the item has, independent of their global `MEDIA_*` permissions.
- [ ] Untagged media remains governed solely by existing global `MEDIA_UPLOAD`/`MEDIA_DELETE`; visible to any `MEDIA_VIEW` holder.
- [ ] Uploading an item without any tag is allowed for any user with upload access (global or tag-scoped); it is not required to tag at upload time.
- [ ] Tag CRUD (create/rename/delete) requires a new `MEDIA_TAG_MANAGE` permission, distinct from assigning existing tags to media (which only requires edit/upload access to the item).
- [ ] Admin UI: a tag's management view lists current grants (user/group, permission) and lets an authorized admin add/remove them.
- [ ] Users without `MEDIA_VIEW` cannot open the media library at all, regardless of any tag grants they hold.

---

### 11. Media metadata edit form

**Description**
Add an edit form for each media item exposing editable metadata — alt text, caption, and an open-ended set of custom key-value fields — alongside a read-only view of immutable technical metadata. Extend upload-confirm handling to extract and store image width/height and video/audio duration, which aren't currently captured.

**Acceptance Criteria**
- [ ] Edit form on a media item lets a user with edit access set alt text, caption, and add/remove arbitrary custom key-value metadata fields.
- [ ] Immutable fields shown read-only: filename, mimeType, size, uploadedBy, createdAt.
- [ ] Image uploads have width/height extracted and stored at confirm time; video/audio uploads have duration extracted and stored; both shown read-only in the edit form.
- [ ] Saving the form creates a new `MediaVersion` per ticket #8's versioning model.
- [ ] Existing media without extracted dimensions/duration (uploaded before this ticket) degrade gracefully — field simply not shown, no error.