// core.ts

import { IP, Network, ComponentId } from "./network.js";

/* ---------- component model ---------- */

export type ComponentType = "router" | "host";

export interface LogicalComponent {
  readonly id: ComponentId;
  readonly type: ComponentType;
  ip: IP;
  gateway: IP;
  connections: Set<ComponentId>;
  network: Network;
}

export interface VisualComponent {
  readonly id: ComponentId;
  readonly cell: HTMLElement;
}

/* ---------- editor state ---------- */

export type EditorMode =
  | { kind: "idle" }
  | { kind: "connecting"; from: ComponentId };

export interface EditorState {
  mode: EditorMode;
  selected: ComponentId | null;
}

/* ---------- store ---------- */

export class EditorStore {
  private nextId = 0;

  readonly logical = new Map<ComponentId, LogicalComponent>();
  readonly visual  = new Map<ComponentId, VisualComponent>();
  readonly networks: Network[] = [Network.createBase()];

  state: EditorState = {
    mode: { kind: "idle" },
    selected: null
  };

  createComponent(
    type: ComponentType,
    cell: HTMLElement
  ): ComponentId {
    const id = this.nextId++;

    const baseNet = this.networks[0];
    const ip = baseNet.addDevice(id);
    if (!ip) {
      throw new Error("Base network full");
    }

    const comp: LogicalComponent = {
      id,
      type,
      ip,
      gateway: baseNet.hostIp,
      connections: new Set(),
      network: baseNet
    };

    this.logical.set(id, comp);
    this.visual.set(id, { id, cell });

    return id;
  }

  removeComponent(id: ComponentId): void {
    const comp = this.logical.get(id);
    if (!comp) return;

    for (const other of comp.connections) {
      this.logical.get(other)?.connections.delete(id);
    }

    comp.network.removeDevice(comp.ip);

    this.logical.delete(id);
    this.visual.delete(id);

    if (this.state.selected === id) {
      this.state.selected = null;
      this.state.mode = { kind: "idle" };
    }
  }
}

/* ---------- connections ---------- */

export function canConnect(
  a: LogicalComponent,
  b: LogicalComponent
): boolean {
  if (a.id === b.id) return false;
  if (a.connections.has(b.id)) return false;
  return true;
}

export function connectComponents(
  a: LogicalComponent,
  b: LogicalComponent
): void {
  a.connections.add(b.id);
  b.connections.add(a.id);

  if (a.type === "router" && b.type !== "router") {
    moveToNetwork(b, a.network);
  } else if (b.type === "router" && a.type !== "router") {
    moveToNetwork(a, b.network);
  }
}

function moveToNetwork(
  comp: LogicalComponent,
  network: Network
): void {
  comp.network.removeDevice(comp.ip);

  const newIp = network.addDevice(comp.id);
  if (!newIp) {
    throw new Error("Target network full");
  }

  comp.ip = newIp;
  comp.gateway = network.hostIp;
  comp.network = network;
}
