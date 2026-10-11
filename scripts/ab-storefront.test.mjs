import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

class Node {
  constructor() {
    this.children = [];
    this.style = {};
    this.dataset = {
      surface: "Carts",
      currency: "USD",
      proxy: "/apps/section-experiments",
    };
    this.isConnected = true;
    this.open = false;
    this.listeners = new Map();
    this.attributes = new Map();
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes) {
    this.children = nodes;
  }
  addEventListener(event, handler) {
    this.listeners.set(event, handler);
  }
  removeEventListener(event) {
    this.listeners.delete(event);
  }
  setAttribute(key, value) {
    this.attributes.set(key, value);
  }
  removeAttribute(key) {
    this.attributes.delete(key);
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
  remove() {
    this.isConnected = false;
  }
}
function runtime({ consent = true, deferConfig = false } = {}) {
  const state = { consent, calls: [], storage: new Map(), storageReads: 0 };
  const elements = new Map();
  const config = {
    id: "test-1",
    variant: "B",
    currency: "USD",
    settings: {
      reward: 80,
      upsell: false,
      checkout: "Secure checkout",
      color: "#123456",
    },
    discountCode: "SSAB-test-B",
    rollout: false,
  };
  let resolveConfig, signalReady;
  const ready = new Promise((resolve) => (signalReady = resolve));
  const cart = {
    currency: "USD",
    item_count: 1,
    items: [],
    items_subtotal_price: 5000,
    total_price: 5000,
    discount_codes: [],
  };
  const fetch = async (url, options) => {
    const data = options?.body ? JSON.parse(options.body) : null;
    state.calls.push({ url: String(url), data });
    let body;
    if (String(url).includes("/apps/")) {
      if (!data) {
        if (deferConfig) {
          signalReady();
          body = await new Promise((resolve) => (resolveConfig = resolve));
        } else body = { test: config };
      } else body = { token: "signed-cart-token", variant: "B" };
    } else body = { ...cart };
    return { ok: true, json: async () => body };
  };
  const document = {
    documentElement: { lang: "en" },
    body: new Node(),
    createElement: () => new Node(),
    createTextNode: (text) => ({ text }),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
  };
  const window = {
    Shopify: {
      routes: { root: "/" },
      customerPrivacy: { analyticsProcessingAllowed: () => state.consent },
    },
    location: {
      assign: (url) => {
        state.checkout = url;
      },
    },
  };
  runInNewContext(readFileSync("app/storefront/ab-storefront.js", "utf8"), {
    HTMLElement: Node,
    customElements: {
      get: (name) => elements.get(name),
      define: (name, cls) => elements.set(name, cls),
    },
    document,
    window,
    URL,
    location: { origin: "https://store.example.test" },
    fetch,
    crypto: { randomUUID: () => "anonymous-visitor-123" },
    localStorage: {
      getItem: (key) => {
        state.storageReads++;
        return state.storage.get(key);
      },
      setItem: (key, value) => state.storage.set(key, value),
      removeItem: (key) => state.storage.delete(key),
    },
    CustomEvent: class {},
    console,
  });
  const Experiment = elements.get("ss-ab-experiment");
  return {
    state,
    instance: new Experiment(),
    config,
    ready,
    resolve: () => resolveConfig({ test: config }),
    cart,
  };
}
test("Storefront reads no anonymous storage and sends no requests before analytics consent", async () => {
  const r = runtime({ consent: false });
  await r.instance.init();
  assert.equal(r.state.calls.length, 0);
  assert.equal(r.state.storageReads, 0);
  assert.equal(r.instance.children.length, 0);
});
test("Visible cart exposure attaches signed attribution to the real cart and deduplicates repeat exposure", async () => {
  const r = runtime();
  await r.instance.init();
  assert.equal(r.state.calls.length, 1);
  assert.equal(r.state.calls[0].data, null);
  await r.instance.openCart();
  assert.equal(r.instance.drawer.open, true);
  const exposures = r.state.calls.filter((c) => c.data?.intent === "expose");
  assert.equal(exposures.length, 1);
  assert.equal(exposures[0].data.consent, true);
  const attribute = r.state.calls.find(
    (c) => c.data?.attributes?._ss_ab_attribution === "signed-cart-token",
  );
  assert.ok(attribute);
  assert.equal(attribute.url, "/cart/update.js");
  await r.instance.expose();
  assert.equal(
    r.state.calls.filter((c) => c.data?.intent === "expose").length,
    1,
  );
});
test("Offer application preserves other customer codes, including pending codes", async () => {
  const r = runtime();
  await r.instance.init();
  await r.instance.attachOffer({
    ...r.cart,
    discount_codes: [
      { code: "WELCOME", applicable: true },
      { code: "PENDING", applicable: false },
      { code: "SSAB-old-A", applicable: true },
    ],
  });
  const call = r.state.calls.findLast(
    (c) => typeof c.data?.discount === "string",
  );
  assert.equal(call.data.discount, "WELCOME,PENDING,SSAB-test-B");
  assert.equal(call.data.attributes._ss_ab_attribution, "signed-cart-token");
});
test("Consent withdrawal clears attribution and discards a pending stale configuration", async () => {
  const r = runtime({ deferConfig: true });
  const loading = r.instance.init();
  await r.ready;
  r.state.consent = false;
  await r.instance.consentChanged();
  r.resolve();
  await loading;
  assert.equal(r.instance.test, null);
  assert.equal(r.instance.children.length, 0);
  assert.equal(r.state.storage.size, 0);
  assert.ok(
    r.state.calls.some((c) => c.data?.attributes?._ss_ab_attribution === ""),
  );
});
