import { getConfig } from "@/config";

export interface SessionUser {
	id: string;
	email: string;
	name: string;
}

export interface Session {
	user: SessionUser;
}

export async function getSession(): Promise<Session | null> {
	const { authBasePath } = getConfig();
	try {
		const res = await fetch(`${authBasePath}/get-session`, {
			credentials: "include",
		});
		if (!res.ok) return null;
		return res.json() as Promise<Session>;
	} catch {
		return null;
	}
}

export async function signIn(
	email: string,
	password: string,
): Promise<Session> {
	const { authBasePath } = getConfig();
	const res = await fetch(`${authBasePath}/sign-in/email`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ email, password }),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "Sign in failed");
		throw new Error(text);
	}
	return res.json() as Promise<Session>;
}

export async function signOut(): Promise<void> {
	const { authBasePath } = getConfig();
	await fetch(`${authBasePath}/sign-out`, {
		method: "POST",
		credentials: "include",
	});
}

export async function changePassword(opts: {
	currentPassword: string;
	newPassword: string;
}): Promise<void> {
	const { authBasePath } = getConfig();
	const res = await fetch(`${authBasePath}/change-password`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({
			currentPassword: opts.currentPassword,
			newPassword: opts.newPassword,
			revokeOtherSessions: true,
		}),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "Failed to change password");
		throw new Error(text);
	}
}
