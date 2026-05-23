import { describe, expect, test } from "bun:test";
import type { ReactNode } from "react";
import { key, plural, rich, vars } from "../markers";
import { defineNamespace } from "../namespace";
import { createRichTranslator, createTranslator } from "../translator";

const ns = defineNamespace("nav", {
	topNav: {
		aboutUs: key,
		greeting: vars<{ name: string }>(),
		items: plural<{ count: number }>(),
		terms: rich<"b" | "link">(),
	},
});

const translations = {
	"topNav.aboutUs": "About Us",
	"topNav.greeting": "Hello, {name}!",
	"topNav.items": "{count} items",
	"topNav.terms": "Read our <b>terms</b> and <link>privacy</link>.",
};

const t = createTranslator(ns, translations, "en");
const tRich = createRichTranslator(ns, translations, "en");

describe("createTranslator", () => {
	test("plain key returns string", () => {
		const result: string = t("topNav.aboutUs");
		expect(result).toBe("About Us");
	});

	test("vars key interpolates variables", () => {
		const result: string = t("topNav.greeting", { name: "Ada" });
		expect(result).toBe("Hello, Ada!");
	});

	test("plural key interpolates count", () => {
		const result: string = t("topNav.items", { count: 3 });
		expect(result).toBe("3 items");
	});

	test("plural selects correct suffix (_one, _other)", () => {
		const pluralTranslations = {
			"topNav.items_one": "One item",
			"topNav.items_other": "{count} items",
		};
		const tPlural = createTranslator(ns, pluralTranslations, "en");
		expect(tPlural("topNav.items", { count: 1 })).toBe("One item");
		expect(tPlural("topNav.items", { count: 2 })).toBe("2 items");
	});

	test("missing key returns key string as fallback", () => {
		const t2 = createTranslator(ns, {}, "en");
		expect(t2("topNav.aboutUs")).toBe("topNav.aboutUs");
	});
});

// type errors — caught by tsc --noEmit, not executed at runtime
// @ts-expect-error "topNav.terms" is a RichMarker — not in PlainFlatKeys
t("topNav.terms");
// @ts-expect-error not a valid key
t("nonexistent.key");

describe("createRichTranslator", () => {
	test("rich key renders tags", () => {
		const result: ReactNode = tRich("topNav.terms", {
			b: (chunks) => `<b>${chunks}</b>`,
			link: (chunks) => `<a>${chunks}</a>`,
		});
		expect(result).toBeArray();
	});

	test("missing key returns key string as fallback", () => {
		const tRich2 = createRichTranslator(ns, {}, "en");
		expect(tRich2("topNav.terms", { b: (c) => c, link: (c) => c })).toBe(
			"topNav.terms",
		);
	});
});

// @ts-expect-error missing "link" tag
tRich("topNav.terms", { b: (chunks) => chunks });
// @ts-expect-error "topNav.aboutUs" is not in RichFlatKeys
tRich("topNav.aboutUs", {});
