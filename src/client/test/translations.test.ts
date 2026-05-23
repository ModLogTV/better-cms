import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { deleteCached } from "../cache";
import { configureCMSClient } from "../config";
import { loadTranslations } from "../translations";

const CMS_URL = "http://cms.test";
const TOKEN = "test-token";

function mockFetch(fn: () => Promise<Response>) {
	return spyOn(globalThis, "fetch").mockImplementation(
		fn as unknown as typeof fetch,
	);
}

beforeEach(() => {
	configureCMSClient({ cmsUrl: CMS_URL, readToken: TOKEN });
	deleteCached("translations:nav:en");
	deleteCached("translations:nav:de");
});

describe("loadTranslations", () => {
	test("returns translations from API", async () => {
		const spy = mockFetch(() =>
			Promise.resolve(
				new Response(JSON.stringify({ title: "Home" }), { status: 200 }),
			),
		);
		const result = await loadTranslations("nav", "en");
		expect(result).toEqual({ title: "Home" });
		spy.mockRestore();
	});

	test("uses in-memory cache on second call", async () => {
		let callCount = 0;
		const spy = mockFetch(() => {
			callCount++;
			return Promise.resolve(
				new Response(JSON.stringify({ title: "Cached" }), { status: 200 }),
			);
		});
		await loadTranslations("nav", "en");
		await loadTranslations("nav", "en");
		expect(callCount).toBe(1);
		spy.mockRestore();
	});

	test("deduplicates concurrent calls", async () => {
		let callCount = 0;
		const spy = mockFetch(() => {
			callCount++;
			return new Promise<Response>((r) =>
				setTimeout(
					() =>
						r(
							new Response(JSON.stringify({ title: "Concurrent" }), {
								status: 200,
							}),
						),
					10,
				),
			);
		});
		const [a, b] = await Promise.all([
			loadTranslations("nav", "en"),
			loadTranslations("nav", "en"),
		]);
		expect(callCount).toBe(1);
		expect(a).toEqual(b);
		spy.mockRestore();
	});

	test("falls back to fallback fn on API error", async () => {
		configureCMSClient({
			cmsUrl: CMS_URL,
			readToken: TOKEN,
			fallback: async (ns, locale) =>
				ns === "nav" && locale === "en" ? { title: "Fallback" } : null,
		});
		const spy = mockFetch(() =>
			Promise.resolve(new Response("error", { status: 500 })),
		);
		const result = await loadTranslations("nav", "en");
		expect(result).toEqual({ title: "Fallback" });
		spy.mockRestore();
	});

	test("returns {} when API fails and no fallback", async () => {
		const spy = mockFetch(() =>
			Promise.resolve(new Response("error", { status: 500 })),
		);
		const result = await loadTranslations("nav", "de");
		expect(result).toEqual({});
		spy.mockRestore();
	});
});
