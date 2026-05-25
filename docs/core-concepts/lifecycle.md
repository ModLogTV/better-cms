# Lifecycle & Events

`better-cms` provides multiple ways to hook into its lifecycle, from server-side initialization to client-side data fetching.

## Server-Side Lifecycle

### 1. Plugin Initialization
Plugins are initialized during the `createCMS()` call. The `init` function is called sequentially for each registered plugin.

```ts
const myPlugin: CMSPlugin = {
  name: "my-plugin",
  async init(ctx) {
    // Access ctx.adapter, ctx.events, ctx.elysiaApp
    console.log("CMS initializing...");
  }
};
```

### 2. Server Events
The `cms.events` emitter (a `CMSEventEmitter` instance) allows you to react to backend actions.

| Event | Payload | Description |
|-------|---------|-------------|
| `translations:updated` | `{ namespace, locale, values }` | Emitted after a successful translation update via API. |

```ts
cms.events.on("translations:updated", ({ namespace, locale }) => {
  console.log(`Namespace ${namespace} updated for locale ${locale}`);
});
```

---

## Client-Side Lifecycle

The client SDK manages data fetching for translations and page content. You can monitor this globally via configuration or the event emitter, or locally via hooks.

### 1. Global Callbacks
Configure application-wide handlers when initializing the CMS client.

```ts
import { configureCMSClient } from "@modlog/better-cms/client";

configureCMSClient({
  cmsUrl: "/api/cms",
  readToken: "...",
  onFetchStart: (ev) => {
    // e.g., show a global loading bar
    console.log(`Fetching ${ev.type}: ${ev.key}`);
  },
  onFetchSuccess: (ev) => {
    console.log(`Loaded ${ev.key}`);
  },
  onFetchError: (ev) => {
    // e.g., show a toast notification
    console.error(`Error loading ${ev.key}:`, ev.error);
  }
});
```

### 2. Client Event Emitter (`cmsEvents`)
For non-React apps or global side-effects, use the `cmsEvents` singleton.

```ts
import { cmsEvents } from "@modlog/better-cms/client";

cmsEvents.on("client:fetch:start", ({ type, key }) => {
  nprogress.start();
});

cmsEvents.on("client:fetch:success", () => {
  nprogress.done();
});
```

### 3. React Hook Callbacks
Handle lifecycle events directly within your components.

#### `useTranslations`
```tsx
const { t, isLoading } = useTranslations(ns, {
  onSuccess: (data) => console.log("Translations ready"),
  onError: (err) => console.error("Failed to load translations", err)
});
```

#### `usePageContent`
```tsx
const { data, isLoading } = usePageContent({
  slug: "home",
  onSuccess: (blocks) => console.log("Blocks loaded", blocks),
  onError: (err) => console.error("Failed to load page", err)
});
```

### 4. Event Hook (`useCMSClientEvents`)
A specialized hook to subscribe to client events within a component with automatic cleanup on unmount.

```tsx
import { useCMSClientEvents } from "@modlog/better-cms/react";

function LoadingIndicator() {
  const [loading, setLoading] = useState(false);

  useCMSClientEvents("client:fetch:start", () => setLoading(true));
  useCMSClientEvents("client:fetch:success", () => setLoading(false));
  useCMSClientEvents("client:fetch:error", () => setLoading(false));

  return loading ? <Spinner /> : null;
}
```

---

## Summary Table

| Scope | Mechanism | Use Case |
|-------|-----------|----------|
| **Server** | `Plugin.init()` | Mounting routes, initial setup. |
| **Server** | `cms.events` | Reacting to database changes (e.g., clearing cache). |
| **Client** | `CMSClientConfig` | Global error handling, global loading bars. |
| **Client** | `cmsEvents` | Non-React event handling, global analytics. |
| **React** | `onSuccess/onError` | Local component state, local notifications. |
| **React** | `useCMSClientEvents` | Component-level subscription to global fetch events. |
