import { ip, Komponent, Network } from "./network.js";
import { checkValidRouterIP } from "./util.js";
export class CoreState {
    networks;
    unconnectedComponents;
    constructor() {
        this.unconnectedComponents = new Map();
        this.networks = new Map();
    }
    addComponent(type) {
        // Create a new component with a default IP of
        var component = new Komponent(type, new ip("0.0.0.0"));
        this.unconnectedComponents.set(component.ipAddress, component);
        return component.ipAddress;
    }
    addRouter(ipString) {
        if (!checkValidRouterIP(ipString)) {
            return false;
        }
        //null is checked in checkValidRouterIP
        var router = new Komponent("router", new ip(ipString));
        if (this.ipInUseByNetwork(router.ipAddress)) {
            return false;
        }
        this.networks.set(router.ipAddress, new Network(router.ipAddress, router));
        return true;
    }
    removeComponent(ipAddress) {
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
