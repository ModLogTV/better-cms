import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Rocket, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { api, type RawBlock } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const searchSchema = z.object({
  slug: z.string(),
  locale: z.string(),
});

export const Route = createFileRoute("/_layout/pages/$pageId")({
  validateSearch: searchSchema,
  component: PageEditorPage,
});

function PageEditorPage() {
  const { pageId } = Route.useParams();
  const { slug, locale } = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: page, isLoading } = useQuery({
    queryKey: ["cms", "page", slug, locale, true],
    queryFn: () => api.pages.get(slug, locale, true),
  });

  const [blocksJson, setBlocksJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (page) {
      setBlocksJson(JSON.stringify(page.blocks, null, 2));
    }
  }, [page]);

  function handleJsonChange(val: string) {
    setBlocksJson(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const blocks = JSON.parse(blocksJson) as RawBlock[];
      return api.pages.update(pageId, blocks);
    },
    onSuccess: () => {
      toast.success("Blocks saved");
      qc.invalidateQueries({ queryKey: ["cms", "pages"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const publish = useMutation({
    mutationFn: () => api.pages.publish(pageId),
    onSuccess: () => {
      toast.success("Page published");
      qc.invalidateQueries({ queryKey: ["cms", "pages"] });
      navigate({ to: "/pages" });
    },
    onError: () => toast.error("Publish failed"),
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link to="/pages" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <div>
            <h2 className="text-xl font-bold font-mono">{slug}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline">{locale}</Badge>
              {page && (
                <Badge variant={page.status === "published" ? "success" : "warning"}>
                  {page.status}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => save.mutate()}
            disabled={save.isPending || !!jsonError}
          >
            <Save className="size-4" />
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => publish.mutate()}
            disabled={publish.isPending || !!jsonError}
          >
            <Rocket className="size-4" />
            Publish
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Blocks (JSON)</p>
            {jsonError && (
              <span className="text-xs text-destructive">{jsonError}</span>
            )}
          </div>
          <Textarea
            value={blocksJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="flex-1 font-mono text-xs"
            style={{ minHeight: "500px" }}
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}
