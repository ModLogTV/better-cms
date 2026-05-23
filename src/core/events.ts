type Handler<T> = (payload: T) => void | Promise<void>;

interface EventMap {
	"translations:updated": {
		namespace: string;
		locale: string;
		values: Record<string, string>;
	};
}

/** Minimal typed event emitter — no Node.js EventEmitter dependency. */
export class CMSEventEmitter {
	private handlers: { [K in keyof EventMap]?: Handler<EventMap[K]>[] } = {};

	on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
		if (!this.handlers[event]) this.handlers[event] = [];
		this.handlers[event].push(handler);
	}

	emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
		for (const handler of this.handlers[event] ?? []) {
			void handler(payload);
		}
	}
}
