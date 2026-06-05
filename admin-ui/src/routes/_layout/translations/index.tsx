import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Languages } from "lucide-react";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_layout/translations/")({
  component: TranslationsIndexPage,
});

function TranslationsIndexPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["cms", "namespaces"],
    queryFn: () => api.namespaces.list(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Translations</h2>
        <p className="text-muted-foreground">
          Manage translation keys across all namespaces.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namespace</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-48" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : data?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="py-10 text-center text-muted-foreground"
                >
                  <Languages className="mx-auto mb-2 size-8 opacity-40" />
                  No namespaces configured.
                </TableCell>
              </TableRow>
            ) : (
              data?.map((ns) => (
                <TableRow key={ns.name} className="cursor-pointer">
                  <TableCell className="font-mono text-sm">{ns.name}</TableCell>
                  <TableCell>
                    <Link
                      to="/translations/$namespace"
                      params={{ namespace: ns.name }}
                      className="flex items-center justify-end text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
