import { Fragment, useEffect, useRef, useState } from "react";
import {
  rewardProgress,
  cartPreviewTotals,
  normalizeQuantity,
} from "../lib/cart-preview";
import type { RewardTier } from "../lib/cart-preview";
import { Link, useNavigate } from "react-router";
import CartStyles, { cartTitleStyles, gradientValue } from "./CartStyles";
import type { SavedGradient } from "./CartStyles";
import type { CSSProperties } from "react";
import ColorPickerField from "./ColorPickerField";
import CartIcon from "./CartIcon";
import HeaderIconPicker from "./HeaderIconPicker";
import CartCelebration from "./CartCelebration";
import { CustomHtmlSettings, CustomHtmlPreview } from "./CustomHtml";
import {
  paymentDefaults,
  trustDefaults,
  PaymentSettings,
  PaymentPreview,
  TrustSettings,
  TrustPreview,
} from "./FooterBadges";
import {
  DiscountSettings,
  DiscountPreview,
  discountDefaults,
} from "./DiscountCode";
import CartBlockOrder from "./CartBlockOrder";
import {
  UpsellSettings,
  UpsellPreview,
  upsellDefaults,
} from "./ProductsUpsell";
import reference from "../assets/cart-reference.png";
import productReference from "../assets/cart-editor-reference.png";
import "./dashboard.css";
import "./conversion-blocks.css";
import "./bundles-page.css";
import "./cart-drawer.css";
const textPaint = (value: string): CSSProperties =>
  value.includes("gradient(")
    ? {
        backgroundImage: value,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
      }
    : { color: value };
const solidColor = (value: string) =>
  value.match(/#[0-9a-f]{6}/i)?.[0] || value;
const products = [
  {
    id: "ridge",
    name: "Ridgeblade™ Folding Knife – Built for the Outdoors, Ready for Everyday Carry",
    variant: "",
    price: 60,
    compare: 75,
  },
  {
    id: "engraved",
    name: "Custom Engraved Ridgeblade Knife",
    variant: "Laser Engraved",
    price: 85,
    compare: 85,
  },
  {
    id: "uv",
    name: "Custom Engraved Ridgeblade Knife",
    variant: "UV Printed",
    price: 90,
    compare: 90,
  },
  {
    id: "bundle",
    name: "EDC Ridgeblade Bundle",
    variant: "",
    price: 90,
    compare: 90,
  },
  {
    id: "gray",
    name: "Edge Sherpa Knife Sharpener",
    variant: "Gray",
    price: 13,
    compare: 13,
  },
  {
    id: "black",
    name: "Edge Sherpa Knife Sharpener",
    variant: "Black",
    price: 13,
    compare: 13,
  },
  {
    id: "seat",
    name: "NextPad | Camp – Heated Outdoor Seat Cushion",
    variant: "",
    price: 129,
    compare: 129,
  },
  {
    id: "merch",
    name: "Ridgeblade + Merch bundle",
    variant: "",
    price: 115,
    compare: 115,
  },
];
const bodyNames = {
  announcement: "Announcement",
  timer: "Timer",
  reward: "Reward bar",
  items: "Line items",
  upsell: "Products upsell",
  bodyHtml: "Body Custom HTML",
};
type BodyBlock = keyof typeof bodyNames;
const footerNames = {
  discount: "Discount code",
  discountTotal: "Discount total",
  addon: "Order addon",
  note: "Order note",
  subtotal: "Subtotal",
  checkout: "Checkout button",
  payments: "Payment icons",
  trust: "Trust badges",
  html: "Custom HTML",
};
type FooterBlock = keyof typeof footerNames;
const initial = {
  bodyDeleted: ["bodyHtml"] as string[],
  bodyHtml: false,
  bodyHtmlContent: "",
  bodyHtmlCss: "",
  emptyHtml: false,
  emptyHtmlContent: "",
  emptyHtmlCss: "",
  rewardTiers: [] as RewardTier[],
  rewardExcluded: [] as string[],
  translations: {} as Record<string, { title: string; checkout: string }>,
  previewLanguage: "en",
  discountDeleted: false,
  discountTotalDeleted: false,
  html: false,
  htmlDeleted: true,
  htmlContent: "",
  htmlCss: ".my-note {\n  text-align: center;\n}",
  payments: true,
  paymentsDeleted: false,
  trustDeleted: false,
  paymentSettings: paymentDefaults,
  trustSettings: trustDefaults,
  checkoutTemplate: "Checkout • {{cart_total}}",
  checkoutIcon: "Checkout",
  checkoutCustomIcon: "",
  checkoutBg: "",
  checkoutColor: "#ffffff",
  checkoutHoverBg: "#000000",
  checkoutHoverColor: "#ffffff",
  checkoutSize: 15,
  checkoutEffect: "Shine + lift",
  subtotalTitle: "",
  subtotalSubtitle: "",
  subtotalCompare: true,
  subtotalSize: 15,
  subtotalColor: "#0d0d1c",
  note: false,
  noteDeleted: false,
  noteTitle: "Add special instructions",
  notePlaceholder: "Special instructions for your order",
  noteCollapsible: true,
  noteExpanded: true,
  noteColor: "#000000",
  noteWeight: "Semibold",
  noteBg: "#ffffff",
  noteText: "#000000",
  noteBorder: "#cacaca",
  addon: false,
  addonDeleted: false,
  addonProduct: "",
  addonImage: "",
  addonTitle: "Shipping protection",
  addonSubtitle: "Protect your order from loss or damage.",
  addonTitleSize: 13,
  addonSubtitleSize: 12,
  addonReward: false,
  addonTitleColor: "#000000",
  addonSubtitleColor: "#666666",
  addonBg: "#f1f1f1",
  addonPriceColor: "#000000",
  addonCompareColor: "#666666",
  addonToggleColor: "#000000",
  addonImageSize: 22,
  addonBorderStyle: "Solid",
  addonBorder: "#cacaca",
  discountTotal: true,
  discountTotalTitle: "Discount",
  discountTotalColor: "#666666",
  discountSettings: discountDefaults,
  upsellSettings: upsellDefaults,
  footerOrder: [
    "discount",
    "discountTotal",
    "addon",
    "note",
    "subtotal",
    "checkout",
    "payments",
    "trust",
    "html",
  ] as FooterBlock[],
  bodyOrder: [
    "announcement",
    "timer",
    "reward",
    "items",
    "upsell",
    "bodyHtml",
  ] as BodyBlock[],
  name: "Cart",
  position: "right",
  floating: false,
  rounded: false,
  compare: true,
  openAdd: true,
  openIcon: true,
  accessible: false,
  preset: "store",
  text: "#000000",
  muted: "#666666",
  soft: "#eeeeee",
  gradientEnd: "#444444",
  gradientStops: ["#000000", "#444444"],
  gradientAngle: 110,
  savedGradients: [] as SavedGradient[],
  gradient: false,
  bg: "#ffffff",
  accent: "#000000",
  radius: 14,
  width: 440,
  imageRadius: 14,
  imageRatio: "Adapt to image",
  imageStyle: "Frame",
  size: "Balanced",
  errorBg: "#fee2e2",
  errorColor: "#991b1b",
  errorSize: 13,
  custom: false,
  css: ".cart-title {\n  text-transform: uppercase;\n  letter-spacing: 1px;\n}",
  title: "Cart {{items_count}}",
  align: "left",
  iconPosition: "right",
  icon: "×",
  headerIcon: "None",
  headerCustomIcon: "",
  headerIconPosition: "alongside",
  titleSize: 20,
  titleBg: "#ffffff",
  titleColor: "#000000",
  announcement: false,
  announcementText: "Limited-time offer: complete your order today.",
  announcementSize: 13,
  announcementBg: "#ebebeb",
  announcementColor: "#000000",
  announcementTop: 9,
  announcementBottom: 9,
  timer: false,
  minutes: 10,
  timerTitle: "Cart reserved for {{timer}}",
  timerEnd: "Hide the timer",
  timerBg: "#f1f1f1",
  timerColor: "#666666",
  timerNumber: "#000000",
  timerTop: 9,
  timerBottom: 9,
  reward: false,
  rewardMessage: "Add {{amount_remaining}} to unlock {{next_tier_title}}.",
  rewardUnlocked: "All rewards unlocked!",
  rewardAlign: "center",
  unlockBy: "Cart total",
  threshold: 100,
  tierTitle: "Free shipping",
  rewardBg: "#ffffff",
  rewardColor: "#000000",
  barBg: "#cacaca",
  barFill: "#000000",
  locked: "#666666",
  unlocked: "#000000",
  rewardTop: 12,
  rewardBottom: 4,
  barHeight: 6,
  milestoneSize: 32,
  unlockedIcon: "#ffffff",
  milestoneBg: "#ffffff",
  milestoneBorder: "#cacaca",
  tierTextSize: 12,
  spacing: "Spaced by threshold",
  thresholds: false,
  exclude: false,
  celebration: "Screen fireworks",
  upsell: false,
  discount: false,
  discountLabel: "Discount code",
  checkout: "Checkout",
  trust: true,
};
type Config = typeof initial;
function ProductImage() {
  return (
    <svg viewBox="1478 260 70 70" aria-hidden="true">
      <image href={productReference} width="1920" height="1080" />
    </svg>
  );
}
export default function CartDrawer({
  homeHref = "/",
  editor = false,
  cloudDraft,
}: {
  homeHref?: string;
  editor?: boolean;
  cloudDraft?: { config: Record<string, unknown> | null; version: number };
}) {
  const [draftVersion, setDraftVersion] = useState(cloudDraft?.version ?? 0);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const base = homeHref === "/app" ? "/app" : "";
  const [config, setConfig] = useState<Config>(initial);
  const [saved, setSaved] = useState<Config>(initial);
  const [modal, setModal] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [celebrationRun, setCelebrationRun] = useState<{
    id: number;
    mode: string;
  } | null>(null);
  const previousRewards = useRef<string[]>([]);
  const [tab, setTab] = useState("Settings");
  const [empty, setEmpty] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [market, setMarket] = useState("Pakistan");
  const [items, setItems] = useState<Record<string, number>>({
    ridge: 1,
    engraved: 1,
  });
  const [selection, setSelection] = useState<string[]>(["ridge", "engraved"]);
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("All");
  const [filter, setFilter] = useState("");
  const [filterValue, setFilterValue] = useState("All sample products");
  const [filename, setFilename] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [previewModes, setPreviewModes] = useState({
    discount: true,
    error: false,
    plan: false,
  });
  const [discountCodes, setDiscountCodes] = useState<string[]>([]);
  const [addonSelected, setAddonSelected] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const checkoutInput = useRef<HTMLInputElement>(null);
  const [checkoutHovered, setCheckoutHovered] = useState(false);
  const [addTarget, setAddTarget] = useState<"body" | "footer">("body");
  const [translationLanguage, setTranslationLanguage] = useState("en");
  const [translationFields, setTranslationFields] = useState({
    title: "",
    checkout: "",
  });
  const [hasDraft, setHasDraft] = useState(Boolean(cloudDraft?.config));
  const [seconds, setSeconds] = useState(600);
  const dialog = useRef<HTMLDialogElement>(null);
  const storageKey = `section-store-cart-draft-v1${base}`;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw =
          cloudDraft === undefined
            ? localStorage.getItem(storageKey)
            : cloudDraft.config
              ? JSON.stringify(cloudDraft.config)
              : null;
        if (!raw) return;
        const stored = JSON.parse(raw);
        const normalize = (values: unknown, defaults: string[]) =>
          Array.isArray(values)
            ? [
                ...new Set(
                  values.filter(
                    (id): id is string =>
                      typeof id === "string" && defaults.includes(id),
                  ),
                ),
                ...defaults.filter((id) => !values.includes(id)),
              ]
            : defaults;
        const restored = {
          ...initial,
          ...stored,
          celebration:
            stored.celebration === "Confetti"
              ? "Screen fireworks"
              : stored.celebration || initial.celebration,
          paymentSettings: { ...paymentDefaults, ...stored.paymentSettings },
          trustSettings: { ...trustDefaults, ...stored.trustSettings },
          discountSettings: { ...discountDefaults, ...stored.discountSettings },
          upsellSettings: { ...upsellDefaults, ...stored.upsellSettings },
          bodyOrder: normalize(
            stored.bodyOrder,
            initial.bodyOrder,
          ) as BodyBlock[],
          footerOrder: normalize(
            Array.isArray(stored.footerOrder) &&
              !stored.footerOrder.includes("discountTotal")
              ? stored.footerOrder.flatMap((id: string) =>
                  id === "checkout" ? ["discountTotal", id] : [id],
                )
              : stored.footerOrder,
            initial.footerOrder,
          )
            .flatMap((id: string, _, order: string[]) =>
              id === "checkout" &&
              !stored.footerOrder?.includes("addon") &&
              order.indexOf("addon") > order.indexOf("checkout")
                ? ["addon", id]
                : id === "addon" &&
                    !stored.footerOrder?.includes("addon") &&
                    order.indexOf("addon") > order.indexOf("checkout")
                  ? []
                  : [id],
            )
            .flatMap((id: string, _, order: string[]) =>
              !stored.footerOrder?.includes("note") && id === "checkout"
                ? ["note", id]
                : !stored.footerOrder?.includes("note") &&
                    id === "note" &&
                    order.indexOf("note") > order.indexOf("checkout")
                  ? []
                  : [id],
            )
            .flatMap((id: string, _, order: string[]) =>
              !stored.footerOrder?.includes("subtotal") && id === "checkout"
                ? ["subtotal", id]
                : !stored.footerOrder?.includes("subtotal") &&
                    id === "subtotal" &&
                    order.indexOf("subtotal") > order.indexOf("checkout")
                  ? []
                  : [id],
            ) as FooterBlock[],
        };
        setConfig(restored);
        setHasDraft(true);
        setSaved(restored);
        setSeconds(restored.minutes * 60);
      } catch {
        setNotice("Saved draft could not be restored.");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey, cloudDraft]);
  const saveDraft = async (nextConfig: Config = config) => {
    if (saving) return;
    setSaving(true);
    try {
      if (cloudDraft !== undefined) {
        const response = await fetch("/app/cart-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: nextConfig, version: draftVersion }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Cart draft could not be saved.");
        setDraftVersion(result.version);
        setNotice(
          "Cart design saved to your store's app workspace. Storefront publishing is not connected yet.",
        );
      } else {
        localStorage.setItem(storageKey, JSON.stringify(nextConfig));
        setNotice("Cart design and block order saved in this browser.");
      }
      setSaved(nextConfig);
      setHasDraft(true);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Your changes have not been saved.",
      );
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);

  useEffect(() => {
    if (!config.timer) return;
    const interval = window.setInterval(
      () =>
        setSeconds((n) =>
          n > 0
            ? n - 1
            : config.timerEnd === "Repeat the timer"
              ? config.minutes * 60
              : 0,
        ),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [config.timer, config.minutes, config.timerEnd]);
  useEffect(() => {
    if (
      config.timer &&
      seconds === 0 &&
      config.timerEnd === "Remove all items from cart"
    ) {
      setItems({});
      setEmpty(true);
      setAddonSelected(false);
    }
  }, [config.timer, config.timerEnd, seconds]);
  useEffect(() => {
    if (addonSelected && (!items[config.addonProduct] || empty))
      setAddonSelected(false);
  }, [items, empty, addonSelected, config.addonProduct]);
  const update = <K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
    if (key === "minutes") setSeconds(Number(value) * 60);
    if (key === "timer") setSeconds(config.minutes * 60);
  };
  const open = (name: string) => {
    if (name === "Translations") {
      setTranslationLanguage(config.previewLanguage);
      setTranslationFields(
        config.translations[config.previewLanguage] || {
          title: "",
          checkout: "",
        },
      );
    }
    setNotice("");
    setModal(name);
  };
  const dirty = JSON.stringify(config) !== JSON.stringify(saved);
  const selectedProducts = products.filter((p) => items[p.id] > 0);
  const {
    total,
    compare,
    subtotal,
    count,
    discount: discountAmount,
  } = cartPreviewTotals(products, items, discountCodes, empty);
  const rewardTotal =
    config.addonReward || !addonSelected
      ? total
      : Math.max(
          0,
          total -
            (products.find((p) => p.id === config.addonProduct)?.price || 0),
        );
  const rewardCount =
    config.addonReward || !addonSelected ? count : Math.max(0, count - 1);
  const excludedProducts = config.exclude
    ? products.filter(
        (p) =>
          config.rewardExcluded.includes(p.id) &&
          (config.addonReward ||
            !addonSelected ||
            p.id !== config.addonProduct),
      )
    : [];
  const excludedTotals = cartPreviewTotals(excludedProducts, items, [], empty);
  const rewardValue = Math.max(
    0,
    config.unlockBy === "Item count"
      ? rewardCount - excludedTotals.count
      : rewardTotal - excludedTotals.total,
  );
  const rewards = rewardProgress(
    [
      {
        id: "first",
        title: config.tierTitle,
        threshold: config.threshold,
        kind: "shipping",
      },
      ...config.rewardTiers,
    ],
    rewardValue,
  );
  const translation = config.translations[config.previewLanguage];
  const unlockedIds = rewards.unlocked.map((t) => t.id).join(",");
  useEffect(() => {
    const current = unlockedIds ? unlockedIds.split(",") : [];
    if (
      config.reward &&
      config.celebration !== "None" &&
      current.some((id) => !previousRewards.current.includes(id))
    ) {
      setCelebrationRun({ id: Date.now(), mode: config.celebration });
    }
    previousRewards.current = current;
  }, [unlockedIds, config.reward, config.celebration]);
  useEffect(() => {
    if (!celebrationRun) return;
    const timeout = window.setTimeout(() => setCelebrationRun(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [celebrationRun]);
  useEffect(() => {
    if (!editor || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editor, dirty]);
  const timerText = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const field = (
    label: string,
    key: keyof Config,
    type = "text",
    choices?: string[],
  ) =>
    type === "color" ? (
      <ColorPickerField
        label={label}
        value={String(config[key])}
        showHex={
          label.toLowerCase().includes("color") ||
          label.toLowerCase().includes("text")
        }
        onChange={(value) => update(key, value as never)}
      />
    ) : (
      <label className="cd-field">
        {label}
        {choices ? (
          <select
            value={String(config[key])}
            onChange={(e) => update(key, e.target.value as never)}
          >
            {choices.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={String(config[key])}
            min={type === "number" ? 0 : undefined}
            onChange={(e) =>
              update(
                key,
                (type === "number"
                  ? Number(e.target.value)
                  : e.target.value) as never,
              )
            }
          />
        )}
      </label>
    );
  const check = (label: string, key: keyof Config) => (
    <label className="cd-check">
      <input
        type="checkbox"
        checked={Boolean(config[key])}
        onChange={(e) => update(key, e.target.checked as never)}
      />
      {label}
    </label>
  );
  const panel = (
    name: string,
    content: React.ReactNode,
    toggle?: keyof Config,
  ) => (
    <div className="cd-section cd-addon-editor">
      <details>
        <summary>
          <span className="cd-panel-label">
            <CartIcon name={name} />
            {name}
          </span>
          <span className="cd-chevron" aria-hidden="true">
            <CartIcon name="chevron" />
          </span>
        </summary>
        <div className="cd-fields">{content}</div>
      </details>
      {toggle && (
        <input
          className="cd-toggle"
          aria-label={`Enable ${name}`}
          type="checkbox"
          role="switch"
          checked={Boolean(config[toggle])}
          onChange={(e) => update(toggle, e.target.checked as never)}
        />
      )}
      {toggle &&
        [
          "Announcement",
          "Timer",
          "Reward bar",
          "Products upsell",
          "Body Custom HTML",
          "Discount code",
          "Discount total",
        ].includes(name) && (
          <button
            className="cd-addon-delete"
            aria-label={`Delete ${name}`}
            onClick={() =>
              setConfig((c) => ({
                ...c,
                [toggle]: false,
                ...(name === "Discount code"
                  ? { discountDeleted: true }
                  : name === "Discount total"
                    ? { discountTotalDeleted: true }
                    : {
                        bodyDeleted: [
                          ...new Set([...c.bodyDeleted, toggle as string]),
                        ],
                      }),
              }))
            }
          >
            <CartIcon name="trash" />
          </button>
        )}
    </div>
  );
  const checkoutIcons = [
    "None",
    "arrow",
    "cart",
    "bag",
    "Checkout",
    "lightning",
    "gift",
    "truck",
    "star",
    "heart",
  ];
  const checkoutIcon = config.checkoutCustomIcon ? (
    <img
      className="cd-checkout-custom-icon"
      src={config.checkoutCustomIcon}
      alt=""
    />
  ) : config.checkoutIcon !== "None" ? (
    <CartIcon name={config.checkoutIcon} />
  ) : null;
  const insertCheckoutVariable = (value: string) => {
    const input = checkoutInput.current;
    const start = input?.selectionStart ?? config.checkoutTemplate.length;
    const end = input?.selectionEnd ?? start;
    update(
      "checkoutTemplate",
      config.checkoutTemplate.slice(0, start) +
        value +
        config.checkoutTemplate.slice(end),
    );
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + value.length, start + value.length);
    });
  };
  const checkoutSettings = (
    <>
      <label className="cd-field">
        Text
        <div className="cd-checkout-text-field">
          <input
            ref={checkoutInput}
            value={config.checkoutTemplate}
            onChange={(e) => update("checkoutTemplate", e.target.value)}
            aria-label="Checkout text"
          />
          <details className="cd-checkout-variables">
            <summary aria-label="Add checkout variable">&lt;/&gt;</summary>
            <div>
              <small>Add variable</small>
              <button
                type="button"
                onClick={(e) => {
                  insertCheckoutVariable("{{items_count}}");
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                Items count
              </button>
              <button
                type="button"
                onClick={(e) => {
                  insertCheckoutVariable("{{cart_total}}");
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                Cart total
              </button>
            </div>
          </details>
        </div>
      </label>
      <div className="cd-checkout-icon-row">
        <span className="cd-checkout-icon-tile">{checkoutIcon}</span>
        <span>Icon</span>
        <button onClick={() => open("Select checkout icon")}>
          ✎ Change icon
        </button>
      </div>
      <h3>Colors</h3>
      <div className="cd-two">
        <ColorPickerField
          label="Background"
          value={
            config.checkoutBg ||
            (config.gradient
              ? gradientValue(config.gradientStops, config.gradientAngle)
              : config.accent)
          }
          onChange={(value) => update("checkoutBg", value)}
        />
        {field("Text color", "checkoutColor", "color")}
        {field("Hover background", "checkoutHoverBg", "color")}
        {field("Hover text", "checkoutHoverColor", "color")}
      </div>
      <h3>Style</h3>
      <div className="cd-two">
        {field("Text size", "checkoutSize", "number")}
        {field("Hover effect", "checkoutEffect", "text", [
          "None",
          "Lift",
          "Shine",
          "Shine + lift",
        ])}
      </div>
      {check("Show trust badges", "trust")}
    </>
  );
  const addonProduct = products.find((p) => p.id === config.addonProduct);
  const toggleAddon = (enabled: boolean) => {
    if (!addonProduct) return;
    setItems((x) => ({
      ...x,
      [addonProduct.id]: Math.max(
        0,
        (x[addonProduct.id] || 0) + (enabled ? 1 : -1),
      ),
    }));
    setAddonSelected(enabled);
    setEmpty(false);
  };
  const addonSettings = (
    <>
      <div
        className={`cd-addon-picker ${addonProduct ? "cd-addon-picked" : ""}`}
      >
        {addonProduct && (
          <div className="cd-addon-thumbnail">
            {config.addonImage ? (
              <img src={config.addonImage} alt="Addon" />
            ) : (
              <ProductImage />
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setSelection(config.addonProduct ? [config.addonProduct] : []);
            setQuery("");
            open("Select addon product");
          }}
        >
          {addonProduct?.name || "No product selected"}{" "}
          <CartIcon name="chevron" />
        </button>
        {addonProduct && (
          <label className="cd-addon-replace">
            ✎ Replace image
            <input
              type="file"
              accept="image/*"
              aria-label="Replace addon image"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2000000) {
                  setNotice("Choose an image smaller than 2 MB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () =>
                  update("addonImage", String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
          </label>
        )}
      </div>
      <div className="cd-two">
        {field("Title", "addonTitle")}
        {field("Subtitle", "addonSubtitle")}
        {field("Title size", "addonTitleSize", "number")}
        {field("Subtitle size", "addonSubtitleSize", "number")}
      </div>
      {check("Include in reward threshold", "addonReward")}
      <h3>Colors</h3>
      <div className="cd-three">
        {field("Title color", "addonTitleColor", "color")}
        {field("Subtitle color", "addonSubtitleColor", "color")}
        {field("Background", "addonBg", "color")}
        {field("Price", "addonPriceColor", "color")}
        {field("Compare-at price", "addonCompareColor", "color")}
        {field("Toggle button", "addonToggleColor", "color")}
        {field("Image size", "addonImageSize", "number")}
        {field("Border style", "addonBorderStyle", "text", [
          "Solid",
          "Dashed",
          "Dotted",
          "None",
        ])}
        {field("Border", "addonBorder", "color")}
      </div>
    </>
  );
  const bodyPanels = {
    announcement: panel(
      "Announcement",
      <>
        {field("Text", "announcementText")}
        <div className="cd-three">
          {field("Text size", "announcementSize", "number")}
          {field("Background", "announcementBg", "color")}
          {field("Text color", "announcementColor", "color")}
        </div>
        <div className="cd-two">
          {field("Top padding", "announcementTop", "number")}
          {field("Bottom padding", "announcementBottom", "number")}
        </div>
      </>,
      "announcement",
    ),
    timer: panel(
      "Timer",
      <>
        <fieldset>
          <legend>After timer ends</legend>
          {[
            "Hide the timer",
            "Repeat the timer",
            "Show message",
            "Remove all items from cart",
          ].map((t) => (
            <label key={t} className="cd-check">
              <input
                type="radio"
                name="timer-end"
                checked={config.timerEnd === t}
                onChange={() => update("timerEnd", t)}
              />
              {t}
            </label>
          ))}
        </fieldset>
        <div className="cd-two">
          {field("Timer (minutes)", "minutes", "number")}
          {field("Title", "timerTitle")}
        </div>
        <div className="cd-three">
          {field("Background", "timerBg", "color")}
          {field("Text color", "timerColor", "color")}
          {field("Timer color", "timerNumber", "color")}
        </div>
        <div className="cd-two">
          {field("Top padding", "timerTop", "number")}
          {field("Bottom padding", "timerBottom", "number")}
        </div>
      </>,
      "timer",
    ),
    reward: panel(
      "Reward bar",
      <>
        <h3>Content</h3>
        {field("In-progress message", "rewardMessage")}
        {field("All promotions unlocked message", "rewardUnlocked")}
        {field("Text align", "rewardAlign", "text", [
          "left",
          "center",
          "right",
        ])}
        <hr />
        <h3>Tiers</h3>
        {field("Unlock by", "unlockBy", "text", ["Cart total", "Item count"])}
        <p className="cd-info">
          Reward thresholds use the cart subtotal before discounts.
        </p>
        <div className="cd-two">
          {field("Tier title", "tierTitle")}
          {field("Threshold", "threshold", "number")}
        </div>
        <button
          onClick={() => {
            update("rewardTiers", [
              ...config.rewardTiers,
              {
                id: crypto.randomUUID(),
                title: `Reward ${config.rewardTiers.length + 2}`,
                threshold:
                  Math.max(
                    config.threshold,
                    ...config.rewardTiers.map((t) => t.threshold),
                  ) + 50,
                kind: "discount",
              },
            ]);
          }}
        >
          ⊕ Add tier
        </button>
        {config.rewardTiers.map((tier, index) => (
          <div className="cd-reward-tier" key={tier.id}>
            <h4>Tier {index + 2}</h4>
            <label className="cd-field">
              Reward type
              <select
                value={tier.kind}
                onChange={(e) =>
                  update(
                    "rewardTiers",
                    config.rewardTiers.map((t) =>
                      t.id === tier.id
                        ? { ...t, kind: e.target.value as RewardTier["kind"] }
                        : t,
                    ),
                  )
                }
              >
                <option value="shipping">Free shipping</option>
                <option value="discount">Order discount</option>
                <option value="gift">Free gift</option>
              </select>
            </label>
            <label className="cd-field">
              Tier title
              <input
                value={tier.title}
                onChange={(e) =>
                  update(
                    "rewardTiers",
                    config.rewardTiers.map((t) =>
                      t.id === tier.id ? { ...t, title: e.target.value } : t,
                    ),
                  )
                }
              />
            </label>
            <label className="cd-field">
              Tier threshold
              <input
                type="number"
                min={1}
                value={tier.threshold}
                onChange={(e) =>
                  update(
                    "rewardTiers",
                    config.rewardTiers.map((t) =>
                      t.id === tier.id
                        ? {
                            ...t,
                            threshold: Math.max(1, Number(e.target.value)),
                          }
                        : t,
                    ),
                  )
                }
              />
            </label>
            <button
              aria-label={`Remove reward tier ${index + 2}`}
              onClick={() =>
                update(
                  "rewardTiers",
                  config.rewardTiers.filter((t) => t.id !== tier.id),
                )
              }
            >
              Remove tier
            </button>
          </div>
        ))}
        {check("Exclude products from being counted", "exclude")}
        {config.exclude && (
          <>
            <button
              onClick={() => {
                setSelection(config.rewardExcluded);
                open("Select reward exclusions");
              }}
            >
              Select excluded products
            </button>
            <small>{config.rewardExcluded.length} excluded products</small>
          </>
        )}
        <h3>Styles</h3>
        <div className="cd-three">
          {field("Background", "rewardBg", "color")}
          {field("Text color", "rewardColor", "color")}
          {field("Bar background", "barBg", "color")}
          {field("Bar fill", "barFill", "color")}
          {field("Locked tier", "locked", "color")}
          {field("Unlocked tier", "unlocked", "color")}
          {field("Unlocked icon", "unlockedIcon", "color")}
          {field("Milestone background", "milestoneBg", "color")}
          {field("Milestone border", "milestoneBorder", "color")}
          {field("Top padding", "rewardTop", "number")}
          {field("Bottom padding", "rewardBottom", "number")}
          {field("Bar height", "barHeight", "number")}
          {field("Milestone size", "milestoneSize", "number")}
          {field("Tier text size", "tierTextSize", "number")}
          {field("Milestone spacing", "spacing", "text", [
            "Spaced by threshold",
            "Evenly spaced",
          ])}
        </div>
        {check("Show tier thresholds under milestones", "thresholds")}
        {field("Celebrate animation", "celebration", "text", [
          "None",
          "One side cannon",
          "Screen fireworks",
          "School pride",
          "Ring pulse",
        ])}
        <button
          disabled={config.celebration === "None" || !config.reward}
          onClick={() =>
            setCelebrationRun({ id: Date.now(), mode: config.celebration })
          }
        >
          Preview celebration
        </button>
      </>,
      "reward",
    ),
    items: panel(
      "Line items",
      <>
        {check("Show compare-at prices", "compare")}
        <button onClick={() => open("Select products")}>
          Choose preview products
        </button>
        <p>Quantity and remove controls work in the cart preview.</p>
        {check("Custom HTML when cart is empty", "emptyHtml")}
        {config.emptyHtml && (
          <CustomHtmlSettings
            html={config.emptyHtmlContent}
            css={config.emptyHtmlCss}
            onHtml={(v) => update("emptyHtmlContent", v)}
            onCss={(v) => update("emptyHtmlCss", v)}
          />
        )}
      </>,
    ),
    upsell: panel(
      "Products upsell",
      <UpsellSettings
        config={config.upsellSettings}
        products={products}
        onChange={(value) => update("upsellSettings", value)}
      />,
      "upsell",
    ),
    bodyHtml: panel(
      "Body Custom HTML",
      <CustomHtmlSettings
        html={config.bodyHtmlContent}
        css={config.bodyHtmlCss}
        onHtml={(v) => update("bodyHtmlContent", v)}
        onCss={(v) => update("bodyHtmlCss", v)}
      />,
      "bodyHtml",
    ),
  };
  const previewBlocks = {
    announcement: config.announcement && (
      <div
        className="cd-live-announcement"
        style={{
          background: config.announcementBg,
          color: solidColor(config.announcementColor),
          fontSize: config.announcementSize,
          paddingTop: config.announcementTop,
          paddingBottom: config.announcementBottom,
        }}
      >
        <span style={textPaint(config.announcementColor)}>
          {config.announcementText}
        </span>
      </div>
    ),
    timer: config.timer &&
      (seconds > 0 || config.timerEnd === "Show message") && (
        <div
          className="cd-live-announcement"
          style={{
            background: config.timerBg,
            color: solidColor(config.timerColor),
            paddingTop: config.timerTop,
            paddingBottom: config.timerBottom,
          }}
        >
          <span style={textPaint(config.timerColor)}>
            {seconds > 0
              ? config.timerTitle.split("{{timer}}").map((part, i) => (
                  <Fragment key={i}>
                    {i > 0 && (
                      <span style={textPaint(config.timerNumber)}>
                        {timerText}
                      </span>
                    )}
                    {part}
                  </Fragment>
                ))
              : "Reservation ended"}
          </span>
        </div>
      ),
    reward: config.reward && (
      <div
        className="cd-live-reward"
        style={{
          background: config.rewardBg,
          color: solidColor(config.rewardColor),
          textAlign: config.rewardAlign as "center",
          paddingTop: config.rewardTop,
          paddingBottom: config.rewardBottom,
        }}
      >
        <p style={textPaint(config.rewardColor)}>
          {!rewards.next
            ? config.rewardUnlocked
            : config.rewardMessage
                .replaceAll(
                  "{{amount_remaining}}",
                  config.unlockBy === "Item count"
                    ? String(rewards.remaining)
                    : `$${rewards.remaining.toFixed(2)}`,
                )
                .replaceAll("{{next_tier_title}}", rewards.next.title)}
        </p>
        <div
          role="progressbar"
          aria-label="Reward progress"
          aria-valuenow={Math.round(rewards.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            background: config.barBg,
            height: config.barHeight,
            marginTop: config.milestoneSize / 2,
          }}
        >
          <span
            style={{
              background: config.barFill,
              width: `${rewards.percent}%`,
            }}
          />
        </div>
        <div
          className="cd-reward-milestones"
          style={{
            fontSize: config.tierTextSize,
            marginTop: -(config.barHeight + config.milestoneSize) / 2,
            height: config.milestoneSize + 34,
          }}
        >
          {rewards.tiers.map((t, index) => (
            <div
              key={t.id}
              style={{
                color:
                  rewardValue >= t.threshold ? config.unlocked : config.locked,
                position: "absolute",
                left: `clamp(${config.milestoneSize / 2}px, ${config.spacing === "Evenly spaced" ? ((index + 1) / rewards.tiers.length) * 100 : (t.threshold / (rewards.tiers.at(-1)?.threshold || 1)) * 100}%, calc(100% - ${config.milestoneSize / 2}px))`,
                transform: "translateX(-50%)",
              }}
            >
              <span
                style={{
                  width: config.milestoneSize,
                  height: config.milestoneSize,
                  background:
                    rewardValue >= t.threshold
                      ? solidColor(config.unlocked)
                      : config.milestoneBg,
                  color:
                    rewardValue >= t.threshold
                      ? solidColor(config.unlockedIcon)
                      : solidColor(config.locked),
                  borderColor: solidColor(config.milestoneBorder),
                }}
              >
                <CartIcon
                  name={
                    t.kind === "shipping"
                      ? "truck"
                      : t.kind === "gift"
                        ? "gift"
                        : "tag"
                  }
                />
              </span>
              <small>
                {t.title}
                {config.thresholds ? ` · ${t.threshold}` : ""}
              </small>
            </div>
          ))}
        </div>
      </div>
    ),
    items:
      empty ||
      !selectedProducts.length ||
      (config.timer &&
        seconds === 0 &&
        config.timerEnd === "Remove all items from cart") ? (
        <div className="cd-empty">
          <h3>Your cart is empty</h3>
          {config.emptyHtml && (
            <CustomHtmlPreview
              html={config.emptyHtmlContent}
              css={config.emptyHtmlCss}
            />
          )}
          <button
            onClick={() => {
              setEmpty(false);
              setItems({ ridge: 1, engraved: 1 });
            }}
          >
            Continue shopping
          </button>
        </div>
      ) : (
        selectedProducts.map((p) => (
          <article className={`cd-line cd-size-${config.size}`} key={p.id}>
            <div
              className="cd-product-image"
              style={{
                borderRadius: config.imageRadius,
                border: config.imageStyle === "Plain" ? "none" : undefined,
                height: config.imageRatio === "Portrait" ? 96 : undefined,
              }}
            >
              <ProductImage />
            </div>
            <div className="cd-product-copy">
              <strong>{p.name}</strong>
              {p.variant && <small>{p.variant}</small>}
              {previewModes.plan && (
                <small className="cd-selling-plan">
                  Subscribe & save · Monthly delivery
                </small>
              )}
              <div className="cd-quantity">
                <button
                  aria-label={`Decrease ${p.variant || p.name} quantity`}
                  onClick={() =>
                    setItems((x) => ({
                      ...x,
                      [p.id]: Math.max(0, x[p.id] - 1),
                    }))
                  }
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={999}
                  aria-label={`Quantity for ${p.variant || p.name}`}
                  value={items[p.id]}
                  onChange={(e) =>
                    setItems((x) => ({
                      ...x,
                      [p.id]: normalizeQuantity(Number(e.target.value)),
                    }))
                  }
                />
                <button
                  aria-label={`Increase ${p.variant || p.name} quantity`}
                  onClick={() =>
                    setItems((x) => ({ ...x, [p.id]: x[p.id] + 1 }))
                  }
                >
                  +
                </button>
              </div>
            </div>
            <div className="cd-line-price">
              <button
                aria-label={`Remove ${p.variant || p.name}`}
                onClick={() => setItems((x) => ({ ...x, [p.id]: 0 }))}
              >
                <CartIcon name="trash" />
              </button>
              {config.compare && p.compare > p.price && (
                <s>${(p.compare * items[p.id]).toFixed(2)}</s>
              )}
              <strong>${(p.price * items[p.id]).toFixed(2)}</strong>
            </div>
          </article>
        ))
      ),
    upsell: config.upsell && (
      <UpsellPreview
        config={config.upsellSettings}
        products={products}
        cart={empty ? [] : selectedProducts.map((p) => p.id)}
        image={<ProductImage />}
        onAdd={(id) => {
          setItems((x) =>
            empty ? { [id]: 1 } : { ...x, [id]: (x[id] || 0) + 1 },
          );
          setEmpty(false);
        }}
      />
    ),
    bodyHtml: config.bodyHtml && (
      <CustomHtmlPreview
        html={config.bodyHtmlContent}
        css={config.bodyHtmlCss}
      />
    ),
  };
  return (
    <div className="ss-dashboard cb-page cd-page">
      <header className="ss-topbar">
        <Link to={homeHref} className="ss-brand">
          <span className="ss-brand-icon">S</span>Section Store
        </Link>
        {editor && dirty && (
          <div className="cd-savebar">
            <span>Unsaved changes</span>
            <button
              onClick={() => {
                setConfig(saved);
                setSeconds(saved.minutes * 60);
              }}
            >
              Discard
            </button>
            <button onClick={() => void saveDraft()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
        <div className="ss-topbar-actions">
          <button
            className="ss-pill"
            onClick={() => open("Section Store Plus")}
          >
            Try Plus Free
          </button>
          <button
            className="ss-pill"
            aria-label="Page information"
            onClick={() => open("About Cart Drawer")}
          >
            •••
          </button>
        </div>
      </header>
      {!editor ? (
        <main className="cb-main">
          <div className="cb-heading">
            <div>
              <h1>Cart Drawer</h1>
              <p>
                Create a global cart drawer with order upsells, discount codes,
                reward bars and more.
              </p>
            </div>
            <button
              className="cb-plus"
              onClick={() => open("Section Store Plus")}
            >
              <span>＋</span>Section Store Plus
            </button>
          </div>
          <nav className="cb-tabs" aria-label="Plus toolkit">
            <Link className="bp-tab" to={`${base}/conversion-blocks`}>
              Conversion Blocks
            </Link>
            <Link className="bp-tab" to={`${base}/bundles`}>
              Bundles / Quantity Breaks
            </Link>
            <button className="cb-dark" aria-current="page">
              Cart Drawer
            </button>
            <button onClick={() => open("Section Store Plus")}>
              Subscribe
            </button>
            <Link className="bp-tab bp-ab" to={`${base}/ab-tests?surface=cart`}>
              A/B Tests
            </Link>
            <button onClick={() => open("Translations")}>♧ Translations</button>
          </nav>
          <section className="cb-panel bp-intro">
            <div className="bp-copy">
              <h2>Create your first cart drawer</h2>
              <p>
                The cart slides in on the page they&apos;re already on, instead
                of sending shoppers to a cart page. AI-picked upsells show when
                they&apos;re ready to buy, so average order value goes up.
              </p>
              <ul>
                <li>
                  Order addons, product upsells, discount codes, and reward bars
                </li>
                <li>AI-picked upsells that increase average order value</li>
                <li>Stays on the page, so checkout feels faster</li>
              </ul>
              <p>
                Configure and preview your cart drawer now.{" "}
                <button
                  className="bp-inline"
                  onClick={() => open("Section Store Plus")}
                >
                  Upgrade to Plus
                </button>{" "}
                when you are ready to enable it on your live store.
              </p>
              <div className="bp-actions">
                <button
                  className="cb-dark"
                  onClick={() => navigate(`${base}/cart-drawer/new`)}
                >
                  {hasDraft ? "Edit cart drawer" : "Create cart drawer"}
                </button>
                <button onClick={() => open("Create from screenshot")}>
                  ✦ Create from screenshot
                </button>
                <button
                  className="bp-plan"
                  onClick={() => open("Section Store Plus")}
                >
                  Choose a plan
                </button>
              </div>
            </div>
            <button
              className="bp-video"
              aria-label="Watch Cart Drawer Setup"
              onClick={() => open("Cart Drawer Setup")}
            >
              <svg viewBox="1208 361 318 180">
                <image href={reference} width="1920" height="1080" />
              </svg>
            </button>
          </section>
        </main>
      ) : (
        <div
          className={`cd-editor ${config.position === "left" ? "cd-preview-left" : ""}`}
          style={
            {
              "--cd-preview-width": `${Math.max(280, Math.min(config.width, 600))}px`,
            } as CSSProperties
          }
        >
          <main className="cd-controls">
            <div className="cd-editor-title">
              <Link to={`${base}/cart-drawer`} aria-label="Back to Cart Drawer">
                ←
              </Link>
              <h1>{config.name}</h1>
              <span>Disabled in app</span>
              <button
                aria-label="Enable cart on live store"
                onClick={() => open("Section Store Plus")}
              >
                ◯
              </button>
            </div>
            <div className="cd-unlock">
              <span className="cd-cart-icon">
                <CartIcon name="cart" />
              </span>
              <div>
                <strong>
                  Unlock Cart Drawer <small>＋ PLUS</small>
                </strong>
                <p>Your cart stays off until you start Plus.</p>
              </div>
              <button onClick={() => open("Section Store Plus")}>
                → Upgrade to Plus
              </button>
            </div>
            <div className="cd-segment">
              {["Settings", "AI assistant"].map((t) => (
                <button
                  key={t}
                  aria-pressed={tab === t}
                  onClick={() => setTab(t)}
                >
                  {t === "Settings" && <CartIcon name="Settings" />} {t}
                </button>
              ))}
            </div>
            {tab === "AI assistant" ? (
              <section className="cd-ai">
                <h2>Design your cart with AI</h2>
                <p>
                  Describe your preferred style to try a sample configuration.
                </p>
                <textarea
                  aria-label="Cart design prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="A minimal cart with free shipping rewards…"
                />
                <button
                  className="cb-dark"
                  disabled={!aiPrompt.trim()}
                  onClick={() => {
                    setConfig((c) => ({
                      ...c,
                      reward: true,
                      announcement: true,
                      rounded: true,
                    }));
                    setNotice(
                      "Sample style applied to preview. AI generation is not connected.",
                    );
                  }}
                >
                  Apply sample style
                </button>
              </section>
            ) : (
              <>
                <h2 className="cd-group">
                  <CartIcon name="Preview" />
                  Preview
                </h2>
                {panel(
                  "Preview",
                  <>
                    <div className="cd-segment">
                      <button
                        aria-pressed={!empty}
                        onClick={() => setEmpty(false)}
                      >
                        Filled cart
                      </button>
                      <button
                        aria-pressed={empty}
                        onClick={() => setEmpty(true)}
                      >
                        Empty cart
                      </button>
                    </div>
                    <div className="cd-preview-options">
                      <button
                        className="cd-select-items"
                        onClick={() => {
                          setSelection(
                            Object.keys(items).filter((id) => items[id] > 0),
                          );
                          open("Select products");
                        }}
                      >
                        <span>Select cart items</span>
                        <CartIcon name="chevron" />
                      </button>
                      <details className="cd-preview-menu">
                        <summary>
                          Preview <CartIcon name="chevron" />
                        </summary>
                        <div>
                          {(
                            [
                              ["discount", "Discount code"],
                              ["error", "Cart error"],
                              ["plan", "Selling plan"],
                            ] as const
                          ).map(([key, label]) => (
                            <label key={key}>
                              <input
                                type="checkbox"
                                checked={previewModes[key]}
                                onChange={(e) => {
                                  setPreviewModes((x) => ({
                                    ...x,
                                    [key]: e.target.checked,
                                  }));
                                  setShowPreview(true);
                                }}
                              />
                              <span className="cd-option-check">
                                {previewModes[key] && <CartIcon name="check" />}
                              </span>
                              {label}
                            </label>
                          ))}
                        </div>
                      </details>
                    </div>
                    <label className="cd-field">
                      Preview market
                      <select
                        value={market}
                        onChange={(e) => setMarket(e.target.value)}
                      >
                        {[
                          "Pakistan",
                          "United States",
                          "United Kingdom",
                          "Canada",
                        ].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                  </>,
                )}
                <h2 className="cd-group">
                  <CartIcon name="Settings" />
                  General
                </h2>
                {panel(
                  "Settings",
                  <>
                    {field("Cart name", "name")}
                    <fieldset>
                      <legend>Cart position</legend>
                      {["right", "left"].map((p) => (
                        <label key={p} className="cd-check">
                          <input
                            type="radio"
                            name="position"
                            checked={config.position === p}
                            onChange={() => update("position", p)}
                          />
                          Slide from {p}
                        </label>
                      ))}
                    </fieldset>
                    {check("Open drawer when products are added", "openAdd")}
                    {check(
                      "Open drawer when cart icons are clicked",
                      "openIcon",
                    )}
                    {check("Use product compare-at price", "compare")}
                    {check(
                      "Keep page accessible while cart is open",
                      "accessible",
                    )}
                    {check("Floating cart", "floating")}
                    <p className="cd-setting-help">
                      Desktop only: the cart floats with all four corners
                      rounded and a shadow.
                    </p>
                    {check("Rounded corners", "rounded")}
                  </>,
                )}
                {panel(
                  "Styles",
                  <CartStyles
                    config={config}
                    onChange={(patch) =>
                      setConfig((c) => ({
                        ...c,
                        ...patch,
                        titleBg: patch.bg ?? c.titleBg,
                        titleColor: patch.text ?? c.titleColor,
                      }))
                    }
                  />,
                )}
                <h2 className="cd-group">
                  <CartIcon name="Header" />
                  Header
                </h2>
                {panel(
                  "Top bar",
                  <>
                    <div className="cd-header-title-field">
                      {field("Title", "title")}
                      <details className="cd-header-variable-menu">
                        <summary aria-label="Insert title variable">
                          &lt;/&gt;
                        </summary>
                        <div>
                          <strong>Add variable</strong>
                          {[
                            ["Items count", "{{items_count}}"],
                            ["Cart total", "{{cart_total}}"],
                          ].map(([label, token]) => (
                            <button
                              key={token}
                              onClick={(e) => {
                                update("title", `${config.title} ${token}`);
                                e.currentTarget
                                  .closest("details")
                                  ?.removeAttribute("open");
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>
                    <div className="cd-header-icon-setting">
                      <span className="cd-header-icon-sample">
                        {config.headerCustomIcon ? (
                          <img
                            src={config.headerCustomIcon}
                            alt="Header icon"
                          />
                        ) : config.headerIcon !== "None" ? (
                          <CartIcon name={config.headerIcon} />
                        ) : null}
                      </span>
                      <span>Image icon</span>
                      <button onClick={() => open("Select icon")}>
                        Change icon
                      </button>
                    </div>
                    <div className="cd-two">
                      <div>
                        <p>Text align</p>
                        <div
                          className="cd-header-segment"
                          role="radiogroup"
                          aria-label="Text align"
                        >
                          {["left", "center", "right"].map((align) => (
                            <button
                              key={align}
                              role="radio"
                              aria-label={align}
                              aria-checked={config.align === align}
                              onClick={() => update("align", align)}
                            >
                              <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path
                                  d={`M3 5h14M${align === "right" ? 7 : align === "center" ? 5 : 3} 9h10M3 13h14M${align === "right" ? 7 : align === "center" ? 5 : 3} 17h10`}
                                />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p>Icon position</p>
                        <div
                          className="cd-header-segment"
                          role="radiogroup"
                          aria-label="Icon position"
                        >
                          {[
                            { value: "bar", label: "Align to left of bar" },
                            {
                              value: "alongside",
                              label: "Left alongside title",
                            },
                          ].map((position, index) => (
                            <button
                              key={position.value}
                              role="radio"
                              aria-label={position.label}
                              aria-checked={
                                config.headerIconPosition === position.value
                              }
                              onClick={() =>
                                update("headerIconPosition", position.value)
                              }
                            >
                              <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path
                                  d={
                                    index === 0
                                      ? "M3 5h14M3 9h10M3 13h14M3 17h10"
                                      : "M3 5h14M6 9h11M3 13h14M6 17h11"
                                  }
                                />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="cd-three">
                      {field("Text size", "titleSize", "number")}
                      {field("Background", "titleBg", "color")}
                      {field("Text color", "titleColor", "color")}
                    </div>
                  </>,
                )}
                <h2 className="cd-group">
                  <CartIcon name="Body" />
                  Body
                </h2>
                <CartBlockOrder
                  section="Body"
                  order={config.bodyOrder.filter(
                    (id) => !config.bodyDeleted.includes(id),
                  )}
                  names={bodyNames}
                  render={(id) => bodyPanels[id]}
                  onChange={(bodyOrder, message) => {
                    update("bodyOrder", bodyOrder);
                    setNotice(message);
                  }}
                />
                <button
                  className="cd-add"
                  onClick={() => {
                    setAddTarget("body");
                    open("Add block");
                  }}
                >
                  <CartIcon name="plus" /> Add block
                </button>
                <h2 className="cd-group">
                  <CartIcon name="Footer" />
                  Footer
                </h2>
                <CartBlockOrder
                  section="Footer"
                  order={config.footerOrder.filter(
                    (id) =>
                      (id !== "discount" || !config.discountDeleted) &&
                      (id !== "discountTotal" ||
                        !config.discountTotalDeleted) &&
                      (id !== "addon" || !config.addonDeleted) &&
                      (id !== "note" || !config.noteDeleted) &&
                      (id !== "payments" || !config.paymentsDeleted) &&
                      (id !== "trust" || !config.trustDeleted) &&
                      (id !== "html" || !config.htmlDeleted),
                  )}
                  names={footerNames}
                  render={(id) =>
                    id === "html" ? (
                      <div className="cd-addon-editor">
                        {panel(
                          "Custom HTML",
                          <CustomHtmlSettings
                            html={config.htmlContent}
                            css={config.htmlCss}
                            onHtml={(value) => update("htmlContent", value)}
                            onCss={(value) => update("htmlCss", value)}
                          />,
                          "html",
                        )}
                        <button
                          className="cd-addon-delete"
                          aria-label="Delete Custom HTML"
                          onClick={() =>
                            setConfig((c) => ({
                              ...c,
                              html: false,
                              htmlDeleted: true,
                            }))
                          }
                        >
                          <CartIcon name="trash" />
                        </button>
                      </div>
                    ) : id === "discount" ? (
                      panel(
                        "Discount code",
                        <DiscountSettings
                          config={config.discountSettings}
                          onChange={(value) =>
                            update("discountSettings", value)
                          }
                        />,
                        "discount",
                      )
                    ) : id === "discountTotal" ? (
                      panel(
                        "Discount total",
                        <div className="cd-two">
                          {field("Title", "discountTotalTitle")}
                          {field("Title color", "discountTotalColor", "color")}
                        </div>,
                        "discountTotal",
                      )
                    ) : id === "addon" ? (
                      <div className="cd-addon-editor">
                        {panel("Order addon", addonSettings, "addon")}
                        <button
                          className="cd-addon-delete"
                          aria-label="Delete Order addon"
                          onClick={() => {
                            if (addonSelected) toggleAddon(false);
                            setConfig((c) => ({
                              ...c,
                              addon: false,
                              addonDeleted: true,
                            }));
                          }}
                        >
                          <CartIcon name="trash" />
                        </button>
                      </div>
                    ) : id === "note" ? (
                      <div className="cd-addon-editor">
                        {panel(
                          "Order note",
                          <>
                            {field("Title", "noteTitle")}
                            {field("Placeholder", "notePlaceholder")}
                            <div className="cd-two">
                              {check("Make it collapsible", "noteCollapsible")}
                              <label className="cd-field">
                                <span className="dc-sr">
                                  Note default expansion
                                </span>
                                <select
                                  aria-label="Note default expansion"
                                  disabled={!config.noteCollapsible}
                                  value={
                                    config.noteExpanded
                                      ? "expanded"
                                      : "collapsed"
                                  }
                                  onChange={(e) =>
                                    update(
                                      "noteExpanded",
                                      e.target.value === "expanded",
                                    )
                                  }
                                >
                                  <option value="expanded">
                                    Expanded by default
                                  </option>
                                  <option value="collapsed">
                                    Collapsed by default
                                  </option>
                                </select>
                              </label>
                            </div>
                            <h3>Style</h3>
                            <h3>Title</h3>
                            <div className="cd-three">
                              {field("Color", "noteColor", "color")}
                              {field("Font weight", "noteWeight", "text", [
                                "Normal",
                                "Medium",
                                "Semibold",
                                "Bold",
                              ])}
                            </div>
                            <h3>Input</h3>
                            <div className="cd-three">
                              {field("Background", "noteBg", "color")}
                              {field("Text", "noteText", "color")}
                              {field("Border", "noteBorder", "color")}
                            </div>
                          </>,
                          "note",
                        )}
                        <button
                          className="cd-addon-delete"
                          aria-label="Delete Order note"
                          onClick={() =>
                            setConfig((c) => ({
                              ...c,
                              note: false,
                              noteDeleted: true,
                            }))
                          }
                        >
                          <CartIcon name="trash" />
                        </button>
                      </div>
                    ) : id === "subtotal" ? (
                      panel(
                        "Subtotal",
                        <>
                          {field("Title", "subtotalTitle")}
                          {field("Subtitle", "subtotalSubtitle")}
                          {check("Show compare-at price", "subtotalCompare")}
                          <h3>Styles</h3>
                          <div className="cd-two">
                            {field("Text size", "subtotalSize", "number")}
                            {field("Text color", "subtotalColor", "color")}
                          </div>
                        </>,
                      )
                    ) : id === "payments" ? (
                      <div className="cd-addon-editor">
                        {panel(
                          "Payment icons",
                          <PaymentSettings
                            config={config.paymentSettings}
                            onChange={(value) =>
                              update("paymentSettings", value)
                            }
                          />,
                          "payments",
                        )}
                        <button
                          className="cd-addon-delete"
                          aria-label="Delete Payment icons"
                          onClick={() =>
                            setConfig((c) => ({
                              ...c,
                              payments: false,
                              paymentsDeleted: true,
                            }))
                          }
                        >
                          <CartIcon name="trash" />
                        </button>
                      </div>
                    ) : id === "trust" ? (
                      <div className="cd-addon-editor">
                        {panel(
                          "Trust badges",
                          <TrustSettings
                            config={config.trustSettings}
                            onChange={(value) => update("trustSettings", value)}
                            onFacts={() =>
                              setNotice(
                                "Store facts are not connected. Add verified shipping, return or review information manually.",
                              )
                            }
                          />,
                          "trust",
                        )}
                        <button
                          className="cd-addon-delete"
                          aria-label="Delete Trust badges"
                          onClick={() =>
                            setConfig((c) => ({
                              ...c,
                              trust: false,
                              trustDeleted: true,
                            }))
                          }
                        >
                          <CartIcon name="trash" />
                        </button>
                      </div>
                    ) : id === "checkout" ? (
                      panel("Checkout button", checkoutSettings)
                    ) : null
                  }
                  onChange={(footerOrder, message) => {
                    update("footerOrder", footerOrder);
                    setNotice(message);
                  }}
                />
                <button
                  className="cd-add"
                  onClick={() => {
                    setAddTarget("footer");
                    open("Add block");
                  }}
                >
                  <CartIcon name="plus" /> Add block
                </button>
              </>
            )}
            {notice && !modal && (
              <p className="cd-status" role="status">
                {notice}
              </p>
            )}
            <p className="cd-footnote">
              Design preview · Save keeps your design and block order in this
              browser.
            </p>
          </main>
          {showPreview ? (
            <aside
              className={`cd-live ${config.floating ? "cd-floating" : ""} ${config.rounded ? "cd-rounded" : ""}`}
              style={
                {
                  background: config.bg,
                  color: config.text,
                  maxWidth: Math.max(280, Math.min(config.width, 600)),
                  "--cd-muted": config.muted,
                  "--cd-soft": config.soft,
                  "--cd-accent": config.accent,
                } as CSSProperties
              }
              aria-label="Cart preview"
            >
              {celebrationRun &&
                config.reward &&
                config.celebration !== "None" && (
                  <CartCelebration
                    mode={celebrationRun.mode}
                    id={celebrationRun.id}
                  />
                )}
              <header
                style={{
                  background: config.titleBg,
                  color: solidColor(config.titleColor),
                  position: "relative",
                }}
              >
                <h2
                  className="cart-title"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent:
                      config.align === "center"
                        ? "center"
                        : config.align === "right"
                          ? "flex-end"
                          : "flex-start",
                    paddingLeft:
                      config.headerIconPosition === "bar" &&
                      config.align === "left" &&
                      (config.headerCustomIcon || config.headerIcon !== "None")
                        ? 32
                        : 0,
                    fontSize: config.titleSize,
                    ...textPaint(config.titleColor),
                    ...(config.custom ? cartTitleStyles(config.css) : {}),
                  }}
                >
                  {config.headerIconPosition === "alongside" &&
                    (config.headerCustomIcon ||
                      config.headerIcon !== "None") && (
                      <span
                        className="cd-topbar-icon"
                        data-header-icon-position="alongside"
                      >
                        {config.headerCustomIcon ? (
                          <img src={config.headerCustomIcon} alt="" />
                        ) : (
                          <CartIcon name={config.headerIcon} />
                        )}
                      </span>
                    )}
                  {(translation?.title || config.title)
                    .replaceAll("{{items_count}}", String(count))
                    .replaceAll("{{cart_total}}", `$${subtotal.toFixed(2)}`)}
                </h2>
                {config.headerIconPosition === "bar" &&
                  (config.headerCustomIcon || config.headerIcon !== "None") && (
                    <span
                      className="cd-topbar-icon cd-topbar-icon-fixed"
                      data-header-icon-position="bar"
                    >
                      {config.headerCustomIcon ? (
                        <img src={config.headerCustomIcon} alt="" />
                      ) : (
                        <CartIcon name={config.headerIcon} />
                      )}
                    </span>
                  )}
                <button
                  aria-label="Close cart preview"
                  onClick={() => setShowPreview(false)}
                >
                  <CartIcon name="close" />
                </button>
              </header>
              <div className="cd-live-body">
                {config.bodyOrder
                  .filter((id) => !config.bodyDeleted.includes(id))
                  .map((id) => (
                    <div key={id} data-preview-block={id}>
                      {previewBlocks[id]}
                    </div>
                  ))}
              </div>
              {!empty && count > 0 && (
                <footer>
                  {previewModes.error && (
                    <p
                      className="cd-cart-error"
                      role="status"
                      style={{
                        background: config.errorBg,
                        color: solidColor(config.errorColor),
                        fontSize: config.errorSize,
                      }}
                    >
                      <span style={textPaint(config.errorColor)}>
                        Some items are unavailable. Please update your cart to
                        continue.
                      </span>
                    </p>
                  )}
                  {config.footerOrder
                    .filter(
                      (id) =>
                        (id !== "discount" || !config.discountDeleted) &&
                        (id !== "discountTotal" ||
                          !config.discountTotalDeleted) &&
                        (id !== "addon" || !config.addonDeleted) &&
                        (id !== "note" || !config.noteDeleted) &&
                        (id !== "payments" || !config.paymentsDeleted) &&
                        (id !== "trust" || !config.trustDeleted) &&
                        (id !== "html" || !config.htmlDeleted),
                    )
                    .map((id) => (
                      <div key={id} data-preview-footer-block={id}>
                        {id === "html" ? (
                          <>
                            {config.html && (
                              <CustomHtmlPreview
                                html={config.htmlContent}
                                css={config.htmlCss}
                              />
                            )}
                          </>
                        ) : id === "discount" ? (
                          <>
                            {config.discount && (
                              <DiscountPreview
                                key={`${config.discountSettings.collapsible}-${config.discountSettings.expanded}`}
                                config={config.discountSettings}
                                codes={discountCodes}
                                onChange={setDiscountCodes}
                              />
                            )}
                          </>
                        ) : id === "discountTotal" ? (
                          <>
                            {config.discountTotal && discountAmount > 0 && (
                              <div
                                className="cd-total cd-discount-total"
                                style={textPaint(config.discountTotalColor)}
                              >
                                <span>{config.discountTotalTitle}</span>
                                <span>-${discountAmount.toFixed(2)}</span>
                              </div>
                            )}
                          </>
                        ) : id === "addon" ? (
                          <>
                            {config.addon && !config.addonDeleted && (
                              <div
                                className="cd-addon-preview"
                                style={{
                                  background: config.addonBg,
                                  borderColor: config.addonBorder,
                                  borderStyle:
                                    config.addonBorderStyle.toLowerCase() as CSSProperties["borderStyle"],
                                }}
                              >
                                <div
                                  className="cd-addon-image"
                                  style={{
                                    width: Math.max(16, config.addonImageSize),
                                    height: Math.max(16, config.addonImageSize),
                                  }}
                                >
                                  {addonProduct ? (
                                    config.addonImage ? (
                                      <img
                                        src={config.addonImage}
                                        alt="Addon"
                                      />
                                    ) : (
                                      <ProductImage />
                                    )
                                  ) : (
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      aria-hidden="true"
                                    >
                                      <path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z" />
                                      <path d="m15 17 2 2 4-4" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <strong
                                    style={{
                                      fontSize: config.addonTitleSize,
                                      ...textPaint(config.addonTitleColor),
                                    }}
                                  >
                                    {config.addonTitle}
                                  </strong>
                                  <small
                                    style={{
                                      fontSize: config.addonSubtitleSize,
                                      ...textPaint(config.addonSubtitleColor),
                                    }}
                                  >
                                    {config.addonSubtitle}
                                  </small>
                                </div>
                                {addonProduct && (
                                  <div className="cd-addon-price">
                                    <span
                                      style={textPaint(config.addonPriceColor)}
                                    >
                                      ${addonProduct.price.toFixed(2)}
                                    </span>{" "}
                                    {addonProduct.compare >
                                      addonProduct.price && (
                                      <s
                                        style={textPaint(
                                          config.addonCompareColor,
                                        )}
                                      >
                                        ${addonProduct.compare.toFixed(2)}
                                      </s>
                                    )}
                                  </div>
                                )}
                                <input
                                  className="cd-addon-switch"
                                  type="checkbox"
                                  role="switch"
                                  aria-label="Add order addon"
                                  checked={addonSelected}
                                  onChange={(e) =>
                                    toggleAddon(e.target.checked)
                                  }
                                  style={
                                    {
                                      "--addon-toggle": config.addonToggleColor,
                                    } as CSSProperties
                                  }
                                  disabled={!addonProduct}
                                />
                              </div>
                            )}
                          </>
                        ) : id === "note" ? (
                          <>
                            {config.note && !config.noteDeleted && (
                              <details
                                key={`${config.noteExpanded}-${config.noteCollapsible}`}
                                className={`cd-note-preview ${config.noteCollapsible ? "" : "cd-note-fixed"}`}
                                open={
                                  !config.noteCollapsible || config.noteExpanded
                                }
                              >
                                <summary
                                  onClick={(e) => {
                                    if (!config.noteCollapsible)
                                      e.preventDefault();
                                  }}
                                  style={{
                                    ...textPaint(config.noteColor),
                                    fontWeight:
                                      {
                                        Normal: 400,
                                        Medium: 500,
                                        Semibold: 600,
                                        Bold: 700,
                                      }[config.noteWeight] || 600,
                                  }}
                                >
                                  {config.noteTitle}
                                  {config.noteCollapsible && (
                                    <span className="cd-note-arrow">⌄</span>
                                  )}
                                </summary>
                                <textarea
                                  aria-label="Order note"
                                  placeholder={config.notePlaceholder}
                                  value={orderNote}
                                  onChange={(e) => setOrderNote(e.target.value)}
                                  style={{
                                    background: config.noteBg,
                                    color: config.noteText,
                                    borderColor: config.noteBorder,
                                  }}
                                />
                              </details>
                            )}
                          </>
                        ) : id === "payments" ? (
                          <>
                            {config.payments && (
                              <PaymentPreview config={config.paymentSettings} />
                            )}
                          </>
                        ) : id === "trust" ? (
                          <>
                            {config.trust && (
                              <TrustPreview config={config.trustSettings} />
                            )}
                          </>
                        ) : id === "subtotal" ? (
                          <>
                            <div
                              className="cd-total cd-subtotal"
                              style={{
                                fontSize: config.subtotalSize,
                                ...textPaint(config.subtotalColor),
                              }}
                            >
                              <span>{config.subtotalTitle || "Subtotal"}</span>
                              <span>
                                {config.subtotalCompare &&
                                  compare > subtotal && (
                                    <s>${compare.toFixed(2)}</s>
                                  )}{" "}
                                <strong>${subtotal.toFixed(2)}</strong>
                              </span>
                            </div>
                            {config.subtotalSubtitle && (
                              <p
                                className="cd-subtotal-subtitle"
                                style={{
                                  fontSize: config.subtotalSize,
                                  ...textPaint(config.subtotalColor),
                                }}
                              >
                                {config.subtotalSubtitle}
                              </p>
                            )}
                          </>
                        ) : id === "checkout" ? (
                          <>
                            <button
                              className={`cd-checkout cd-checkout-effect-${config.checkoutEffect.toLowerCase().replaceAll(" ", "")}`}
                              onMouseEnter={() => setCheckoutHovered(true)}
                              onMouseLeave={() => setCheckoutHovered(false)}
                              onFocus={() => setCheckoutHovered(true)}
                              onBlur={() => setCheckoutHovered(false)}
                              style={{
                                background: checkoutHovered
                                  ? config.checkoutHoverBg
                                  : config.checkoutBg ||
                                    (config.gradient
                                      ? gradientValue(
                                          config.gradientStops,
                                          config.gradientAngle,
                                        )
                                      : config.accent),
                                color: checkoutHovered
                                  ? config.checkoutHoverColor
                                  : config.checkoutColor,
                                fontSize: Math.max(
                                  10,
                                  Math.min(32, config.checkoutSize),
                                ),
                                borderRadius: config.radius,
                              }}
                              onClick={() =>
                                setNotice(
                                  "Checkout preview only. No order or payment was created.",
                                )
                              }
                            >
                              {checkoutIcon}
                              <span
                                style={textPaint(
                                  checkoutHovered
                                    ? config.checkoutHoverColor
                                    : config.checkoutColor,
                                )}
                              >
                                {(
                                  translation?.checkout ||
                                  config.checkoutTemplate
                                )
                                  .replaceAll(
                                    "{{cart_total}}",
                                    `$${subtotal.toFixed(2)}`,
                                  )
                                  .replaceAll("{{items_count}}", String(count))}
                              </span>
                            </button>
                          </>
                        ) : null}
                      </div>
                    ))}
                </footer>
              )}
            </aside>
          ) : (
            <button className="cd-reopen" onClick={() => setShowPreview(true)}>
              Open cart preview
            </button>
          )}
        </div>
      )}
      <dialog
        ref={dialog}
        className={`cb-dialog cd-dialog ${modal === "Select icon" ? "cd-header-icon-dialog" : ""}`}
        aria-labelledby="cd-dialog-title"
        onCancel={() => setModal(null)}
      >
        <header>
          <h2 id="cd-dialog-title">{modal}</h2>
          <button aria-label="Close dialog" onClick={() => setModal(null)}>
            ×
          </button>
        </header>
        <div className="cb-dialog-body">
          {modal === "Select checkout icon" ? (
            <>
              <h3>Default icons</h3>
              <div className="cd-checkout-icon-grid">
                {checkoutIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    aria-label={`Checkout icon ${icon}`}
                    aria-pressed={
                      config.checkoutIcon === icon && !config.checkoutCustomIcon
                    }
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        checkoutIcon: icon,
                        checkoutCustomIcon: "",
                      }))
                    }
                  >
                    {icon !== "None" && <CartIcon name={icon} />}
                  </button>
                ))}
              </div>
              <hr />
              <h3>Custom icon</h3>
              <p>Upload custom icon</p>
              <label className="cd-icon-upload">
                Add files
                <input
                  type="file"
                  aria-label="Upload checkout icon"
                  accept=".jpg,.jpeg,.png,.svg,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1000000) {
                      setNotice("Choose an icon smaller than 1 MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () =>
                      update("checkoutCustomIcon", String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                />
                <small>Accepts .jpg, .png, .jpeg, .svg and .webp</small>
                {config.checkoutCustomIcon && (
                  <img
                    src={config.checkoutCustomIcon}
                    alt="Selected custom icon"
                  />
                )}
              </label>
              <div className="cd-dialog-actions">
                <button className="cb-dark" onClick={() => setModal(null)}>
                  Done
                </button>
              </div>
            </>
          ) : modal === "Permission Required" ? (
            <>
              <p>
                To support cart drawer rewards and order upsells, shipping,
                market, product, and file access would be requested. Shipping
                and market access are read-only and list eligible shipping
                methods and Shopify Markets.
              </p>
              <p className="cd-info">
                Design preview only. This flow does not request actual store
                access.
              </p>
              <div className="cd-dialog-actions">
                <button onClick={() => setModal(null)}>Cancel</button>
                <button
                  className="cb-dark"
                  onClick={() => open("Update data access")}
                >
                  Review Access Scopes
                </button>
              </div>
            </>
          ) : modal === "Update data access" ? (
            <>
              <p>Section Store needs access to:</p>
              <div className="cd-access">
                {[
                  [
                    "View customer data",
                    "Device and activity data",
                    "Geolocation, IP address, browser and operating system",
                  ],
                  [
                    "View and edit store data",
                    "Edit products",
                    "Inventory, products, product listings, collections",
                  ],
                  ["View orders", "Shipping information", ""],
                  ["Edit discounts", "Discount codes and promotions", ""],
                  ["View custom data", "Metaobjects", ""],
                  ["Edit Shopify admin", "Files", ""],
                  [
                    "View other data",
                    "Shopify Markets settings, product and variant inventory, product tags, selling plans",
                    "",
                  ],
                ].map(([a, b, c]) => (
                  <div key={a}>
                    <strong>{a}</strong>
                    <p>{b}</p>
                    <small>{c}</small>
                  </div>
                ))}
              </div>
              <small>
                Sample permission screen. Actual scopes and Shopify review
                status are not verified here.
              </small>
              <div className="cd-dialog-actions">
                <button onClick={() => setModal(null)}>Cancel</button>
                <button
                  className="cb-dark"
                  onClick={() => {
                    setModal(null);
                    navigate(`${base}/cart-drawer/new`);
                  }}
                >
                  Continue to editor
                </button>
              </div>
            </>
          ) : modal === "Select products" ||
            modal === "Select addon product" ||
            modal === "Select reward exclusions" ? (
            <>
              <div className="cd-picker-search">
                <input
                  aria-label="Search products"
                  placeholder="Search products"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="Search by"
                  value={searchBy}
                  onChange={(e) => setSearchBy(e.target.value)}
                >
                  {[
                    "All",
                    "Product title",
                    "Product ID",
                    "Barcode",
                    "SKU",
                    "Variant ID",
                    "Variant title",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <details className="cd-picker-filter">
                <summary>Add filter +</summary>
                {[
                  "Categories",
                  "Collection",
                  "Status",
                  "Types",
                  "Tags",
                  "Vendors",
                ].map((x) => (
                  <button key={x} onClick={() => setFilter(x)}>
                    {x}
                  </button>
                ))}
              </details>
              {filter && (
                <label className="cd-field">
                  {filter}
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  >
                    <option>All sample products</option>
                    <option>Knives</option>
                    <option>Accessories</option>
                  </select>
                </label>
              )}
              <div className="cd-picker-list">
                {products
                  .filter(
                    (p) =>
                      (filterValue === "All sample products" ||
                        (filterValue === "Knives"
                          ? p.name.includes("Knife")
                          : !p.name.includes("Knife"))) &&
                      (searchBy === "Product ID" ||
                      searchBy === "Variant ID" ||
                      searchBy === "SKU"
                        ? p.id
                        : searchBy === "Variant title"
                          ? p.variant
                          : `${p.name} ${p.variant} ${p.id}`
                      )
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={selection.includes(p.id)}
                        onChange={(e) =>
                          setSelection((x) =>
                            e.target.checked
                              ? modal === "Select addon product"
                                ? [p.id]
                                : [...x, p.id]
                              : x.filter((id) => id !== p.id),
                          )
                        }
                      />
                      <span className="cd-picker-image">
                        <ProductImage />
                      </span>
                      <span>
                        {p.name}
                        {p.variant && <small>{p.variant}</small>}
                      </span>
                      <span>${p.price.toFixed(2)}</span>
                    </label>
                  ))}
              </div>
              <div className="cd-dialog-actions">
                <span>
                  {selection.length}
                  {modal === "Select addon product" ? "/1" : ""} products
                  selected
                </span>
                <button onClick={() => setModal(null)}>Cancel</button>
                <button
                  className="cb-dark"
                  disabled={
                    modal === "Select addon product" && !selection.length
                  }
                  onClick={() => {
                    if (modal === "Select addon product") {
                      if (addonSelected) toggleAddon(false);
                      setConfig((c) => ({
                        ...c,
                        addonProduct: selection[0],
                        addonTitle:
                          products.find((p) => p.id === selection[0])?.name ||
                          c.addonTitle,
                        addonSubtitle: "",
                        addonImage: "",
                      }));
                    } else if (modal === "Select reward exclusions") {
                      update("rewardExcluded", selection);
                    } else {
                      setItems(
                        Object.fromEntries(
                          selection.map((id) => [id, items[id] || 1]),
                        ),
                      );
                      setEmpty(false);
                    }
                    setModal(null);
                  }}
                >
                  Select
                </button>
              </div>
            </>
          ) : modal === "Section Store Plus" ? (
            <>
              <h3>Unlock Cart Drawer</h3>
              <p className="cb-price">
                $15 <small>/ month</small>
              </p>
              <ul>
                <li>Cart drawer, upsells and rewards</li>
                <li>Conversion blocks and bundles</li>
                <li>14-day free trial</li>
              </ul>
              <button
                className="cb-dark"
                onClick={() =>
                  setNotice(
                    "Trial selected for preview. No subscription or charge created.",
                  )
                }
              >
                Try 14 days free
              </button>
            </>
          ) : modal === "Create from screenshot" ? (
            <>
              <label>
                Reference screenshot
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFilename(e.target.files?.[0]?.name || "")}
                />
              </label>
              {filename && <p>{filename}</p>}
              <small>
                Local reference selection only. Automatic image analysis is not
                connected.
              </small>
              <button
                className="cb-dark"
                disabled={!filename}
                onClick={() => open("Permission Required")}
              >
                Continue
              </button>
            </>
          ) : modal === "Select icon" ? (
            <HeaderIconPicker
              icon={config.headerIcon}
              image={config.headerCustomIcon}
              onApply={(headerIcon, headerCustomIcon) =>
                setConfig((c) => ({ ...c, headerIcon, headerCustomIcon }))
              }
              onDone={() => setModal(null)}
            />
          ) : modal === "Add block" ? (
            <>
              {(addTarget === "body"
                ? [
                    "Announcement",
                    "Timer",
                    "Reward bar",
                    "Products upsell",
                    "Custom HTML",
                    "Empty cart HTML",
                  ]
                : [
                    "Discount code",
                    "Discount total",
                    "Order addon",
                    "Order note",
                    "Payment icons",
                    "Trust badges",
                    "Custom HTML",
                  ]
              ).map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    const keys: Record<string, keyof Config> = {
                      Announcement: "announcement",
                      Timer: "timer",
                      "Reward bar": "reward",
                      "Products upsell": "upsell",
                    };
                    if (name === "Custom HTML" && addTarget === "body")
                      setConfig((c) => ({
                        ...c,
                        bodyHtml: true,
                        bodyDeleted: c.bodyDeleted.filter(
                          (id) => id !== "bodyHtml",
                        ),
                      }));
                    else if (name === "Empty cart HTML")
                      update("emptyHtml", true);
                    else if (name === "Discount code")
                      setConfig((c) => ({
                        ...c,
                        discount: true,
                        discountDeleted: false,
                      }));
                    else if (name === "Discount total")
                      setConfig((c) => ({
                        ...c,
                        discountTotal: true,
                        discountTotalDeleted: false,
                      }));
                    else if (name === "Custom HTML")
                      setConfig((c) => ({
                        ...c,
                        html: true,
                        htmlDeleted: false,
                      }));
                    else if (
                      name === "Payment icons" ||
                      name === "Trust badges"
                    )
                      setConfig((c) => ({
                        ...c,
                        ...(name === "Payment icons"
                          ? { payments: true, paymentsDeleted: false }
                          : { trust: true, trustDeleted: false }),
                      }));
                    else if (name === "Order note")
                      setConfig((c) => ({
                        ...c,
                        noteDeleted: false,
                        note: true,
                        footerOrder: c.footerOrder.includes("note")
                          ? c.footerOrder
                          : [...c.footerOrder, "note"],
                      }));
                    else if (name === "Order addon")
                      setConfig((c) => ({
                        ...c,
                        addonDeleted: false,
                        addon: true,
                        footerOrder: c.footerOrder.includes("addon")
                          ? c.footerOrder
                          : [...c.footerOrder, "addon"],
                      }));
                    else if (keys[name])
                      setConfig((c) => ({
                        ...c,
                        [keys[name]]: true,
                        bodyDeleted: c.bodyDeleted.filter(
                          (id) => id !== keys[name],
                        ),
                      }));
                    setModal(null);
                  }}
                >
                  {name}
                </button>
              ))}
            </>
          ) : modal === "Translations" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const next = {
                  ...config,
                  previewLanguage: translationLanguage,
                  translations: {
                    ...config.translations,
                    [translationLanguage]: translationFields,
                  },
                };
                setConfig(next);
                void saveDraft(next);
              }}
            >
              <label>
                Language
                <select
                  value={translationLanguage}
                  onChange={(e) => {
                    setTranslationLanguage(e.target.value);
                    setTranslationFields(
                      config.translations[e.target.value] || {
                        title: "",
                        checkout: "",
                      },
                    );
                  }}
                >
                  <option value="en">English</option>
                  <option value="ur">Urdu</option>
                  <option value="fr">French</option>
                </select>
              </label>
              <label>
                Cart title
                <input
                  value={translationFields.title}
                  placeholder={config.title}
                  onChange={(e) =>
                    setTranslationFields((v) => ({
                      ...v,
                      title: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Checkout label
                <input
                  value={translationFields.checkout}
                  placeholder={config.checkoutTemplate}
                  onChange={(e) =>
                    setTranslationFields((v) => ({
                      ...v,
                      checkout: e.target.value,
                    }))
                  }
                />
              </label>
              <p>
                Use {"{{items_count}}"} in the title and {"{{cart_total}}"} in
                the checkout label. Blank fields keep your original labels.
              </p>
              <button className="cb-dark" disabled={saving}>
                {saving ? "Saving…" : "Save translations"}
              </button>
            </form>
          ) : (
            <>
              <p>
                Choose your preview products, customize the cart appearance, and
                enable optional announcement, timer and reward blocks.
              </p>
              <p>
                Store access, live publishing and checkout are not connected in
                this design prototype.
              </p>
              <button
                className="cb-dark"
                onClick={() => open("Permission Required")}
              >
                Start setup
              </button>
            </>
          )}
          {notice && modal && (
            <p className="cb-notice" role="status">
              {notice}
            </p>
          )}
        </div>
      </dialog>
    </div>
  );
}
