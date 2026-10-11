import { useRef, useState } from "react";
import type { ReactNode, PointerEvent } from "react";

export default function CartBlockOrder<T extends string>({ section, order, names, render, onChange }: {
  section: string; order: T[]; names: Record<T, string>; render: (id: T) => ReactNode;
  onChange: (order: T[], message: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: T; pointer: number; y: number; active: boolean; slot: number } | null>(null);
  const [drag, setDrag] = useState<{ id: T; slot: number } | null>(null);
  const move = (id: T, slot: number) => {
    const next = order.filter(value => value !== id);
    next.splice(slot, 0, id);
    if (next.some((value, index) => value !== order[index])) onChange(next, `${names[id]} moved to position ${slot + 1} in ${section}.`);
  };
  const track = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (!current.active && Math.abs(event.clientY - current.y) < 5) return;
    current.active = true;
    const rows = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-sort-row]") ?? []).filter(row => row.dataset.orderSection === section && row.dataset.sortRow !== current.id);
    current.slot = rows.filter(row => event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2).length;
    setDrag({ id: current.id, slot: current.slot });
    if (event.clientY < 100) window.scrollBy(0, -16);
    else if (event.clientY > window.innerHeight - 70) window.scrollBy(0, 16);
  };
  const finish = (event: PointerEvent<HTMLButtonElement>, cancel = false) => {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    gesture.current = null;
    setDrag(null);
    if (!cancel && current.active) move(current.id, current.slot);
  };
  const remaining = order.filter(id => id !== drag?.id);
  const before = drag ? remaining[drag.slot] : undefined;
  return <div ref={root} className="cd-order-list" aria-label={`${section} block order`}>
    {order.map((id, index) => <div key={id} data-sort-row={id} data-order-section={section} className={`cd-order-row ${drag?.id === id ? "cd-order-dragging" : ""} ${before === id ? "cd-order-before" : ""}`}>
      <button type="button" className="cd-order-handle" aria-label={`Drag ${names[id]} to reorder in ${section}. Use arrow keys to move.`}
        onPointerDown={event => { if (event.button !== 0 || gesture.current) return; event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); gesture.current = { id, pointer: event.pointerId, y: event.clientY, active: false, slot: index }; }}
        onPointerMove={track} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)} onLostPointerCapture={event => finish(event, true)}
        onKeyDown={event => { if (event.key === "Escape") { gesture.current = null; setDrag(null); } else if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); move(id, Math.max(0, Math.min(order.length - 1, index + (event.key === "ArrowUp" ? -1 : 1)))); } }}>
        <svg width="12" height="18" viewBox="0 0 12 18" aria-hidden="true">{[3, 9, 15].flatMap(y => [3, 9].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="currentColor"/>))}</svg>
      </button>{render(id)}
    </div>)}
    {drag && drag.slot === remaining.length && <div className="cd-order-end"/>}
    <span className="cd-order-instruction">Drag the six-dot handle to reorder. Arrow keys also work.</span>
  </div>;
}
