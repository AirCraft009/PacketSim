import { Network } from "./network";
class CoreState {
    networks;
    unconnectedComponents;
    constructor() {
        this.unconnectedComponents = new Map();
        this.networks = new Map();
    }
    addComponent(component) {
        if (component.type === "router") {
            if (this.ipInUseByNetwork(component.ipAddress)) {
                return false;
            }
            this.networks.set(component.ipAddress, new Network(component.ipAddress, component));
            return true;
        }
        this.unconnectedComponents.set(component.ipAddress, component);
        return true;
    }
    renmoveComponent(ipAddress) {
        this.unconnectedComponents.delete(ipAddress);
        if (this.networks.delete(ipAddress)) {
            // if a network was deleted, no need to continue because the device was a router
            return;
        }
        ;
        this.networks.get(ipAddress.getHostPart())?.removeDevice(ipAddress);
    }
    ipInUseByNetwork(ip) {
        return this.networks.has(ip);
    }
}
