import type { CSSProperties } from "react";

/** Decorative editor preview; rewards themselves remain governed by Shopify. */
export default function CartCelebration({
  mode,
  id,
}: {
  mode: string;
  id: number;
}) {
  if (mode === "None") return null;
  const variant =
    mode === "Screen fireworks"
      ? "fireworks"
      : mode === "School pride"
        ? "pride"
        : mode === "Ring pulse"
          ? "ring"
          : "cannon";
  return (
    <div
      key={id}
      className={`cd-celebration cd-celebration-${variant}`}
      data-celebration={mode}
      aria-hidden="true"
    >
      {variant === "ring" ? (
        <>
          <i />
          <i />
          <i />
        </>
      ) : (
        Array.from({ length: 48 }, (_, n) => (
          <i
            key={n}
            style={
              {
                "--n": n,
                "--angle": `${n * 137.5}deg`,
                "--distance": `${80 + (n % 7) * 24}px`,
                "--delay": `${(n % 8) * 45}ms`,
                "--color": ["#8657ff", "#ffb300", "#fa5c9b", "#35bfa6"][n % 4],
              } as CSSProperties
            }
          />
        ))
      )}
    </div>
  );
}
