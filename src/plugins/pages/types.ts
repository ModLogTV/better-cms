import type { ZodSchema } from "zod";

export type BlockFieldType = "text" | "textarea" | "number" | "boolean";

export interface BlockFieldDefinition {
	/** Property name within the block's `data` object. */
	key: string;
	label: string;
	type: BlockFieldType;
	optional?: boolean;
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
