import assert from "node:assert/strict";
const base = "http://127.0.0.1:4173";
const headers = {
  "X-AI-Local": "1",
  "Content-Type": "application/json",
  Origin: base,
};
async function get() {
  const response = await fetch(base + "/__ai", { headers });
  assert.equal(response.status, 200);
  return response.json();
}
async function act(intent, payload) {
  const response = await fetch(base + "/__ai", {
    method: "POST",
    headers,
    body: JSON.stringify({ intent, payload }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, body.error);
  return body;
}
const before = await get();
let id;
try {
  const setup = {
    kind: "page",
    mode: "full",
    title: "Temporary HTTP validation draft",
    prompt: "",
    themeId: "",
    sourceTemplate: "",
    keepSections: false,
    target: "any",
    targetId: "",
    targetTitle: "",
    language: "English",
    style: "Minimal",
  };
  const created = await act("create", { setup }),
    page = created.pages.find(
      (p) => !before.pages.some((old) => old.id === p.id),
    );
  assert.ok(page);
  id = page.id;
  const content = { ...page.content, title: "HTTP saved page" };
  const saved = await act("save", { id, version: page.version, content });
  assert.equal(
    saved.pages.find((p) => p.id === id).content.title,
    "HTTP saved page",
  );
  assert.equal(
    (await get()).pages.find((p) => p.id === id).content.title,
    "HTTP saved page",
  );
  const response = await fetch(base + "/__ai?export=" + id, { headers }),
    bundle = await response.json();
  assert.equal(response.status, 200);
  assert.ok(bundle.files["sections/aip-page.liquid"]);
  const blocked = await fetch(base + "/__ai", {
    headers: { ...headers, Origin: "https://untrusted.example" },
  });
  assert.equal(blocked.status, 403);
  const unauthenticated = await fetch(base + "/__ai");
  assert.equal(unauthenticated.status, 403);
  const forbidden = await fetch(base + "/__ai", {
    method: "POST",
    headers,
    body: JSON.stringify({ intent: "deploy", payload: { id, version: 2 } }),
  });
  assert.equal(forbidden.status, 400);
  assert.equal((await fetch(base + "/ai-pages")).status, 200);
  console.log(
    "Local HTTP checks passed: draft create/save/persistence, theme export, cross-origin/header guards, Shopify publish blocked, preview route served. Browser UI was not exercised.",
  );
} finally {
  if (id) {
    const current = (await get()).pages.find((p) => p.id === id);
    if (current) await act("delete", { id, version: current.version });
  }
}
