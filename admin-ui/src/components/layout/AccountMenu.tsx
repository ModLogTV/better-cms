import {
	IconDeviceDesktop,
	IconKey,
	IconLogout,
	IconMoon,
	IconSelector,
	IconSun,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

const THEME_OPTIONS: {
	value: Theme;
	label: string;
	icon: React.ElementType;
}[] = [
	{ value: "light", label: "Light", icon: IconSun },
	{ value: "dark", label: "Dark", icon: IconMoon },
	{ value: "system", label: "System", icon: IconDeviceDesktop },
];

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
	const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
	const initials = initialsFor(userName, userEmail);

	function selectTheme(next: Theme) {
		setTheme(next);
		setThemeState(next);
	}

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
						<DropdownMenuLabel>Theme</DropdownMenuLabel>
						<div className="flex gap-1 px-1 pb-1.5">
							{THEME_OPTIONS.map((opt) => (
								<Button
									key={opt.value}
									type="button"
									size="sm"
									variant="ghost"
									className={cn(
										"flex-1 gap-1",
										theme === opt.value &&
											"bg-sidebar-accent text-sidebar-accent-foreground",
									)}
									onClick={() => selectTheme(opt.value)}
								>
									<opt.icon className="size-3.5" />
									{opt.label}
								</Button>
							))}
						</div>
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
