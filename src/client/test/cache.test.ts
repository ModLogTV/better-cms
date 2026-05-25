import { describe, expect, test } from "bun:test";
import { deleteCached, getCached, setCached } from "../cache";

describe("cache", () => {
	test("returns undefined for missing key", () => {
		expect(getCached({ key: "missing" })).toBeUndefined();
	});

	test("stores and retrieves value", () => {
		setCached({ key: "key1", value: { data: 42 }, ttlMs: 5000 });
		expect(getCached<{ data: number }>({ key: "key1" })).toEqual({
			data: 42,
		});
	});

	test("expires after TTL", async () => {
		setCached({ key: "key2", value: "value", ttlMs: 10 });
		await new Promise((r) => setTimeout(r, 20));
		expect(getCached({ key: "key2" })).toBeUndefined();
	});

	test("deleteCached removes entry", () => {
		setCached({ key: "key3", value: "value", ttlMs: 5000 });
		deleteCached({ key: "key3" });
		expect(getCached({ key: "key3" })).toBeUndefined();
	});
});
