import { describe, expect, spyOn, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { configureCMSClient } from "../../client/config";
import { cmsEvents } from "../../client/events";
import { defineNamespace, key } from "../../i18n";
import { useCMSClientEvents, usePageContent, useTranslations } from "../hooks";
import { CMSProvider } from "../provider";

// Load JSDOM
import "./setup";

const CMS_URL = "http://cms.test";
const TOKEN = "test-token";

configureCMSClient({ cmsUrl: CMS_URL, readToken: TOKEN });

const ns = defineNamespace({
	name: "nav",
	definition: { title: key },
});

function wrapper({ children }: { children: React.ReactNode }) {
	return (
		<CMSProvider
			initialLocale="en"
			initialTranslations={{}}
			initialContent={{}}
		>
			{children}
		</CMSProvider>
	);
}

function mockFetch(data: any) {
	return spyOn(globalThis, "fetch").mockImplementation((() =>
		Promise.resolve(
			new Response(JSON.stringify(data), {
				status: 200,
			}),
		)) as any);
}

describe("React Hooks", () => {
	test("useTranslations calls onSuccess", async () => {
		const spy = mockFetch({ title: "Home" });
		let successData: any = null;

		const { result } = renderHook(
			() =>
				useTranslations(ns, {
					onSuccess: (data) => {
						successData = data;
					},
				}),
			{ wrapper },
		);

		expect(result.current.isLoading).toBe(true);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(successData).toEqual({ title: "Home" });
		expect(result.current.t("title")).toBe("Home");
		spy.mockRestore();
	});

	test("usePageContent calls onSuccess", async () => {
		const spy = mockFetch([{ type: "hero", data: { title: "WelcomeHook" } }]);
		let successData: any = null;

		const { result } = renderHook(
			() =>
				usePageContent({
					slug: "home-hook",
					onSuccess: (data) => {
						successData = data;
					},
				}),
			{ wrapper },
		);

		expect(result.current.isLoading).toBe(true);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(successData).toEqual([
			{ type: "hero", data: { title: "WelcomeHook" } },
		]);
		expect(result.current.data).toEqual([
			{ type: "hero", data: { title: "WelcomeHook" } },
		]);
		spy.mockRestore();
	});

	test("usePageContent calls onError on failure", async () => {
		const spy = spyOn(globalThis, "fetch").mockImplementation((() =>
			Promise.resolve(new Response("error", { status: 500 }))) as any);
		let error: Error | null = null;

		const { result } = renderHook(
			() =>
				usePageContent({
					slug: "fail",
					onError: (err) => {
						error = err;
					},
				}),
			{ wrapper },
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(error).toBeDefined();
		expect(result.current.error).toBeDefined();
		spy.mockRestore();
	});

	test("useCMSClientEvents subscribes and unsubscribes", () => {
		let count = 0;
		const handler = () => {
			count++;
		};

		const { unmount } = renderHook(() =>
			useCMSClientEvents("client:fetch:start" as any, handler),
		);

		cmsEvents.emit("client:fetch:start" as any, { type: "pages", key: "test" });
		expect(count).toBe(1);

		unmount();

		cmsEvents.emit("client:fetch:start" as any, { type: "pages", key: "test" });
		expect(count).toBe(1); // Should still be 1
	});
});
