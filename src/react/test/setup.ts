import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
	url: "http://localhost",
});

// @ts-ignore
globalThis.window = dom.window;
// @ts-ignore
globalThis.document = dom.window.document;
// @ts-ignore
globalThis.navigator = dom.window.navigator;
// @ts-ignore
globalThis.Node = dom.window.Node;
// @ts-ignore
globalThis.Element = dom.window.Element;
// @ts-ignore
globalThis.HTMLElement = dom.window.HTMLElement;
// @ts-ignore
globalThis.Event = dom.window.Event;
// @ts-ignore
globalThis.CustomEvent = dom.window.CustomEvent;
// @ts-ignore
globalThis.fetch = fetch; // Use bun's fetch
