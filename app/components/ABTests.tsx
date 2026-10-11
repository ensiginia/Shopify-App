import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  STORAGE_KEY,
  comparison,
  createExperiment,
  defaults,
  metrics,
  recordOrder,
  recordVisit,
  reportCSV,
  restoreExperiments,
  sampleExperiment,
  transition,
  validateSetup,
} from "../lib/experiments";
import type {
  Experiment,
  Setup,
  Status,
  Surface,
  Variant,
  VariantKey,
} from "../lib/experiments";
import "./dashboard.css";
import "./conversion-blocks.css";
import "./ab-tests.css";
import { analyze } from "../lib/experiment-analysis";
export type ABServer = {
  initialTests: Experiment[];
  currency: string;
  enabled: boolean;
  planEligible: boolean;
  missingScopes: string[];
  storefrontUrl: string;
  testOrdersIncluded: boolean;
  products: {
    id: string;
    title: string;
    variants: { nodes: { id: string; title: string; price: string }[] };
  }[];
  pickProduct: () => Promise<ABServer["products"][number] | undefined>;
  requestPermissions: () => Promise<void>;
  privacyRequests: { createdAt: string; data: unknown }[];
  transact: (
    intent: string,
    payload: Record<string, unknown>,
  ) => Promise<Experiment[]>;
};

type Modal =
  | "setup"
  | "report"
  | "sample"
  | "connection"
  | "end"
  | "archive"
  | "start"
  | "rollout"
  | null;
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency }).format(value);
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not started";
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function VariantPreview({
  variant,
  surface,
  currency,
  label,
}: {
  variant: Variant;
  surface: Surface;
  currency: string;
  label: string;
}) {
  return (
    <section
      className="ab-variant-preview"
      aria-label={`${label} visual preview`}
    >
      <div className="ab-variant-top">
        <span className="ab-letter">{label}</span>
        <strong>{variant.name}</strong>
      </div>
      {surface === "Bundles" ? (
        <>
          <div className="ab-product-art" aria-hidden="true">
            ✦
          </div>
          <small>Sample product · {money(50, currency)} each</small>
          <h3>Build your everyday kit</h3>
          <div className="ab-offer">
            <strong>Buy {variant.quantity}</strong>
            <span>Save {variant.discount}%</span>
          </div>
          <p>
            <strong>
              {money(
                50 * variant.quantity * (1 - variant.discount / 100),
                currency,
              )}
            </strong>{" "}
            <del>{money(50 * variant.quantity, currency)}</del>
          </p>
          <span
            className="ab-store-button"
            style={{ background: variant.color }}
          >
            Add bundle to cart
          </span>
        </>
      ) : (
        <>
          <h3>Your cart · 1 item</h3>
          {variant.reward > 0 && (
            <div className="ab-reward">
              {money(variant.reward, currency)} free-shipping goal
              <div>
                <span
                  style={{
                    width: `${Math.min((50 / variant.reward) * 100, 100)}%`,
                    background: variant.color,
                  }}
                />
              </div>
              <small>
                {variant.reward > 50
                  ? `Add ${money(variant.reward - 50, currency)} to unlock free shipping`
                  : "Free shipping unlocked"}
              </small>
            </div>
          )}
          <div className="ab-cart-item">
            <span aria-hidden="true">✦</span>
            <div>
              Everyday kit<small>Quantity: 1</small>
            </div>
            <strong>{money(50, currency)}</strong>
          </div>
          {variant.upsell && (
            <div className="ab-offer">
              <span>Add a carry pouch</span>
              <strong>+ {money(10, currency)}</strong>
            </div>
          )}
          <p>
            Subtotal <strong>{money(50, currency)}</strong>
          </p>
          <span
            className="ab-store-button"
            style={{ background: variant.color }}
          >
            {variant.checkout}
          </span>
        </>
      )}
      <small className="ab-preview-caption">
        Visual preview with sample products
      </small>
    </section>
  );
}
function Report({
  experiment,
  sample,
}: {
  experiment: Experiment;
  sample: boolean;
}) {
  const result = comparison(experiment);
  const analysis = analyze(experiment);
  return (
    <>
      <div className="ab-report-meta">
        <span className="ab-badge">
          {sample
            ? "Illustrative sample"
            : experiment.source === "shopify"
              ? "Verified Shopify orders"
              : "Simulated results"}
        </span>
        <span>
          {experiment.currency} · Revenue per visitor is the primary metric
        </span>
      </div>
      <p>{experiment.hypothesis}</p>
      <div className="ab-report">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>A · {experiment.variants.A.name}</th>
              <th>B · {experiment.variants.B.name}</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "Visitors",
                result.a.visitors.toLocaleString(),
                result.b.visitors.toLocaleString(),
              ],
              ["Paid orders", result.a.orders, result.b.orders],
              [
                "Net revenue",
                money(result.a.revenue, experiment.currency),
                money(result.b.revenue, experiment.currency),
              ],
              [
                "Refunds",
                money(result.a.refunds || 0, experiment.currency),
                money(result.b.refunds || 0, experiment.currency),
              ],
              [
                "Revenue per visitor",
                money(result.a.rpv, experiment.currency),
                money(result.b.rpv, experiment.currency),
              ],
              [
                "Buyer conversion",
                `${result.a.conversion.toFixed(2)}%`,
                `${result.b.conversion.toFixed(2)}%`,
              ],
              [
                "Average order value",
                money(result.a.aov, experiment.currency),
                money(result.b.aov, experiment.currency),
              ],
            ].map(([label, a, b]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{a}</td>
                <td>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ab-insight">
        <strong>
          {result.leader
            ? `Variant ${result.leader} leads on observed revenue per visitor`
            : "No observed leader yet"}
        </strong>
        <p>
          {result.uplift === null
            ? "A needs non-zero revenue before a relative lift can be calculated."
            : `B compared with A: ${result.uplift >= 0 ? "+" : ""}${result.uplift.toFixed(1)}% revenue per visitor.`}
        </p>
        <small>
          {result.enough
            ? "Your visitor and duration targets are met. "
            : `Target: ${experiment.minimumVisitors.toLocaleString()} visitors per variant over ${experiment.minimumDays} days. `}
          {analysis.mismatch
            ? "Traffic imbalance detected (sample-ratio check, p < 0.001). Investigate before choosing a winner."
            : analysis.interval
              ? "95% interval for B minus A: " +
                money(analysis.interval[0], experiment.currency) +
                " to " +
                money(analysis.interval[1], experiment.currency) +
                " per visitor. " +
                (analysis.supported
                  ? "Evidence supports " +
                    analysis.supported +
                    " at the planned horizon."
                  : "The interval includes zero; no clear winner.")
              : "A final interval needs an ended test, its planned duration, at least " +
                Math.max(500, experiment.minimumVisitors) +
                " visitors per version, measurable variation, and " +
                (experiment.source === "shopify"
                  ? "the 7-day attribution window to finish."
                  : "a balanced traffic split.")}
        </small>
        <small>{analysis.method}</small>
      </div>
      <div className="ab-progress">
        <span>
          A: {result.a.visitors.toLocaleString()} /{" "}
          {experiment.minimumVisitors.toLocaleString()} visitors
        </span>
        <span>
          B: {result.b.visitors.toLocaleString()} /{" "}
          {experiment.minimumVisitors.toLocaleString()} visitors
        </span>
        <span>
          {result.duration.toFixed(1)} / {experiment.minimumDays} elapsed days
        </span>
      </div>
      <small>
        Conversion = unique buyers ÷ visitors. Revenue per visitor = paid-order
        revenue after refunds ÷ visitors. Sample reports are excluded from
        workspace totals. Duration is elapsed calendar time and includes pauses.
      </small>
      <div className="ab-variant-grid">
        {(["A", "B"] as const).map((key) => (
          <VariantPreview
            key={key}
            label={key}
            variant={experiment.variants[key]}
            surface={experiment.surface}
            currency={experiment.currency}
          />
        ))}
      </div>
    </>
  );
}

export default function ABTests({
  homeHref = "/",
  server,
}: {
  homeHref?: string;
  server?: ABServer;
}) {
  const [params] = useSearchParams();
  const [surface, setSurface] = useState<Surface>(
    params.get("surface") === "cart" ? "Carts" : "Bundles",
  );
  const [tests, setTests] = useState<Experiment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sample, setSample] = useState<Experiment | null>(null);
  const [form, setForm] = useState<Setup>(() => defaults(surface));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [visitorId, setVisitorId] = useState("demo-visitor-1");
  const [orderId, setOrderId] = useState("demo-order-1");
  const [amount, setAmount] = useState(50);
  const [winner, setWinner] = useState<"none" | VariantKey>("none");
  const [totalCurrency, setTotalCurrency] = useState(server?.currency || "USD");
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const networkLock = useRef(false);
  const importInput = useRef<HTMLInputElement>(null);
  const [pickedProducts, setPickedProducts] = useState<ABServer["products"]>(
    [],
  );
  const products = [
    ...pickedProducts,
    ...(server?.products || []).filter(
      (p) => !pickedProducts.some((picked) => picked.id === p.id),
    ),
  ];
  const browseProducts = async (upsell = false) => {
    if (!server) return;
    try {
      const product = await server.pickProduct();
      if (!product) return;
      setPickedProducts((existing) => [
        product,
        ...existing.filter((p) => p.id !== product.id),
      ]);
      setForm((f) =>
        upsell
          ? {
              ...f,
              upsellProductId: product.id,
              upsellVariantId: product.variants.nodes[0]?.id || "",
            }
          : { ...f, productId: product.id, productTitle: product.title },
      );
    } catch {
      setError(
        "The Shopify product picker could not open. Check your app connection.",
      );
    }
  };
  const storageKey =
    homeHref === "/app"
      ? `${STORAGE_KEY}:${params.get("shop") || "unlinked"}`
      : STORAGE_KEY;
  const storageVersion = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = tests.find((t) => t.id === selectedId);
  const report = modal === "sample" ? sample : selected;
  const incomingTests = server?.initialTests;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setLoaded(false);
      setTests([]);
      setStorageError(false);
      try {
        if (incomingTests) {
          setTests(incomingTests);
          setLoaded(true);
          return;
        }
        const raw = localStorage.getItem(storageKey);
        storageVersion.current = raw;
        if (raw) setTests(restoreExperiments(raw));
      } catch {
        setStorageError(true);
        setNotice(
          "Saved preview data could not be loaded. It has been preserved. Export the saved data before changing browser storage.",
        );
      }
      setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey, incomingTests]);
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
    else if (!modal) dialog.current?.close();
  }, [modal]);
  const runServer = (
    intent: string,
    payload: Record<string, unknown>,
    message: string,
    closeAfter = true,
  ) => {
    if (!server || networkLock.current) return;
    networkLock.current = true;
    setBusy(true);
    setError("");
    server
      .transact(intent, payload)
      .then((rows) => {
        setTests(rows);
        setNotice(message);
        if (closeAfter) setModal(null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => {
        networkLock.current = false;
        setBusy(false);
      });
  };
  const commit = (next: Experiment[], message: string) => {
    if (server) {
      const added = next.find((t) => !tests.some((old) => old.id === t.id));
      const changed = next.find((t) =>
        tests.some((old) => old.id === t.id && old !== t),
      );
      if (added)
        runServer("save", { setup: added }, "Draft saved to your shop.");
      else if (changed) {
        const old = tests.find((t) => t.id === changed.id)!;
        const intent =
          changed.archived !== old.archived
            ? changed.archived
              ? "archive"
              : "restore"
            : changed.status !== old.status
              ? changed.status === "Active"
                ? old.status === "Draft"
                  ? "start"
                  : "resume"
                : changed.status === "Paused"
                  ? "pause"
                  : "end"
              : "save";
        runServer(
          intent,
          {
            id: old.id,
            version: old.version,
            setup: changed,
            selectedVariant: changed.selectedVariant,
          },
          changed.name + ": change saved.",
        );
      }
      return false;
    }
    try {
      if (next.length > 500) {
        setError(
          "This preview supports up to 500 tests. Export your workspace before creating a new workspace.",
        );
        return false;
      }
      if (localStorage.getItem(storageKey) !== storageVersion.current) {
        setError(
          "This workspace changed in another tab. Refresh before saving so those changes are preserved.",
        );
        return false;
      }
      const serialized = JSON.stringify(next);
      localStorage.setItem(storageKey, serialized);
      storageVersion.current = serialized;
      setTests(next);
      setNotice(message);
      setError("");
      return true;
    } catch {
      setError(
        "Browser storage is unavailable or full. This change was not saved. Export your workspace to back it up.",
      );
      return false;
    }
  };
  const update = (next: Experiment, message: string) =>
    commit(
      tests.map((t) => (t.id === next.id ? next : t)),
      message,
    );
  const open = (next: Modal, test?: Experiment) => {
    setError("");
    setNotice("");
    setSelectedId(test?.id ?? null);
    setModal(next);
  };
  const setup = (test?: Experiment) => {
    setForm(
      test
        ? structuredClone(test)
        : { ...defaults(surface), currency: server?.currency || "USD" },
    );
    open("setup", test);
  };
  const changeStatus = (test: Experiment, status: Status) => {
    if (server && status === "Active") {
      setAcknowledged(false);
      open("start", test);
      return;
    }
    try {
      update(
        transition(test, status, tests),
        `${test.name}: ${status.toLowerCase()} in the local preview.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const setVariant = <K extends keyof Variant>(
    key: VariantKey,
    field: K,
    value: Variant[K],
  ) =>
    setForm((f) => ({
      ...f,
      variants: {
        ...f.variants,
        [key]: { ...f.variants[key], [field]: value },
      },
    }));
  const close = () => {
    setModal(null);
    setError("");
  };
  const switchSurface = (value: Surface) => {
    setSurface(value);
    setTotalCurrency(server?.currency || "USD");
    setFilter("All");
    setQuery("");
    setPage(0);
  };
  const matching = tests
    .filter(
      (t) =>
        t.surface === surface &&
        (filter === "Archived"
          ? t.archived
          : !t.archived && (filter === "All" || t.status === filter)) &&
        `${t.name} ${t.target}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    )
    .sort(
      (a, b) => (ascending ? 1 : -1) * a.createdAt.localeCompare(b.createdAt),
    );
  const pageCount = Math.max(1, Math.ceil(matching.length / 6));
  const currentPage = Math.min(page, pageCount - 1);
  const currencies = [
    ...new Set([
      server?.currency || "USD",
      ...tests.filter((t) => t.surface === surface).map((t) => t.currency),
    ]),
  ];
  const totals = tests
    .filter((t) => t.surface === surface && t.currency === totalCurrency)
    .reduce(
      (sum, t) => {
        const a = metrics(t, "A"),
          b = metrics(t, "B");
        return {
          revenue: sum.revenue + a.revenue + b.revenue,
          orders: sum.orders + a.orders + b.orders,
          visitors: sum.visitors + a.visitors + b.visitors,
        };
      },
      { revenue: 0, orders: 0, visitors: 0 },
    );
  const simulate = (test: Experiment) => {
    try {
      let next = test;
      const prefix = crypto.randomUUID();
      for (let i = 0; i < 200; i++) {
        const visitor = `demo-${prefix}-${i}`;
        next = recordVisit(next, visitor);
        const key = next.visitors[visitor];
        if (i % 20 === 0)
          next = recordOrder(
            next,
            visitor,
            `order-${prefix}-${i}`,
            key === "A" ? 50 : 60,
          );
      }
      update(
        next,
        "Added 200 synthetic visitors and 10 synthetic orders. These figures are for trying the report only.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="ss-dashboard cb-page ab-page">
      <header className="ss-topbar">
        <Link to={homeHref} className="ss-brand">
          <span className="ss-brand-icon">S</span>Section Store
        </Link>
        <div className="ss-topbar-actions">
          <span className="ab-mode">
            {server ? "Shopify workspace" : "Local preview"}
          </span>
          <button className="ss-pill" onClick={() => open("connection")}>
            Connection status
          </button>
        </div>
      </header>
      <main className="ab-main" aria-busy={busy}>
        {busy && (
          <p role="status" className="ab-feedback">
            Saving your change…
          </p>
        )}
        <fieldset disabled={busy} className="ab-workspace">
          <div className="ab-heading">
            <div>
              <h1>A/B Tests</h1>
              <p>
                Find the bundle or cart version that earns more per visitor.
              </p>
            </div>
            <div className="ab-actions">
              <button
                onClick={() => {
                  setSample(sampleExperiment(surface));
                  open("sample");
                }}
              >
                View sample report
              </button>
              <button
                className="cb-dark"
                disabled={!loaded || storageError}
                onClick={() => setup()}
              >
                Create new test
              </button>
            </div>
          </div>
          <div className="ab-surfaces" role="group" aria-label="Test type">
            {(["Bundles", "Carts"] as const).map((item) => (
              <button
                key={item}
                className={surface === item ? "cb-dark" : ""}
                aria-pressed={surface === item}
                onClick={() => switchSurface(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <section className="ab-subscribe">
            <div>
              <strong>
                {server
                  ? server.enabled
                    ? "Shopify measurement and delivery configured"
                    : "Live delivery is disabled until development-store checks pass"
                  : "Build, compare, and learn in a local preview."}
              </strong>
            </div>
            <footer>
              <p>
                {server
                  ? "Tests save to your shop database. Orders are attributed through signed cart data and authenticated Shopify webhooks; refunds reduce revenue."
                  : "Tests and simulated results save in this browser. The Shopify backend and theme extension need your own app connection for live use."}
              </p>
              <button onClick={() => open("connection")}>
                View setup requirements
              </button>
            </footer>
          </section>
          {notice && !modal && (
            <div className="ab-feedback" role="status">
              {notice}
            </div>
          )}
          {error && !modal && (
            <div className="ab-feedback ab-error" role="alert">
              {error}
            </div>
          )}
          <section className="ab-summary" aria-label="Preview totals">
            <div className="ab-summary-heading">
              <div>
                <h2>
                  {server ? "Your tests so far" : "Your preview tests so far"}
                </h2>
                <p>
                  {server ? "Attributed net revenue" : "Simulated totals"} for{" "}
                  {surface.toLowerCase()}, including archived tests. Visitors
                  are summed per test.
                </p>
              </div>
              <label>
                Currency
                <select
                  aria-label="Totals currency"
                  value={totalCurrency}
                  onChange={(e) => setTotalCurrency(e.target.value)}
                >
                  {currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="ab-metrics">
              {[
                ["Net revenue", money(totals.revenue, totalCurrency)],
                [
                  "Revenue per visitor",
                  money(
                    totals.visitors ? totals.revenue / totals.visitors : 0,
                    totalCurrency,
                  ),
                ],
                ["Paid orders", totals.orders.toLocaleString()],
                ["Visitors", totals.visitors.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="ab-table-panel" aria-label="Tests">
            <div className="ab-filters" role="group" aria-label="Test status">
              {["All", "Draft", "Active", "Paused", "Ended", "Archived"].map(
                (item) => (
                  <button
                    key={item}
                    className={filter === item ? "cb-dark" : ""}
                    aria-pressed={filter === item}
                    onClick={() => {
                      setFilter(item);
                      setPage(0);
                    }}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <div className="ab-search">
              <label>
                <span aria-hidden="true">⌕</span>
                <input
                  aria-label="Search tests"
                  placeholder="Search tests or targets"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <button
                type="button"
                aria-label={
                  ascending ? "Sort newest first" : "Sort oldest first"
                }
                aria-pressed={ascending}
                onClick={() => setAscending(!ascending)}
              >
                ⇅
              </button>
              {server && (
                <button
                  onClick={() =>
                    runServer("refresh", {}, "Results refreshed.", false)
                  }
                >
                  Refresh results
                </button>
              )}
              {!server && (
                <>
                  <button onClick={() => importInput.current?.click()}>
                    Import backup
                  </button>
                  <input
                    ref={importInput}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        if (file.size > 10000000)
                          throw new Error(
                            "Choose a backup smaller than 10 MB.",
                          );
                        const restored = restoreExperiments(await file.text());
                        if (
                          restored.some(
                            (t) => t.source === "shopify" || t.serverMetrics,
                          )
                        )
                          throw new Error(
                            "Shopify exports are read-only snapshots. Restore live tests through their original shop database.",
                          );
                        const collisions = restored.filter((t) =>
                          tests.some((old) => old.id === t.id),
                        );
                        if (
                          collisions.some(
                            (t) =>
                              JSON.stringify(t) !==
                              JSON.stringify(
                                tests.find((old) => old.id === t.id),
                              ),
                          )
                        )
                          throw new Error(
                            "Backup versions differ from existing tests. Import into an empty preview workspace to preserve changes.",
                          );
                        commit(
                          [
                            ...tests,
                            ...restored.filter(
                              (t) => !tests.some((old) => old.id === t.id),
                            ),
                          ],
                          "Backup imported; existing tests were preserved.",
                        );
                      } catch (error) {
                        setError((error as Error).message);
                      }
                    }}
                  />
                </>
              )}
              <button
                disabled={!loaded}
                onClick={() => {
                  try {
                    const raw = storageError
                      ? localStorage.getItem(storageKey) || "[]"
                      : JSON.stringify(tests, null, 2);
                    download(
                      server
                        ? "ab-tests-shopify-snapshot.json"
                        : "ab-tests-preview-backup.json",
                      raw,
                      "application/json",
                    );
                  } catch {
                    setError(
                      "Browser storage is unavailable; saved data could not be exported.",
                    );
                  }
                }}
              >
                Export workspace
              </button>
            </div>
            <div className="ab-table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      "Test name",
                      surface === "Bundles" ? "Bundle" : "Cart",
                      "Observed result",
                      "Start date",
                      "Status",
                      "Actions",
                    ].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matching
                    .slice(currentPage * 6, currentPage * 6 + 6)
                    .map((test) => {
                      const result = comparison(test);
                      return (
                        <tr key={test.id}>
                          <td>
                            <button
                              className="ab-name"
                              onClick={() => open("report", test)}
                            >
                              {test.name}
                            </button>
                            <small>
                              {test.currency} · A {test.split}% / B{" "}
                              {100 - test.split}%
                            </small>
                          </td>
                          <td>{test.target}</td>
                          <td>
                            {test.selectedVariant
                              ? `${test.selectedVariant} selected`
                              : result.leader
                                ? `${result.leader} leads · ${money(metrics(test, result.leader).rpv, test.currency)} / visitor`
                                : "Awaiting results"}
                            <small>
                              {server ? "Shopify orders" : "Simulated data"}
                              {test.rolloutVariant
                                ? " · " +
                                  test.rolloutVariant +
                                  (server ? " applied" : " preview rollout")
                                : ""}
                            </small>
                          </td>
                          <td>{date(test.startedAt)}</td>
                          <td>
                            <span
                              className={`ab-badge ab-status-${test.status.toLowerCase()}`}
                            >
                              {test.archived ? "Archived" : test.status}
                            </span>
                          </td>
                          <td>
                            <div className="ab-row-actions">
                              {test.archived ? (
                                <button
                                  onClick={() =>
                                    update(
                                      { ...test, archived: false },
                                      "Test restored.",
                                    )
                                  }
                                >
                                  Restore
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => open("report", test)}>
                                    Report
                                  </button>
                                  {test.status === "Draft" && (
                                    <>
                                      <button onClick={() => setup(test)}>
                                        Edit
                                      </button>
                                      <button
                                        onClick={() =>
                                          changeStatus(test, "Active")
                                        }
                                      >
                                        {server
                                          ? "Review & start"
                                          : "Start preview"}
                                      </button>
                                    </>
                                  )}
                                  {test.status === "Active" && (
                                    <button
                                      onClick={() =>
                                        changeStatus(test, "Paused")
                                      }
                                    >
                                      Pause
                                    </button>
                                  )}
                                  {test.status === "Paused" && (
                                    <button
                                      onClick={() =>
                                        changeStatus(test, "Active")
                                      }
                                    >
                                      Resume
                                    </button>
                                  )}
                                  {["Active", "Paused"].includes(
                                    test.status,
                                  ) && (
                                    <button
                                      onClick={() => {
                                        setWinner("none");
                                        open("end", test);
                                      }}
                                    >
                                      End
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      const clone = createExperiment({
                                        ...test,
                                        name: `${test.name.slice(0, 94)} copy`,
                                      });
                                      commit(
                                        [...tests, clone],
                                        "Duplicated as a fresh draft without results.",
                                      );
                                    }}
                                  >
                                    Duplicate
                                  </button>
                                  {test.status === "Ended" && (
                                    <button
                                      onClick={() => {
                                        setWinner(test.selectedVariant || "A");
                                        setAcknowledged(false);
                                        open("rollout", test);
                                      }}
                                    >
                                      {test.rolloutVariant || test.needsCleanup
                                        ? "Manage rollout"
                                        : server
                                          ? "Apply version"
                                          : "Preview rollout"}
                                    </button>
                                  )}
                                  {["Draft", "Ended"].includes(test.status) &&
                                    !test.rolloutVariant &&
                                    !test.needsCleanup && (
                                      <button
                                        onClick={() => open("archive", test)}
                                      >
                                        Archive
                                      </button>
                                    )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {!matching.length && (
              <div className="ab-empty" role="status">
                <div className="ab-empty-icon" aria-hidden="true">
                  A / B
                </div>
                <h2>
                  {!loaded
                    ? "Loading saved tests…"
                    : query
                      ? "No matching tests"
                      : filter === "All"
                        ? `Create your first ${surface === "Bundles" ? "bundle" : "cart"} test`
                        : `No ${filter.toLowerCase()} tests`}
                </h2>
                <p>
                  {query
                    ? `No test matches “${query}”.`
                    : "Choose two versions, set a traffic split, then compare revenue per visitor."}
                </p>
                {query ? (
                  <button onClick={() => setQuery("")}>Clear search</button>
                ) : (
                  filter === "All" && (
                    <button
                      className="cb-dark"
                      disabled={!loaded || storageError}
                      onClick={() => setup()}
                    >
                      Create new test
                    </button>
                  )
                )}
              </div>
            )}
            {matching.length > 0 && (
              <footer className="ab-table-footer">
                <span>
                  {matching.length} tests · Page {currentPage + 1} of{" "}
                  {pageCount}
                </span>
                <div>
                  <button
                    disabled={!currentPage}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage + 1 >= pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </footer>
            )}
          </section>
          <p className="ab-footnote">
            Change one meaningful variable at a time. A higher observed result
            is a lead, and needs enough traffic and a sound statistical analysis
            before a rollout decision.
          </p>
        </fieldset>
      </main>
      <dialog
        ref={dialog}
        className="cb-dialog ab-dialog"
        aria-labelledby="ab-modal-title"
        onCancel={close}
        onClose={() => setModal(null)}
      >
        <header>
          <h2 id="ab-modal-title">
            {modal === "setup"
              ? selected
                ? "Edit test draft"
                : "Create new test"
              : modal === "sample"
                ? "Sample report"
                : modal === "report"
                  ? selected?.name
                  : modal === "end"
                    ? "End test"
                    : modal === "archive"
                      ? "Archive test"
                      : modal === "start"
                        ? "Review live test"
                        : modal === "rollout"
                          ? "Apply a version"
                          : "Connection status"}
          </h2>
          <button aria-label="Close dialog" onClick={close}>
            ×
          </button>
        </header>
        <div className="cb-dialog-body">
          <fieldset disabled={busy} className="ab-workspace">
            {modal === "setup" && (
              <form
                className="ab-setup"
                onSubmit={(e) => {
                  e.preventDefault();
                  const validation = validateSetup(form);
                  if (validation) {
                    setError(validation);
                    return;
                  }
                  if (selected && selected.status !== "Draft") {
                    setError(
                      "Only drafts can be edited. Duplicate this test to try new settings.",
                    );
                    return;
                  }
                  const next = selected
                    ? {
                        ...selected,
                        ...structuredClone(form),
                        name: form.name.trim(),
                        target: form.target.trim(),
                        hypothesis: form.hypothesis.trim(),
                      }
                    : createExperiment(form);
                  if (
                    commit(
                      selected
                        ? tests.map((t) => (t.id === selected.id ? next : t))
                        : [...tests, next],
                      "Test draft saved in this browser. Start preview from the test list.",
                    )
                  )
                    close();
                }}
              >
                <div className="ab-form-grid">
                  <label>
                    Test name
                    <input
                      value={form.name}
                      required
                      maxLength={100}
                      placeholder="Free shipping goal · 100 vs 80"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Test type
                    <select
                      value={form.surface}
                      onChange={(e) => {
                        const value = e.target.value as Surface;
                        setForm((f) => ({
                          ...defaults(value),
                          name: f.name,
                          hypothesis: f.hypothesis,
                          currency: f.currency,
                        }));
                        setSurface(value);
                      }}
                    >
                      {(["Bundles", "Carts"] as const).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  {form.surface === "Bundles"
                    ? "Bundle / product page name"
                    : "Cart name"}
                  <input
                    value={form.target}
                    maxLength={100}
                    required
                    onChange={(e) =>
                      setForm((f) => ({ ...f, target: e.target.value }))
                    }
                  />
                  <small>
                    {server
                      ? "A descriptive label. Choose the actual Shopify product below for bundle delivery."
                      : "A preview target name. Real products are selectable in the Shopify workspace."}
                  </small>
                </label>
                {server && form.surface === "Bundles" && (
                  <label>
                    Product to test
                    <button type="button" onClick={() => browseProducts()}>
                      Browse all Shopify products
                    </button>
                    <select
                      required
                      value={form.productId || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          productId: e.target.value,
                          productTitle: products.find(
                            (p) => p.id === e.target.value,
                          )?.title,
                        }))
                      }
                    >
                      <option value="">Select a published product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                    <small>
                      Place the Bundle A/B app block on this product template in
                      the theme editor.
                    </small>
                  </label>
                )}
                {server &&
                  form.surface === "Carts" &&
                  (form.variants.A.upsell || form.variants.B.upsell) && (
                    <>
                      <label>
                        Recommended product
                        <button
                          type="button"
                          onClick={() => browseProducts(true)}
                        >
                          Browse all Shopify products
                        </button>
                        <select
                          required
                          value={form.upsellProductId || ""}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              upsellProductId: e.target.value,
                              upsellVariantId: "",
                            }))
                          }
                        >
                          <option value="">Select a published product</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Recommended variant
                        <select
                          required
                          value={form.upsellVariantId || ""}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              upsellVariantId: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select a variant</option>
                          {products
                            .find((p) => p.id === form.upsellProductId)
                            ?.variants.nodes.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.title} · {v.price} {server.currency}
                              </option>
                            ))}
                        </select>
                      </label>
                    </>
                  )}
                <label>
                  What are you testing?
                  <textarea
                    value={form.hypothesis}
                    required
                    maxLength={500}
                    rows={2}
                    placeholder="Lowering the shipping goal may increase paid orders without reducing revenue per visitor."
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hypothesis: e.target.value }))
                    }
                  />
                </label>
                <div className="ab-form-grid">
                  <label>
                    Traffic split
                    <select
                      value={form.split}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          split: Number(e.target.value),
                        }))
                      }
                    >
                      {[50, 25, 75].map((n) => (
                        <option key={n} value={n}>
                          A {n}% / B {100 - n}%
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Currency
                    <select
                      value={form.currency}
                      disabled={!!server}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, currency: e.target.value }))
                      }
                    >
                      {[
                        ...new Set([
                          server?.currency || "USD",
                          "USD",
                          "GBP",
                          "EUR",
                          "PKR",
                        ]),
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Visitor target per variant
                    <input
                      type="number"
                      min={100}
                      max={1000000}
                      step={1}
                      required
                      value={form.minimumVisitors}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          minimumVisitors: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Minimum elapsed days
                    <input
                      type="number"
                      min={1}
                      max={90}
                      step={1}
                      required
                      value={form.minimumDays}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          minimumDays: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="ab-variant-grid">
                  {(["A", "B"] as const).map((key) => (
                    <fieldset key={key}>
                      <legend>
                        Variant {key} · {key === "A" ? "Control" : "Challenger"}
                      </legend>
                      <label>
                        Version name
                        <input
                          required
                          maxLength={60}
                          value={form.variants[key].name}
                          onChange={(e) =>
                            setVariant(key, "name", e.target.value)
                          }
                        />
                      </label>
                      {form.surface === "Bundles" ? (
                        <div className="ab-form-grid">
                          <label>
                            Quantity
                            <input
                              type="number"
                              min={1}
                              max={100}
                              step={1}
                              required
                              value={form.variants[key].quantity}
                              onChange={(e) =>
                                setVariant(
                                  key,
                                  "quantity",
                                  Number(e.target.value),
                                )
                              }
                            />
                          </label>
                          <label>
                            Discount %
                            <input
                              type="number"
                              min={0}
                              max={90}
                              step="0.1"
                              required
                              value={form.variants[key].discount}
                              onChange={(e) =>
                                setVariant(
                                  key,
                                  "discount",
                                  Number(e.target.value),
                                )
                              }
                            />
                          </label>
                        </div>
                      ) : (
                        <>
                          <label>
                            Free-shipping threshold ({form.currency})
                            <input
                              type="number"
                              min={0}
                              max={100000}
                              step="0.01"
                              required
                              value={form.variants[key].reward}
                              onChange={(e) =>
                                setVariant(
                                  key,
                                  "reward",
                                  Number(e.target.value),
                                )
                              }
                            />
                            <small>0 hides the reward bar.</small>
                          </label>
                          <label className="ab-checkbox">
                            <input
                              type="checkbox"
                              checked={form.variants[key].upsell}
                              onChange={(e) =>
                                setVariant(key, "upsell", e.target.checked)
                              }
                            />
                            Show product upsell
                          </label>
                          <label>
                            Checkout button label
                            <input
                              required
                              maxLength={60}
                              value={form.variants[key].checkout}
                              onChange={(e) =>
                                setVariant(key, "checkout", e.target.value)
                              }
                            />
                          </label>
                        </>
                      )}
                      <label className="ab-color-field">
                        Button color
                        <input
                          type="color"
                          value={form.variants[key].color}
                          onChange={(e) =>
                            setVariant(key, "color", e.target.value)
                          }
                        />
                      </label>
                      <VariantPreview
                        label={key}
                        variant={form.variants[key]}
                        surface={form.surface}
                        currency={form.currency}
                      />
                    </fieldset>
                  ))}
                </div>
                <small>
                  Preview settings freeze when started. Duplicate a started test
                  to change settings. No storefront changes are made.
                </small>
                {error && (
                  <p role="alert" className="ab-feedback ab-error">
                    {error}
                  </p>
                )}
                <div className="ab-dialog-actions">
                  <button type="button" onClick={close}>
                    Cancel
                  </button>
                  <button className="cb-dark">Save draft</button>
                </div>
              </form>
            )}
            {(modal === "report" || modal === "sample") && report && (
              <>
                <Report experiment={report} sample={modal === "sample"} />
                {modal === "report" && selected && (
                  <>
                    <div className="ab-dialog-actions">
                      <button
                        onClick={() =>
                          download(
                            "ab-test-preview-report.csv",
                            reportCSV(selected),
                            "text/csv;charset=utf-8",
                          )
                        }
                      >
                        Export report CSV
                      </button>
                      {selected.status === "Draft" && !selected.archived && (
                        <button
                          className="cb-dark"
                          onClick={() => changeStatus(selected, "Active")}
                        >
                          {server ? "Review & start" : "Start preview"}
                        </button>
                      )}
                    </div>
                    {!server &&
                      selected.status === "Active" &&
                      !selected.archived && (
                        <section className="ab-simulator">
                          <h3>Try the event tracking</h3>
                          <p>
                            These controls add synthetic data to this local
                            test. Returning visitor IDs keep their variant;
                            duplicate order IDs are rejected.
                          </p>
                          <div className="ab-form-grid">
                            <label>
                              Demo visitor ID
                              <input
                                maxLength={100}
                                value={visitorId}
                                onChange={(e) => setVisitorId(e.target.value)}
                              />
                            </label>
                            <div className="ab-simulation-action">
                              <button
                                onClick={() => {
                                  try {
                                    const next = recordVisit(
                                      selected,
                                      visitorId.trim(),
                                    );
                                    update(
                                      next,
                                      `Visitor assigned to ${next.visitors[visitorId.trim()]}. Returning visits count once.`,
                                    );
                                  } catch (e) {
                                    setError((e as Error).message);
                                  }
                                }}
                              >
                                Record demo visit
                              </button>
                              <small>
                                {Object.hasOwn(
                                  selected.visitors,
                                  visitorId.trim(),
                                )
                                  ? `Assigned variant: ${selected.visitors[visitorId.trim()]}`
                                  : "Visit not recorded yet"}
                              </small>
                            </div>
                            <label>
                              Demo order ID
                              <input
                                value={orderId}
                                maxLength={100}
                                onChange={(e) => setOrderId(e.target.value)}
                              />
                            </label>
                            <label>
                              Paid order value ({selected.currency})
                              <input
                                type="number"
                                min="0.01"
                                max={1000000}
                                step="0.01"
                                value={amount}
                                onChange={(e) =>
                                  setAmount(Number(e.target.value))
                                }
                              />
                            </label>
                          </div>
                          <div className="ab-dialog-actions">
                            <button
                              onClick={() => {
                                try {
                                  update(
                                    recordOrder(
                                      selected,
                                      visitorId.trim(),
                                      orderId.trim(),
                                      amount,
                                    ),
                                    "Synthetic paid order recorded.",
                                  );
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                              }}
                            >
                              Record demo paid order
                            </button>
                            <button onClick={() => simulate(selected)}>
                              Generate 200 demo visits
                            </button>
                          </div>
                        </section>
                      )}
                    {!server &&
                      ["Paused", "Ended"].includes(selected.status) && (
                        <p className="ab-insight">
                          Event recording is disabled while{" "}
                          {selected.status.toLowerCase()}.{" "}
                          {selected.status === "Paused"
                            ? "Resume from the test list to continue."
                            : "Duplicate this test to start a new experiment."}
                        </p>
                      )}
                  </>
                )}
                {modal === "sample" && (
                  <small>
                    This illustrative report contains 1,000 visitors per
                    variant. A earned $2,000 and B earned $2,500: a 25% observed
                    lift. It is separate from your saved tests.
                  </small>
                )}
              </>
            )}
            {modal === "start" && selected && server && (
              <>
                <p>
                  Start <strong>{selected.name}</strong> with A receiving{" "}
                  {selected.split}% of eligible visitors. Configurations freeze
                  when the test starts.
                </p>
                <p>
                  The app creates native{" "}
                  {selected.surface === "Bundles"
                    ? "product quantity discounts"
                    : "free-shipping discount codes"}{" "}
                  for the configured offers. One test or rollout can own the
                  storefront at a time.
                </p>
                <p>
                  Enable the{" "}
                  {selected.surface === "Bundles"
                    ? "Bundle A/B block on the selected product template"
                    : "Cart A/B app embed"}{" "}
                  in your theme editor. Consenting visitors in{" "}
                  {selected.currency} are measured. New assignment stops after{" "}
                  {selected.minimumDays} calendar days; late orders remain
                  eligible for seven more days.
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />{" "}
                  I reviewed the offers, app block placement, discounts and
                  traffic split.
                </label>
                <div className="ab-dialog-actions">
                  <button onClick={close}>Cancel</button>
                  <button
                    className="cb-dark"
                    disabled={
                      !acknowledged ||
                      !server.enabled ||
                      !!server.missingScopes.length ||
                      !server.planEligible
                    }
                    onClick={() =>
                      runServer(
                        selected.status === "Draft" ? "start" : "resume",
                        { id: selected.id, version: selected.version },
                        "Test started. Verify both versions in your development store.",
                      )
                    }
                  >
                    Start live test
                  </button>
                </div>
                {(!server.enabled ||
                  server.missingScopes.length > 0 ||
                  !server.planEligible) && (
                  <p role="status">
                    Resolve the connection requirements before starting. Check
                    Connection status.
                  </p>
                )}
              </>
            )}
            {modal === "rollout" && selected && (
              <>
                <p>
                  {server
                    ? "Deliver one version to all eligible visitors for 30 days. This changes the app block offer and its native discounts."
                    : "Preview the chosen version in this workspace. This does not publish to Shopify."}
                </p>
                {selected.rolloutUntil && (
                  <p>Current rollout expires {date(selected.rolloutUntil)}.</p>
                )}
                <label>
                  Version
                  <select
                    value={winner === "none" ? "A" : winner}
                    onChange={(e) => setWinner(e.target.value as VariantKey)}
                  >
                    <option value="A">A · {selected.variants.A.name}</option>
                    <option value="B">B · {selected.variants.B.name}</option>
                  </select>
                </label>
                <VariantPreview
                  variant={selected.variants[winner === "B" ? "B" : "A"]}
                  surface={selected.surface}
                  currency={selected.currency}
                  label={winner === "B" ? "B" : "A"}
                />
                <p>
                  Check traffic balance, attribution maturity and the report
                  interval before applying a version. Rollout purchases are
                  excluded from experiment results.
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />{" "}
                  I reviewed this version and want to apply it.
                </label>
                <div className="ab-dialog-actions">
                  <button onClick={close}>Cancel</button>
                  {(selected.rolloutVariant || selected.needsCleanup) && (
                    <button
                      onClick={() =>
                        server
                          ? runServer(
                              "stop-rollout",
                              { id: selected.id, version: selected.version },
                              "Rollout stopped.",
                            )
                          : update(
                              { ...selected, rolloutVariant: null },
                              "Preview rollout stopped.",
                            ) && close()
                      }
                    >
                      Stop rollout
                    </button>
                  )}
                  <button
                    className="cb-dark"
                    disabled={!acknowledged || (!!server && !server.enabled)}
                    onClick={() =>
                      server
                        ? runServer(
                            "rollout",
                            {
                              id: selected.id,
                              version: selected.version,
                              variant: winner === "B" ? "B" : "A",
                              acknowledged,
                            },
                            "Version applied for 30 days.",
                          )
                        : update(
                            {
                              ...selected,
                              rolloutVariant: winner === "B" ? "B" : "A",
                            },
                            "Preview rollout saved. Shopify was not changed.",
                          ) && close()
                    }
                  >
                    {server ? "Apply to storefront" : "Apply preview version"}
                  </button>
                </div>
              </>
            )}
            {modal === "connection" && server && (
              <>
                <span className="ab-badge">
                  Shopify workspace ·{" "}
                  {server.enabled ? "delivery enabled" : "delivery disabled"}
                </span>
                <p>
                  Real products, tenant-scoped storage, signed app-proxy
                  delivery, native discounts, paid-order webhooks and refunds
                  are implemented.
                </p>
                {server.missingScopes.length > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        await server.requestPermissions();
                        setNotice(
                          "Permission request completed. Refresh this page to check the current grants.",
                        );
                      } catch (error) {
                        setError((error as Error).message);
                      }
                    }}
                  >
                    Request A/B permissions
                  </button>
                )}
                {server.privacyRequests.length > 0 && (
                  <button
                    onClick={() =>
                      download(
                        "ab-customer-data-requests.json",
                        JSON.stringify(server.privacyRequests, null, 2),
                        "application/json",
                      )
                    }
                  >
                    Export received customer data requests
                  </button>
                )}
                <ul className="ab-connection-list">
                  <li>
                    Permissions:{" "}
                    {server.missingScopes.length
                      ? server.missingScopes.join(", ")
                      : "approved"}
                    .
                  </li>
                  <li>
                    Plan eligibility:{" "}
                    {server.planEligible
                      ? "eligible"
                      : "required plan unavailable"}
                    .
                  </li>
                  <li>
                    Live gate:{" "}
                    {server.enabled
                      ? "enabled"
                      : "AB_LIVE_ENABLED is false; complete development-store checks before enabling"}
                    .
                  </li>
                  <li>
                    Theme placement: add Bundle A/B to the product template or
                    enable Cart A/B, then verify the actual storefront.
                  </li>
                  <li>
                    Test orders:{" "}
                    {server.testOrdersIncluded
                      ? "included for development testing"
                      : "excluded from production totals"}
                    .
                  </li>
                </ul>
                <a href={server.storefrontUrl} target="_blank" rel="noreferrer">
                  Open storefront
                </a>
              </>
            )}
            {modal === "connection" && !server && (
              <>
                <span className="ab-badge">
                  Local preview · integration pending
                </span>
                <p>
                  The experiment manager works in this browser. Your live
                  Shopify store is not receiving variants or sending order data
                  to this page.
                </p>
                <ul className="ab-connection-list">
                  <li>
                    <strong>Working now</strong> — draft setup, variant
                    previews, lifecycle controls, stable demo assignment,
                    duplicate-order protection, reports, browser storage,
                    exports.
                  </li>
                  <li>
                    <strong>Store configuration</strong> — connect your own app,
                    choose real bundle/cart designs and product targets, and
                    check app-plan eligibility.
                  </li>
                  <li>
                    <strong>Storefront delivery</strong> — theme app extension
                    renders frozen A/B configurations and keeps each eligible
                    visitor on one version.
                  </li>
                  <li>
                    <strong>Measurement</strong> — consent-aware pixel exposure
                    events, order attribution, verified paid-order webhooks,
                    refund handling and currency rules.
                  </li>
                  <li>
                    <strong>Merchant rollout</strong> — tenant-scoped database,
                    reliable statistics, monitored rollout, and applying the
                    selected version to the store.
                  </li>
                </ul>
                <small>
                  No subscription, charge, or theme change is created by this
                  preview.
                </small>
              </>
            )}
            {modal === "end" && selected && (
              <>
                <p>
                  Stop recording events for <strong>{selected.name}</strong>.
                  Results are retained. Selecting a version records your
                  decision. Apply it separately from the ended test.
                </p>
                <label>
                  Record your decision
                  <select
                    value={winner}
                    onChange={(e) => setWinner(e.target.value as typeof winner)}
                  >
                    <option value="none">
                      End without selecting a version
                    </option>
                    <option value="A">
                      Select A · {selected.variants.A.name}
                    </option>
                    <option value="B">
                      Select B · {selected.variants.B.name}
                    </option>
                  </select>
                </label>
                <div className="ab-insight">
                  {server
                    ? "New assignment stops immediately. Existing attributed orders may arrive for seven days; the storefront slot stays reserved for that period."
                    : "Ending this preview does not publish a design to Shopify."}
                </div>
                <div className="ab-dialog-actions">
                  <button onClick={close}>Cancel</button>
                  <button
                    className="cb-dark"
                    onClick={() => {
                      try {
                        const next = transition(selected, "Ended", tests);
                        if (
                          update(
                            {
                              ...next,
                              selectedVariant:
                                winner === "none" ? null : winner,
                            },
                            "Preview test ended. Results and local decision retained.",
                          )
                        )
                          close();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    End test
                  </button>
                </div>
              </>
            )}
            {modal === "archive" && selected && (
              <>
                <p>
                  Move <strong>{selected.name}</strong> to Archived. Its results
                  stay in preview totals and you can restore it anytime.
                </p>
                <div className="ab-dialog-actions">
                  <button onClick={close}>Cancel</button>
                  <button
                    className="cb-dark"
                    onClick={() => {
                      if (
                        update(
                          { ...selected, archived: true },
                          "Test archived. Restore it from the Archived tab.",
                        )
                      )
                        close();
                    }}
                  >
                    Archive test
                  </button>
                </div>
              </>
            )}
            {busy && <p role="status">Saving your change…</p>}
            {error && modal !== "setup" && (
              <p className="ab-feedback ab-error" role="alert">
                {error}
              </p>
            )}
            {notice && modal && (
              <p className="ab-feedback" role="status">
                {notice}
              </p>
            )}
          </fieldset>
        </div>
      </dialog>
    </div>
  );
}
