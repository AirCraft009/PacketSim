import { EditorStore, canConnect, connectComponents } from "./core.js";
import { drawLine, removeConnections } from "./util.js";
const store = new EditorStore();
export function onDrop(cell, type) {
    store.createComponent(type, cell);
}
export function onConnect(aId, bId) {
    const a = store.logical.get(aId);
    const b = store.logical.get(bId);
    if (!a || !b)
        return;
    if (!canConnect(a, b))
        return;
    connectComponents(a, b);
    const va = store.visual.get(aId);
    const vb = store.visual.get(bId);
    if (va && vb) {
        drawLine(va.cell, vb.cell, vb.id, va.id);
    }
}
export function onRemove(id) {
    store.removeComponent(id);
    removeConnections(id);
}
