import { comparison, metrics } from "./experiments";
import type { Experiment } from "./experiments";

// Fixed-horizon, large-sample normal interval on per-visitor net revenue.
// This is not a sequential test: inspect the interval only after the planned horizon.
export function analyze(experiment: Experiment, now = Date.now()) {
  const a = metrics(experiment, "A"),
    b = metrics(experiment, "B");
  const planned = comparison(experiment, now);
  const total = a.visitors + b.visitors;
  const expectedA = (total * experiment.split) / 100;
  const expectedB = total - expectedA;
  const chiSquare = total
    ? (a.visitors - expectedA) ** 2 / expectedA +
      (b.visitors - expectedB) ** 2 / expectedB
    : 0;
  // df=1, p<0.001 threshold. Flagging imbalance does not diagnose its cause.
  const mismatch = total >= 100 && chiSquare > 10.827566;
  const variance = (n: number, revenue: number, squares: number) =>
    n > 1 ? Math.max(0, (squares - revenue ** 2 / n) / (n - 1)) : 0;
  const va = variance(a.visitors, a.revenue, a.sumSquares || 0);
  const vb = variance(b.visitors, b.revenue, b.sumSquares || 0);
  const mature =
    experiment.source !== "shopify" ||
    (!!experiment.endedAt &&
      now >= Date.parse(experiment.endedAt) + 7 * 86400000);
  const eligible =
    a.visitors >= Math.max(500, experiment.minimumVisitors) &&
    b.visitors >= Math.max(500, experiment.minimumVisitors) &&
    planned.enough &&
    !mismatch &&
    mature &&
    experiment.status === "Ended" &&
    va > 0 &&
    vb > 0;
  const difference = b.rpv - a.rpv;
  const standardError =
    total && a.visitors && b.visitors
      ? Math.sqrt(va / a.visitors + vb / b.visitors)
      : 0;
  const interval = eligible
    ? ([
        difference - 1.96 * standardError,
        difference + 1.96 * standardError,
      ] as const)
    : null;
  const supported =
    interval && interval[0] > 0
      ? "B"
      : interval && interval[1] < 0
        ? "A"
        : null;
  return {
    mismatch,
    chiSquare,
    eligible,
    interval,
    supported,
    difference,
    standardError,
    method:
      "95% large-sample normal interval on the difference in net revenue per visitor (B − A). Exploratory until the planned test is ended. Heavy-tailed revenue may require a longer experiment or a robust statistical review.",
  };
}
