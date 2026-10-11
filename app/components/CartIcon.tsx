import type { ReactNode } from "react";
export default function CartIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    Preview: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    Settings: (
      <>
        <path d="M9.7 3h4.6l.5 2.5 1.7 1 2.4-.8 2.3 4-1.9 1.7v2l1.9 1.7-2.3 4-2.4-.8-1.7 1-.5 2.7H9.7l-.5-2.7-1.7-1-2.4.8-2.3-4 1.9-1.7v-2L2.8 9.7l2.3-4 2.4.8 1.7-1L9.7 3Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    Styles: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M11 3v18M4 10h7" />
      </>
    ),
    Header: (
      <>
        <rect x="3" y="3" width="18" height="6" rx="2" />
        <path d="M4 13h4m4 0h4m4 0h1M4 17v3m6-3v3m7-3v3" />
      </>
    ),
    Body: (
      <>
        <rect x="3" y="3" width="18" height="4" rx="1" />
        <path d="M3 11h18M3 16h18M3 21h18" />
      </>
    ),
    Announcement: (
      <>
        <path d="m4 9 8-2 7-4v18l-7-4-8-2V9ZM8 16l2 5h3l-2-5M22 8v8" />
      </>
    ),
    Timer: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 3" />
      </>
    ),
    "Reward bar": (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <path d="m12 12 8 8m-1-5 1 5-5-1" />
      </>
    ),
    "Line items": (
      <>
        <path d="M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1" />
      </>
    ),
    "Products upsell": (
      <>
        <path d="m3 12 9-9h8v8l-9 9-8-8Z" />
        <circle cx="16" cy="7" r="1" />
      </>
    ),
    "Order addon": (
      <>
        <rect x="2" y="6" width="20" height="12" rx="6" />
        <circle cx="8" cy="12" r="4" />
      </>
    ),
    "Order note": (
      <>
        <rect x="3" y="3" width="16" height="17" rx="3" />
        <path d="M7 8h8M7 12h4m6 3v7m-3-3h6" />
      </>
    ),
    Subtotal: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <path d="M8 6h8M8 10h2m4 0h2M8 14h2m4 0h2M8 18h2m4 0h2" />
      </>
    ),
    "Checkout button": (
      <>
        <rect x="3" y="4" width="18" height="13" rx="3" />
        <path d="m12 10 8 8m-8-8 1 7 2-3 4-1Z" />
      </>
    ),
    arrow: <path d="M3 12h17m-7-7 7 7-7 7" />,
    bag: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M8 9a4 4 0 0 0 8 0M8 5V3h8v2" />
      </>
    ),
    lightning: <path d="m14 2-9 12h7l-2 8 9-12h-7l2-8Z" />,
    gift: (
      <>
        <rect x="3" y="9" width="18" height="12" rx="1" />
        <path d="M2 9h20M12 5v16" />
        <path d="M12 7C1 7 5-3 12 7c7-10 11 0 0 0Z" />
      </>
    ),
    star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />,
    "Payment icons": (
      <>
        <rect x="3" y="4" width="18" height="14" rx="3" />
        <path d="M3 9h18M6 14h5" />
      </>
    ),
    "Trust badges": (
      <>
        <path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    card: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="M2 9h20M6 15h4" />
      </>
    ),
    tag: (
      <>
        <path d="m3 12 9-9h9v9l-9 9-9-9Z" />
        <circle cx="17" cy="7" r="1" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="4" ry="10" />
        <path d="M2 12h20" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3C5 2 1 10 5 17c7 6 17-3 15-14Z" />
        <path d="m3 21 13-13" />
      </>
    ),
    rocket: (
      <>
        <path d="M21 3c-10-1-13 10-13 10l3 3S22 13 21 3ZM8 13l-5-1 4-5 5 1m-1 8 1 5 5-4-1-5M5 17l-2 4 4-2" />
        <circle cx="16" cy="8" r="2" />
      </>
    ),
    store: (
      <>
        <path d="M3 10h18l-3-7H6l-3 7ZM5 10v11h14V10M10 21v-7h4v7" />
      </>
    ),
    headset: (
      <>
        <path d="M4 14v-3a8 8 0 0 1 16 0v3M20 17v4h-6" />
        <rect x="2" y="11" width="4" height="8" rx="2" />
        <rect x="18" y="11" width="4" height="8" rx="2" />
      </>
    ),
    Footer: (
      <>
        <path d="M3 3h18M3 8h18M3 13h18" />
        <rect x="3" y="17" width="18" height="4" rx="1" />
      </>
    ),
    "Discount code": (
      <>
        <path d="m3 12 9-9h8v8l-9 9-8-8Z" />
        <path d="m10 10 5 5m0-5-5 5" />
      </>
    ),
    Checkout: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
      </>
    ),
    truck: (
      <>
        <path d="M2 5h12v12H2V5Zm12 4h4l4 5v3h-8" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    heart: <path d="M12 21 3 12a5.5 5.5 0 0 1 9-7 5.5 5.5 0 0 1 9 7l-9 9Z" />,
    cart: (
      <>
        <path d="M2 3h3l3 13h11l3-9H6" />
        <circle cx="9" cy="21" r="1" />
        <circle cx="18" cy="21" r="1" />
      </>
    ),
    tote: (
      <>
        <path d="M5 8h14l-2 13H7L5 8ZM9 11V5a3 3 0 0 1 6 0v6" />
      </>
    ),
    basket: (
      <>
        <path d="m4 10 3 11h10l3-11H4Zm-2 0h20M7 10l4-7m6 7-4-7M9 13v5m6-5v5M4 15h16" />
      </>
    ),
    "cart-spark": (
      <>
        <path d="M2 3h3l2 11h12l3-8H6M9 18v4m-2-2h4m8-2v4m-2-2h4" />
      </>
    ),
    plus: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M7 12h10" />
      </>
    ),
    chevron: <path d="m8 5 4-3 4 3M8 19l4 3 4-3" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      className="cd-icon"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.Preview}
    </svg>
  );
}
