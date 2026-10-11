import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import CartIcon from "./CartIcon";
import CartBlockOrder from "./CartBlockOrder";
import ColorPickerField from "./ColorPickerField";
export const paymentBrands = [
  "Visa",
  "Mastercard",
  "Amex",
  "PayPal",
  "Apple Pay",
  "Google Pay",
  "Shop Pay",
  "Discover",
  "Diners Club",
  "JCB",
  "Maestro",
  "UnionPay",
  "Klarna",
  "Afterpay",
];
export const paymentDefaults = {
  store: true,
  size: 34,
  brands: [] as string[],
  custom: [] as string[],
};
export const trustDefaults = {
  layout: "Icon beside text",
  iconSize: 17,
  textSize: 11,
  bg: "#ffffff",
  text: "#000000",
  icon: "#000000",
  top: 11,
  bottom: 10,
  badges: [
    { id: "secure", text: "Secure payment", icon: "Checkout", custom: "" },
    { id: "delivery", text: "Fast delivery", icon: "bag", custom: "" },
    { id: "happy", text: "Happy customers", icon: "heart", custom: "" },
  ],
};
export type TrustConfig = typeof trustDefaults;
export type PaymentConfig = typeof paymentDefaults;
const paint = (value: string): CSSProperties =>
  value.includes("gradient(")
    ? {
        backgroundImage: value,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
      }
    : { color: value };
function upload(file: File | undefined, apply: (data: string) => void) {
  if (!file) return;
  if (file.size > 1000000) return;
  const reader = new FileReader();
  reader.onload = () => apply(String(reader.result));
  reader.readAsDataURL(file);
}
function IconPicker({
  icon,
  custom,
  onChange,
  onClose,
}: {
  icon: string;
  custom: string;
  onChange: (icon: string, custom: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const names = [
    "shield",
    "Checkout",
    "bag",
    "card",
    "heart",
    "star",
    "gift",
    "tag",
    "globe",
    "leaf",
    "rocket",
    "store",
    "headset",
    "truck",
    "arrow",
    "None",
  ];
  return (
    <dialog
      ref={dialog}
      className="fb-icon-dialog"
      aria-label="Select badge icon"
      onCancel={onClose}
    >
      <header>
        <h2>Select icon</h2>
        <button onClick={onClose} aria-label="Close badge icon picker">
          ×
        </button>
      </header>
      <div className="fb-icon-body">
        <h3>Default icons</h3>
        <div className="fb-icons">
          {names.map((name) => (
            <button
              key={name}
              aria-label={`Badge icon ${name}`}
              aria-pressed={icon === name && !custom}
              onClick={() => onChange(name, "")}
            >
              {name !== "None" && <CartIcon name={name} />}
            </button>
          ))}
        </div>
        <h3>Custom icon</h3>
        <label className="cd-icon-upload">
          Add files
          <input
            type="file"
            aria-label="Upload badge icon"
            accept=".jpg,.jpeg,.png,.svg,.webp"
            onChange={(e) =>
              upload(e.target.files?.[0], (data) => onChange("custom", data))
            }
          />
          <small>JPG, PNG, JPEG, SVG, WebP · up to 1 MB</small>
          {custom && <img src={custom} alt="Selected icon" />}
        </label>
      </div>
      <footer>
        <button className="cb-dark" onClick={onClose}>
          Done
        </button>
      </footer>
    </dialog>
  );
}
function PaymentMark({ name }: { name: string }) {
  return (
    <img
      className="fb-payment-logo"
      src={`/payment-icons/${name.toLowerCase().replaceAll(" ", "-")}.svg`}
      alt={name}
    />
  );
}
export function PaymentSettings({
  config,
  onChange,
}: {
  config: PaymentConfig;
  onChange: (value: PaymentConfig) => void;
}) {
  return (
    <div className="fb-settings">
      <label className="cd-check">
        <input
          type="checkbox"
          checked={config.store}
          onChange={(e) => onChange({ ...config, store: e.target.checked })}
        />
        Use store&apos;s payment icons
      </label>
      <p className="fb-help">
        These icons are pulled from your store's payment settings. If the
        preview can't load them it shows gray placeholders. Select icons below
        to preview your choices.
      </p>
      <div className="fb-payment-grid">
        {paymentBrands.map((name) => (
          <button
            key={name}
            aria-label={`Payment icon ${name}`}
            aria-pressed={config.brands.includes(name)}
            onClick={() =>
              onChange({
                ...config,
                brands: config.brands.includes(name)
                  ? config.brands.filter((b) => b !== name)
                  : [...config.brands, name],
              })
            }
          >
            <PaymentMark name={name} />
          </button>
        ))}
        {config.custom.map((data, i) => (
          <button
            key={data}
            aria-label={`Remove custom payment icon ${i + 1}`}
            onClick={() =>
              onChange({
                ...config,
                custom: config.custom.filter((_, n) => n !== i),
              })
            }
          >
            <img src={data} alt="Custom payment icon" />
          </button>
        ))}
        <label className="fb-payment-upload">
          +
          <input
            aria-label="Add payment icon"
            type="file"
            accept=".png,.jpg,.jpeg,.svg,.webp"
            onChange={(e) =>
              upload(e.target.files?.[0], (data) =>
                onChange({ ...config, custom: [...config.custom, data] }),
              )
            }
          />
        </label>
      </div>
      <label className="cd-field fb-payment-size">
        Icon size
        <span className="fb-size-input">
          <input
            type="number"
            min="16"
            max="80"
            value={config.size}
            onChange={(e) =>
              onChange({
                ...config,
                size: Math.max(16, Math.min(80, Number(e.target.value))),
              })
            }
          />
          <span>px</span>
        </span>
      </label>
    </div>
  );
}
export function PaymentPreview({ config }: { config: PaymentConfig }) {
  return (
    <div className="fb-payment-preview" aria-label="Payment methods preview">
      {config.store && !config.brands.length && !config.custom.length ? (
        Array.from({ length: 5 }, (_, i) => (
          <span
            className="fb-payment-placeholder"
            key={i}
            style={{ width: config.size, height: config.size * 0.65 }}
          />
        ))
      ) : (
        <>
          {config.brands.map((name) => (
            <span
              key={name}
              style={{ width: config.size, height: config.size * 0.65 }}
            >
              <PaymentMark name={name} />
            </span>
          ))}
          {config.custom.map((data) => (
            <img
              key={data}
              src={data}
              alt="Custom payment method"
              style={{ width: config.size, height: config.size * 0.65 }}
            />
          ))}
        </>
      )}
    </div>
  );
}
export function TrustSettings({
  config,
  onChange,
  onFacts,
}: {
  config: TrustConfig;
  onChange: (value: TrustConfig) => void;
  onFacts: () => void;
}) {
  const [picker, setPicker] = useState<string | null>(null);
  const patch = (value: Partial<TrustConfig>) =>
    onChange({ ...config, ...value });
  const update = (id: string, value: Partial<TrustConfig["badges"][number]>) =>
    patch({
      badges: config.badges.map((b) => (b.id === id ? { ...b, ...value } : b)),
    });
  const number = (
    label: string,
    key: "iconSize" | "textSize" | "top" | "bottom",
  ) => (
    <label className="cd-field">
      {label}
      <input
        type="number"
        min="0"
        value={config[key]}
        onChange={(e) =>
          patch({ [key]: Math.max(0, Math.min(100, Number(e.target.value))) })
        }
      />
    </label>
  );
  const selected = config.badges.find((b) => b.id === picker);
  return (
    <div className="fb-settings">
      <div className="fb-heading">
        <h3>Badges</h3>
        <button onClick={onFacts}>✦ Use my store&apos;s facts</button>
      </div>
      <CartBlockOrder
        section="Trust badges"
        order={config.badges.map((b) => b.id)}
        names={Object.fromEntries(
          config.badges.map((b, i) => [b.id, b.text || `Badge ${i + 1}`]),
        )}
        render={(id) => {
          const badge = config.badges.find((b) => b.id === id)!;
          return (
            <div className="fb-badge-row">
              <button
                aria-label={`Change icon for ${badge.text || "new badge"}`}
                onClick={() => setPicker(id)}
              >
                {badge.custom ? (
                  <img src={badge.custom} alt="" />
                ) : (
                  badge.icon !== "None" && <CartIcon name={badge.icon} />
                )}
              </button>
              <input
                aria-label={`Badge text ${id}`}
                value={badge.text}
                onChange={(e) => update(id, { text: e.target.value })}
              />
              <button
                aria-label={`Delete badge ${badge.text || "new badge"}`}
                onClick={() =>
                  patch({ badges: config.badges.filter((b) => b.id !== id) })
                }
              >
                <CartIcon name="trash" />
              </button>
            </div>
          );
        }}
        onChange={(ids) =>
          patch({
            badges: ids.map((id) => config.badges.find((b) => b.id === id)!),
          })
        }
      />
      <button
        className="cd-add"
        onClick={() =>
          patch({
            badges: [
              ...config.badges,
              { id: crypto.randomUUID(), text: "", icon: "shield", custom: "" },
            ],
          })
        }
      >
        <CartIcon name="plus" /> Add badge
      </button>
      <h3>Styles</h3>
      <span>Layout</span>
      <div className="cd-two fb-layout">
        {["Icon above text", "Icon beside text"].map((layout) => (
          <button
            key={layout}
            aria-pressed={config.layout === layout}
            onClick={() => patch({ layout })}
          >
            <span
              className={
                layout === "Icon above text" ? "fb-stack" : "fb-inline"
              }
            >
              <i />
              <b />
            </span>
            {layout}
          </button>
        ))}
      </div>
      <div className="cd-three">
        {number("Icon size", "iconSize")}
        {number("Text size", "textSize")}
        <ColorPickerField
          label="Background"
          value={config.bg}
          onChange={(bg) => patch({ bg })}
        />
        <ColorPickerField
          label="Text color"
          showHex
          value={config.text}
          onChange={(text) => patch({ text })}
        />
        <ColorPickerField
          label="Icon color"
          showHex
          value={config.icon}
          onChange={(icon) => patch({ icon })}
        />
      </div>
      <div className="cd-two">
        {number("Top padding", "top")}
        {number("Bottom padding", "bottom")}
      </div>
      {selected && (
        <IconPicker
          icon={selected.icon}
          custom={selected.custom}
          onChange={(icon, custom) => update(selected.id, { icon, custom })}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
export function TrustPreview({ config }: { config: TrustConfig }) {
  return (
    <div
      className={`fb-trust-preview ${config.layout === "Icon above text" ? "fb-trust-above" : ""}`}
      style={{
        background: config.bg,
        fontSize: config.textSize,
        paddingTop: config.top,
        paddingBottom: config.bottom,
      }}
    >
      {config.badges.map((b) => (
        <span key={b.id}>
          <span
            className="fb-trust-icon"
            style={{
              width: config.iconSize,
              height: config.iconSize,
              color: config.icon,
            }}
          >
            {b.custom ? (
              <img src={b.custom} alt="" />
            ) : (
              b.icon !== "None" && <CartIcon name={b.icon} />
            )}
          </span>
          <span style={paint(config.text)}>{b.text}</span>
        </span>
      ))}
    </div>
  );
}
