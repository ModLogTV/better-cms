# Building an Admin UI

- [What you need to build](#what-you-need-to-build)
- [Setup](#setup)
- [Translation editor](#translation-editor)
  - [Plural key handling](#plural-key-handling)
- [Page editor](#page-editor)
- [Media uploader](#media-uploader)
- [Locale management](#locale-management)
- [Security considerations](#security-considerations)
- [Recommended stack](#recommended-stack)

better-cms provides no pre-built admin dashboard. This page explains what you need to build one using the available primitives.

## What you need to build

A minimal admin UI needs:

1. **Locale selector** - add/remove/list locales
2. **Translation editor** - list namespaces, edit key values per locale
3. **Page editor** - create/edit page blocks, publish pages
4. **Media uploader** - upload images/files linked to storage

## Setup

```tsx
// apps/admin/src/providers.tsx
import { createAdminClient } from "@modlog/better-cms/admin";
import { createAdminHooks, AdminQueryProvider } from "@modlog/better-cms/admin/react";

const admin = createAdminClient({
  cmsUrl: process.env.NEXT_PUBLIC_CMS_URL!,
  token: process.env.CMS_ADMIN_TOKEN!,
});

export const {
  useNamespaceTranslations,
  useUpdateTranslation,
  useDescribeNamespace,
  usePages,
  usePage,
  useUpdatePage,
  usePublishPage,
  useMediaUpload,
  useLocales,
  useUpsertLocale,
  useDeleteLocale,
} = createAdminHooks({ client: admin });

export function AdminProvider({ children }) {
  return <AdminQueryProvider>{children}</AdminQueryProvider>;
}
```

## Translation editor

Pattern: show all keys for a namespace, render the appropriate input per `inputHint`, save on blur/submit.

```tsx
function TranslationEditor({ namespace, locale }: { namespace: string; locale: string }) {
  const { data: translations } = useNamespaceTranslations({ namespace, locale });
  const { data: keys } = useDescribeNamespace({ namespace });
  const { mutate: updateTranslation } = useUpdateTranslation();

  if (!keys || !translations) return <div>Loading...</div>;

  return (
    <div>
      {keys.map((meta) => (
        <div key={meta.key}>
          <label>{meta.key}</label>
          {meta.inputHint === "rich-text" ? (
            <RichTextEditor
              value={translations[meta.key] ?? ""}
              tags={meta.tags}
              onBlur={(value) =>
                updateTranslation({ namespace, locale, key: meta.key, value })
              }
            />
          ) : (
            <input
              defaultValue={translations[meta.key] ?? ""}
              onBlur={(e) =>
                updateTranslation({ namespace, locale, key: meta.key, value: e.target.value })
              }
            />
          )}
          {meta.type === "vars" && (
            <small>Variables: {meta.vars?.map((v) => `{${v}}`).join(", ")}</small>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Plural key handling

For `inputHint: "text+count"`, you need to render one input per plural suffix. The suffixes depend on the locale's CLDR rules, but `one` and `other` cover English.

```tsx
if (meta.inputHint === "text+count") {
  const suffixes = getPluralSuffixes(locale); // e.g. ["one", "other"]
  return suffixes.map((suffix) => (
    <div key={suffix}>
      <label>{meta.key}_{suffix}</label>
      <input
        defaultValue={translations[`${meta.key}_${suffix}`] ?? ""}
        onBlur={(e) =>
          updateTranslation({
            namespace,
            locale,
            key: `${meta.key}_${suffix}`,
            value: e.target.value,
          })
        }
      />
    </div>
  ));
}
```

## Page editor

Pattern: show a list of blocks, allow drag-to-reorder, inline field editing per block type, save draft, publish.

```tsx
function PageEditor({ slug, locale }: { slug: string; locale: string }) {
  const { data: page } = usePage({ slug, locale, draft: true }); // fetch draft
  const { mutate: updatePage } = useUpdatePage();
  const { mutate: publishPage } = usePublishPage();

  const [blocks, setBlocks] = useState(page?.blocks ?? []);

  const save = () => updatePage({ id: page!.id, blocks });
  const publish = () => publishPage({ id: page!.id });

  return (
    <div>
      <BlockList blocks={blocks} onChange={setBlocks} />
      <button onClick={save}>Save Draft</button>
      <button onClick={publish}>Publish</button>
    </div>
  );
}
```

## Media uploader

```tsx
function MediaUploader({ onUpload }: { onUpload: (url: string) => void }) {
  const { upload, isPending } = useMediaUpload();

  return (
    <input
      type="file"
      accept="image/*"
      disabled={isPending}
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const { publicUrl } = await upload({ file });
        onUpload(publicUrl);
      }}
    />
  );
}
```

## Locale management

```tsx
function LocaleManager() {
  const { data: locales } = useLocales();
  const { mutate: upsert } = useUpsertLocale();
  const { mutate: remove } = useDeleteLocale();

  return (
    <div>
      {locales?.map((locale) => (
        <div key={locale.code}>
          {locale.code} - {locale.name}
          {locale.isDefault && " (default)"}
          <button onClick={() => remove({ code: locale.code })}>Remove</button>
        </div>
      ))}
      <button onClick={() => upsert({ code: "fr", name: "French" })}>
        Add French
      </button>
    </div>
  );
}
```

## Security considerations

The admin token (`CMS_ADMIN_TOKEN`) must never reach the browser. Options:

1. **Separate admin app** on a private network - server-side only, token never exposed
2. **Next.js API route proxy** - frontend calls `/api/cms/*`, route handler adds the token server-side
3. **TanStack Start server functions** - token stays on the server

Avoid: embedding `CMS_ADMIN_TOKEN` in `NEXT_PUBLIC_*` env vars or client bundles.

## Recommended stack

| Concern | Recommendation |
|---------|---------------|
| State management | TanStack Query (already required by admin hooks) |
| Forms | React Hook Form or controlled inputs |
| Rich text | Tiptap, Lexical, or Slate |
| Drag-and-drop | @dnd-kit/core |
| Routing | Next.js App Router or TanStack Router |


---

[← Admin Hooks (React)](admin-hooks.md) | [Subpath Exports →](../api-reference/exports.md)
