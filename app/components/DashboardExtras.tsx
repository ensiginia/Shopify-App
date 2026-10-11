import { useEffect, useRef, useState } from "react";
import HelpResources from "./HelpResources";
import guideReference from "../assets/dashboard-guides-reference.png";
import "./dashboard-extras.css";

type SymbolName =
  | "blocks"
  | "box"
  | "cart"
  | "sections"
  | "sparkles"
  | "arrow"
  | "play"
  | "external"
  | "youtube"
  | "coin"
  | "mail"
  | "theme"
  | "faq"
  | "star"
  | "idea"
  | "close";

function Symbol({ name }: { name: SymbolName }) {
  const shapes: Record<SymbolName, React.ReactNode> = {
    blocks: (
      <>
        {[4, 13].flatMap((x) =>
          [4, 13].map((y) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="7"
              height="7"
              rx="1.5"
              fill="currentColor"
              fillOpacity=".35"
            />
          )),
        )}
      </>
    ),
    box: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" fill="currentColor" fillOpacity=".7" />
        <path
          d="M3 8v9l9 5V13M21 8v9l-9 5"
          fill="currentColor"
          fillOpacity=".3"
        />
      </>
    ),
    cart: (
      <>
        <path d="M2 4h3l3 12h11l3-9H6" fill="currentColor" fillOpacity=".35" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </>
    ),
    sections: (
      <>
        <rect
          x="4"
          y="3"
          width="16"
          height="18"
          rx="3"
          fill="currentColor"
          fillOpacity=".15"
        />
        <path d="M4 9h16M11 9v12" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z" />
        <path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5L20 2Z" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    external: (
      <>
        <path d="M7 17 17 7M7 7h10v10" />
      </>
    ),
    youtube: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <path d="m10 8 6 4-6 4V8Z" />
      </>
    ),
    coin: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 7h-4a2.5 2.5 0 0 0 0 5h2a2.5 2.5 0 0 1 0 5H9M12 5v14" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    theme: (
      <>
        <path d="M12 3a9 9 0 1 0 9 9c0-1.5-1.5-2-3-2h-2a2 2 0 0 1-2-2V6c0-1.5-.5-3-2-3Z" />
        <circle cx="7" cy="10" r=".7" />
        <circle cx="8" cy="16" r=".7" />
        <circle cx="13" cy="18" r=".7" />
      </>
    ),
    faq: (
      <>
        <path d="M6 3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5l-5 3v-3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" />
        <path d="M10 8a2 2 0 1 1 3 2c-1 1-1 1-1 3M12 16h.01" />
      </>
    ),
    star: <path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1 3-6Z" />,
    idea: (
      <>
        <path d="M8 15a7 7 0 1 1 8 0v3H8v-3ZM9 21h6M12 18v-6" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  );
}

const features = [
  {
    title: "Conversion Blocks",
    description: "10 minutes now. Higher conversion forever.",
    icon: "blocks" as const,
    color: "blue",
    benefits: [
      "Add trust badges and clear product benefits",
      "Answer purchase questions at the right moment",
      "Match blocks to your store’s look",
    ],
  },
  {
    title: "Bundles & Quantity Breaks",
    description: "Same customers, bigger orders.",
    icon: "box" as const,
    color: "purple",
    benefits: [
      "Group complementary products",
      "Offer savings on multi-item purchases",
      "Show simple quantity options",
    ],
  },
  {
    title: "Cart Drawer",
    description: "Fully customisable. More revenue, less friction.",
    icon: "cart" as const,
    color: "green",
    benefits: [
      "Keep shopping without leaving the page",
      "Show helpful cart recommendations",
      "Customize colors and cart messaging",
    ],
  },
  {
    title: "29 Premium Sections",
    description: "Conversion-focused. Curated to build a world class store.",
    icon: "sections" as const,
    color: "orange",
    benefits: [],
  },
];

const aiBenefits = [
  {
    title: "Built to convert",
    description: "Sections and blocks proven across thousands of stores",
  },
  {
    title: "Written to sell",
    description: "We write every line and make the images",
  },
  {
    title: "Looks like your brand",
    description: "We pull in your products, colors and fonts",
  },
  {
    title: "Nothing goes live without you",
    description: "Customize each page in the theme editor first",
  },
];

const guides = [
  {
    title: "Section Store Overview",
    caption: "Sections, blocks, bundles & carts",
    duration: "5:06",
    cropX: 382,
    steps: [
      "Explore the section library and Plus toolkit.",
      "Choose a section that fits your storefront.",
      "Customize it in your theme editor before publishing.",
    ],
  },
  {
    title: "AI Block Setup",
    caption: "AI-powered buy box",
    duration: "2:49",
    cropX: 694,
    steps: [
      "Choose the product you want to highlight.",
      "Arrange benefits, reviews and purchase options.",
      "Preview the buy box on desktop and mobile.",
    ],
  },
  {
    title: "Cart Drawer Setup",
    caption: "AI-powered cart drawer",
    duration: "7:25",
    cropX: 1005,
    steps: [
      "Choose your drawer layout and brand colors.",
      "Add recommendations and cart messaging.",
      "Preview the cart before applying it to your theme.",
    ],
  },
];

type Detail =
  | { kind: "feature"; index: number }
  | { kind: "guide"; index: number }
  | { kind: "how" | "builder" | "refer" | "support" | "migrate" | "suggest" }
  | null;

function GuideArtwork({ index }: { index: number }) {
  // Display only the thumbnail region of the supplied screenshot, preserving it.
  return (
    <svg
      className="ss-guide-artwork"
      viewBox={`${guides[index].cropX} 474 ${index === 2 ? 279 : 295} 150`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <image href={guideReference} width="1699" height="700" />
    </svg>
  );
}

export default function DashboardExtras({
  onExplore,
  onConversion,
  onBundles,
  onCart,
  onAI,
  onTrial,
  onHelp,
  resourceLive = false,
  onResourcePermissions,
}: {
  onExplore: () => void;
  onConversion?: () => void;
  onBundles?: () => void;
  onCart?: () => void;
  onAI?: (how?: boolean) => void;
  onTrial: () => void;
  onHelp: () => void;
  resourceLive?: boolean;
  onResourcePermissions?: () => Promise<void>;
}) {
  const [detail, setDetail] = useState<Detail>(null);
  const [guideOffset, setGuideOffset] = useState(0);
  const [pageType, setPageType] = useState("Home page");
  const [pageReady, setPageReady] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (detail && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!detail && dialogRef.current?.open) dialogRef.current.close();
  }, [detail]);

  function open(next: Detail) {
    setPageReady(false);
    setMessageSent(false);
    setDetail(next);
  }
  function leave(action: () => void) {
    dialogRef.current?.close();
    setDetail(null);
    action();
  }
  const heading =
    detail?.kind === "feature"
      ? features[detail.index].title
      : detail?.kind === "guide"
        ? guides[detail.index].title
        : detail?.kind === "how"
          ? "How AI Pages works"
          : detail?.kind === "builder"
            ? "Build a page"
            : detail?.kind === "refer"
              ? "Refer & Earn"
              : detail?.kind === "migrate"
                ? "Theme Migrator"
                : detail?.kind === "suggest"
                  ? "Suggest an idea"
                  : "Get support";

  return (
    <>
      <section
        className="ss-toolkit"
        id="plus-toolkit"
        aria-labelledby="ss-toolkit-title"
      >
        <div className="ss-extras-section-heading">
          <h2 id="ss-toolkit-title">
            Section Store Plus <span className="ss-plus-mark">+</span>
          </h2>
          <button className="ss-learn-link" onClick={onTrial}>
            Learn more <Symbol name="external" />
          </button>
        </div>
        <div className="ss-toolkit-grid">
          {features.map((feature, index) => (
            <button
              className="ss-feature-card"
              key={feature.title}
              onClick={() =>
                index === 2 && onCart ? onCart() : index === 1 && onBundles ? onBundles() : index === 3 ? onExplore() : index === 0 && onConversion ? onConversion() : open({ kind: "feature", index })
              }
            >
              <span className={`ss-feature-icon ss-feature-${feature.color}`}>
                <Symbol name={feature.icon} />
              </span>
              <span className="ss-feature-copy">
                <strong>{feature.title}</strong>
                <span>{feature.description}</span>
              </span>
              <Symbol name="arrow" />
            </button>
          ))}
        </div>
        <article className="ss-ai-card">
          <div className="ss-ai-header">
            <span className="ss-ai-tile">
              <Symbol name="sparkles" />
            </span>
            <div className="ss-ai-copy">
              <div>
                <h3>AI Pages</h3>
                <button
                  className="ss-how-button"
                  onClick={() => onAI ? onAI(true) : open({ kind: "how" })}
                >
                  <Symbol name="play" />
                  How it works
                </button>
              </div>
              <p>
                Same visitors, more sales. We build your home, product and
                landing pages.
              </p>
            </div>
            <button
              className="ss-button ss-button-primary ss-build-button"
              onClick={() => onAI ? onAI() : open({ kind: "builder" })}
            >
              <Symbol name="sparkles" />
              Build a page
            </button>
          </div>
          <div className="ss-ai-benefits">
            {aiBenefits.map((benefit) => (
              <div key={benefit.title}>
                <h4>{benefit.title}</h4>
                <p>{benefit.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section
        className="ss-quick-guides"
        id="quick-guides"
        aria-labelledby="ss-guides-title"
      >
        <h2 id="ss-guides-title">Quick guides</h2>
        <div className="ss-guides-container">
          <div className="ss-guides-grid">
            {guides.map((_, position) => {
              const index = (position + guideOffset) % guides.length;
              const guide = guides[index];
              return (
                <article className="ss-guide-card" key={guide.title}>
                  <button
                    className="ss-guide-thumbnail"
                    aria-label={`Watch ${guide.title} guide, ${guide.duration}`}
                    onClick={() => open({ kind: "guide", index })}
                  >
                    <GuideArtwork index={index} />
                  </button>
                  <div className="ss-guide-caption">
                    <h3>{guide.caption}</h3>
                    {index > 0 && (
                      <button
                        className="ss-button ss-button-secondary ss-try-guide"
                        onClick={() =>
                          open({ kind: "feature", index: index === 1 ? 0 : 2 })
                        }
                      >
                        Try it
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <button
            className="ss-guide-next"
            aria-label="Next guide"
            onClick={() => setGuideOffset((guideOffset + 1) % guides.length)}
          >
            <Symbol name="arrow" />
          </button>
        </div>
      </section>

      <HelpResources live={resourceLive} onPermissions={onResourcePermissions} onBrowse={onExplore} />

      <dialog
        className="ss-dialog ss-extras-dialog"
        ref={dialogRef}
        onCancel={() => setDetail(null)}
        onClose={() => setDetail(null)}
        aria-labelledby="ss-extra-dialog-title"
      >
        <div className="ss-dialog-header">
          <div>
            <span className="ss-eyebrow">SECTION STORE</span>
            <h2 id="ss-extra-dialog-title">{heading}</h2>
          </div>
          <button
            className="ss-icon-button"
            aria-label="Close preview"
            onClick={() => setDetail(null)}
          >
            <Symbol name="close" />
          </button>
        </div>
        <div className="ss-dialog-body">
          {detail?.kind === "feature" && (
            <>
              <span
                className={`ss-feature-icon ss-detail-feature-icon ss-feature-${features[detail.index].color}`}
              >
                <Symbol name={features[detail.index].icon} />
              </span>
              <p className="ss-dialog-intro">
                {features[detail.index].description}
              </p>
              <ul className="ss-extra-steps">
                {features[detail.index].benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
              <button
                className="ss-button ss-button-primary ss-button-full"
                onClick={() => leave(onTrial)}
              >
                Explore Plus
                <Symbol name="arrow" />
              </button>
            </>
          )}
          {detail?.kind === "guide" && (
            <>
              <div className="ss-guide-modal-art">
                <GuideArtwork index={detail.index} />
              </div>
              <p className="ss-guide-preview-note">
                Guide preview · {guides[detail.index].duration}
              </p>
              <ol className="ss-extra-steps">
                {guides[detail.index].steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="ss-dialog-footnote">
                This prototype shows the guide artwork and steps. A video will
                be connected in the functional app.
              </p>
            </>
          )}
          {detail?.kind === "how" && (
            <>
              <p className="ss-dialog-intro">
                From your brand to a page you can make your own.
              </p>
              <ol className="ss-extra-steps">
                <li>Choose a home, product or landing page.</li>
                <li>Bring in your brand, products, colors and fonts.</li>
                <li>Review the draft and customize it in your theme editor.</li>
                <li>Publish when you’re happy with it.</li>
              </ol>
              <button
                className="ss-button ss-button-primary ss-button-full"
                onClick={() => onAI ? onAI() : open({ kind: "builder" })}
              >
                Build a page
                <Symbol name="sparkles" />
              </button>
            </>
          )}
          {detail?.kind === "builder" && (
            <>
              {pageReady ? (
                <div className="ss-page-ready" role="status">
                  <span className="ss-ready-symbol">
                    <Symbol name="sections" />
                  </span>
                  <h3>Your {pageType.toLowerCase()} preview is ready</h3>
                  <div className="ss-page-wireframe">
                    <span />
                    <div>
                      <i />
                      <i />
                      <i />
                    </div>
                    <span />
                  </div>
                  <p>
                    This sample layout shows the page-building flow. Real AI
                    generation and theme editing will be connected later.
                  </p>
                  <button
                    className="ss-button ss-button-secondary"
                    onClick={() => setPageReady(false)}
                  >
                    Choose another page
                  </button>
                </div>
              ) : (
                <form
                  className="ss-extras-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setPageReady(true);
                  }}
                >
                  <p className="ss-dialog-intro">
                    What would you like to build for your store?
                  </p>
                  <label>
                    Page type
                    <select
                      value={pageType}
                      onChange={(event) => setPageType(event.target.value)}
                    >
                      <option>Home page</option>
                      <option>Product page</option>
                      <option>Landing page</option>
                    </select>
                  </label>
                  <label>
                    What should this page highlight?
                    <textarea
                      rows={3}
                      placeholder="Your bestselling products, a new collection, your brand story…"
                    />
                  </label>
                  <button
                    className="ss-button ss-button-primary ss-button-full"
                    type="submit"
                  >
                    Create page preview
                    <Symbol name="sparkles" />
                  </button>
                  <p className="ss-dialog-footnote">
                    Design prototype · Creates a sample layout only.
                  </p>
                </form>
              )}
            </>
          )}
          {detail?.kind === "refer" && (
            <>
              <p className="ss-dialog-intro">
                Share Section Store with another store owner.
              </p>
              <div className="ss-resource-preview-box">
                <Symbol name="coin" />
                <h3>A little thank-you for spreading the word</h3>
                <p>
                  Your referral link and reward details will appear here once
                  the referral program is connected.
                </p>
              </div>
              <p className="ss-dialog-footnote">Referral program preview.</p>
            </>
          )}
          {detail?.kind === "migrate" && (
            <>
              <p className="ss-dialog-intro">
                Bring your favorite sections to your next theme.
              </p>
              <ol className="ss-extra-steps">
                <li>Select your current theme.</li>
                <li>Choose the sections you want to move.</li>
                <li>Review them in the destination theme before publishing.</li>
              </ol>
              <button
                className="ss-button ss-button-primary ss-button-full"
                onClick={() => leave(onHelp)}
              >
                View migration help
              </button>
              <p className="ss-dialog-footnote">
                Theme migration will be connected in the functional app.
              </p>
            </>
          )}
          {(detail?.kind === "support" || detail?.kind === "suggest") && (
            <>
              {messageSent ? (
                <div className="ss-resource-preview-box" role="status">
                  <Symbol name="mail" />
                  <h3>
                    {detail.kind === "suggest"
                      ? "Thanks for your idea"
                      : "Your message preview is ready"}
                  </h3>
                  <p>
                    This is a local form preview. Your message has not been
                    sent.
                  </p>
                </div>
              ) : (
                <form
                  className="ss-extras-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setMessageSent(true);
                  }}
                >
                  <p className="ss-dialog-intro">
                    {detail.kind === "suggest"
                      ? "What would you love to build next?"
                      : "Tell us what you need a hand with."}
                  </p>
                  <label>
                    Your email
                    <input
                      type="email"
                      required
                      placeholder="you@yourstore.com"
                    />
                  </label>
                  <label>
                    {detail.kind === "suggest"
                      ? "Your idea"
                      : "How can we help?"}
                    <textarea
                      rows={4}
                      required
                      placeholder={
                        detail.kind === "suggest"
                          ? "A section, a feature, a little improvement…"
                          : "Describe your question…"
                      }
                    />
                  </label>
                  <button
                    className="ss-button ss-button-primary ss-button-full"
                    type="submit"
                  >
                    Preview message
                    <Symbol name="arrow" />
                  </button>
                  <p className="ss-dialog-footnote">
                    Prototype form · Nothing is sent externally.
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
