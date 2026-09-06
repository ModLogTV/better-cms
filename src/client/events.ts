import { CMSEventEmitter } from "../core/events";

// See the comment in client/config.ts — this module is duplicated across every
// subpath bundle (splitting: false). Without a globalThis-backed singleton, a
// listener registered via one subpath's copy of `cmsEvents` (e.g. useCMSClientEvents
// from /react) would never fire for an emit() from another subpath's copy (e.g.
// loadTranslations from /next).
const EMITTER_KEY = Symbol.for("@modlog/better-cms/client-events");

interface GlobalWithCMSEvents {
	[EMITTER_KEY]?: CMSEventEmitter;
}

const globalEvents = globalThis as GlobalWithCMSEvents;

if (!globalEvents[EMITTER_KEY]) {
	globalEvents[EMITTER_KEY] = new CMSEventEmitter();
}

/**
 * Global client-side event emitter for better-cms.
 * Subscribe to fetch events, locale changes, and more.
 */
export const cmsEvents: CMSEventEmitter = globalEvents[EMITTER_KEY];
