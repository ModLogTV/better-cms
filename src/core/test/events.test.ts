import { describe, expect, test } from "bun:test";
import { CMSEventEmitter } from "../events";

describe("CMSEventEmitter", () => {
	test("on and emit work for multiple handlers", () => {
		const emitter = new CMSEventEmitter();
		let count = 0;
		emitter.on("translations:updated", () => {
			count++;
		});
		emitter.on("translations:updated", () => {
			count++;
		});

		emitter.emit("translations:updated", {
			namespace: "common",
			locale: "en",
			values: {},
		});
		expect(count).toBe(2);
	});

	test("off removes specific handler", () => {
		const emitter = new CMSEventEmitter();
		let count = 0;
		const handler = () => {
			count++;
		};

		emitter.on("translations:updated", handler);
		emitter.emit("translations:updated", {
			namespace: "common",
			locale: "en",
			values: {},
		});
		expect(count).toBe(1);

		emitter.off("translations:updated", handler);
		emitter.emit("translations:updated", {
			namespace: "common",
			locale: "en",
			values: {},
		});
		expect(count).toBe(1); // Still 1
	});

	test("off does nothing if handler not found", () => {
		const emitter = new CMSEventEmitter();
		emitter.off("translations:updated", () => {});
		// Should not throw
	});

	test("client:fetch events work", () => {
		const emitter = new CMSEventEmitter();
		let startCalled = false;
		emitter.on("client:fetch:start", (ev) => {
			expect(ev.type).toBe("pages");
			expect(ev.key).toBe("pages:home:en");
			startCalled = true;
		});

		emitter.emit("client:fetch:start", { type: "pages", key: "pages:home:en" });
		expect(startCalled).toBe(true);
	});
});
