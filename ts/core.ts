import { DijkstraNode, ip, Komponent, macAddress, Network } from "./network.js";
import { checkValidRouterIP } from "./util.js";

export class CoreState {
    networks: Map<string, Network>;
    unconnectedComponents: Map<string, Komponent>;
    logicalNetworkTopology: Array<DijkstraNode>;
    connectionMap: Map<string, Array<string>>;

    constructor() {
        this.unconnectedComponents = new Map();
        this.networks = new Map();
        this.logicalNetworkTopology = new Array();
        this.connectionMap = new Map();
    }

    addComponent(type: string) : macAddress{
        // Create a new component with a default IP of
        var component = new Komponent(type, new ip("0.0.0.0"));
        this.unconnectedComponents.set(component.macAddress.toString(), component);
        return component.macAddress;
    }

    addRouter(ipString : string | null) : macAddress | false {
        if(!checkValidRouterIP(ipString)) {
            return false;
        }
        //null is checked in checkValidRouterIP
        var router = new Komponent("router", new ip(ipString as string));
        if (this.ipInUseByNetwork(router.ipAddress)){
            return false;
        }

        this.networks.set(router.ipAddress.toString(), new Network(router.ipAddress, router));
        this.logicalNetworkTopology.push(new DijkstraNode(router.ipAddress.toString()));
        return router.macAddress;
    }

    removeComponent(componentMac: string) {
        if(this.unconnectedComponents.delete(componentMac)) {
            return;
        }

        this.networks.forEach((network) => {
            if(network.isRouterof(componentMac)){
                this.unconnectedComponents = new Map([...this.unconnectedComponents.entries(), ...network.destroyNetwork()]);
                this.networks.delete(network.networkIp.toString());
                this.logicalNetworkTopology = this.logicalNetworkTopology.filter(node => node.ip !== network.networkIp.toString());
                return;
            }
            network.removeDevice(componentMac);
        });

    }

    ipInUseByNetwork(ip: ip) : boolean {
        return this.networks.has(ip.toString());
    }

    alreadyConnected(fromMac: string, toMac: string) : boolean {
        if(this.connectionMap.has(fromMac)) {
            return this.connectionMap.get(fromMac)?.includes(toMac) as boolean;
        }
        if(this.connectionMap.has(toMac)) {
            return this.connectionMap.get(toMac)?.includes(fromMac) as boolean;
        }
        return false;
    }

    getComponentByMac(mac: string): Komponent | null {
        if (this.unconnectedComponents.has(mac)) {
            return this.unconnectedComponents.get(mac) as Komponent;
        }

        for (const network of this.networks.values()) {
            if (network.isRouterof(mac)) {
                return network.router;
            }
            if (network.networkDevices.has(mac)) {
                return network.networkDevices.get(mac) as Komponent;
            }
        }

        return null;
    }


    connectComponents(fromMac: string, toMac: string) {
        // only called after checking if component exists and that theoretical connection is valid
        if(!this.connectionMap.has(fromMac)) {
            this.connectionMap.set(fromMac, []);
        }
        this.connectionMap.get(fromMac)?.push(toMac);

        // connect components is only called after checking for existing connections with alreadyConnected and the other checks in 
        // isvalidConnection so we can assume both components exist and are not already connected
        var fromComp = this.getComponentByMac(fromMac) as Komponent;
        var toComp = this.getComponentByMac(toMac) as Komponent;

        if (fromComp.inNetwork) {
            var fromNetwork = this.networks.get(fromComp.ipAddress.getNetworkPart().toString()) as Network;
            fromNetwork.addDevice(toComp);
        } else if (toComp.inNetwork) {
            var toNetwork = this.networks.get(toComp.ipAddress.getNetworkPart().toString()) as Network;
            toNetwork.addDevice(fromComp);
        }        
    }

    getStateOfComponent(mac: string) : string[] {
        var component = this.getComponentByMac(mac);
        if (component === null) {
            return [];
        }
        return [component.type, component.ipAddress.toString(), component.macAddress.toString(), component.connections.size.toString(), component.ipAddress.getNetworkPart().toString(), ];
    }

    SendPacket(fromMac: string, toIp: string, data: string) : boolean {
        // get Network of fromMac
        var fromComp = this.getComponentByMac(fromMac);
        if (fromComp === null) {
            console.error("Component not found");
            return false;
        }

        if (!fromComp.inNetwork) {
            console.error("Component not in a network connect to a router first");
            return false;
        }

        var fromNetwork = this.networks.get(fromComp.ipAddress.getNetworkPart().toString())!;
        fromNetwork.sendPacket(fromMac, toIp, data);

        return true;
    }

    calculateLogicalRoutes() {
        var rootNode = this.logicalNetworkTopology.at(0);
        if (rootNode === undefined) {
            return;
        }
        rootNode.distance = 0;
        rootNode.previous = rootNode;
        for (var i = 1; i < this.logicalNetworkTopology.length; i++) {
            var unvisited = this.logicalNetworkTopology[i];
            
        }
    }
}