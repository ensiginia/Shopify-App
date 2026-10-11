import test from "node:test";
import assert from "node:assert/strict";
import {
  defaults,
  createExperiment,
  validateSetup,
  transition,
  assignment,
  recordVisit,
  recordOrder,
  metrics,
  comparison,
  restoreExperiments,
  sampleExperiment,
  reportCSV,
} from "../app/lib/experiments.ts";
const draft = (surface = "Carts") =>
  createExperiment({
    ...defaults(surface),
    name: "Shipping goal test",
    hypothesis: "A lower goal may improve revenue per visitor.",
  });
const active = () =>
  transition(draft(), "Active", [], "2026-10-01T00:00:00.000Z");

test("Setup rejects indistinguishable variants and invalid numeric settings", () => {
  const t = draft();
  t.variants.B = { ...t.variants.A, name: "Different name only" };
  assert.match(validateSetup(t), /at least one/);
  assert.match(
    validateSetup({ ...draft(), minimumVisitors: NaN }),
    /Visitor target/,
  );
  assert.match(validateSetup({ ...draft(), minimumDays: 0 }), /Duration/);
  assert.match(validateSetup({ ...draft(), split: 0 }), /split/);
  const bundle = draft("Bundles");
  bundle.variants.A.discount = 91;
  assert.match(validateSetup(bundle), /discount/);
});
test("Lifecycle prevents invalid transitions and overlapping same-target tests", () => {
  const running = active();
  const other = draft();
  other.target = ` ${running.target.toUpperCase()} `;
  assert.throws(() => transition(other, "Active", [running]), /overlapping/);
  const paused = transition(running, "Paused", [running]);
  assert.throws(() => transition(other, "Active", [paused]), /overlapping/);
  const resumed = transition(paused, "Active", [paused]);
  assert.equal(resumed.startedAt, running.startedAt);
  const ended = transition(resumed, "Ended", [resumed]);
  assert.throws(() => transition(ended, "Active", []), /status change/);
  assert.equal(transition(other, "Active", [ended]).status, "Active");
});
test("Stable assignment, unique exposure count, and approximately configured traffic split", () => {
  let t = active();
  const bucket = assignment(t, "visitor-1");
  t = recordVisit(t, "visitor-1");
  assert.equal(assignment(t, "visitor-1"), bucket);
  assert.equal(recordVisit(t, "visitor-1"), t);
  assert.equal(Object.keys(t.visitors).length, 1);
  const ratioTest = { ...active(), split: 25 };
  let a = 0;
  for (let i = 0; i < 10000; i++)
    if (assignment(ratioTest, `v-${i}`) === "A") a++;
  assert.ok(a > 2250 && a < 2750, `A allocation ${a}/10000`);
});
test("Attribution requires exposure, rejects duplicate orders, uses cents and unique buyer conversion", () => {
  let t = active();
  assert.throws(() => recordOrder(t, "missing", "o", 50), /before recording/);
  t = recordVisit(t, "visitor");
  t = recordOrder(t, "visitor", "order-1", 10.23);
  t = recordOrder(t, "visitor", "order-2", 20.01);
  const result = metrics(t, t.visitors.visitor);
  assert.equal(result.visitors, 1);
  assert.equal(result.orders, 2);
  assert.equal(result.revenue, 30.24);
  assert.equal(result.conversion, 100);
  assert.equal(result.aov, 15.12);
  assert.throws(() => recordOrder(t, "visitor", "order-1", 10), /Duplicate/);
  assert.throws(() => recordOrder(t, "visitor", "order-3", -1), /greater than/);
  assert.throws(
    () => recordVisit(transition(t, "Paused", []), "new"),
    /resume/,
  );
  assert.throws(
    () => recordOrder(transition(t, "Ended", []), "visitor", "new", 10),
    /resume/,
  );
});
test("Sample report gives 25% observed lift and a valid storage roundtrip", () => {
  const t = sampleExperiment("Bundles");
  const r = comparison(t);
  assert.equal(r.a.rpv, 2);
  assert.equal(r.b.rpv, 2.5);
  assert.equal(r.uplift, 25);
  assert.equal(r.leader, "B");
  assert.deepEqual(restoreExperiments(JSON.stringify([t])), [t]);
  assert.throws(() => restoreExperiments(JSON.stringify([t, t])), /invalid/);
  const invalid = structuredClone(t);
  invalid.orders.bad = { visitor: "missing", variant: "A", cents: 500 };
  assert.throws(() => restoreExperiments(JSON.stringify([invalid])), /invalid/);
  assert.equal(comparison(draft()).leader, null);
  assert.equal(comparison(draft()).uplift, null);
});
test("Snapshot and duplicate do not mutate originals; duplicate has no results", () => {
  const t = sampleExperiment("Carts");
  const copy = createExperiment({ ...t, name: "Copy" });
  copy.variants.B.reward = 20;
  assert.equal(t.variants.B.reward, 80);
  assert.equal(copy.status, "Draft");
  assert.equal(copy.startedAt, null);
  assert.equal(Object.keys(copy.orders).length, 0);
  assert.equal(Object.keys(copy.visitors).length, 0);
  assert.notEqual(t.id, copy.id);
});
test("CSV identifies simulated source, preserves commas and neutralizes formula cells", () => {
  const t = draft();
  t.name = '=HYPERLINK("example")';
  t.variants.A.name = "Control, A";
  const csv = reportCSV(t);
  assert.match(csv, /LOCAL PREVIEW \/ SIMULATED/);
  assert.ok(csv.includes('"\'=HYPERLINK(""example"")"'));
  assert.ok(csv.includes('"Control, A"'));
});
