import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_layout/locales/")({
  component: LocalesPage,
});

function AddLocaleDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const upsert = useMutation({
    mutationFn: () => api.locales.upsert({ code, name, isDefault }),
    onSuccess: () => {
      toast.success("Locale saved");
      qc.invalidateQueries({ queryKey: ["cms", "locales"] });
      setOpen(false);
      setCode("");
      setName("");
    },
    onError: () => toast.error("Failed to save locale"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add locale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add locale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              placeholder="en"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="English"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded"
            />
            Set as default
          </label>
        </div>
        <DialogFooter>
          <Button
            onClick={() => upsert.mutate()}
            disabled={upsert.isPending || !code || !name}
          >
            {upsert.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocalesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cms", "locales"],
    queryFn: () => api.locales.list(),
  });

  const remove = useMutation({
    mutationFn: (code: string) => api.locales.delete(code),
    onSuccess: () => {
      toast.success("Locale deleted");
      qc.invalidateQueries({ queryKey: ["cms", "locales"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  const setDefault = useMutation({
    mutationFn: ({ code, name }: { code: string; name: string }) =>
      api.locales.upsert({ code, name, isDefault: true }),
    onSuccess: () => {
      toast.success("Default locale updated");
      qc.invalidateQueries({ queryKey: ["cms", "locales"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Locales</h2>
          <p className="text-muted-foreground">
            Manage languages supported by your CMS.
          </p>
        </div>
        <AddLocaleDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.map((locale) => (
                  <TableRow key={locale.code}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {locale.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{locale.name}</TableCell>
                    <TableCell>
                      {locale.isDefault && (
                        <Badge variant="success">default</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(locale.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!locale.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs"
                            onClick={() =>
                              setDefault.mutate({
                                code: locale.code,
                                name: locale.name,
                              })
                            }
                          >
                            <Star className="size-3" />
                            Set default
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-destructive hover:bg-destructive/10"
                          onClick={() => remove.mutate(locale.code)}
                          disabled={locale.isDefault || remove.isPending}
                        >
                          <Trash2 className="size-3" />
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
