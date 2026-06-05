import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, type KeyMetadata } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_layout/translations/$namespace")({
  component: TranslationEditorPage,
});

function inputHintBadge(hint: KeyMetadata["inputHint"]) {
  const map: Record<KeyMetadata["inputHint"], string> = {
    text: "text",
    "text+vars": "vars",
    "text+count": "plural",
    "rich-text": "rich",
  };
  return map[hint];
}

function TranslationRow({
  meta,
  value,
  namespace,
  locale,
}: {
  meta: KeyMetadata;
  value: string;
  namespace: string;
  locale: string;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.namespaces.updateTranslation(namespace, locale, meta.key, draft),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({
        queryKey: ["cms", "translations", namespace, locale],
      });
    },
    onError: () => toast.error("Failed to save translation"),
  });

  function handleChange(val: string) {
    setDraft(val);
    setDirty(val !== value);
  }

  function handleBlur() {
    if (dirty) mutate();
  }

  const isMultiline = meta.inputHint === "rich-text";

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="flex flex-col gap-1">
          <code className="text-xs text-foreground">{meta.key}</code>
          <Badge variant="outline" className="w-fit text-[10px]">
            {inputHintBadge(meta.inputHint)}
          </Badge>
          {meta.vars && meta.vars.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {meta.vars.map((v) => (
                <code
                  key={v}
                  className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                >
                  {"{"}
                  {v}
                  {"}"}
                </code>
              ))}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="relative">
        {isMultiline ? (
          <Textarea
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className="min-h-20 font-mono text-sm"
          />
        ) : (
          <Input
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className="font-mono text-sm"
          />
        )}
        {isPending && (
          <Loader2 className="absolute right-2 top-1/2 size-3 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </TableCell>
    </TableRow>
  );
}

function TranslationEditorPage() {
  const { namespace } = Route.useParams();
  const [locale, setLocale] = useState("en");

  const locales = useQuery({
    queryKey: ["cms", "locales"],
    queryFn: () => api.locales.list(),
  });

  const metadata = useQuery({
    queryKey: ["cms", "namespace", namespace, "describe"],
    queryFn: () => api.namespaces.describe(namespace),
  });

  const translations = useQuery({
    queryKey: ["cms", "translations", namespace, locale],
    queryFn: () => api.namespaces.getTranslations(namespace, locale),
    enabled: !!locale,
  });

  const isLoading = metadata.isLoading || translations.isLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/translations"
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight font-mono">
            {namespace}
          </h2>
          <p className="text-muted-foreground text-sm">
            {metadata.data?.length ?? 0} keys
          </p>
        </div>
        <Select value={locale} onValueChange={setLocale}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Select locale" />
          </SelectTrigger>
          <SelectContent>
            {locales.data?.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.name} ({l.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-64">Key</TableHead>
              <TableHead>Value ({locale})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : metadata.data?.map((meta) => (
                  <TranslationRow
                    key={meta.key}
                    meta={meta}
                    value={translations.data?.[meta.key] ?? ""}
                    namespace={namespace}
                    locale={locale}
                  />
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
