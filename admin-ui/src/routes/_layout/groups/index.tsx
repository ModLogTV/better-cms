import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X, Shield } from "lucide-react";
import { toast } from "sonner";
import { api, type CMSGroup } from "@/lib/api";
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

export const Route = createFileRoute("/_layout/groups/")({
  component: GroupsPage,
});

function GroupDialog({
  group,
  onClose,
}: {
  group?: CMSGroup;
  onClose?: () => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  const [permissions, setPermissions] = useState<string[]>(
    group?.permissions ?? [],
  );
  const [newPerm, setNewPerm] = useState("");

  const isEdit = !!group;

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? api.groups.update(group.id, { name, permissions })
        : api.groups.create(name, permissions),
    onSuccess: () => {
      toast.success(isEdit ? "Group updated" : "Group created");
      qc.invalidateQueries({ queryKey: ["cms", "groups"] });
      setOpen(false);
      if (!isEdit) {
        setName("");
        setPermissions([]);
      }
      onClose?.();
    },
    onError: () => toast.error("Save failed"),
  });

  function addPerm() {
    if (!newPerm.trim() || permissions.includes(newPerm.trim())) return;
    setPermissions([...permissions, newPerm.trim()]);
    setNewPerm("");
  }

  function removePerm(p: string) {
    setPermissions(permissions.filter((x) => x !== p));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) onClose?.();
      }}
    >
      {!isEdit && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="size-4" />
            New group
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit group" : "Create group"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Editors"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Permissions</Label>
            <div className="flex flex-wrap gap-1.5 rounded-md border p-2 min-h-10">
              {permissions.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="gap-1 font-mono text-xs"
                >
                  {p}
                  <button
                    onClick={() => removePerm(p)}
                    className="ml-1 opacity-60 hover:opacity-100"
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="cms:translations:write"
                value={newPerm}
                onChange={(e) => setNewPerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPerm()}
                className="font-mono text-xs"
              />
              <Button size="sm" variant="outline" onClick={addPerm}>
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim()}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cms", "groups"],
    queryFn: () => api.groups.list(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.groups.delete(id),
    onSuccess: () => {
      toast.success("Group deleted");
      qc.invalidateQueries({ queryKey: ["cms", "groups"] });
      qc.invalidateQueries({ queryKey: ["cms", "users"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Groups</h2>
          <p className="text-muted-foreground">
            Define permission groups for your CMS users.
          </p>
        </div>
        <GroupDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 3 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.length === 0
                ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-muted-foreground"
                    >
                      <Shield className="mx-auto mb-2 size-8 opacity-40" />
                      No groups yet.
                    </TableCell>
                  </TableRow>
                )
                : data?.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {group.permissions.slice(0, 4).map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className="font-mono text-[10px]"
                          >
                            {p}
                          </Badge>
                        ))}
                        {group.permissions.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{group.permissions.length - 4}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-destructive hover:bg-destructive/10"
                        onClick={() => remove.mutate(group.id)}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
