import { useEffect, useRef, useState } from "react";
import CartIcon from "./CartIcon";
export default function HeaderIconPicker({
  icon,
  image,
  onApply,
  onDone,
}: {
  icon: string;
  image: string;
  onApply: (icon: string, image: string) => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState(icon);
  const [custom, setCustom] = useState(image);
  const [error, setError] = useState("");
  const reader = useRef<FileReader | null>(null);
  useEffect(() => () => reader.current?.abort(), []);
  return (
    <>
      <h3>Default icons</h3>
      <div className="cd-header-icon-options">
        {["None", "tote", "bag", "basket", "cart", "cart-spark"].map((name) => (
          <button
            key={name}
            aria-label={`Header icon ${name}`}
            aria-pressed={selected === name && !custom}
            onClick={() => {
              reader.current?.abort();
              setSelected(name);
              setCustom("");
              setError("");
              onApply(name, "");
            }}
          >
            {name !== "None" && <CartIcon name={name} />}
          </button>
        ))}
      </div>
      <hr />
      <h3>Custom icon</h3>
      <p>Upload custom icon</p>
      <label className="cd-icon-upload">
        <span className="cd-upload-button">Add files</span>
        <input
          type="file"
          aria-label="Upload header icon"
          accept=".jpg,.png,.jpeg,.svg,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!/\.(jpe?g|png|svg|webp)$/i.test(file.name)) {
              setError("Choose a JPG, PNG, SVG or WebP image.");
              return;
            }
            if (file.size > 1000000) {
              setError("Choose an icon smaller than 1 MB.");
              return;
            }
            reader.current?.abort();
            const next = new FileReader();
            reader.current = next;
            next.onload = () => {
              setCustom(String(next.result));
              setError("");
              onApply(selected, String(next.result));
            };
            next.onerror = () => setError("This image could not be opened.");
            next.readAsDataURL(file);
          }}
        />
        <small>Accepts .jpg, .png, .jpeg, .svg and .webp</small>
        {custom && <img src={custom} alt="Selected custom header icon" />}
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="cd-dialog-actions">
        <button className="cb-dark" onClick={onDone}>
          Done
        </button>
      </div>
    </>
  );
}
