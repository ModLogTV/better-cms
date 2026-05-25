import { describe, expect, test } from "bun:test";
import { createNextProxy } from "../proxy";

const proxy = createNextProxy({
	locales: ["en", "de"],
	defaultLocale: "en",
});

function makeRequest(
	pathname: string,
	opts?: { cookie?: string; acceptLanguage?: string },
): Parameters<typeof proxy>[0] {
	return {
		nextUrl: { pathname, href: `http://localhost${pathname}` },
		headers: {
			get: (name: string) => {
				if (name.toLowerCase() === "accept-language")
					return opts?.acceptLanguage ?? null;
				return null;
			},
		},
		cookies: {
			get: (name: string) => {
				if (name === "locale" && opts?.cookie) return { value: opts.cookie };
				return undefined;
			},
		},
	};
}

describe("createNextProxy", () => {
	test("returns undefined if pathname already has locale", () => {
		expect(proxy(makeRequest("/en/about"))).toBeUndefined();
		expect(proxy(makeRequest("/de"))).toBeUndefined();
	});

	test("redirects to default locale when no hints", () => {
		const result = proxy(makeRequest("/about"));
		expect(result?.locale).toBe("en");
		expect(result?.redirect.pathname).toBe("/en/about");
	});

	test("uses cookie locale when available", () => {
		const result = proxy(makeRequest("/about", { cookie: "de" }));
		expect(result?.locale).toBe("de");
		expect(result?.redirect.pathname).toBe("/de/about");
	});

	test("uses Accept-Language when no cookie", () => {
		const result = proxy(
			makeRequest("/about", { acceptLanguage: "de-DE,de;q=0.9" }),
		);
		expect(result?.locale).toBe("de");
		expect(result?.redirect.pathname).toBe("/de/about");
	});

	test("falls back to default for unknown Accept-Language", () => {
		const result = proxy(makeRequest("/about", { acceptLanguage: "ja" }));
		expect(result?.locale).toBe("en");
		expect(result?.redirect.pathname).toBe("/en/about");
	});
});
