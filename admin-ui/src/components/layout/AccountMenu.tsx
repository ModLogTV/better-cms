import { IconKey, IconLogout, IconSelector } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

function initialsFor(name?: string, email?: string) {
	if (name) {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	}
	return email?.[0]?.toUpperCase() ?? "?";
}

export function AccountMenu({
	userEmail,
	userName,
}: {
	userEmail?: string;
	userName?: string;
}) {
	const { isMobile } = useSidebar();
	const navigate = useNavigate();
	const [changePasswordOpen, setChangePasswordOpen] = useState(false);
	const initials = initialsFor(userName, userEmail);

	async function handleSignOut() {
		try {
			await signOut();
			navigate({ to: "/login" });
		} catch {
			toast.error("Sign out failed");
		}
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="size-8 rounded-lg">
								<AvatarFallback className="rounded-lg text-xs">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">
									{userName || userEmail}
								</span>
								{userName && userEmail && (
									<span className="truncate text-xs text-muted-foreground">
										{userEmail}
									</span>
								)}
							</div>
							<IconSelector className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-64 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5">
								<Avatar className="size-8 rounded-lg">
									<AvatarFallback className="rounded-lg text-xs">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">
										{userName || userEmail}
									</span>
									{userName && userEmail && (
										<span className="truncate text-xs text-muted-foreground">
											{userEmail}
										</span>
									)}
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Account</DropdownMenuLabel>
						<DropdownMenuGroup>
							<DropdownMenuItem
								className="gap-2"
								onClick={() => setChangePasswordOpen(true)}
							>
								<IconKey className="size-4" />
								Change password
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							className="gap-2"
							onClick={handleSignOut}
						>
							<IconLogout className="size-4" />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
			<ChangePasswordDialog
				open={changePasswordOpen}
				onClose={() => setChangePasswordOpen(false)}
			/>
		</SidebarMenu>
	);
}
