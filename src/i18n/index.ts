export type {
	KeyMarker,
	PluralMarker,
	RichMarker,
	VarsMarker,
} from "./markers";
export { key, plural, rich, vars } from "./markers";
export type { NamespaceDef } from "./namespace";
export { defineNamespace } from "./namespace";

export { createRichTranslator, createTranslator } from "./translator";

export type {
	FlatKeys,
	LeafMarker,
	NamespaceDefinition,
	PlainFlatKeys,
	RichFlatKeys,
	RichTranslatorFn,
	TranslatorFn,
} from "./types";
