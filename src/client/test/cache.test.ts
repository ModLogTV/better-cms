import { describe, expect, test } from "bun:test";
import { deleteCached, getCached, setCached } from "../cache";

describe("cache", () => {
	test("returns undefined for missing key", () => {
		expect(getCached("missing")).toBeUndefined();
	});

	test("stores and retrieves value", () => {
		setCached("key1", { data: 42 }, 5000);
		expect(getCached<{ data: number }>("key1")).toEqual({ data: 42 });
	});

	test("expires after TTL", async () => {
		setCached("key2", "value", 10);
		await new Promise((r) => setTimeout(r, 20));
		expect(getCached("key2")).toBeUndefined();
	});

	test("deleteCached removes entry", () => {
		setCached("key3", "value", 5000);
		deleteCached("key3");
		expect(getCached("key3")).toBeUndefined();
	});
});
