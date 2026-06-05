import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Languages, FileText, Image, Globe } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_layout/")({
  component: DashboardPage,
});

function StatCard({
  title,
  value,
  icon: Icon,
  to,
  loading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  to: string;
  loading: boolean;
}) {
  return (
    <Link to={to}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-3xl font-bold">{value ?? 0}</div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function DashboardPage() {
  const namespaces = useQuery({
    queryKey: ["cms", "namespaces"],
    queryFn: () => api.namespaces.list(),
  });
  const pages = useQuery({
    queryKey: ["cms", "pages"],
    queryFn: () => api.pages.list(),
  });
  const media = useQuery({
    queryKey: ["cms", "media"],
    queryFn: () => api.media.list(),
  });
  const locales = useQuery({
    queryKey: ["cms", "locales"],
    queryFn: () => api.locales.list(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your CMS content.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Translation Namespaces"
          value={namespaces.data?.length}
          icon={Languages}
          to="/translations"
          loading={namespaces.isLoading}
        />
        <StatCard
          title="Pages"
          value={pages.data?.length}
          icon={FileText}
          to="/pages"
          loading={pages.isLoading}
        />
        <StatCard
          title="Media Assets"
          value={media.data?.length}
          icon={Image}
          to="/media"
          loading={media.isLoading}
        />
        <StatCard
          title="Locales"
          value={locales.data?.length}
          icon={Globe}
          to="/locales"
          loading={locales.isLoading}
        />
      </div>
    </div>
  );
}
