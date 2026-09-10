export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "better-cms-admin-theme";

function systemPrefersDark() {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getStoredTheme(): Theme {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "light" || stored === "dark" || stored === "system") {
			return stored;
		}
	} catch {
		// localStorage unavailable (e.g. private browsing) — fall back to system
	}
	return "system";
}

export function applyTheme(theme: Theme) {
	const isDark =
		theme === "dark" || (theme === "system" && systemPrefersDark());
	document.documentElement.classList.toggle("dark", isDark);
}

export function setTheme(theme: Theme) {
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// localStorage unavailable — theme still applies for this session
	}
	applyTheme(theme);
}

/** Call once, before the app renders, to avoid a flash of the wrong theme. */
export function initTheme() {
	applyTheme(getStoredTheme());
}
