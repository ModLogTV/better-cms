import { describe, expect, test } from "bun:test";
import { key, plural, rich, vars } from "../../i18n/markers";
import { defineNamespace } from "../../i18n/namespace";
import { describeNamespace } from "../describe";

const ns = defineNamespace("nav", {
	topNav: {
		aboutUs: key,
		greeting: vars<{ name: string }>(),
		items: plural<{ count: number }>(),
		terms: rich<"b" | "link">(),
	},
});

describe("describeNamespace", () => {
	test("returns metadata for all leaf keys", () => {
		const meta = describeNamespace(ns);
		const keys = meta.map((m) => m.key);
		expect(keys).toContain("topNav.aboutUs");
		expect(keys).toContain("topNav.greeting");
		expect(keys).toContain("topNav.items");
		expect(keys).toContain("topNav.terms");
	});

	test("key marker → type=key, inputHint=text", () => {
		const meta = describeNamespace(ns);
		const aboutUs = meta.find((m) => m.key === "topNav.aboutUs");
		expect(aboutUs?.type).toBe("key");
		expect(aboutUs?.inputHint).toBe("text");
	});

	test("vars marker → type=vars, inputHint=text+vars", () => {
		const meta = describeNamespace(ns);
		const greeting = meta.find((m) => m.key === "topNav.greeting");
		expect(greeting?.type).toBe("vars");
		expect(greeting?.inputHint).toBe("text+vars");
	});

	test("plural marker → type=plural, inputHint=text+count, vars=[count]", () => {
		const meta = describeNamespace(ns);
		const items = meta.find((m) => m.key === "topNav.items");
		expect(items?.type).toBe("plural");
		expect(items?.inputHint).toBe("text+count");
		expect(items?.vars).toContain("count");
	});

	test("rich marker → type=rich, inputHint=rich-text", () => {
		const meta = describeNamespace(ns);
		const terms = meta.find((m) => m.key === "topNav.terms");
		expect(terms?.type).toBe("rich");
		expect(terms?.inputHint).toBe("rich-text");
	});
});
