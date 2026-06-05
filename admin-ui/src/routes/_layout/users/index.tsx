import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Users, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, type CMSUserSummary, type CMSGroup } from "@/lib/api";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_layout/users/")({
  component: UsersPage,
});

function UserDetailDialog({
  user,
  allGroups,
  open,
  onClose,
}: {
  user: CMSUserSummary;
  allGroups: CMSGroup[];
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [newPerm, setNewPerm] = useState("");

  const { data: perms } = useQuery({
    queryKey: ["cms", "users", user.id, "permissions"],
    queryFn: () => api.users.getPermissions(user.id),
    enabled: open,
  });
  const { data: groups } = useQuery({
    queryKey: ["cms", "users", user.id, "groups"],
    queryFn: () => api.users.getGroups(user.id),
    enabled: open,
  });

  const setPerms = useMutation({
    mutationFn: (permissions: string[]) =>
      api.users.setPermissions(user.id, permissions),
    onSuccess: () => {
      toast.success("Permissions updated");
      qc.invalidateQueries({ queryKey: ["cms", "users", user.id] });
    },
  });

  const addGroup = useMutation({
    mutationFn: (groupId: string) => api.users.addToGroup(user.id, groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms", "users", user.id, "groups"] });
    },
  });
  const removeGroup = useMutation({
    mutationFn: (groupId: string) =>
      api.users.removeFromGroup(user.id, groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms", "users", user.id, "groups"] });
    },
  });

  function addPerm() {
    if (!newPerm.trim() || perms?.includes(newPerm.trim())) return;
    setPerms.mutate([...(perms ?? []), newPerm.trim()]);
    setNewPerm("");
  }

  function removePerm(perm: string) {
    setPerms.mutate((perms ?? []).filter((p) => p !== perm));
  }

  const memberGroupIds = new Set(groups?.map((g) => g.id) ?? []);
  const availableGroups = allGroups.filter((g) => !memberGroupIds.has(g.id));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">
                {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {user.name || user.email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Direct Permissions</p>
            <div className="flex flex-wrap gap-1.5 rounded-md border p-2 min-h-10">
              {perms?.map((p) => (
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
            <div className="mt-2 flex gap-2">
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

          <Separator />

          <div>
            <p className="mb-2 text-sm font-medium">Group Memberships</p>
            <div className="space-y-1.5">
              {groups?.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="size-3.5 text-muted-foreground" />
                    <span className="text-sm">{g.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeGroup.mutate(g.id)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
              {availableGroups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availableGroups.map((g) => (
                    <Button
                      key={g.id}
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => addGroup.mutate(g.id)}
                    >
                      <Plus className="size-3" />
                      {g.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<CMSUserSummary | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["cms", "users"],
    queryFn: () => api.users.list(),
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["cms", "groups"],
    queryFn: () => api.groups.list(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">
          Manage CMS user permissions and group memberships.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : users?.length === 0
                ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      <Users className="mx-auto mb-2 size-8 opacity-40" />
                      No users found.
                    </TableCell>
                  </TableRow>
                )
                : users?.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-xs">
                            {user.name?.[0]?.toUpperCase() ??
                              user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          {user.name && (
                            <p className="text-sm font-medium">{user.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.groupIds.slice(0, 3).map((gid) => {
                          const g = groups.find((g) => g.id === gid);
                          return g ? (
                            <Badge
                              key={gid}
                              variant="secondary"
                              className="text-xs"
                            >
                              {g.name}
                            </Badge>
                          ) : null;
                        })}
                        {user.groupIds.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.groupIds.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.permissions.length} direct
                      </span>
                    </TableCell>
                    <TableCell>
                      <Shield className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <UserDetailDialog
          user={selectedUser}
          allGroups={groups}
          open
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
