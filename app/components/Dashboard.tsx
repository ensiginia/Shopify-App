import { useEffect, useRef, useState } from "react";
import "./dashboard.css";
import DashboardExtras from "./DashboardExtras";
import StoreAudit from "./StoreAudit";

type IconName =
  "search" | "arrow" | "bell" | "plus" | "close" | "check" | "dots";
function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h15M14 7l5 5-5 5" />
      </>
    ),
    bell: (
      <>
        <path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9Z" />
        <path d="M10 20h4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 7v10M7 12h10" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    dots: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
  };
  return (
    <svg
      className={`ss-icon ${className}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function AppTile({ plus = false }: { plus?: boolean }) {
  return (
    <span
      className={`ss-app-tile ${plus ? "ss-app-tile-plus" : ""}`}
      aria-hidden="true"
    >
      <span>{plus ? "+" : "S"}</span>
    </span>
  );
}

const sections = [
  {
    name: "Customer testimonials",
    category: "Trust",
    description: "Let happy customers do the talking.",
    price: "$9",
    preview: "reviews",
    recommended: true,
  },
  {
    name: "Frequently asked questions",
    category: "Conversion",
    description: "Answer questions before they become doubts.",
    price: "$9",
    preview: "faq",
    recommended: true,
  },
  {
    name: "Product benefits",
    category: "Conversion",
    description: "Show what makes your products special.",
    price: "$9",
    preview: "benefits",
    recommended: true,
  },
  {
    name: "Image with text",
    category: "Storytelling",
    description: "Bring your brand story to life.",
    price: "$9",
    preview: "story",
    recommended: false,
  },
  {
    name: "Featured collection",
    category: "Conversion",
    description: "Give your bestsellers a place to shine.",
    price: "$9",
    preview: "collection",
    recommended: false,
  },
  {
    name: "Scrolling announcement",
    category: "Storytelling",
    description: "Make your next announcement stand out.",
    price: "$9",
    preview: "announcement",
    recommended: false,
  },
];

function SectionPreview({ kind }: { kind: string }) {
  return (
    <div className={`ss-section-preview ss-preview-${kind}`} aria-hidden="true">
      {kind === "reviews" ? (
        <>
          <span className="ss-preview-stars">★★★★★</span>
          <span className="ss-preview-line" />
          <div className="ss-mini-reviews">
            {[1, 2, 3].map((n) => (
              <span key={n}>
                <i />
                <b />
                <b />
              </span>
            ))}
          </div>
        </>
      ) : kind === "faq" ? (
        <>
          <strong>Good questions. Clear answers.</strong>
          {[1, 2, 3].map((n) => (
            <span className="ss-mini-faq" key={n}>
              <i />+
            </span>
          ))}
        </>
      ) : kind === "benefits" ? (
        <>
          <strong>A little more to love.</strong>
          <div className="ss-mini-benefits">
            {[1, 2, 3].map((n) => (
              <span key={n}>
                <Icon name="check" />
                <b />
                <i />
              </span>
            ))}
          </div>
        </>
      ) : kind === "story" ? (
        <>
          <span className="ss-mini-photo" />
          <div>
            <strong>Made with care.</strong>
            <span className="ss-preview-line" />
            <span className="ss-preview-line" />
          </div>
        </>
      ) : kind === "collection" ? (
        <>
          <strong>Your new favorites.</strong>
          <div className="ss-mini-products">
            <i />
            <i />
            <i />
          </div>
        </>
      ) : (
        <>
          <span>GOOD THINGS ARE COMING ✦</span>
          <span>MADE FOR EVERY DAY ✦</span>
        </>
      )}
    </div>
  );
}

type Panel = "audit" | "catalog" | "trial" | "help" | null;

export default function Dashboard({
  onExplore,
  onConversion,
  onBundles,
  onCart,
  onAI,
  auditLive = false,
  onAuditBrowse,
  onAuditPermissions,
}: { onExplore?: () => void; onConversion?: () => void; onBundles?: () => void; onCart?: () => void; onAI?: (how?: boolean) => void; auditLive?: boolean; onAuditBrowse?: (query: string) => void; onAuditPermissions?: () => Promise<void> } = {}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [auditStage, setAuditStage] = useState<"setup" | "results">("setup");
  const [auditTheme, setAuditTheme] = useState("live");
  const [notifications, setNotifications] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All sections");
  const [toast, setToast] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const visibleSections = sections.filter(
    (section) =>
      (category === "All sections" || section.category === category) &&
      section.name.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (panel && panel !== "audit" && dialog && !dialog.open) dialog.showModal();
    if (!panel && dialog?.open) dialog.close();
  }, [panel]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openCatalog() {
    if (onExplore) {
      onExplore();
      return;
    }
    setQuery("");
    setCategory("All sections");
    setPanel("catalog");
  }

  return (
    <div className="ss-dashboard">
      <header className="ss-topbar">
        <a
          className="ss-brand"
          href="#dashboard"
          aria-label="Section Store dashboard"
        >
          <span className="ss-brand-icon">S</span>
          <span>Section Store</span>
        </a>
        <div className="ss-topbar-actions">
          <button className="ss-pill" onClick={() => setPanel("trial")}>
            Try Plus Free
          </button>
          <details className="ss-more-menu">
            <summary aria-label="More options">
              <Icon name="dots" />
            </summary>
            <div className="ss-menu">
              <button onClick={() => setPanel("help")}>Help & support</button>
              <button
                onClick={() =>
                  setToast("You're viewing the dashboard design prototype.")
                }
              >
                About this prototype
              </button>
            </div>
          </details>
        </div>
      </header>

      <main className="ss-main" id="dashboard">
        <section className="ss-welcome" aria-label="Welcome">
          <div>
            <h1>
              Hi, Wild Soul Brand <span className="ss-wave">👋</span>
            </h1>
            <p>
              Here is all you need to design a beautiful high converting store.
            </p>
          </div>
          <div className="ss-welcome-actions">
            <button
              className="ss-button ss-button-primary"
              onClick={openCatalog}
            >
              <Icon name="search" />
              Explore all sections
            </button>
            <div className="ss-notification-wrap">
              <button
                className="ss-notification-button"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Icon name="bell" />
              </button>
              {notifications && (
                <aside className="ss-notification-panel">
                  <div>
                    <strong>Notifications</strong>
                    <button
                      className="ss-icon-button"
                      aria-label="Close notifications"
                      onClick={() => setNotifications(false)}
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                  <p>You’re all caught up.</p>
                  <span>New sections and store tips will appear here.</span>
                </aside>
              )}
            </div>
          </div>
        </section>

        <section className="ss-audit" aria-labelledby="ss-audit-heading">
          <h2 id="ss-audit-heading">Store audit</h2>
          <div className="ss-audit-banner">
            <AppTile />
            <div className="ss-audit-copy">
              <div>
                <h3>Top 3 high-impact sections missing from your store</h3>
                <span className="ss-badge">NEW</span>
              </div>
              <p>Takes ~60 seconds. Ranked by revenue impact.</p>
            </div>
            <button
              className="ss-button ss-button-primary ss-show-button"
              onClick={() => { setAuditStage("setup"); setPanel("audit"); }}
            >
              Show me
              <Icon name="arrow" />
            </button>
          </div>
        </section>

        <section className="ss-plan-section" aria-labelledby="ss-plan-heading">
          <h2 id="ss-plan-heading">No sections yet? Start with Plus</h2>
          <p className="ss-plan-description">
            29 premium sections to build your store, conversion blocks, bundles,
            cart drawer, and AI setup — all in one plan.
          </p>
          <div className="ss-plan-grid">
            <article className="ss-plus-card">
              <div className="ss-plus-heading">
                <div>
                  <AppTile plus />
                  <h3>Section Store Plus</h3>
                </div>
                <span className="ss-badge">Recommended</span>
              </div>
              <p>The full conversion toolkit in one plan.</p>
              <ul className="ss-benefit-list">
                <li>
                  <span className="ss-benefit-icon">
                    <Icon name="plus" />
                  </span>
                  <div>
                    <strong>29 curated sections included</strong>
                    <p>Design your whole store with these</p>
                  </div>
                </li>
                <li>
                  <span className="ss-benefit-icon">
                    <Icon name="plus" />
                  </span>
                  <div>
                    <strong>Conversion + AOV toolkit</strong>
                    <p>Bundles, Cart Drawer, Conversion Blocks and upsells.</p>
                  </div>
                </li>
                <li>
                  <span className="ss-benefit-icon">
                    <Icon name="plus" />
                  </span>
                  <div>
                    <strong>14-day free trial</strong>
                    <p>Cancel anytime.</p>
                  </div>
                </li>
              </ul>
              <div className="ss-plan-card-footer">
                <button
                  className="ss-button ss-button-primary ss-button-full"
                  onClick={() => setPanel("trial")}
                >
                  Try 14 days free
                </button>
                <p>Then $15/month. Cancel anytime.</p>
              </div>
            </article>
            <article className="ss-individual-card">
              <h3>Only need sections?</h3>
              <p>
                Buy individual sections as you need them. Yours forever — no
                Plus plan, no Conversion + AOV toolkit.
              </p>
              <button
                className="ss-button ss-button-secondary ss-button-full"
                onClick={openCatalog}
              >
                <Icon name="search" />
                Explore sections
              </button>
            </article>
          </div>
          <p className="ss-review-line">
            <span aria-hidden="true">★</span> 4.9 from 2,900+ reviews · Expert
            human support
          </p>
        </section>
        <DashboardExtras
          onAI={onAI}
          onCart={onCart}
          onBundles={onBundles}
          onConversion={onConversion}
          onExplore={openCatalog}
          onTrial={() => setPanel("trial")}
          resourceLive={auditLive}
          onResourcePermissions={onAuditPermissions}
          onHelp={() => setPanel("help")}
        />
      </main>

      {panel === "audit" && <StoreAudit live={auditLive} onPermissions={onAuditPermissions} onClose={() => setPanel(null)} onBrowse={search => { setPanel(null); if (onAuditBrowse) onAuditBrowse(search); else { setQuery(search); setCategory("All sections"); setPanel("catalog"); } }} />}
      <dialog
        className={`ss-dialog ${panel === "catalog" || panel === "audit" ? "ss-dialog-wide" : ""}`}
        ref={dialogRef}
        onCancel={() => setPanel(null)}
        onClose={() => setPanel(null)}
        aria-labelledby="ss-dialog-title"
      >
        <div className="ss-dialog-header">
          <div>
            <span className="ss-eyebrow">SECTION STORE</span>
            <h2 id="ss-dialog-title">
              {panel === "audit"
                ? (auditStage === "setup" ? "Run audit" : "Your store’s next big wins")
                : panel === "catalog"
                  ? "Find your next section"
                  : panel === "trial"
                    ? "Meet your full conversion toolkit"
                    : "We're here to help"}
            </h2>
          </div>
          <button
            className="ss-icon-button"
            aria-label="Close dialog"
            onClick={() => setPanel(null)}
          >
            <Icon name="close" />
          </button>
        </div>
        {panel === "audit" && auditStage === "setup" && (
          <div className="ss-dialog-body ss-audit-setup">
            <p>We will analyze your homepage and top product page, then recommend the 3 section categories that will make the biggest difference.</p>
            <label htmlFor="ss-audit-theme">Theme</label>
            <select id="ss-audit-theme" value={auditTheme} onChange={(event) => setAuditTheme(event.target.value)}>
              <option value="live">Demo theme - Live</option>
              <option value="draft">Demo theme - Draft</option>
            </select>
            <h3>Pages analyzed</h3>
            <p className="ss-audit-muted">Homepage and top product page.</p>
            <p className="ss-demo-note">Prototype preview: themes and recommendations are sample data. Your Shopify store is not scanned.</p>
            <div className="ss-audit-footer">
              <button className="ss-button ss-button-secondary" onClick={() => setPanel(null)}>Cancel</button>
              <button className="ss-button ss-button-primary" onClick={() => setAuditStage("results")}>Start audit</button>
            </div>
          </div>
        )}
        {panel === "audit" && auditStage === "results" && (
          <div className="ss-dialog-body">
            <p className="ss-dialog-intro">
              Three small additions. A more confident shopping experience.
            </p>
            <div className="ss-demo-note">
              Sample audit for this design prototype.
            </div>
            <div className="ss-audit-results">
              {sections
                .filter((section) => section.recommended)
                .map((section, index) => (
                  <article key={section.name}>
                    <span className="ss-rank">0{index + 1}</span>
                    <div>
                      <h3>{section.name}</h3>
                      <p>{section.description}</p>
                      <span className="ss-impact">
                        {index === 0
                          ? "Build customer trust"
                          : index === 1
                            ? "Reduce purchase hesitation"
                            : "Highlight your value"}
                      </span>
                    </div>
                    <button
                      className="ss-button ss-button-secondary"
                      onClick={() => {
                        setQuery(section.name);
                        setCategory("All sections");
                        setPanel("catalog");
                      }}
                    >
                      View section
                      <Icon name="arrow" />
                    </button>
                  </article>
                ))}
            </div>
            <button
              className="ss-button ss-button-primary"
              onClick={openCatalog}
            >
              Explore all sections
              <Icon name="arrow" />
            </button>
          </div>
        )}
        {panel === "catalog" && (
          <div className="ss-dialog-body">
            <p className="ss-dialog-intro">
              A little inspiration for your next storefront upgrade.
            </p>
            <label className="ss-search-input">
              <Icon name="search" />
              <input
                aria-label="Search sections"
                placeholder="Search sections…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="ss-filters" aria-label="Section categories">
              {["All sections", "Conversion", "Trust", "Storytelling"].map(
                (item) => (
                  <button
                    key={item}
                    aria-pressed={category === item}
                    className={category === item ? "ss-filter-active" : ""}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <div className="ss-catalog-grid">
              {visibleSections.map((section) => (
                <article className="ss-catalog-card" key={section.name}>
                  <SectionPreview kind={section.preview} />
                  <div>
                    <span className="ss-eyebrow">{section.category}</span>
                    <h3>{section.name}</h3>
                    <p>{section.description}</p>
                    <button
                      className="ss-button ss-button-secondary ss-button-full"
                      onClick={() =>
                        setToast(
                          `${section.name} selected. Section installation will be connected after the design is finalized.`,
                        )
                      }
                    >
                      Preview section<span>{section.price}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {visibleSections.length === 0 && (
              <div className="ss-empty-state">
                <Icon name="search" />
                <h3>No sections found</h3>
                <p>Try another search or choose a different category.</p>
                <button
                  className="ss-button ss-button-secondary"
                  onClick={openCatalog}
                >
                  Reset filters
                </button>
              </div>
            )}
            <p className="ss-dialog-footnote">
              Sample section library · Prices and content are for the prototype.
            </p>
          </div>
        )}
        {panel === "trial" && (
          <div className="ss-dialog-body ss-trial-body">
            <AppTile plus />
            <p>Everything you need to build a store customers love.</p>
            <div className="ss-trial-price">
              <strong>14 days free</strong>
              <span>Then $15/month · Cancel anytime</span>
            </div>
            <ul>
              {[
                "All 29 premium sections",
                "Conversion blocks, bundles and upsells",
                "Cart drawer and AI setup",
                "Expert human support",
              ].map((item) => (
                <li key={item}>
                  <Icon name="check" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              className="ss-button ss-button-primary ss-button-full"
              onClick={() => {
                setPanel(null);
                setToast(
                  "Trial flow previewed. No subscription or charge has been created.",
                );
              }}
            >
              Preview free trial
              <Icon name="arrow" />
            </button>
            <p className="ss-dialog-footnote">
              Design prototype — this action does not start a subscription.
            </p>
          </div>
        )}
        {panel === "help" && (
          <div className="ss-dialog-body">
            <p className="ss-dialog-intro">
              A little guidance, whenever you need it.
            </p>
            <details className="ss-help-question">
              <summary>How do I add a section?</summary>
              <p>
                Browse the section library, choose a section, then add it to
                your theme. Installation will be connected in the functional
                app.
              </p>
            </details>
            <details className="ss-help-question">
              <summary>What’s included in Plus?</summary>
              <p>
                29 premium sections, conversion blocks, bundles, a cart drawer,
                AI setup, and human support.
              </p>
            </details>
            <details className="ss-help-question">
              <summary>Can I buy just one section?</summary>
              <p>
                Yes. The individual section option is designed for one-time
                purchases.
              </p>
            </details>
          </div>
        )}
      </dialog>
      <div className="ss-toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="ss-toast">
            <Icon name="check" />
            <span>{toast}</span>
            <button
              className="ss-icon-button"
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
