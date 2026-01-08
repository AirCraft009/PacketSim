import { DijkstraEdge, DijkstraNode, ipAddress, Komponent, macAddress, ip, mac, Network } from "./network.js";
import { checkValidRouterIP } from "./util.js";

export class CoreState {
    networks: Map<ip, Network>;
    unconnectedComponents: Map<mac, Komponent>;
    logicalNetworkTopology: Array<DijkstraNode>;
    connectionMap: Map<mac, Array<mac>>;

    constructor() {
        this.unconnectedComponents = new Map();
        this.networks = new Map();
        this.logicalNetworkTopology = new Array();
        this.connectionMap = new Map();
    }

    addComponent(type: string) : macAddress{
        // Create a new component with a default IP of
        var component = new Komponent(type, new ipAddress("0.0.0.0"));
        this.unconnectedComponents.set(component.macAddress.toString(), component);
        return component.macAddress;
    }

    addRouter(ipString : ip | null) : macAddress | false {
        if(!checkValidRouterIP(ipString)) {
            return false;
        }
        //null is checked in checkValidRouterIP
        var router = new Komponent("router", new ipAddress(ipString as string));
        if (this.ipInUseByNetwork(router.ipAddress)){
            return false;
        }

        this.networks.set(router.ipAddress.toString(), new Network(router.ipAddress, router));
        this.logicalNetworkTopology.push(new DijkstraNode(router.ipAddress.toString()));
        return router.macAddress;
    }

    removeComponent(componentMac: mac) {
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

    ipInUseByNetwork(ip: ipAddress) : boolean {
        return this.networks.has(ip.toString());
    }

    alreadyConnected(fromMac: mac, toMac: mac) : boolean {
        if(this.connectionMap.has(fromMac)) {
            return this.connectionMap.get(fromMac)?.includes(toMac) as boolean;
        }
        if(this.connectionMap.has(toMac)) {
            return this.connectionMap.get(toMac)?.includes(fromMac) as boolean;
        }
        return false;
    }

    getComponentByMac(mac: mac): Komponent | null {
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


    connectComponents(fromMac: mac, toMac: mac) {
        // only called after checking if component exists and that theoretical connection is valid
        if(!this.connectionMap.has(fromMac)) {
            this.connectionMap.set(fromMac, []);
        }
        this.connectionMap.get(fromMac)?.push(toMac);

        // connect components is only called after checking for existing connections with alreadyConnected and the other checks in 
        // isvalidConnection so we can assume both components exist and are not already connected
        var fromComp = this.getComponentByMac(fromMac) as Komponent;
        var toComp = this.getComponentByMac(toMac) as Komponent;

        var fromNode = this.logicalNetworkTopology.filter((n) => n.ip.toString() === fromComp.ipAddress.toString())[0];
        var toNode = this.logicalNetworkTopology.filter((n) => n.ip.toString() === toComp.ipAddress.toString())[0];

        fromNode.outgoingEdges.push(new DijkstraEdge(1, fromNode, toNode))
        toNode.outgoingEdges.push(new DijkstraEdge(1,toNode, fromNode));

        if (fromComp.inNetwork) {
            var fromNetwork = this.networks.get(fromComp.ipAddress.getNetworkPart().toString()) as Network;
            fromNetwork.addDevice(toComp);
        } else if (toComp.inNetwork) {
            var toNetwork = this.networks.get(toComp.ipAddress.getNetworkPart().toString()) as Network;
            toNetwork.addDevice(fromComp);
        }        
    }

    addConnected(start: Komponent){
        start.connections
    }

    getStateOfComponent(mac: mac) : string[] {
        var component = this.getComponentByMac(mac);
        if (component === null) {
            return [];
        }
        return [component.type, component.ipAddress.toString(), component.macAddress.toString(), component.connections.size.toString(), component.ipAddress.getNetworkPart().toString(), ];
    }

    SendPacket(fromMac: mac, toIp: ip, data: string) : boolean {
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

        var fromNetwork = this.networks.get(fromComp.ipAddress.getNetworkPart().toString());
        if (fromNetwork) {
            fromNetwork.sendPacket(fromMac, toIp, data, this.makeNetworkMap(fromNetwork.networkIp.toString()));
            return true;
        }
        return true;
    }


    calculateLogicalRoutes(ip: ip) : Array<DijkstraNode> {
        // Create a copy of the logical network topology
        const copiedTopology = this.logicalNetworkTopology.map(node => ({
            ip: node.ip,
            distance: node.distance,
            previous: node.previous,
            outgoingEdges: node.outgoingEdges
        }));

        // Dijkstra's algorithm using a priority queue approach
        const unvisited = new Set(copiedTopology);
        let current = copiedTopology.find(n => n.ip === ip);
        if (current) {
            current.previous = current;
        }


        while (unvisited.size > 0 && current) {
            unvisited.delete(current);

            for (const edge of current.outgoingEdges) {
                const neighbor = copiedTopology.find(n => n.ip === edge.EndNode.ip);
                if (neighbor && unvisited.has(neighbor)) {
                    const newDistance = current.distance + edge.lenght;
                    if (newDistance < neighbor.distance) {
                        neighbor.distance = newDistance;
                        neighbor.previous = current;
                    }
                }
            }

            // Find next unvisited node with minimum distance
            current = Array.from(unvisited).reduce((min, node) => 
                node.distance < min.distance ? node : min, 
                { distance: Infinity } as any
            );
        }

        return copiedTopology;
        }

    makeNetworkMap(ip: ip) : Map<ip, ip> {
        const DijkstraTopology = this.calculateLogicalRoutes(ip);
        // map of ip to ip
        const networkMap = new Map<ip, ip>();
        for (const node of DijkstraTopology) {
            if (node.ip === ip) {
                continue;
            }
            var prevNode = node.previous;
            if (!prevNode) {
                // a node not connected to the one currently in focus
                networkMap.set(node.ip, "0.0.0.0");
                continue;
            }
            // prevNode is not null and no prevNodes can be null
            while (prevNode!.previous!.ip != ip){
                prevNode = prevNode!.previous;
            }
            networkMap.set(node.ip, prevNode!.ip);
        }
        return networkMap;
    }
}