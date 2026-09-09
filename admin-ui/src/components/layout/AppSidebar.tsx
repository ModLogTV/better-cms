import {
	IconFileText,
	IconLanguage,
	IconLayoutDashboard,
	IconPhoto,
	IconSettings,
	IconShield,
	IconUsers,
	IconWorld,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { AccountMenu } from "./AccountMenu";

const NAV_ITEMS = [
	{ label: "Dashboard", to: "/", icon: IconLayoutDashboard, exact: true },
	{ label: "Translations", to: "/translations", icon: IconLanguage },
	{ label: "Pages", to: "/pages", icon: IconFileText },
	{ label: "Media", to: "/media", icon: IconPhoto },
	{ label: "Locales", to: "/locales", icon: IconWorld },
	{ label: "Users", to: "/users", icon: IconUsers },
	{ label: "Groups", to: "/groups", icon: IconShield },
] as const;

export function AppSidebar({
	userEmail,
	userName,
}: {
	userEmail?: string;
	userName?: string;
}) {
	const { location } = useRouterState();

	function isActive(to: string, exact?: boolean) {
		if (exact) return location.pathname === to;
		return location.pathname === to || location.pathname.startsWith(`${to}/`);
	}

	return (
		<Sidebar variant="inset" collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild className="cursor-default">
							<div>
								<div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
									<IconSettings className="size-4" />
								</div>
								<span className="truncate font-heading font-semibold group-data-[collapsible=icon]:hidden">
									better-cms
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{NAV_ITEMS.map((item) => (
								<SidebarMenuItem key={item.to}>
									<SidebarMenuButton
										asChild
										isActive={isActive(
											item.to,
											"exact" in item ? item.exact : undefined,
										)}
										tooltip={item.label}
									>
										<Link to={item.to}>
											<item.icon />
											<span>{item.label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<AccountMenu userEmail={userEmail} userName={userName} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
