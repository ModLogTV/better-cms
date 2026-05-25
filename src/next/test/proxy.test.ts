import { describe, expect, test } from "bun:test";
import { createNextMiddleware } from "../middleware";

const middleware = createNextMiddleware({
	locales: ["en", "de", "fr"],
	defaultLocale: "en",
	cookieName: "locale",
});

function makeRequest(
	pathname: string,
	opts?: { cookie?: string; acceptLanguage?: string },
): Parameters<typeof middleware>[0] {
	return {
		nextUrl: {
			pathname,
			clone() {
				return new URL(`http://localhost${pathname}`);
			},
		},
		cookies: {
			get: (name: string) =>
				name === "locale" && opts?.cookie ? { value: opts.cookie } : undefined,
		},
		headers: {
			get: (name: string) =>
				name === "accept-language" ? (opts?.acceptLanguage ?? null) : null,
		},
	};
}

describe("createNextMiddleware", () => {
	test("returns undefined if pathname already has locale", () => {
		expect(middleware(makeRequest("/en/about"))).toBeUndefined();
		expect(middleware(makeRequest("/de"))).toBeUndefined();
	});

	test("redirects to default locale when no hints", () => {
		const result = middleware(makeRequest("/about"));
		expect(result?.locale).toBe("en");
		expect(result?.redirect).toContain("/en/about");
	});

	test("uses cookie locale when available", () => {
		const result = middleware(makeRequest("/about", { cookie: "de" }));
		expect(result?.locale).toBe("de");
		expect(result?.redirect).toContain("/de/about");
	});

	test("uses Accept-Language when no cookie", () => {
		const result = middleware(
			makeRequest("/about", { acceptLanguage: "fr-FR,fr;q=0.9" }),
		);
		expect(result?.locale).toBe("fr");
	});

	test("falls back to default for unknown Accept-Language", () => {
		const result = middleware(makeRequest("/about", { acceptLanguage: "ja" }));
		expect(result?.locale).toBe("en");
	});
});
