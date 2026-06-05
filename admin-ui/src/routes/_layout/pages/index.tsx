import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, PenLine, Rocket } from "lucide-react";
import { toast } from "sonner";
import { api, type PageSummary } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_layout/pages/")({
  component: PagesPage,
});

function StatusBadge({ status }: { status: PageSummary["status"] }) {
  return (
    <Badge variant={status === "published" ? "success" : "warning"}>
      {status}
    </Badge>
  );
}

function PagesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cms", "pages"],
    queryFn: () => api.pages.list(),
  });

  const publish = useMutation({
    mutationFn: (id: string) => api.pages.publish(id),
    onSuccess: () => {
      toast.success("Page published");
      qc.invalidateQueries({ queryKey: ["cms", "pages"] });
    },
    onError: () => toast.error("Publish failed"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pages</h2>
        <p className="text-muted-foreground">
          Manage page content and publish drafts.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Locale</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.length === 0
                ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      <FileText className="mx-auto mb-2 size-8 opacity-40" />
                      No pages yet.
                    </TableCell>
                  </TableRow>
                )
                : data?.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-mono text-sm">
                      {page.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{page.locale}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={page.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {page.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs"
                            onClick={() => publish.mutate(page.id)}
                            disabled={publish.isPending}
                          >
                            <Rocket className="size-3" />
                            Publish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          asChild
                        >
                          <Link
                            to="/pages/$pageId"
                            params={{ pageId: page.id }}
                            search={{ slug: page.slug, locale: page.locale }}
                          >
                            <PenLine className="size-3" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
