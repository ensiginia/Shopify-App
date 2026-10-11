import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type {
  AIClient,
  AIWorkspace,
  Brand,
  PageContent,
  PageKind,
  PageSetup,
  SavedPage,
  SectionKind,
} from "../lib/ai-pages";
import {
  DEFAULT_BRAND,
  SECTION_KINDS,
  newSection,
  validateContent,
} from "../lib/ai-pages";
import { themeFiles, zipFiles } from "../lib/ai-export";
import { localAIClient } from "../lib/ai-local-client";
import { STYLE_PRESETS, resolveBrand, creditQuote } from "../lib/ai-page-options";
import "./dashboard.css";
import "./ai-pages.css";
const GUIDE = "https://docs.section.store/article/135-how-to-use-ai-pages";
function initialSetup(kind: PageKind): PageSetup {
  return {
    kind,
    mode: "full",
    title:
      kind === "home"
        ? "New home page"
        : kind === "product"
          ? "New product page"
          : "New landing page",
    prompt: "",
    themeId: "",
    sourceTemplate: kind === "product" ? "templates/product.json" : "",
    keepSections: false,
    target: "any",
    targetId: "",
    targetTitle: "",
    language: "English",
    style: "Minimal",
  };
}
function download(name: string, body: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function PageImage({ src, alt }: { src: string; alt: string }) {
  const privateImage = /^\/(app\/ai-image|__ai-image)\?id=/.test(src);
  const [objectUrl, setObjectUrl] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!privateImage) return;
    let alive = true,
      url = "";
    const abort = new AbortController();
    void fetch(src, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Image unavailable.");
        return response.blob();
      })
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (alive) setObjectUrl(url);
        else URL.revokeObjectURL(url);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, privateImage]);
  if (privateImage && !objectUrl)
    return (
      <p>
        {failed
          ? "Image could not be loaded. Refresh your Shopify session."
          : "Loading your generated image…"}
      </p>
    );
  return <img src={privateImage ? objectUrl : src} alt={alt} loading="lazy" />;
}

function PagePreview({
  content,
  brand,
  setup,
  mobile,
}: {
  content: PageContent;
  brand: Brand;
  setup: PageSetup;
  mobile: boolean;
}) {
  return (
    <div
      data-style={setup.style}
      className={"ai-preview " + (mobile ? "ai-mobile" : "")}
      style={{ color: brand.color, background: brand.background }}
      aria-label={mobile ? "Mobile page preview" : "Desktop page preview"}
    >
      <div className="ai-preview-brand">
        {brand.name || "Your store"}
        <span>Page preview</span>
      </div>
      {content.sections
        .filter((s) => !s.hidden)
        .map((s) => (
          <section key={s.id} className={"ai-render ai-render-" + s.kind}>
            {s.image && (
              <PageImage key={s.image} src={s.image} alt={s.imageAlt} />
            )}
            <div>
              {s.kind === "hero" ? <h1>{s.heading}</h1> : <h2>{s.heading}</h2>}
              <p>{s.text}</p>
              {s.kind === "faq" ? (
                s.items.map((i, n) => (
                  <details key={n}>
                    <summary>{i.title}</summary>
                    <p>{i.text}</p>
                  </details>
                ))
              ) : (
                <div className="ai-render-items">
                  {s.items.map((i, n) => (
                    <div key={n}>
                      <h3>{i.title}</h3>
                      <p>{i.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {s.kind === "product" && (
                <div className="ai-product-placeholder">
                  <strong>{setup.targetTitle || "Shopify product"}</strong>
                  <p>
                    Product images, live prices and variant choices load from
                    Shopify in the theme preview.
                  </p>
                  <button disabled>Native add to cart · Theme preview</button>
                </div>
              )}
              {s.button && (
                <span
                  className="ai-preview-button"
                  style={{ background: brand.color, color: brand.background }}
                >
                  {s.button}
                </span>
              )}
            </div>
          </section>
        ))}
    </div>
  );
}
export default function AIPages({
  homeHref = "/",
  client = localAIClient,
  initialWorkspace,
}: {
  homeHref?: string;
  client?: AIClient;
  initialWorkspace?: AIWorkspace;
}) {
  const [params] = useSearchParams();
  const [ws, setWs] = useState<AIWorkspace | null>(initialWorkspace || null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(""),
    [loading, setLoading] = useState(!initialWorkspace);
  const [brandTheme, setBrandTheme] = useState("");
  const [styleOpen, setStyleOpen] = useState(false);
  const stylePickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!styleOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!stylePickerRef.current?.contains(event.target as Node)) setStyleOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [styleOpen]);
  const [creditQuantity, setCreditQuantity] = useState(50);
  const quote = creditQuote(creditQuantity);
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const inspiration = ws?.brand.inspiration || "store";
  const [draftVersion, setDraftVersion] = useState(1);
  const operationRef = useRef(0);
  const initializeBuildLink = useRef(params.has("build"));
  useEffect(() => {
    if (!ws || !initializeBuildLink.current) return;
    initializeBuildLink.current = false;
    setSetup(s => ({...s, style:resolveBrand(ws.brand).style, themeId:ws.themes[0]?.id || ""}));
  }, [ws]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [editingSetup, setEditingSetup] = useState(false);
  const [modal, setModal] = useState<
    "builder" | "modes" | "credits" | "brand" | "how" | "publish" | null
  >(params.has("how") ? "how" : params.has("build") ? (params.get("type") === "product" ? "modes" : "builder") : null);
  const [setup, setSetup] = useState<PageSetup>(
    initialSetup(params.get("type") === "product" ? "product" : "home"),
  );
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND),
    [selected, setSelected] = useState<string | null>(null),
    [draft, setDraft] = useState<PageContent | null>(null),
    [dirty, setDirty] = useState(false),
    [mobile, setMobile] = useState(false),
    [sectionIndex, setSectionIndex] = useState(0);
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [templates, setTemplates] = useState<string[]>([]),
    [accepted, setAccepted] = useState(false),
    [sectionKind, setSectionKind] = useState<SectionKind>("text");
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  const load = useCallback(async () => {
    try {
      const next = await client.load();
      setWs(next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [client]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
    else if (!modal) dialog.current?.close();
  }, [modal, loading]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const page = ws?.pages.find((p) => p.id === selected);
  const frozen =
    !!busy ||
    !!page?.deployment.activated ||
    page?.status === "attention" ||
    ["generating", "deploying", "activating", "restoring"].includes(
      page?.status || "",
    );
  async function run(
    intent: string,
    payload: Record<string, unknown>,
    message: string,
  ) {
    const operation = ++operationRef.current;
    setBusy(intent);
    setError("");
    setNotice("");
    try {
      const next = await client.command(intent, payload);
      if (operation !== operationRef.current) return null;
      setWs(next);
      const saved = next.pages.find((p) => p.id === selectedRef.current);
      if (
        saved &&
        [
          "save",
          "undo",
          "generate",
          "regenerate",
          "image",
          "configure",
        ].includes(intent)
      ) {
        setDraft(structuredClone(saved.content));
        setDraftVersion(saved.version);
        setDirty(false);
      }
      if (
        (intent === "generate" ||
          intent === "regenerate" ||
          intent === "image") &&
        saved?.status === "failed"
      )
        setError(saved.error);
      else if (
        (intent === "generate" ||
          intent === "regenerate" ||
          intent === "image") &&
        saved?.status !== "ready"
      )
        setNotice(
          "Generation did not replace this draft. Refresh to review its status.",
        );
      else setNotice(message);
      return next;
    } catch (e) {
      if (operation !== operationRef.current) return null;
      setError((e as Error).message);
      try {
        setWs(await client.load());
      } catch {
        /* Keep the visible workspace while offline. */
      }
      return null;
    } finally {
      if (operation === operationRef.current) setBusy("");
    }
  }
  function openPage(next: SavedPage) {
    if (busy) return;
    if (dirty && !window.confirm("Discard unsaved page edits?")) return;
    setSelected(next.id);
    setDraft(structuredClone(next.content));
    setDraftVersion(next.version);
    setSectionIndex(0);
    setDirty(false);
    setError("");
    setNotice("");
  }
  function patch(change: Partial<PageContent>) {
    setDraft((d) => (d ? { ...d, ...change } : d));
    setDirty(true);
  }
  function editSection(change: Partial<PageContent["sections"][number]>) {
    if (!draft) return;
    patch({
      sections: draft.sections.map((s, i) =>
        i === sectionIndex ? { ...s, ...change } : s,
      ),
    });
  }
  function openBuilder(kind: PageKind) {
    setEditingSetup(false);
    setSetup({
      ...initialSetup(kind),
      themeId: ws?.themes[0]?.id || "",
      style: ws ? resolveBrand(ws.brand).style : "Minimal",
    });
    setTemplates([]);
    setModal(kind === "product" ? "modes" : "builder");
  }
  async function create() {
    if (editingSetup && page) {
      const next = await run(
        "configure",
        { id: page.id, version: page.version, setup },
        "Page settings saved.",
      );
      if (next) setModal(null);
      return;
    }
    const next = await run(
      "create",
      { setup },
      "Draft created. Generate with AI or start editing.",
    );
    if (next) {
      const added = next.pages.find(
        (p) => !ws?.pages.some((old) => old.id === p.id),
      );
      if (added) openPage(added);
      setModal(null);
    }
  }
  async function chooseTarget() {
    try {
      const resource = await client.pick(
        setup.target === "collection" ? "collection" : "product",
      );
      if (resource)
        setSetup((s) => ({
          ...s,
          targetId: resource.id,
          targetTitle: resource.title,
        }));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function getTemplates(themeId: string) {
    setSetup((s) => ({ ...s, themeId }));
    if (client.templates && themeId) {
      try {
        setTemplates(await client.templates(themeId, setup.kind));
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }
  async function exportPage() {
    if (!page || !draft || !ws) return;
    try {
      if (dirty) throw new Error("Save your edits before exporting.");
      const files: Record<string, string | Uint8Array> = {};
      if (client.export) {
        const bundle = await client.export(page.id);
        for (const [name, file] of Object.entries(bundle))
          files[name] =
            file.type === "BASE64"
              ? Uint8Array.from(atob(file.value), (c) => c.charCodeAt(0))
              : file.value;
      } else
        Object.assign(
          files,
          themeFiles(page.id, page.setup, validateContent(draft), ws.brand),
        );
      files["README.txt"] =
        "AI Pages theme export\n\nAdd each file to the matching directory of a duplicate Shopify theme. Review desktop/mobile in Shopify's Theme Editor before assigning the template or publishing the theme.\nProduct templates use native Shopify variants, price and product forms.\nThis ZIP includes a template and its sections/assets, not a complete installable theme.\n\nFor preserved source sections use the linked app to read and merge your existing template before export.\n";
      download(
        "ai-page-" + page.id + ".zip",
        zipFiles(files) as BlobPart,
        "application/zip",
      );
      setNotice("Theme files downloaded.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const activeSection = draft?.sections[sectionIndex];
  const filtered =
    ws?.pages.filter(
      (p) =>
        (filter === "all" || p.status === filter) &&
        (p.content.title + " " + p.setup.targetTitle)
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) || [];
  return (
    <div className="ss-dashboard ai-page">
      <header className="ss-topbar">
        <div className="ai-breadcrumb">
          <Link to={homeHref} className="ai-back" aria-label="Back to dashboard">‹</Link>
          <span className="ss-brand-icon">S</span><span className="ai-slash">/</span><strong>AI Pages</strong>
        </div>
        <nav className="ai-top-actions">
          <button onClick={() => setModal("how")}>How it works</button>
          <button className="ai-more" aria-label="Page help" onClick={() => setModal("how")}>•••</button>
        </nav>
      </header>
      <main className="ai-main">
        <div className="ai-heading">
          <h1><span>Hey there!</span><br />Let’s build your next page.</h1>
          <div className="ai-hero-pills">
            <button className="ai-pill" onClick={() => setModal("credits")}><span className="ai-sparkle">✧</span> {ws?.balance ?? 0} AI credits</button>
            <button className="ai-pill" onClick={() => document.getElementById("ai-recent-pages")?.scrollIntoView({behavior: "smooth"})}>Recent pages <span className="ai-count">{ws?.pages.length ?? 0}</span></button>
            <div className="ai-style-picker" ref={stylePickerRef} onKeyDown={e => {if(e.key === "Escape") setStyleOpen(false);}}>
              <button className="ai-pill" aria-expanded={styleOpen} aria-controls="ai-style-options" disabled={!ws} onClick={() => setStyleOpen(v => !v)}>♧ &nbsp; In the style of: {STYLE_PRESETS[inspiration].name} <span className="ai-chevron">⌄</span></button>
              {styleOpen && ws && <div className="ai-style-menu" id="ai-style-options">
                <div role="listbox" aria-label="In the style of">
                  {Object.entries(STYLE_PRESETS).map(([key,preset]) => <div className="ai-style-row" key={key}>
                    <button role="option" aria-selected={inspiration === key} disabled={!!busy} onClick={() => void run("brand", {brand:{...ws.brand,inspiration:key}}, "Page style saved.")}><span className="ai-style-monogram">{preset.name[0]}</span><span><strong>{preset.name}</strong><small>{key === "store" ? "From your brand guidelines" : `Preset · ${preset.domain}`}</small></span><span className="ai-style-check">{inspiration === key ? "✓" : ""}</span></button>
                    {preset.domain && <a href={`https://${preset.domain}`} target="_blank" rel="noreferrer" aria-label={`Open ${preset.domain} in a new tab`}>↗</a>}
                  </div>)}
                </div>
                {inspiration !== "store" && <><p>Colors</p><div className="ai-style-colors" role="group" aria-label="Colors">
                  {(["store","preset"] as const).map(source => <button key={source} disabled={!!busy} aria-pressed={(ws.brand.colorSource || "store") === source} onClick={() => void run("brand",{brand:{...ws.brand,colorSource:source}},"Color preference saved.")}>{source === "store" ? "Your store" : STYLE_PRESETS[inspiration].name}</button>)}
                </div><small>{STYLE_PRESETS[inspiration].name}’s style with {ws.brand.colorSource === "preset" ? "preset colors" : "colors from your Brand guidelines"}.</small></>}
                <button className="ai-style-guidelines" onClick={() => {setStyleOpen(false);setBrandTheme(ws.themes[0]?.id || "");setBrand(ws.brand);setModal("brand");}}>Brand guidelines <small>Your store’s colors</small></button>
              </div>}
            </div>
          </div>
        </div>
        {error && (
          <div className="ai-alert ai-error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="ai-alert" role="status">
            {notice}
          </div>
        )}
        {loading && <p role="status">Loading your saved pages…</p>}
        {!loading && !ws && (
          <button
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Retry connection
          </button>
        )}
        {ws && (
          <>
            <section className="ai-status">
              <div>
                <span
                  className={
                    "ai-dot " + (ws.providerReady ? "ai-dot-ready" : "")
                  }
                />
                <strong>
                  {ws.providerReady
                    ? "AI generation connected"
                    : "Connect AI to generate pages"}
                </strong>
                <p>
                  {ws.providerReady
                    ? ws.provider + " · Server configured"
                    : "Draft editing and theme exports are available. The server needs an AI provider key and model."}
                  {!ws.live &&
                    " Local workspace · Shopify publishing requires your linked app."}
                </p>
              </div>
              <div className="ai-credit">
                <strong>{ws.balance}</strong>
                <span>AI credits</span>
                <small>1 per generation</small>
              </div>
            </section>
            {ws.live && client.requestScopes && (
              <button
                disabled={!!busy}
                onClick={() => {
                  setBusy("permissions");
                  void client.requestScopes!([
                    "read_themes",
                    "write_content",
                    ...(ws.themeWriteApproved ? ["write_themes"] : []),
                  ])
                    .then(() => load())
                    .catch((e) => setError((e as Error).message))
                    .finally(() => setBusy(""));
                }}
              >
                Connect Shopify theme permissions
              </button>
            )}
            {ws.catalogError && <p className="ai-muted">{ws.catalogError}</p>}
            <section className="ai-types">
              {(
                [
                  [
                    "home",
                    "Home page",
                    "A home page that sells, with AI-written sections and images.",
                    "Build home page",
                  ],
                  [
                    "product",
                    "Product page",
                    "A full product page with benefits, reviews, FAQs and comparisons.",
                    "Build product page",
                  ],
                  [
                    "page",
                    "Any page",
                    "Landing pages, about pages, campaign pages. Describe it and we build it.",
                    "Build a page",
                  ],
                ] as const
              ).map(([kind, title, copy, button]) => (
                <article key={kind} className={"ai-type ai-type-" + kind}>
                  <h2>{title}</h2>
                  <p>{copy}</p>
                  <div className="ai-type-art" aria-hidden="true">
                    <img src={`/ai-pages/${kind}.png`} alt="" />
                  </div>
                  <button onClick={() => openBuilder(kind)}>{button}</button>
                </article>
              ))}
            </section>
            <div className="ai-brand-card">
              <div>
                <strong>Brand guidelines</strong>
                <p>
                  {ws.brand.name || "Make every page feel like your store."} ·{" "}
                  {ws.brand.style} · {ws.brand.voice}
                </p>
              </div>
              <div className="ai-swatches">
                <span style={{ background: ws.brand.color }} />
                <span style={{ background: ws.brand.background }} />
              </div>
              <button
                onClick={() => {
                  setBrandTheme(ws.themes[0]?.id || "");
                  setBrand(ws.brand);
                  setModal("brand");
                }}
              >
                Edit brand guidelines
              </button>
            </div>
            {page && draft && (
              <section className="ai-editor">
                <div className="ai-editor-header">
                  <div>
                    <p className="ai-eyebrow">
                      {page.setup.kind} page · Revision {page.version} ·{" "}
                      {page.status}
                    </p>
                    <h2>{draft.title}</h2>
                    <small>
                      {dirty
                        ? "Unsaved changes"
                        : "Saved " + new Date(page.updatedAt).toLocaleString()}
                    </small>
                  </div>
                  <div className="ai-button-row">
                    <button
                      disabled={!!busy || !dirty || frozen}
                      onClick={() =>
                        void run(
                          "save",
                          {
                            id: page.id,
                            version: draftVersion,
                            content: draft,
                          },
                          "Page changes saved.",
                        )
                      }
                    >
                      Save changes
                    </button>
                    <button
                      disabled={!!busy || dirty || frozen || page.version < 2}
                      onClick={() =>
                        void run(
                          "undo",
                          { id: page.id, version: page.version },
                          "Previous revision restored.",
                        )
                      }
                    >
                      Undo saved change
                    </button>
                    <button
                      disabled={!!busy || dirty || frozen}
                      onClick={() => {
                        setEditingSetup(true);
                        setSetup(page.setup);
                        setModal("builder");
                      }}
                    >
                      Page settings
                    </button>
                    <button
                      onClick={() => {
                        if (
                          !dirty ||
                          window.confirm("Discard unsaved edits?")
                        ) {
                          setSelected(null);
                          setDraft(null);
                          setDirty(false);
                        }
                      }}
                    >
                      Close editor
                    </button>
                  </div>
                </div>
                {page.error && (
                  <p className="ai-error ai-alert">{page.error}</p>
                )}
                <div className="ai-editor-toolbar">
                  <div className="ai-button-row">
                    <button
                      className={mobile ? "" : "ai-selected"}
                      aria-pressed={!mobile}
                      onClick={() => setMobile(false)}
                    >
                      Desktop
                    </button>
                    <button
                      className={mobile ? "ai-selected" : ""}
                      aria-pressed={mobile}
                      onClick={() => setMobile(true)}
                    >
                      Mobile
                    </button>
                  </div>
                  <div className="ai-button-row">
                    <button
                      className="ai-primary"
                      disabled={
                        !!busy ||
                        dirty ||
                        frozen ||
                        !ws.providerReady ||
                        ws.balance < 1
                      }
                      onClick={() =>
                        void run(
                          "generate",
                          {
                            id: page.id,
                            version: page.version,
                            requestKey: crypto.randomUUID(),
                          },
                          "AI page generated. Review the copy before publishing.",
                        )
                      }
                    >
                      {busy === "generate"
                        ? "Generating…"
                        : "✦ Generate with AI"}
                    </button>
                    {(busy === "generate" ||
                      busy === "regenerate" ||
                      busy === "image" ||
                      page.status === "generating") && (
                      <button
                        onClick={() =>
                          void run(
                            "cancel",
                            { id: page.id, version: page.version },
                            "Generation canceled.",
                          )
                        }
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      disabled={!!busy || dirty}
                      onClick={() => void exportPage()}
                    >
                      Download theme ZIP
                    </button>
                    <button
                      disabled={
                        !!busy ||
                        dirty ||
                        page.status === "draft" ||
                        page.status === "failed"
                      }
                      onClick={() => {
                        setAccepted(false);
                        setModal("publish");
                      }}
                    >
                      Review & publish
                    </button>
                  </div>
                </div>
                {(page.setup.mode !== "full" || page.setup.keepSections) && (
                  <p className="ai-muted">
                    The preview shows your generated sections. Your existing
                    theme sections are merged during Shopify upload.
                  </p>
                )}
                <div className="ai-editor-grid">
                  <aside className="ai-controls">
                    <label>
                      Page title
                      <input
                        value={draft.title}
                        disabled={frozen}
                        maxLength={100}
                        onChange={(e) => patch({ title: e.target.value })}
                      />
                    </label>
                    <label>
                      Search description
                      <textarea
                        value={draft.seoDescription}
                        disabled={frozen}
                        maxLength={320}
                        onChange={(e) =>
                          patch({ seoDescription: e.target.value })
                        }
                      />
                      <small>{draft.seoDescription.length}/320</small>
                    </label>
                    <h3>Sections</h3>
                    <div className="ai-section-list">
                      {draft.sections.map((s, i) => (
                        <button
                          key={s.id}
                          className={i === sectionIndex ? "ai-selected" : ""}
                          onClick={() => setSectionIndex(i)}
                        >
                          {i + 1}. {s.heading || s.kind}
                          {s.hidden ? " · hidden" : ""}
                        </button>
                      ))}
                    </div>
                    {!frozen && (
                      <div className="ai-button-row">
                        <select
                          aria-label="New section type"
                          value={sectionKind}
                          onChange={(e) =>
                            setSectionKind(e.target.value as SectionKind)
                          }
                        >
                          {SECTION_KINDS.map((k) => (
                            <option key={k}>{k}</option>
                          ))}
                        </select>
                        <button
                          disabled={draft.sections.length >= 12}
                          onClick={() => {
                            patch({
                              sections: [
                                ...draft.sections,
                                newSection(sectionKind),
                              ],
                            });
                            setSectionIndex(draft.sections.length);
                          }}
                        >
                          Add section
                        </button>
                      </div>
                    )}
                    {activeSection && (
                      <fieldset disabled={frozen}>
                        <legend>Edit {activeSection.kind}</legend>
                        <label>
                          Heading
                          <input
                            maxLength={200}
                            value={activeSection.heading}
                            onChange={(e) =>
                              editSection({ heading: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Copy
                          <textarea
                            rows={5}
                            maxLength={4000}
                            value={activeSection.text}
                            onChange={(e) =>
                              editSection({ text: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Image URL
                          <input
                            disabled={activeSection.kind === "product"}
                            value={activeSection.image}
                            onChange={(e) =>
                              editSection({ image: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          AI image brief
                          <textarea
                            value={imagePrompt}
                            maxLength={2000}
                            placeholder="Describe an original campaign illustration"
                            onChange={(e) => setImagePrompt(e.target.value)}
                          />
                        </label>
                        <button
                          disabled={
                            !!busy ||
                            dirty ||
                            !ws.imageReady ||
                            activeSection.kind === "product" ||
                            ws.balance < 1 ||
                            !imagePrompt.trim()
                          }
                          onClick={() =>
                            void run(
                              "image",
                              {
                                id: page.id,
                                version: page.version,
                                sectionId: activeSection.id,
                                prompt: imagePrompt,
                                requestKey: crypto.randomUUID(),
                              },
                              "AI image generated and saved. Review it before publishing.",
                            )
                          }
                        >
                          ✦ Generate image · 1 credit
                        </button>
                        <p className="ai-muted">
                          AI banners are illustrations. Use your original
                          product photos for accurate product imagery.
                        </p>
                        <label>
                          Image description
                          <input
                            disabled={activeSection.kind === "product"}
                            value={activeSection.imageAlt}
                            maxLength={200}
                            onChange={(e) =>
                              editSection({ imageAlt: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Button label
                          <input
                            value={activeSection.button}
                            maxLength={80}
                            onChange={(e) =>
                              editSection({ button: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Button link
                          <input
                            disabled={activeSection.kind === "product"}
                            value={activeSection.url}
                            onChange={(e) =>
                              editSection({ url: e.target.value })
                            }
                            placeholder="/collections/all"
                          />
                        </label>
                        {activeSection.items.map((item, i) => (
                          <div className="ai-item-edit" key={i}>
                            <label>
                              Item {i + 1} title
                              <input
                                value={item.title}
                                maxLength={200}
                                onChange={(e) =>
                                  editSection({
                                    items: activeSection.items.map((v, n) =>
                                      n === i
                                        ? { ...v, title: e.target.value }
                                        : v,
                                    ),
                                  })
                                }
                              />
                            </label>
                            <label>
                              Item text
                              <textarea
                                value={item.text}
                                maxLength={1000}
                                onChange={(e) =>
                                  editSection({
                                    items: activeSection.items.map((v, n) =>
                                      n === i
                                        ? { ...v, text: e.target.value }
                                        : v,
                                    ),
                                  })
                                }
                              />
                            </label>
                            <button
                              onClick={() =>
                                editSection({
                                  items: activeSection.items.filter(
                                    (_, n) => n !== i,
                                  ),
                                })
                              }
                            >
                              Remove item
                            </button>
                          </div>
                        ))}
                        <button
                          disabled={activeSection.items.length >= 8}
                          onClick={() =>
                            editSection({
                              items: [
                                ...activeSection.items,
                                { title: "New item", text: "" },
                              ],
                            })
                          }
                        >
                          Add item
                        </button>
                        <div className="ai-button-row">
                          <button
                            disabled={sectionIndex === 0}
                            onClick={() => {
                              const sections = [...draft.sections];
                              [
                                sections[sectionIndex - 1],
                                sections[sectionIndex],
                              ] = [
                                sections[sectionIndex],
                                sections[sectionIndex - 1],
                              ];
                              patch({ sections });
                              setSectionIndex(sectionIndex - 1);
                            }}
                          >
                            Move up
                          </button>
                          <button
                            disabled={
                              sectionIndex === draft.sections.length - 1
                            }
                            onClick={() => {
                              const sections = [...draft.sections];
                              [
                                sections[sectionIndex + 1],
                                sections[sectionIndex],
                              ] = [
                                sections[sectionIndex],
                                sections[sectionIndex + 1],
                              ];
                              patch({ sections });
                              setSectionIndex(sectionIndex + 1);
                            }}
                          >
                            Move down
                          </button>
                        </div>
                        <label className="ai-check">
                          <input
                            type="checkbox"
                            checked={activeSection.hidden}
                            onChange={(e) =>
                              editSection({ hidden: e.target.checked })
                            }
                          />
                          Hide section
                        </label>
                        <div className="ai-button-row">
                          <button
                            disabled={draft.sections.length <= 1}
                            onClick={() => {
                              patch({
                                sections: draft.sections.filter(
                                  (_, i) => i !== sectionIndex,
                                ),
                              });
                              setSectionIndex(Math.max(0, sectionIndex - 1));
                            }}
                          >
                            Delete section
                          </button>
                          <button
                            disabled={
                              !!busy ||
                              dirty ||
                              !ws.providerReady ||
                              ws.balance < 1
                            }
                            onClick={() =>
                              void run(
                                "regenerate",
                                {
                                  id: page.id,
                                  version: page.version,
                                  sectionId: activeSection.id,
                                  requestKey: crypto.randomUUID(),
                                },
                                "Selected section regenerated.",
                              )
                            }
                          >
                            ✦ Regenerate section
                          </button>
                        </div>
                      </fieldset>
                    )}
                  </aside>
                  <div className="ai-preview-wrap">
                    <PagePreview
                      content={draft}
                      brand={resolveBrand(ws.brand)}
                      setup={page.setup}
                      mobile={mobile}
                    />
                  </div>
                </div>
              </section>
            )}
            <div className="ai-history-grid">
            <section className="ai-history" id="ai-recent-pages">
              <div className="ai-history-heading">
                <div>
                  <h2>Recent pages</h2>
                  <p>Your drafts, generated pages and published work.</p>
                </div>
                {ws.pages.length > 0 && <button disabled={!!busy} onClick={() => void load()}>
                  Refresh
                </button>}
              </div>
              {ws.pages.length > 0 && <div className="ai-history-tools">
                <input
                  aria-label="Search pages"
                  placeholder="Search pages…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="Page status"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  {[
                    "all",
                    "draft",
                    "ready",
                    "failed",
                    "deployed",
                    "published",
                    "attention",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s === "all" ? "All pages" : s}
                    </option>
                  ))}
                </select>
              </div>}
              {filtered.length ? (
                <div className="ai-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Page</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Last updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <button
                              className="ai-link"
                              onClick={() => openPage(p)}
                            >
                              {p.content.title}
                            </button>
                            <small>
                              {p.setup.targetTitle || p.setup.style}
                            </small>
                          </td>
                          <td>{p.setup.kind}</td>
                          <td>
                            <span className={"ai-badge ai-badge-" + p.status}>
                              {p.status}
                            </span>
                          </td>
                          <td>{new Date(p.updatedAt).toLocaleDateString()}</td>
                          <td>
                            <div className="ai-button-row">
                              <button onClick={() => openPage(p)}>Edit</button>
                              <button
                                disabled={!!busy}
                                onClick={() =>
                                  void run(
                                    "duplicate",
                                    { id: p.id, version: p.version },
                                    "Page duplicated.",
                                  )
                                }
                              >
                                Duplicate
                              </button>
                              <button
                                disabled={!!busy || !!p.deployment.filename}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Delete this draft permanently?",
                                    )
                                  )
                                    void run(
                                      "delete",
                                      { id: p.id, version: p.version },
                                      "Draft deleted.",
                                    );
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="ai-empty">
                  <span>✦</span>
                  <h3>
                    {query || filter !== "all"
                      ? "No matching pages"
                      : "No pages yet"}
                  </h3>
                  <p>
                    Describe your first page above to create a saved draft.
                  </p>
                </div>
              )}
            </section>
            <aside className="ai-buy-credits">
              <h2>Buy credits</h2>
              <p>Build your page with AI-written copy and images.</p>
              <div className="ai-credit-art">
                <div><strong>{ws.balance}</strong> <span>AI credits available</span><div className="ai-credit-bars" aria-hidden="true">{[0,1,2,3,4].map(n => <i key={n} />)}</div></div>
                <img src="/ai-pages/credits.png" alt="" />
              </div>
              <button onClick={() => setModal("credits")}>Buy credits</button>
            </aside>
            </div>
          </>
        )}
      </main>
      <dialog
        className={"ai-dialog " + (modal === "builder" || modal === "modes" ? "ai-dialog-wide" : "") + (modal === "modes" ? " ai-mode-dialog" : modal === "credits" ? " ai-credit-dialog" : "")}
        ref={dialog}
        onCancel={() => setModal(null)}
        aria-labelledby="ai-dialog-title"
      >
        <header>
          <div>
            <p className="ai-eyebrow">AI PAGES</p>
            <h2 id="ai-dialog-title">
              {modal === "modes" ? "AI Product Pages" : modal === "credits" ? "Buy credits" : modal === "builder"
                ? "Build a " +
                  (setup.kind === "page" ? "landing" : setup.kind) +
                  " page"
                : modal === "brand"
                  ? "Brand guidelines"
                  : modal === "publish"
                    ? "Review & publish"
                    : "How it works"}
            </h2>
          </div>
          <button aria-label="Close dialog" onClick={() => setModal(null)}>
            ×
          </button>
        </header>
        <div className="ai-dialog-body">
          {modal === "modes" && <>
            <p className="ai-mode-question">What do you want to build?</p>
            <div className="ai-mode-options" role="group" aria-label="Product page build mode">
              {([
                ["full", "Full product page", "Buy box and sections, with copy and images.", "▱"],
                ["buy-box", "Buy box only", "New conversion blocks go in your buy box. Nothing else changes.", "⛶"],
                ["sections", "Sections only", "New sections go below your product. Your buy box stays as it is.", "▤"],
              ] as const).map(([mode, title, description, icon]) => <button type="button" key={mode} className="ai-mode-option" aria-pressed={setup.mode === mode} onClick={() => setSetup(s => ({...s, mode}))}>
                <img src={`/ai-pages/mode-${mode}.png`} alt="" />
                <strong><span aria-hidden="true">{icon}</span>{title}</strong>
                <span>{description}</span>
              </button>)}
            </div>
            <div className="ai-mode-footer"><button onClick={() => setModal(null)}>Cancel</button><button className="ai-primary" onClick={() => setModal("builder")}>Continue</button></div>
          </>}
          {modal === "credits" && <>
            <p>One credit builds one page. Buy more and each credit costs less, up to 25% off at 100.</p>
            <div className="ai-credit-balances"><div><small>Current balance</small><strong>{ws?.balance ?? 0}</strong><span>credits</span></div><span>→</span><div><small>After purchase</small><strong>{(ws?.balance ?? 0) + quote.quantity}</strong><span>credits</span></div></div>
            <div className="ai-credit-package">
            <div className="ai-credit-quantity"><div><strong>{quote.quantity} credits</strong><small>{quote.percent ? `Save ${quote.percent}%` : "No discount yet"}</small><p>{money(quote.total / quote.quantity)} per credit</p></div><div className="ai-credit-stepper"><button aria-label="Remove 5 credits" disabled={quote.quantity === 5} onClick={() => setCreditQuantity(q => Math.max(5,q - 5))}>−</button><input type="number" aria-label="Credits" min={5} max={100} step={5} value={quote.quantity} onChange={e => setCreditQuantity(creditQuote(Number(e.target.value)).quantity)} /><button aria-label="Add 5 credits" disabled={quote.quantity === 100} onClick={() => setCreditQuantity(q => Math.min(100,q + 5))}>+</button></div></div>
            <input className="ai-credit-slider" type="range" aria-label="Number of credits" min={5} max={100} step={5} value={quote.quantity} onChange={e => setCreditQuantity(Number(e.target.value))} />
            <div className="ai-credit-ticks"><span>5</span><span>25 · 11% off</span><span>50 · 17% off</span><span>75 · 21% off</span><span>100 · 25% off</span></div>
            <div className="ai-credit-picks" role="group" aria-label="Quick picks">{[10,25,50,100].map(n => <button key={n} aria-pressed={quote.quantity === n} onClick={() => setCreditQuantity(n)}>{n}</button>)}</div>
            </div>
            <div className="ai-credit-summary"><p><span>{quote.quantity} credits × $1.00</span><strong>{money(quote.subtotal)}</strong></p><p><span>Volume discount{quote.percent ? ` · ${quote.percent}%` : ""}</span><strong>{quote.percent ? `−${money(quote.discount)}` : "Add 10 or more to unlock"}</strong></p><p><span>Total</span><strong>{money(quote.total)}</strong></p></div>
            <p className="ai-muted">Pricing preview. Credit purchases are not available in this workspace yet. Your balance changes only after a verified purchase.</p>
            <div className="ai-mode-footer"><button onClick={() => setModal(null)}>Cancel</button><button className="ai-primary" disabled>Buy {quote.quantity} credits · {money(quote.total)}</button></div>
          </>}
          {error && (
            <p className="ai-error" role="alert">
              {error}
            </p>
          )}
          {modal === "how" && (
            <>
              <p>
                Choose a page, give AI your brief, then edit and review the
                result in your theme.
              </p>
              {ws?.tutorialUrl ? (
                <video controls preload="metadata" src={ws.tutorialUrl}>
                  <track kind="captions" />
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="ai-video-empty">
                  <span>▷</span>
                  <p>A tutorial video has not been connected yet.</p>
                  <a href={GUIDE} target="_blank" rel="noreferrer">
                    Read the official workflow guide ↗
                  </a>
                </div>
              )}
              <ol>
                <li>
                  <strong>Choose your page.</strong> Home, product, or any
                  landing page.
                </li>
                <li>
                  <strong>Set the direction.</strong> Product, layout, brand,
                  language and brief.
                </li>
                <li>
                  <strong>Generate and refine.</strong> Review copy, imagery and
                  desktop/mobile layout.
                </li>
                <li>
                  <strong>Review in Shopify.</strong> Upload an isolated
                  template, then open your theme editor.
                </li>
                <li>
                  <strong>Publish when ready.</strong> Use as home page, assign
                  products, or publish a landing page. Restore is available for
                  changes applied by this app.
                </li>
              </ol>
              <button
                className="ai-primary"
                onClick={() => openBuilder("page")}
              >
                Build a page
              </button>
            </>
          )}
          {modal === "brand" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run("brand", { brand }, "Brand guidelines saved.").then(
                  (next) => {
                    if (next) setModal(null);
                  },
                );
              }}
            >
              {ws?.live && (
                <div className="ai-brand-import">
                  <label>
                    Import from theme
                    <select
                      value={brandTheme}
                      onChange={(e) => setBrandTheme(e.target.value)}
                    >
                      <option value="">Choose theme</option>
                      {ws.themes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={!!busy || !brandTheme}
                    onClick={() =>
                      void run(
                        "import-brand",
                        { themeId: brandTheme },
                        "Theme brand colors imported.",
                      ).then((next) => {
                        if (next) setBrand(next.brand);
                      })
                    }
                  >
                    Import store name & colors
                  </button>
                </div>
              )}
              <label>
                Brand name
                <input
                  value={brand.name}
                  maxLength={100}
                  onChange={(e) => setBrand({ ...brand, name: e.target.value })}
                />
              </label>
              <label>
                Brand voice
                <textarea
                  value={brand.voice}
                  maxLength={500}
                  onChange={(e) =>
                    setBrand({ ...brand, voice: e.target.value })
                  }
                />
              </label>
              <label>
                Audience
                <textarea
                  value={brand.audience}
                  maxLength={500}
                  onChange={(e) =>
                    setBrand({ ...brand, audience: e.target.value })
                  }
                />
              </label>
              <div className="ai-form-grid">
                <label>
                  Brand color
                  <input
                    type="color"
                    value={brand.color}
                    onChange={(e) =>
                      setBrand({ ...brand, color: e.target.value })
                    }
                  />
                </label>
                <label>
                  Background
                  <input
                    type="color"
                    value={brand.background}
                    onChange={(e) =>
                      setBrand({ ...brand, background: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Store style
                <select
                  value={brand.style}
                  onChange={(e) =>
                    setBrand({ ...brand, style: e.target.value })
                  }
                >
                  {["Minimal", "Bold", "Editorial"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button className="ai-primary" disabled={!!busy}>
                Save brand guidelines
              </button>
            </form>
          )}
          {modal === "builder" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              {setup.kind === "product" && <button type="button" className="ai-mode-back" onClick={() => setModal("modes")}>← Choose build mode</button>}
              <div className="ai-kind-switch">
                {(["home", "product", "page"] as const).map((kind) => (
                  <button
                    type="button"
                    className={setup.kind === kind ? "ai-selected" : ""}
                    key={kind}
                    onClick={() =>
                      setSetup((s) => ({
                        ...initialSetup(kind),
                        themeId: s.themeId,
                        style: s.style,
                      }))
                    }
                  >
                    {kind === "page" ? "Any page" : kind + " page"}
                  </button>
                ))}
              </div>
              <label>
                Page name
                <input
                  required
                  maxLength={100}
                  value={setup.title}
                  onChange={(e) =>
                    setSetup({ ...setup, title: e.target.value })
                  }
                />
              </label>
              {setup.kind === "product" && (
                <>
                  <label>
                    Build mode
                    <select
                      value={setup.mode}
                      onChange={(e) =>
                        setSetup({
                          ...setup,
                          mode: e.target.value as PageSetup["mode"],
                        })
                      }
                    >
                      <option value="full">
                        Full product page · buy box and sections
                      </option>
                      <option value="buy-box">
                        Buy box only · preserve sections below
                      </option>
                      <option value="sections">
                        Sections only · preserve existing buy box
                      </option>
                    </select>
                  </label>
                  <label>
                    Made for
                    <select
                      value={setup.target}
                      onChange={(e) =>
                        setSetup({
                          ...setup,
                          target: e.target.value as PageSetup["target"],
                          targetId: "",
                          targetTitle: "",
                        })
                      }
                    >
                      <option value="any">Any product</option>
                      <option value="product">Specific product</option>
                      <option value="collection">
                        Products in a collection
                      </option>
                    </select>
                  </label>
                  {setup.target !== "any" && (
                    <div className="ai-resource">
                      <span>
                        {setup.targetTitle ||
                          "No " + setup.target + " selected"}
                      </span>
                      <button type="button" onClick={() => void chooseTarget()}>
                        Choose {setup.target}
                      </button>
                    </div>
                  )}
                </>
              )}
              <label>
                Describe the page
                <textarea
                  rows={5}
                  maxLength={4000}
                  placeholder="What are you selling, who is it for, and what should the page emphasize?"
                  value={setup.prompt}
                  onChange={(e) =>
                    setSetup({ ...setup, prompt: e.target.value })
                  }
                />
              </label>
              <div className="ai-form-grid">
                <label>
                  In the style of
                  <select
                    value={setup.style}
                    onChange={(e) =>
                      setSetup({ ...setup, style: e.target.value })
                    }
                  >
                    {["Minimal", "Bold", "Editorial"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Language
                  <input
                    required
                    value={setup.language}
                    maxLength={50}
                    onChange={(e) =>
                      setSetup({ ...setup, language: e.target.value })
                    }
                  />
                </label>
              </div>
              <details className="ai-advanced">
                <summary>Advanced · theme and existing sections</summary>
                <label>
                  Theme
                  <select
                    value={setup.themeId}
                    onChange={(e) => void getTemplates(e.target.value)}
                  >
                    <option value="">Choose later</option>
                    {ws?.themes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.role === "MAIN" ? "Live" : "Draft"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Start from JSON template
                  <input
                    list="ai-templates"
                    value={setup.sourceTemplate}
                    onChange={(e) =>
                      setSetup({ ...setup, sourceTemplate: e.target.value })
                    }
                    placeholder={
                      setup.kind === "home"
                        ? "templates/index.json"
                        : "templates/" + setup.kind + ".json"
                    }
                  />
                  <datalist id="ai-templates">
                    {templates.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </label>
                <label className="ai-check">
                  <input
                    type="checkbox"
                    checked={setup.keepSections}
                    onChange={(e) =>
                      setSetup({ ...setup, keepSections: e.target.checked })
                    }
                  />
                  Keep existing sections beneath the new page
                </label>
                <p className="ai-muted">
                  Buy-box and sections-only modes preserve the source template
                  automatically. Theme access is needed to merge existing
                  sections.
                </p>
              </details>
              <p className="ai-muted">
                Creates a saved draft first. AI generation uses one credit;
                publishing is a separate action.
              </p>
              <button
                className="ai-primary"
                disabled={!!busy || (setup.target !== "any" && !setup.targetId)}
              >
                {busy === "create" || busy === "configure"
                  ? "Saving…"
                  : editingSetup
                    ? "Save page settings"
                    : "Create page draft"}
              </button>
            </form>
          )}
          {modal === "publish" && page && ws && (
            <>
              <p>
                <strong>{page.content.title}</strong> · Revision {page.version}{" "}
                ·{" "}
                {page.setup.themeId
                  ? ws.themes.find((t) => t.id === page.setup.themeId)?.name
                  : "No Shopify theme selected"}
              </p>
              <p>
                Upload creates an isolated template. Activation changes your
                live home page, selected product templates, or publishes a
                landing page. Review the result in Shopify first.
              </p>
              {!ws.themeWrites && (
                <div className="ai-alert">
                  Automatic upload needs your linked app and approved Shopify
                  theme-write access. Download the ZIP to install files
                  manually.
                </div>
              )}
              <label className="ai-check">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                I reviewed the saved copy, images and page layout.
              </label>
              <div className="ai-publish-actions">
                <button
                  disabled={
                    !!busy ||
                    !accepted ||
                    !ws.themeWrites ||
                    !page.setup.themeId ||
                    page.status === "published" ||
                    page.status === "attention"
                  }
                  onClick={() =>
                    void run(
                      "deploy",
                      { id: page.id, version: page.version },
                      "Theme upload verified. Open Shopify’s theme editor to review.",
                    )
                  }
                >
                  1. Upload theme template
                </button>
                {page.deployment.editorUrl && (
                  <a
                    className="ai-action-link"
                    href={page.deployment.editorUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    2. Open theme editor ↗
                  </a>
                )}
                {page.deployment.previewUrl && (
                  <a
                    href={page.deployment.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open storefront preview ↗
                  </a>
                )}
                <button
                  className="ai-primary"
                  disabled={
                    !!busy ||
                    !accepted ||
                    page.status !== "deployed" ||
                    !ws.themeWrites
                  }
                  onClick={() => {
                    if (
                      window.confirm(
                        "Apply this page to your live Shopify store?",
                      )
                    )
                      void run(
                        "activate",
                        { id: page.id, version: page.version },
                        "Page activated in Shopify.",
                      );
                  }}
                >
                  3.{" "}
                  {page.setup.kind === "home"
                    ? "Use as home page"
                    : page.setup.kind === "product"
                      ? "Assign to selected products"
                      : "Publish landing page"}
                </button>
                <button
                  disabled={
                    !!busy ||
                    !ws.themeWrites ||
                    (!page.deployment.activated && page.status !== "attention")
                  }
                  onClick={() => {
                    if (
                      window.confirm(
                        "Restore the previous home/product templates or unpublish this landing page?",
                      )
                    )
                      void run(
                        "restore",
                        { id: page.id, version: page.version },
                        "Previous store state restored.",
                      );
                  }}
                >
                  Restore previous version
                </button>
                {page.status === "attention" && (
                  <button
                    disabled={!!busy}
                    onClick={() =>
                      void run(
                        "verify",
                        { id: page.id, version: page.version },
                        "Theme upload verified.",
                      )
                    }
                  >
                    Verify interrupted upload
                  </button>
                )}
                <button disabled={!!busy} onClick={() => void exportPage()}>
                  Download theme ZIP
                </button>
              </div>
              {page.setup.kind === "page" && page.deployment.handle && (
                <p className="ai-muted">
                  To add this page to your navigation, open Shopify Content →
                  Menus and add /pages/{page.deployment.handle}.
                </p>
              )}
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
