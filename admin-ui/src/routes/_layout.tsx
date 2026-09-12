import {
	createFileRoute,
	Outlet,
	redirect,
	useRouterState,
} from "@tanstack/react-router";
import { AppSidebar, NAV_ITEMS } from "@/components/layout/AppSidebar";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/_layout")({
	beforeLoad: async ({ location }) => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: "/login", search: { redirect: location.href } });
		}
		return { session };
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { session } = Route.useRouteContext();

	return (
		<SidebarProvider>
			<AppSidebar userEmail={session.user.email} userName={session.user.name} />
			<SidebarInset>
				<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<h1 className="text-sm font-semibold text-foreground">
						<PageTitle />
					</h1>
				</header>
				<main className="flex-1 overflow-y-auto p-6">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}

function PageTitle() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const segments = pathname.split("/").filter(Boolean);
	if (segments.length === 0) return "Dashboard";
	// Titled by section (first segment), not the last one - a detail route
	// like /groups/$groupId or /pages/$pageId would otherwise show the raw
	// id as its title.
	const section = NAV_ITEMS.find(
		(item) => item.to !== "/" && pathname.startsWith(item.to),
	);
	if (section) return section.label;
	const last = segments[segments.length - 1];
	return last.charAt(0).toUpperCase() + last.slice(1);
}
