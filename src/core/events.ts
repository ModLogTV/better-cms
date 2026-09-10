type Handler<T> = (payload: T) => void | Promise<void>;

interface EventMap {
	"translations:updated": {
		namespace: string;
		locale: string;
		values: Record<string, string>;
	};
	"client:fetch:start": {
		type: "translations" | "pages";
		key: string;
	};
	"client:fetch:success": {
		type: "translations" | "pages";
		key: string;
		data: unknown;
	};
	"client:fetch:error": {
		type: "translations" | "pages";
		key: string;
		error: Error;
	};
}

/** Minimal typed event emitter - no Node.js EventEmitter dependency. */
export class CMSEventEmitter {
	private handlers: { [K in keyof EventMap]?: Handler<EventMap[K]>[] } = {};

	on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
		if (!this.handlers[event]) this.handlers[event] = [];
		this.handlers[event]?.push(handler);
	}

	off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
		const handlers = this.handlers[event];
		if (!handlers) return;
		const index = handlers.indexOf(handler);
		if (index !== -1) {
			handlers.splice(index, 1);
		}
	}

	emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
		for (const handler of this.handlers[event] ?? []) {
			void handler(payload);
		}
	}
}
