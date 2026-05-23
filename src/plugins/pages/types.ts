import type { ZodSchema } from "zod";

export interface BlockDefinition<Type extends string = string, Data = unknown> {
	type: Type;
	schema: ZodSchema<Data>;
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
