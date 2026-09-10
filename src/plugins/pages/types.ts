import type { ZodSchema } from "zod";

export type BlockFieldType = "text" | "textarea" | "number" | "boolean";

export interface BlockFieldDefinition {
	/** Property name within the block's `data` object. */
	key: string;
	label: string;
	type: BlockFieldType;
	optional?: boolean;
}

/**
 * Static preview shown on the block's card in the admin UI's block library.
 * There's no live-render capability across the framework boundary, so this
 * is author-supplied metadata rather than an actual rendered preview.
 */
export interface BlockPreview {
	/** A short icon glyph/emoji shown on the card, e.g. "🦸" or "H1". */
	icon?: string;
	/** URL to a small static thumbnail image, preferred over `icon` when both are set. */
	image?: string;
}

export interface BlockDefinition<Type extends string = string, Data = unknown> {
	type: Type;
	/** Display name in the admin UI. Defaults to `type` when omitted. */
	label?: string;
	schema: ZodSchema<Data>;
	/**
	 * Field metadata for the admin UI's block editor. When omitted, the admin
	 * falls back to a raw JSON editor for this block type.
	 */
	fields?: BlockFieldDefinition[];
	/** Card preview in the admin UI's block library. Falls back to `label`/`type` when omitted. */
	preview?: BlockPreview;
}

/** Alias for BlockDefinition */
export type PageBlock<
	Type extends string = string,
	Data = unknown,
> = BlockDefinition<Type, Data>;

export type InferBlockData<T extends BlockDefinition> =
	T extends BlockDefinition<infer _Type, infer Data> ? Data : never;

export type BlockUnion<Defs extends BlockDefinition[]> = {
	[I in keyof Defs]: Defs[I] extends BlockDefinition<infer Type, infer Data>
		? { type: Type; data: Data }
		: never;
}[number];
