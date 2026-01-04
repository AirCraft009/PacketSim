import { ip, Komponent, Network } from "./network.js";
import { checkValidRouterIP } from "./util.js";

export class CoreState {
    networks: Map<ip, Network>;
    unconnectedComponents: Map<ip, Komponent>;

    constructor() {
        this.unconnectedComponents = new Map();
        this.networks = new Map();
    }

    addComponent(type: string) : ip{
        // Create a new component with a default IP of
        var component = new Komponent(type, new ip("0.0.0.0"));
        this.unconnectedComponents.set(component.ipAddress, component);
        return component.ipAddress;
    }

    addRouter(ipString : string | null) : boolean {
        if(!checkValidRouterIP(ipString)) {
            return false;
        }
        //null is checked in checkValidRouterIP
        var router = new Komponent("router", new ip(ipString as string));
        if (this.ipInUseByNetwork(router.ipAddress)){
            return false;
        }

        this.networks.set(router.ipAddress, new Network(router.ipAddress, router));
        return true;
    }

    removeComponent(ipAddress: ip) {
        this.unconnectedComponents.delete(ipAddress);
        if(this.networks.delete(ipAddress)){
            // if a network was deleted, no need to continue because the device was a router
            return;
        };
        this.networks.get(ipAddress.getHostPart())?.removeDevice(ipAddress);
    }

    ipInUseByNetwork(ip: ip) : boolean {
        return this.networks.has(ip);
    }

    connectComponents(fromIp: ip, toIp: ip) : boolean {
        
    }
}