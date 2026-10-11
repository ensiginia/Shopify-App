export type Surface = "Bundles" | "Carts";
export type Status = "Draft" | "Active" | "Paused" | "Ended";
export type VariantKey = "A" | "B";
export type Variant = {
  name: string;
  quantity: number;
  discount: number;
  reward: number;
  upsell: boolean;
  checkout: string;
  color: string;
};
export type Experiment = {
  id: string;
  name: string;
  hypothesis: string;
  surface: Surface;
  target: string;
  currency: string;
  split: number;
  minimumVisitors: number;
  minimumDays: number;
  variants: Record<VariantKey, Variant>;
  status: Status;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  selectedVariant: VariantKey | null;
  archived: boolean;
  visitors: Record<string, VariantKey>;
  orders: Record<
    string,
    { visitor: string; variant: VariantKey; cents: number }
  >;
  productId?: string;
  productTitle?: string;
  upsellProductId?: string;
  upsellVariantId?: string;
  upsellHandle?: string;
  source?: "preview" | "shopify";
  version?: number;
  rolloutVariant?: VariantKey | null;
  rolloutUntil?: string | null;
  needsCleanup?: boolean;
  serverMetrics?: Record<VariantKey, Metric>;
};
export type Metric = {
  visitors: number;
  orders: number;
  revenue: number;
  buyers: number;
  rpv: number;
  conversion: number;
  aov: number;
  refunds?: number;
  sumSquares?: number;
};
export type Setup = Pick<
  Experiment,
  | "name"
  | "hypothesis"
  | "surface"
  | "target"
  | "currency"
  | "split"
  | "minimumVisitors"
  | "minimumDays"
  | "variants"
  | "productId"
  | "productTitle"
  | "upsellProductId"
  | "upsellVariantId"
  | "upsellHandle"
>;
export const STORAGE_KEY = "section-store-experiments-preview-v1";
export function defaults(surface: Surface): Setup {
  const a: Variant = {
    name: "Original",
    quantity: 2,
    discount: 10,
    reward: 100,
    upsell: false,
    checkout: "Checkout",
    color: "#202223",
  };
  const b: Variant = {
    ...a,
    name: "Challenger",
    quantity: surface === "Bundles" ? 3 : a.quantity,
    discount: surface === "Bundles" ? 15 : a.discount,
    reward: 80,
  };
  return {
    name: "",
    hypothesis: "",
    surface,
    target:
      surface === "Bundles" ? "Product page bundle" : "Global cart drawer",
    currency: "USD",
    split: 50,
    minimumVisitors: 1000,
    minimumDays: 7,
    variants: { A: a, B: b },
  };
}
export function validateSetup(setup: Setup): string | null {
  if (!setup.name.trim() || setup.name.length > 100)
    return "Enter a test name up to 100 characters.";
  if (!setup.target.trim() || setup.target.length > 100)
    return "Enter the bundle or cart name up to 100 characters.";
  if (!setup.hypothesis.trim() || setup.hypothesis.length > 500)
    return "Describe what you want to learn (up to 500 characters).";
  if (![25, 50, 75].includes(setup.split))
    return "Choose a supported traffic split.";
  if (
    !Number.isInteger(setup.minimumVisitors) ||
    setup.minimumVisitors < 100 ||
    setup.minimumVisitors > 1000000
  )
    return "Visitor target must be a whole number from 100 to 1,000,000 per variant.";
  if (
    !Number.isInteger(setup.minimumDays) ||
    setup.minimumDays < 1 ||
    setup.minimumDays > 90
  )
    return "Duration must be between 1 and 90 whole days.";
  if (
    !/^[A-Z]{3}$/.test(setup.currency) ||
    !Intl.supportedValuesOf("currency").includes(setup.currency) ||
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: setup.currency,
    }).resolvedOptions().maximumFractionDigits !== 2
  )
    return "This release supports Shopify currencies with two decimal places. Zero- and three-decimal currencies need a separate money adapter.";
  for (const key of ["A", "B"] as const) {
    const v = setup.variants[key];
    if (!v.name.trim() || v.name.length > 60)
      return `Name variant ${key} (up to 60 characters).`;
    if (!/^#[0-9a-f]{6}$/i.test(v.color)) return "Choose a valid button color.";
    if (
      setup.surface === "Bundles" &&
      (!Number.isInteger(v.quantity) ||
        v.quantity < 1 ||
        v.quantity > 100 ||
        !Number.isFinite(v.discount) ||
        v.discount < 0 ||
        v.discount > 90)
    )
      return "Bundle quantity must be 1–100 and discount 0–90%.";
    if (
      setup.surface === "Carts" &&
      (!Number.isFinite(v.reward) ||
        v.reward < 0 ||
        v.reward > 100000 ||
        !v.checkout.trim() ||
        v.checkout.length > 60)
    )
      return "Enter a reward threshold from 0–100,000 and a checkout label up to 60 characters.";
  }
  const { A, B } = setup.variants;
  const identical =
    setup.surface === "Bundles"
      ? A.quantity === B.quantity &&
        A.discount === B.discount &&
        A.color === B.color
      : A.reward === B.reward &&
        A.upsell === B.upsell &&
        A.checkout.trim() === B.checkout.trim() &&
        A.color === B.color;
  return identical
    ? "Change at least one offer or design setting between A and B."
    : null;
}
export function createExperiment(
  setup: Setup,
  now = new Date().toISOString(),
): Experiment {
  const error = validateSetup(setup);
  if (error) throw new Error(error);
  return {
    surface: setup.surface,
    currency: setup.currency,
    split: setup.split,
    minimumVisitors: setup.minimumVisitors,
    minimumDays: setup.minimumDays,
    variants: structuredClone(setup.variants),
    ...(setup.productId ? { productId: setup.productId } : {}),
    ...(setup.productTitle ? { productTitle: setup.productTitle } : {}),
    ...(setup.upsellProductId
      ? { upsellProductId: setup.upsellProductId }
      : {}),
    ...(setup.upsellVariantId
      ? { upsellVariantId: setup.upsellVariantId }
      : {}),
    ...(setup.upsellHandle ? { upsellHandle: setup.upsellHandle } : {}),
    source: "preview",
    name: setup.name.trim(),
    target: setup.target.trim(),
    hypothesis: setup.hypothesis.trim(),
    id: crypto.randomUUID(),
    status: "Draft",
    createdAt: now,
    startedAt: null,
    endedAt: null,
    selectedVariant: null,
    archived: false,
    visitors: {},
    orders: {},
  };
}
export function transition(
  experiment: Experiment,
  status: Status,
  all: Experiment[],
  now = new Date().toISOString(),
): Experiment {
  const allowed: Record<Status, Status[]> = {
    Draft: ["Active"],
    Active: ["Paused", "Ended"],
    Paused: ["Active", "Ended"],
    Ended: [],
  };
  if (experiment.archived || !allowed[experiment.status].includes(status))
    throw new Error("This test cannot make that status change.");
  if (
    status === "Active" &&
    all.some(
      (t) =>
        t.id !== experiment.id &&
        !t.archived &&
        ["Active", "Paused"].includes(t.status) &&
        t.surface === experiment.surface &&
        t.target.trim().toLowerCase() ===
          experiment.target.trim().toLowerCase(),
    )
  )
    throw new Error(
      "Another active or paused test uses this target. End it first to avoid overlapping tests.",
    );
  return {
    ...experiment,
    status,
    startedAt: experiment.startedAt ?? (status === "Active" ? now : null),
    endedAt: status === "Ended" ? now : experiment.endedAt,
  };
}
export function assignment(
  experiment: Experiment,
  visitor: string,
): VariantKey {
  if (Object.hasOwn(experiment.visitors, visitor))
    return experiment.visitors[visitor];
  let hash = 2166136261;
  for (const char of `${experiment.id}:${visitor}`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash % 100 < experiment.split ? "A" : "B";
}
export function recordVisit(
  experiment: Experiment,
  visitor: string,
): Experiment {
  if (experiment.status !== "Active" || experiment.archived)
    throw new Error("Start or resume the preview test to record visits.");
  if (!visitor.trim() || visitor.length > 100)
    throw new Error("Enter a demo visitor ID up to 100 characters.");
  if (Object.hasOwn(experiment.visitors, visitor)) return experiment;
  return {
    ...experiment,
    visitors: {
      ...experiment.visitors,
      [visitor]: assignment(experiment, visitor),
    },
  };
}
export function recordOrder(
  experiment: Experiment,
  visitor: string,
  orderId: string,
  amount: number,
): Experiment {
  if (experiment.status !== "Active" || experiment.archived)
    throw new Error("Start or resume the preview test to record orders.");
  if (!Object.hasOwn(experiment.visitors, visitor))
    throw new Error(
      "Record this demo visitor's visit before recording an order.",
    );
  if (!orderId.trim() || orderId.length > 100)
    throw new Error("Enter a demo order ID up to 100 characters.");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000)
    throw new Error(
      "Order value must be greater than 0 and at most 1,000,000.",
    );
  if (Object.hasOwn(experiment.orders, orderId))
    throw new Error(
      "This order ID is already recorded. Duplicate orders are not counted.",
    );
  return {
    ...experiment,
    orders: {
      ...experiment.orders,
      [orderId]: {
        visitor,
        variant: experiment.visitors[visitor],
        cents: Math.round(amount * 100),
      },
    },
  };
}
export function metrics(experiment: Experiment, key: VariantKey) {
  if (experiment.serverMetrics) return experiment.serverMetrics[key];
  const visitors = Object.values(experiment.visitors).filter(
    (v) => v === key,
  ).length;
  const orders = Object.values(experiment.orders).filter(
    (o) => o.variant === key,
  );
  const revenue = orders.reduce((sum, o) => sum + o.cents, 0) / 100;
  const buyers = new Set(orders.map((o) => o.visitor)).size;
  const byVisitor = new Map<string, number>();
  for (const order of orders)
    byVisitor.set(
      order.visitor,
      (byVisitor.get(order.visitor) || 0) + order.cents / 100,
    );
  return {
    visitors,
    orders: orders.length,
    revenue,
    buyers,
    rpv: visitors ? revenue / visitors : 0,
    conversion: visitors ? (buyers / visitors) * 100 : 0,
    aov: orders.length ? revenue / orders.length : 0,
    sumSquares: [...byVisitor.values()].reduce(
      (sum, amount) => sum + amount * amount,
      0,
    ),
    refunds: 0,
  };
}
export function comparison(experiment: Experiment, now = Date.now()) {
  const a = metrics(experiment, "A"),
    b = metrics(experiment, "B");
  const leader: VariantKey | null =
    a.visitors && b.visitors && a.rpv !== b.rpv
      ? b.rpv > a.rpv
        ? "B"
        : "A"
      : null;
  const duration = experiment.startedAt
    ? Math.max(
        0,
        ((experiment.endedAt ? Date.parse(experiment.endedAt) : now) -
          Date.parse(experiment.startedAt)) /
          86400000,
      )
    : 0;
  return {
    a,
    b,
    leader,
    uplift: a.rpv > 0 ? ((b.rpv - a.rpv) / a.rpv) * 100 : null,
    enough:
      a.visitors >= experiment.minimumVisitors &&
      b.visitors >= experiment.minimumVisitors &&
      duration >= experiment.minimumDays,
    duration,
  };
}
export function restoreExperiments(raw: string): Experiment[] {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 500)
    throw new Error("Saved test data is invalid.");
  const ids = new Set<string>();
  for (const item of data) {
    const t = item as Experiment;
    if (
      !t ||
      typeof t.id !== "string" ||
      ids.has(t.id) ||
      !["Bundles", "Carts"].includes(t.surface) ||
      typeof t.name !== "string" ||
      typeof t.target !== "string" ||
      typeof t.hypothesis !== "string" ||
      !t.variants?.A ||
      !t.variants?.B ||
      validateSetup(t) ||
      !["Draft", "Active", "Paused", "Ended"].includes(t.status) ||
      typeof t.archived !== "boolean" ||
      !Number.isFinite(Date.parse(t.createdAt)) ||
      (t.startedAt !== null && !Number.isFinite(Date.parse(t.startedAt))) ||
      (t.endedAt !== null && !Number.isFinite(Date.parse(t.endedAt))) ||
      ![null, "A", "B"].includes(t.selectedVariant) ||
      !t.visitors ||
      Array.isArray(t.visitors) ||
      typeof t.visitors !== "object" ||
      !t.orders ||
      Array.isArray(t.orders) ||
      typeof t.orders !== "object"
    )
      throw new Error(
        "Saved test data is invalid. Existing data has not been overwritten.",
      );
    for (const key of ["A", "B"] as const)
      if (
        typeof t.variants[key].upsell !== "boolean" ||
        typeof t.variants[key].checkout !== "string"
      )
        throw new Error("Saved variant data is invalid.");
    if (Object.values(t.visitors).some((v) => v !== "A" && v !== "B"))
      throw new Error("Saved visitor data is invalid.");
    if (
      Object.values(t.orders).some(
        (o) =>
          !o ||
          !Object.hasOwn(t.visitors, o.visitor) ||
          t.visitors[o.visitor] !== o.variant ||
          !Number.isSafeInteger(o.cents) ||
          o.cents <= 0,
      )
    )
      throw new Error("Saved order data is invalid.");
    ids.add(t.id);
  }
  return data as Experiment[];
}
export function sampleExperiment(surface: Surface): Experiment {
  const sample = createExperiment({
    ...defaults(surface),
    name: "Illustrative sample report",
    hypothesis: "A larger offer may increase revenue per visitor.",
  });
  sample.status = "Ended";
  sample.startedAt = new Date(Date.now() - 14 * 86400000).toISOString();
  sample.endedAt = new Date().toISOString();
  for (const key of ["A", "B"] as const) {
    for (let i = 0; i < 1000; i++) sample.visitors[`${key}-${i}`] = key;
    for (let i = 0; i < (key === "A" ? 40 : 50); i++)
      sample.orders[`${key}-order-${i}`] = {
        visitor: `${key}-${i}`,
        variant: key,
        cents: 5000,
      };
  }
  return sample;
}
export function reportCSV(experiment: Experiment): string {
  const escape = (value: string | number) =>
    `"${String(value)
      .replace(/^[=+@-]/, "'$&")
      .replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [
    [
      "Data source",
      experiment.source === "shopify"
        ? "SHOPIFY PAID ORDERS / NET AFTER REFUNDS"
        : "LOCAL PREVIEW / SIMULATED",
    ],
    ["Test", experiment.name],
    ["Currency", experiment.currency],
    ["Status", experiment.status],
    [
      "Variant",
      "Name",
      "Visitors",
      "Paid orders",
      "Revenue",
      "Revenue per visitor",
      "Buyer conversion %",
      "Average order value",
    ],
  ];
  for (const key of ["A", "B"] as const) {
    const m = metrics(experiment, key);
    rows.push([
      key,
      experiment.variants[key].name,
      m.visitors,
      m.orders,
      m.revenue.toFixed(2),
      m.rpv.toFixed(2),
      m.conversion.toFixed(2),
      m.aov.toFixed(2),
    ]);
  }
  return rows.map((row) => row.map(escape).join(",")).join("\r\n");
}
