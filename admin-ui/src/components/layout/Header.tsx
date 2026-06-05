import { useNavigate } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  title: string;
  userEmail?: string;
  userName?: string;
}

export function Header({ title, userEmail, userName }: HeaderProps) {
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
      navigate({ to: "/login" });
    } catch {
      toast.error("Sign out failed");
    }
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      <h1 className="text-sm font-semibold text-foreground">{title}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {(userName || userEmail) && (
            <>
              <div className="px-2 py-1.5">
                {userName && (
                  <p className="text-sm font-medium leading-none">{userName}</p>
                )}
                {userEmail && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {userEmail}
                  </p>
                )}
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem className="gap-2 text-muted-foreground" disabled>
            <User className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
