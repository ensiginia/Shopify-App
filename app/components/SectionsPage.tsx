import { useEffect, useRef, useState, type ReactNode } from "react";
import libraryArtwork from "../assets/sections-reference.png";
import heroArtwork from "../assets/hero-detail-reference.png";
import mobileArtwork from "../assets/hero-mobile-reference.png";
import "./dashboard.css";
import "./sections-page.css";

type IconName =
  | "search"
  | "plus"
  | "star"
  | "flame"
  | "new"
  | "gift"
  | "template"
  | "diamond"
  | "testimonial"
  | "arrow"
  | "hero"
  | "video"
  | "countdown"
  | "images"
  | "filter"
  | "box"
  | "heart"
  | "eye"
  | "external"
  | "close"
  | "back"
  | "check";
function Icon({ name }: { name: IconName }) {
  const shapes: Record<IconName, ReactNode> = {
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    plus: <path d="M12 3v18M3 12h18" />,
    star: <path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1 3-6Z" />,
    flame: (
      <path d="M12 2c2 5 7 6 7 13a7 7 0 0 1-14 0c0-4 3-7 4-9 0 3 1 5 3 6 2-4 2-6 0-10Zm0 11c-4 5-3 8 0 8s4-4 0-8Z" />
    ),
    new: (
      <>
        <path d="m12 2 3 2 4 1 1 4 2 3-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-3 1-4 4-1 3-2Z" />
        <path
          d="M7 10v4l3-4v4M12 10h2m-2 0v4h2m-2-2h2M16 10l1 4 1-3 1 3 1-4"
          strokeWidth=".8"
        />
      </>
    ),
    gift: (
      <>
        <rect x="3" y="8" width="18" height="4" />
        <path d="M5 12v9h14v-9M12 8v13M12 8C4 8 4 1 8 3c3 1 4 5 4 5Zm0 0c8 0 8-7 4-5-3 1-4 5-4 5Z" />
      </>
    ),
    template: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 9v12M9 15h12" />
      </>
    ),
    diamond: (
      <>
        <path d="m6 3-4 6 10 13L22 9l-4-6H6ZM2 9h20M6 3l6 19L18 3M6 3l6 6 6-6" />
      </>
    ),
    testimonial: (
      <>
        <path d="M4 5h16v11H9l-5 5V5Z" />
        <path d="m12 7 1 2 3 .5-2 2 .5 2.5-2.5-1-2.5 1 .5-2.5-2-2L11 9l1-2Z" />
      </>
    ),
    arrow: <path d="M3 12h18m-6-6 6 6-6 6" />,
    hero: (
      <>
        <rect x="2" y="4" width="20" height="15" />
        <path d="m3 15 6-5 4 3 5-6 3 3M8 22l4-3 4 3" />
      </>
    ),
    video: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m10 7 7 5-7 5V7Z" />
      </>
    ),
    countdown: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="1" />
        <path d="M9 5v14M15 5v14M5 9v6M12 9v6M18 9v6" />
      </>
    ),
    images: (
      <>
        <rect x="4" y="3" width="18" height="16" rx="1" />
        <path d="M1 7v15h18M4 16l5-6 4 4 4-3 5 6" />
        <circle cx="16" cy="7" r="1" />
      </>
    ),
    filter: <path d="M4 6h16M7 11h10M10 16h4" />,
    box: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10" />
      </>
    ),
    heart: <path d="M12 21 3 12C-3 5 7-1 12 6c5-7 15-1 9 6l-9 9Z" />,
    eye: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    external: (
      <>
        <path d="M14 3h7v7M21 3l-12 12M11 5H4v16h16v-7" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    back: <path d="m15 5-7 7 7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  );
}

const catalog = [
  {
    id: "hero",
    name: "Hero pro",
    price: 14,
    plus: true,
    pro: true,
    tags: ["hero", "images", "features"],
    x: 94,
    y: 307,
    w: 354,
    h: 215,
    group: "Trending Sections",
  },
  {
    id: "collection",
    name: "Featured collection pro",
    price: 14,
    plus: true,
    pro: true,
    tags: ["featured collection", "products", "collections"],
    x: 471,
    y: 307,
    w: 354,
    h: 215,
    group: "Trending Sections",
  },
  {
    id: "testimonial",
    name: "Testimonial #8",
    price: 9,
    plus: true,
    pro: false,
    tags: ["testimonial", "features"],
    x: 848,
    y: 307,
    w: 354,
    h: 215,
    group: "Trending Sections",
  },
  {
    id: "video",
    name: "Video slider pro",
    price: 14,
    plus: true,
    pro: true,
    tags: ["video", "slider", "testimonial"],
    x: 1225,
    y: 307,
    w: 342,
    h: 215,
    group: "Trending Sections",
  },
  {
    id: "collection2",
    name: "Featured collection pro #2",
    price: 14,
    plus: false,
    pro: true,
    tags: ["featured collection", "products", "collections"],
    x: 94,
    y: 658,
    w: 354,
    h: 216,
    group: "Newest Releases",
  },
  {
    id: "testimonial55",
    name: "Testimonial #55",
    price: 9,
    plus: false,
    pro: false,
    tags: ["testimonial", "features"],
    x: 471,
    y: 662,
    w: 354,
    h: 176,
    group: "Newest Releases",
  },
  {
    id: "breadcrumbs",
    name: "Breadcrumbs",
    price: 0,
    plus: false,
    pro: false,
    tags: ["navigation", "other", "free"],
    x: 848,
    y: 662,
    w: 354,
    h: 176,
    group: "Newest Releases",
  },
  {
    id: "faq",
    name: "FAQ pro",
    price: 14,
    plus: true,
    pro: true,
    tags: ["faq", "features"],
    x: 1225,
    y: 682,
    w: 342,
    h: 156,
    group: "Newest Releases",
  },
];
type SectionItem = (typeof catalog)[number];
const shortcuts: { label: string; icon: IconName; filter: string }[] = [
  { label: "Plus Sections", icon: "plus", filter: "plus" },
  { label: "Popular", icon: "star", filter: "popular" },
  { label: "Trending", icon: "flame", filter: "trending" },
  { label: "Newest", icon: "new", filter: "newest" },
  { label: "Free", icon: "gift", filter: "free" },
  { label: "Templates", icon: "template", filter: "templates" },
  { label: "Features", icon: "diamond", filter: "features" },
  { label: "Testimonial", icon: "testimonial", filter: "testimonial" },
  { label: "Scrolling", icon: "arrow", filter: "scrolling" },
  { label: "Hero", icon: "hero", filter: "hero" },
  { label: "Video", icon: "video", filter: "video" },
  { label: "Countdown", icon: "countdown", filter: "countdown timer" },
  { label: "Images", icon: "images", filter: "images" },
];
const categoryColumns = [
  [
    ["video", 125],
    ["images", 125],
    ["features", 101],
    ["other", 98],
    ["products", 95],
    ["testimonial", 94],
    ["scrolling", 90],
    ["hero", 85],
    ["image with text", 80],
    ["slider", 70],
    ["collections", 69],
    ["snippet", 60],
    ["tabs", 55],
    ["text", 49],
  ],
  [
    ["comparison", 45],
    ["banner", 41],
    ["featured collection", 39],
    ["faq", 36],
    ["grid", 32],
    ["comparison table", 31],
    ["product", 28],
    ["gallery", 28],
    ["slideshow", 25],
    ["countdown timer", 25],
    ["steps", 21],
    ["header", 22],
    ["blog", 21],
    ["product page", 20],
    ["announcement bar", 18],
    ["footer", 18],
  ],
  [
    ["hotspots", 15],
    ["product ingredients", 15],
    ["instafeed", 12],
    ["logo cloud", 12],
    ["navigation", 11],
    ["email signup", 10],
    ["shop the look", 10],
    ["trust badges", 10],
    ["page section", 9],
    ["bundle builder", 8],
    ["upsell", 7],
    ["cross sell", 7],
    ["timeline", 7],
    ["call out", 5],
    ["styling", 5],
    ["pricing table", 5],
  ],
] as const;
const heroDetails = [
  [
    "Background media",
    "Choose between a static image, a background video, or a solid/gradient color, with adjustable overlay darkness to ensure text is readable.",
  ],
  [
    "Banner size",
    'Set the section height to "Full screen" for maximum impact, define a specific fixed pixel height, or allow it to auto-adjust based on your content.',
  ],
  [
    "Content positioning",
    "Control exactly where your text sits using horizontal alignment (left, center, right), vertical positioning (top, middle, bottom), and maximum width sliders.",
  ],
  [
    "Content blocks",
    "Add, drag, and customize individual elements inside the section, including Heading, Buttons, Star Rating, Features, and Disclaimers.",
  ],
  [
    "Mobile adjustments",
    "Nearly every setting has a separate mobile option, allowing you to use different images, alignments, and font sizes specifically for phone screens.",
  ],
  [
    "Feature styling",
    'Customize the "Features" area with options like glass-effect blurs, background opacity, borders, and rounded corners.',
  ],
  [
    "Section spacing",
    "Fine-tune the overall layout by adjusting the content width (Page vs. Full), outer margins, internal padding, and border thickness.",
  ],
];

function Artwork({
  item,
  slide = 0,
  large = false,
}: {
  item: SectionItem;
  slide?: number;
  large?: boolean;
}) {
  const isHero = large && item.id === "hero";
  const source = isHero
    ? slide === 2
      ? mobileArtwork
      : heroArtwork
    : libraryArtwork;
  const viewBox = isHero
    ? slide === 2
      ? "1097 274 298 417"
      : slide === 1
        ? "346 397 749 545"
        : "346 300 1074 665"
    : `${item.x} ${item.y} ${item.w} ${item.h}`;
  return (
    <svg
      className={`sc-artwork ${isHero && slide === 2 ? "sc-artwork-mobile" : ""}`}
      viewBox={viewBox}
      preserveAspectRatio={large ? "xMidYMid meet" : "none"}
      role="img"
      aria-label={`${item.name} ${slide === 2 ? "mobile" : "storefront"} preview`}
    >
      <image
        href={source}
        width={isHero ? 1920 : 1685}
        height={isHero ? 1080 : 900}
      />
    </svg>
  );
}

type Modal = "detail" | "trial" | "bundle" | null;
export default function SectionsPage({
  homeHref = "/",
  savedOnly = false,
  favoritesKey = "ss-section-favorites:local",
}: {
  homeHref?: string;
  savedOnly?: boolean;
  favoritesKey?: string;
}) {
  const [query, setQuery] = useState(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("q") || "");
  const [shortcut, setShortcut] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [order, setOrder] = useState("default");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(savedOnly);
  const [selected, setSelected] = useState<SectionItem>(catalog[0]);
  const [modal, setModal] = useState<Modal>(null);
  const [slide, setSlide] = useState(0);
  const [bundle, setBundle] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {try {const saved=JSON.parse(localStorage.getItem(favoritesKey)||"[]");if(Array.isArray(saved))setFavorites(saved.filter(id=>typeof id==="string"));}catch {}}, [favoritesKey]);
  useEffect(() => {
    if (modal && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!modal && dialogRef.current?.open) dialogRef.current.close();
  }, [modal]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!filtersOpen) return;
    function outside(event: PointerEvent) {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(event.target as Node)
      )
        setFiltersOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [filtersOpen]);
  function toggleFavorite(id: string) {
    setFavorites((current) =>
      {const next=current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];try{localStorage.setItem(favoritesKey,JSON.stringify(next));}catch {}return next;},
    );
  }
  function openDetail(item: SectionItem) {
    setSelected(item);
    setSlide(0);
    setFiltersOpen(false);
    setModal("detail");
  }
  function reset() {
    setQuery("");
    setShortcut("");
    setCategories([]);
    setOrder("default");
    setFavoritesOnly(false);
  }
  const filtered = catalog.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) &&
      (!(savedOnly || favoritesOnly) || favorites.includes(item.id)) &&
      (!categories.length ||
        categories.some((category) => item.tags.includes(category))) &&
      (!shortcut ||
        shortcut === "popular" ||
        (shortcut === "plus" && item.plus) ||
        (shortcut === "trending" && item.group === "Trending Sections") ||
        (shortcut === "newest" && item.group === "Newest Releases") ||
        (shortcut === "free" && item.price === 0) ||
        item.tags.includes(shortcut)),
  );
  const items = order === "newest" ? [...filtered].reverse() : filtered;
  const isFiltered = Boolean(
    query ||
    shortcut ||
    categories.length ||
    favoritesOnly ||
    order !== "default",
  );
  const groups = isFiltered
    ? [
        {
          heading: favoritesOnly
            ? "Saved Sections"
            : shortcut
              ? shortcuts.find((item) => item.filter === shortcut)?.label ||
                "Sections"
              : "Sections",
          items,
        },
      ]
    : ["Trending Sections", "Newest Releases"].map((heading) => ({
        heading,
        items: items.filter((item) => item.group === heading),
      }));

  return (
    <div className="ss-dashboard sc-page">
      <header className="ss-topbar">
        <a className="ss-brand" href={homeHref}>
          <span className="ss-brand-icon">S</span>Section Store
        </a>
        <div className="ss-topbar-actions">
          <button className="ss-pill" onClick={() => setModal("trial")}>
            Try Plus Free
          </button>
          <details className="ss-more-menu">
            <summary aria-label="More options">•••</summary>
            <div className="ss-menu">
              <button onClick={() => setFavoritesOnly(!favoritesOnly)}>
                {favoritesOnly
                  ? "Show all sections"
                  : `Saved sections (${favorites.length})`}
              </button>
              <a href={`${homeHref}#ss-resources-title`}>Help & resources</a>
            </div>
          </details>
        </div>
      </header>
      <main className="sc-main">
        {savedOnly&&!favorites.length&&<div className="saved-empty"><h2>No saved sections yet</h2><p>Browse Explore Sections and click the heart icon to save sections you're interested in.</p><a href={homeHref==="/app"?"/app/sections":"/sections"}>Explore Sections</a></div>}
        <div className="sc-searchbar" ref={categoriesRef}>
          <label className="sc-search">
            <Icon name="search" />
            <input
              aria-label="Search for sections"
              placeholder="Search for sections"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                className="ss-icon-button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <Icon name="close" />
              </button>
            )}
          </label>
          <button
            className="ss-button ss-button-secondary"
            onClick={() => {
              setFiltersOpen(false);
              setModal("bundle");
            }}
          >
            Build Your Bundle
            <Icon name="box" />
          </button>
          <button
            className="ss-button ss-button-primary"
            aria-expanded={filtersOpen}
            aria-controls="sc-categories"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            Categories
            <Icon name="filter" />
            {categories.length > 0 && (
              <span className="sc-filter-count">{categories.length}</span>
            )}
          </button>
          {filtersOpen && (
            <div className="sc-categories-popover" id="sc-categories">
              <div className="sc-category-columns">
                {categoryColumns.map((column, index) => (
                  <div className="sc-category-column" key={index}>
                    {index === 0 && (
                      <>
                        <h3>Order by</h3>
                        {[
                          ["newest", "Newest"],
                          ["popular", "All-time popular"],
                        ].map(([value, label]) => (
                          <label className="sc-filter-option" key={value}>
                            <input
                              type="radio"
                              name="section-order"
                              checked={order === value}
                              onChange={() => setOrder(value)}
                            />
                            {label}
                          </label>
                        ))}
                        <h3>Category</h3>
                      </>
                    )}
                    {column.map(([label, count]) => (
                      <label className="sc-filter-option" key={label}>
                        <input
                          type="checkbox"
                          checked={categories.includes(label)}
                          onChange={() =>
                            setCategories((current) =>
                              current.includes(label)
                                ? current.filter((item) => item !== label)
                                : [...current, label],
                            )
                          }
                        />
                        <span>{label}</span>
                        <span className="sc-category-count">{count}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <div className="sc-filter-footer">
                <button
                  className="ss-button ss-button-secondary"
                  onClick={reset}
                >
                  Reset filters
                </button>
                <span>{items.length} sample sections</span>
                <button
                  className="ss-button ss-button-primary"
                  onClick={() => setFiltersOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="sc-category-rail-wrap">
          <div
            className="sc-category-rail"
            ref={railRef}
            aria-label="Browse section categories"
          >
            {shortcuts.map((item) => (
              <button
                className={shortcut === item.filter ? "sc-category-active" : ""}
                aria-pressed={shortcut === item.filter}
                key={item.label}
                onClick={() => {
                  setShortcut(shortcut === item.filter ? "" : item.filter);
                  setCategories([]);
                  setFavoritesOnly(false);
                }}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <button
            className="sc-rail-next"
            aria-label="More categories"
            onClick={() => {
              const rail = railRef.current;
              if (rail)
                rail.scrollTo({
                  left:
                    rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 10
                      ? 0
                      : rail.scrollLeft + 300,
                  behavior: "smooth",
                });
            }}
          >
            <Icon name="arrow" />
          </button>
        </div>
        {isFiltered && (
          <div className="sc-results-summary">
            <span>
              {items.length} {items.length === 1 ? "section" : "sections"}{" "}
              {query && `matching “${query}”`}
            </span>
            <button className="sc-clear-link" onClick={reset}>
              Clear filters
            </button>
          </div>
        )}
        {groups.map((group) => (
          <section className="sc-card-section" key={group.heading}>
            <h1>{group.heading}</h1>
            <div className="sc-card-grid">
              {group.items.map((item) => (
                <article className="sc-section-card" key={item.id}>
                  <button
                    className="sc-card-preview"
                    aria-label={`View ${item.name}`}
                    onClick={() => openDetail(item)}
                  >
                    {item.plus && (
                      <span className="sc-plus-badge">
                        + &nbsp; Included in Plus
                      </span>
                    )}
                    <Artwork item={item} />
                  </button>
                  <div className="sc-card-hover-actions">
                    <button
                      aria-label={`${favorites.includes(item.id) ? "Unsave" : "Save"} ${item.name}`}
                      aria-pressed={favorites.includes(item.id)}
                      className={
                        favorites.includes(item.id) ? "sc-is-saved" : ""
                      }
                      onClick={() => toggleFavorite(item.id)}
                    >
                      <Icon name="heart" />
                    </button>
                    <button
                      aria-label={`Demo ${item.name}`}
                      onClick={() => {
                        openDetail(item);
                        setSlide(1);
                      }}
                    >
                      <Icon name="external" />
                    </button>
                    <button
                      aria-label={`Preview ${item.name}`}
                      onClick={() => openDetail(item)}
                    >
                      <Icon name="eye" />
                    </button>
                  </div>
                  <button
                    className="sc-card-footer"
                    onClick={() => openDetail(item)}
                  >
                    <span>
                      {item.name}{" "}
                      {item.pro && <span className="sc-pro-diamond">💎</span>}
                    </span>
                    <span>{item.price === 0 ? "Free" : `$${item.price}`}</span>
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))}
        {items.length === 0 && !savedOnly && (
          <div className="sc-empty">
            <Icon name="search" />
            <h2>No sections found</h2>
            <p>Try another search or choose a different category.</p>
            <button className="ss-button ss-button-secondary" onClick={reset}>
              Clear filters
            </button>
          </div>
        )}
        <p className="sc-library-note">
          Design prototype · Sample section library. Category counts, pricing
          and artwork follow the reference.
        </p>
      </main>

      <dialog
        ref={dialogRef}
        className={`sc-dialog ${modal === "detail" ? "sc-detail-dialog" : "sc-small-dialog"}`}
        onCancel={() => setModal(null)}
        onClose={() => setModal(null)}
        aria-labelledby="sc-modal-title"
      >
        <div className="sc-modal-header">
          <h2 id="sc-modal-title">
            {modal === "detail" ? (
              <>
                {selected.name} {selected.pro && <span>💎</span>}
              </>
            ) : modal === "bundle" ? (
              "Build Your Bundle"
            ) : (
              "Section Store Plus"
            )}
          </h2>
          <button
            className="ss-icon-button"
            aria-label="Close section dialog"
            onClick={() => setModal(null)}
          >
            <Icon name="close" />
          </button>
        </div>
        {modal === "detail" && (
          <div className="sc-detail-scroll">
            <div className="sc-detail-layout">
              <div className="sc-detail-left">
                <div className="sc-gallery">
                  <Artwork item={selected} slide={slide} large />
                  <button
                    className="sc-gallery-arrow sc-gallery-back"
                    aria-label="Previous preview"
                    onClick={() => setSlide((slide + 2) % 3)}
                  >
                    <Icon name="back" />
                  </button>
                  <button
                    className="sc-gallery-arrow sc-gallery-next"
                    aria-label="Next preview"
                    onClick={() => setSlide((slide + 1) % 3)}
                  >
                    <Icon name="arrow" />
                  </button>
                  <div className="sc-gallery-dots">
                    {["Desktop & mobile", "Desktop", "Mobile"].map(
                      (label, index) => (
                        <button
                          key={label}
                          aria-label={`${label} preview`}
                          aria-pressed={slide === index}
                          className={slide === index ? "sc-dot-active" : ""}
                          onClick={() => setSlide(index)}
                        />
                      ),
                    )}
                  </div>
                </div>
                <article className="sc-detail-description">
                  <h3>Details:</h3>
                  <ul>
                    {(selected.id === "hero"
                      ? heroDetails
                      : [
                          [
                            "Customization",
                            `Adjust ${selected.name.toLowerCase()} to match your store’s colors, fonts and content.`,
                          ],
                          [
                            "Responsive layout",
                            "Preview your section on desktop and mobile before publishing.",
                          ],
                          [
                            "Theme editor",
                            "Arrange the section and customize its content in your theme editor.",
                          ],
                        ]
                    ).map(([label, description]) => (
                      <li key={label}>
                        <strong>{label}:</strong> {description}
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
              <aside className="sc-purchase-sidebar">
                <div className="sc-detail-tools">
                  <strong>
                    {selected.name} {selected.pro && "💎"}
                  </strong>
                  <button
                    className="ss-button ss-button-secondary"
                    onClick={() => setSlide(slide === 0 ? 1 : 0)}
                  >
                    Demo
                    <Icon name="eye" />
                  </button>
                  <button
                    className={`ss-button ss-button-secondary ${favorites.includes(selected.id) ? "sc-is-saved" : ""}`}
                    aria-label={`Save ${selected.name}`}
                    aria-pressed={favorites.includes(selected.id)}
                    onClick={() => toggleFavorite(selected.id)}
                  >
                    <Icon name="heart" />
                  </button>
                </div>
                <article className="sc-plus-purchase">
                  <div className="sc-purchase-heading">
                    <h3>Section Store Plus</h3>
                    <span className="ss-badge">Recommended</span>
                  </div>
                  <p className="sc-price">
                    <strong>$15</strong> / month
                  </p>
                  <h4>
                    {selected.plus
                      ? "This section is included in Plus."
                      : "Explore the full Plus toolkit."}
                  </h4>
                  <ul>
                    {[
                      [
                        "29 sections included",
                        "Design your whole store with these",
                      ],
                      [
                        "Conversion + AOV toolkit",
                        "Bundles, Cart Drawer, Conversion Blocks and upsells.",
                      ],
                      ["14-day free trial", "Cancel anytime."],
                    ].map(([title, description]) => (
                      <li key={title}>
                        <span className="sc-benefit-plus">✚</span>
                        <div>
                          <strong>{title}</strong>
                          <p>{description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button
                    className="ss-button ss-button-primary ss-button-full"
                    onClick={() =>
                      setNotice(
                        "Free trial preview — no subscription or section installation has been created.",
                      )
                    }
                  >
                    <Icon name="plus" />
                    Try Plus free & add section
                  </button>
                  <p className="sc-payment-note">
                    150,000 Users · Secure payment through Shopify
                  </p>
                  <button
                    className="sc-learn-plus"
                    onClick={() => setModal("trial")}
                  >
                    Learn more about Plus
                  </button>
                </article>
                <div className="sc-or">
                  <span />
                  OR
                  <span />
                </div>
                <article className="sc-buy-once">
                  <div>
                    <strong>Only need this section?</strong>
                    <p>Buy once and keep it forever.</p>
                  </div>
                  <span>
                    <strong>
                      {selected.price ? `$${selected.price}` : "Free"}
                    </strong>{" "}
                    {selected.price > 0 && <small>one-time</small>}
                  </span>
                  <button
                    className="ss-button ss-button-secondary"
                    onClick={() =>
                      setNotice(
                        selected.price
                          ? "Purchase flow preview — no charge has been created."
                          : "Free section flow preview — theme installation is not connected yet.",
                      )
                    }
                  >
                    {selected.price ? "Buy" : "Add"}
                  </button>
                </article>
              </aside>
            </div>
          </div>
        )}
        {modal === "trial" && (
          <div className="sc-simple-body">
            <span className="sc-trial-mark">+</span>
            <h3>Your full conversion toolkit</h3>
            <p>
              29 premium sections, conversion blocks, bundles, cart drawer and
              AI setup.
            </p>
            <div className="sc-trial-price">
              14 days free<span>Then $15/month. Cancel anytime.</span>
            </div>
            <button
              className="ss-button ss-button-primary ss-button-full"
              onClick={() =>
                setNotice(
                  "Trial flow previewed. No subscription or charge has been created.",
                )
              }
            >
              Preview free trial
            </button>
            <p className="sc-library-note">
              Design prototype · Billing is not connected.
            </p>
          </div>
        )}
        {modal === "bundle" && (
          <div className="sc-simple-body">
            <p className="sc-bundle-intro">
              Choose the sections you’d like to bring together.
            </p>
            <div className="sc-bundle-list">
              {catalog.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={bundle.includes(item.id)}
                    onChange={() =>
                      setBundle((current) =>
                        current.includes(item.id)
                          ? current.filter((id) => id !== item.id)
                          : [...current, item.id],
                      )
                    }
                  />
                  <span>{item.name}</span>
                  <strong>{item.price ? `$${item.price}` : "Free"}</strong>
                </label>
              ))}
            </div>
            <div className="sc-bundle-total">
              <strong>{bundle.length} sections selected</strong>
              <strong>
                $
                {catalog
                  .filter((item) => bundle.includes(item.id))
                  .reduce((total, item) => total + item.price, 0)}
              </strong>
            </div>
            <button
              className="ss-button ss-button-primary ss-button-full"
              disabled={!bundle.length}
              onClick={() =>
                setNotice(
                  "Bundle preview ready. No checkout or purchase has been created.",
                )
              }
            >
              Preview bundle
            </button>
            <p className="sc-library-note">
              Sample bundle · Checkout is not connected.
            </p>
          </div>
        )}
        {notice && modal && (
          <div className="sc-modal-notice" role="status">
            <Icon name="check" />
            {notice}
            <button
              className="ss-icon-button"
              aria-label="Dismiss message"
              onClick={() => setNotice("")}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
      </dialog>
      {notice && !modal && (
        <div className="ss-toast-region" role="status">
          <div className="ss-toast">{notice}</div>
        </div>
      )}
    </div>
  );
}
