import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { deleteCached } from "../cache";
import { configureCMSClient } from "../config";
import { cmsEvents } from "../events";
import { loadPageContent } from "../pages";

const CMS_URL = "http://cms.test";
const TOKEN = "test-token";

function mockFetch(fn: () => Promise<Response>) {
	return spyOn(globalThis, "fetch").mockImplementation(
		fn as unknown as typeof fetch,
	);
}

beforeEach(() => {
	configureCMSClient({ cmsUrl: CMS_URL, readToken: TOKEN });
	deleteCached({ key: "pages:home:en" });
});

describe("loadPageContent", () => {
	test("emits fetch events", async () => {
		const events: string[] = [];
		cmsEvents.on("client:fetch:start", () => {
			events.push("start");
		});
		cmsEvents.on("client:fetch:success", () => {
			events.push("success");
		});

		const spy = mockFetch(() =>
			Promise.resolve(
				new Response(JSON.stringify([{ type: "hero", data: {} }]), {
					status: 200,
				}),
			),
		);
		await loadPageContent({ slug: "home", locale: "en" });
		expect(events).toEqual(["start", "success"]);
		spy.mockRestore();
	});

	test("calls global configuration callbacks", async () => {
		const calls: string[] = [];
		configureCMSClient({
			cmsUrl: CMS_URL,
			readToken: TOKEN,
			onFetchStart: (ev) => {
				expect(ev.type).toBe("pages");
				calls.push("start");
			},
			onFetchSuccess: (ev) => {
				expect(ev.type).toBe("pages");
				calls.push("success");
			},
		});

		const spy = mockFetch(() =>
			Promise.resolve(
				new Response(JSON.stringify([{ type: "hero", data: {} }]), {
					status: 200,
				}),
			),
		);
		await loadPageContent({ slug: "home", locale: "en" });
		expect(calls).toEqual(["start", "success"]);
		spy.mockRestore();
	});

	test("emits error event and calls global callback on failure", async () => {
		const events: string[] = [];
		const calls: string[] = [];
		cmsEvents.on("client:fetch:error", () => {
			events.push("error");
		});

		configureCMSClient({
			cmsUrl: CMS_URL,
			readToken: TOKEN,
			onFetchError: () => {
				calls.push("error");
			},
		});

		const spy = mockFetch(() =>
			Promise.resolve(new Response("error", { status: 500 })),
		);
		await loadPageContent({ slug: "home", locale: "en" });
		expect(events).toEqual(["error"]);
		expect(calls).toEqual(["error"]);
		spy.mockRestore();
	});

	test("returns page blocks from API", async () => {
		const spy = mockFetch(() =>
			Promise.resolve(
				new Response(
					JSON.stringify([{ type: "hero", data: { title: "HiClient" } }]),
					{
						status: 200,
					},
				),
			),
		);
		const result = await loadPageContent({ slug: "home-client", locale: "en" });
		expect(result).toEqual([{ type: "hero", data: { title: "HiClient" } }]);
		spy.mockRestore();
	});
});
