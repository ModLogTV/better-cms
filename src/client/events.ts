import { CMSEventEmitter } from "../core/events";

/**
 * Global client-side event emitter for better-cms.
 * Subscribe to fetch events, locale changes, and more.
 */
export const cmsEvents = new CMSEventEmitter();
