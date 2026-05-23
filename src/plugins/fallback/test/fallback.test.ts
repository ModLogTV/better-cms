import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { CMSEventEmitter } from "../../../core/events";
import { fallbackPlugin } from "../index";

const OUTPUT_DIR = join(import.meta.dir, "__fallback_test__");

describe("fallbackPlugin", () => {
	beforeEach(() => mkdir(OUTPUT_DIR, { recursive: true }));
	afterEach(() => rm(OUTPUT_DIR, { recursive: true, force: true }));

	test("writes JSON file on translations:updated event", async () => {
		const events = new CMSEventEmitter();
		const plugin = fallbackPlugin({ outputDir: OUTPUT_DIR });

		plugin.init({
			namespaces: [],
			adapter: {} as never,
			auth: { internalToken: "x" },
			events,
			elysiaApp: {} as never,
		});

		events.emit("translations:updated", {
			namespace: "nav",
			locale: "en",
			values: { "topNav.aboutUs": "About Us" },
		});

		// Allow async write to complete
		await new Promise((r) => setTimeout(r, 50));

		const content = await readFile(join(OUTPUT_DIR, "en", "nav.json"), "utf-8");
		expect(JSON.parse(content)).toEqual({ "topNav.aboutUs": "About Us" });
	});
});
