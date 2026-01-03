import {
  EditorStore,
  canConnect,
  connectComponents
} from "./core.js";

import { drawLine, removeConnections } from "./util.js";

const store = new EditorStore();

export function onDrop(cell: HTMLElement, type: "router" | "host") {
  store.createComponent(type, cell);
}

export function onConnect(aId: number, bId: number) {
  const a = store.logical.get(aId);
  const b = store.logical.get(bId);
  if (!a || !b) return;

  if (!canConnect(a, b)) return;

  connectComponents(a, b);

  const va = store.visual.get(aId);
  const vb = store.visual.get(bId);
  if (va && vb) {
    drawLine(va.cell, vb.cell);
  }
}

export function onRemove(id: number) {
  store.removeComponent(id);
  removeConnections(id);
}
