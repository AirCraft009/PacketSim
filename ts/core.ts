import { DijkstraEdge, DijkstraNode, ipAddress, Komponent, macAddress, ip, mac, Network, Packet } from "./network.js";
import { checkValidRouterIP } from "./util.js";

export class CoreState {
    networks: Map<mac, Network>;
    unconnectedComponents: Map<mac, Komponent>;
    logicalNetworkTopology: Array<DijkstraNode>;
    connectionMap: Map<mac, Array<mac>>;
    GatewayMap: Map<ip, mac>;
    activeIps : Array<ip>;

    constructor() {
        this.unconnectedComponents = new Map();
        this.networks = new Map();
        this.logicalNetworkTopology = new Array();
        this.connectionMap = new Map();
        this.activeIps = new Array();
        this.GatewayMap = new Map();
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
        var router = new Komponent("router", new ipAddress(ipString!));
        if (this.ipInUseByNetwork(ipString!)){
            return false;
        }

        this.activeIps.push(ipString!);
        this.GatewayMap.set(ipString!, router.macAddress.toString());
        this.networks.set(router.macAddress.toString(), new Network(router.ipAddress, router));
        this.logicalNetworkTopology.push(new DijkstraNode(router.macAddress.toString()));
        return router.macAddress;
    }

    removeComponent(componentMac: mac) {
        if(this.connectionMap.has(componentMac)){        
            this.connectionMap.get(componentMac)!.forEach(macAddr => {
                this.connectionMap.delete(macAddr);
            });
            this.connectionMap.delete(componentMac);


            if(this.unconnectedComponents.delete(componentMac)) {
                return;
            }
        }



        this.networks.forEach((network) => {
            if(network.isRouterof(componentMac)){
                this.unconnectedComponents = new Map([...this.unconnectedComponents.entries(), ...network.destroyNetwork()]);
                var strMac = network.router.macAddress.toString()
                this.networks.delete(strMac);
                this.logicalNetworkTopology = this.logicalNetworkTopology.filter(node => node.mac !== network.router.macAddress.toString());
                
                // network gets deleted also delete all edges connecting the network to others
                this.logicalNetworkTopology.find(top => top.mac === strMac)?.outgoingEdges.filter(edge => edge.EndNode.mac !== strMac)
                return;
            }
            if(network.removeDevice(componentMac)){
                return;
            }
        });

    }

    ipInUseByNetwork(ip: ip) : boolean {
        return this.activeIps.includes(ip);
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
        if(!this.connectionMap.has(toMac)){
            this.connectionMap.set(toMac, []);
        }
        this.connectionMap.get(fromMac)?.push(toMac);
        this.connectionMap.get(toMac)?.push(fromMac);

        // connect components is only called after checking for existing connections with alreadyConnected and the other checks in 
        // isvalidConnection so we can assume both components exist and are not already connected
        var fromComp = this.getComponentByMac(fromMac) as Komponent;
        var toComp = this.getComponentByMac(toMac) as Komponent;

        if(fromComp.type === "router" && toComp.type === "router") {
            var fromNode = this.logicalNetworkTopology.filter((n) => n.mac.toString() === fromComp.macAddress.toString())[0];
            var toNode = this.logicalNetworkTopology.filter((n) => n.mac.toString() === toComp.macAddress.toString())[0];

            fromNode.outgoingEdges.push(new DijkstraEdge(1, fromNode, toNode))
            toNode.outgoingEdges.push(new DijkstraEdge(1,toNode, fromNode));
        }

        if (fromComp.inNetwork && !toComp.inNetwork) {
            var fromNetwork = this.networks.get(fromComp.macAddress.toString()) as Network;
            fromNetwork.addDevice(toComp);
        } else if (toComp.inNetwork && !fromComp.inNetwork) {
            var toNetwork = this.networks.get(toComp.macAddress.toString()) as Network;
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

        // stdGateway is not 0.0.0.0 as the component is in a network
        var fromNetwork = this.networks.get(this.GatewayMap.get(fromComp.stdGateWay.toString())!);
        if (fromNetwork) {

            // TODO: find a way to cache the network map in network and only updating when necesarry
            var packet = new Packet(data, toIp, fromNetwork.networkIp.toString(), fromNetwork.router.macAddress.toString())
            console.log(fromNetwork.sendPacket(packet, this.makeNetworkMap(fromNetwork.router.macAddress.toString())));
            return true;
        }
        return true;
    }


    calculateLogicalRoutes(mac: mac) : Array<DijkstraNode> {
        // Create a copy of the logical network topology
        const copiedTopology = this.logicalNetworkTopology.map(node => ({
            mac: node.mac,
            distance: node.distance,
            previous: node.previous,
            outgoingEdges: node.outgoingEdges
        }));

        // Dijkstra's algorithm using a priority queue approach
        const unvisited = new Set(copiedTopology);
        let current = copiedTopology.find(n => n.mac === mac);
        if (current) {
            current.previous = current;
            current.distance = 0;
        }


        while (unvisited.size > 0 && current) {
            unvisited.delete(current);

            for (const edge of current.outgoingEdges) {
                const neighbor = copiedTopology.find(n => n.mac === edge.EndNode.mac);
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

    makeNetworkMap(mac : mac) : Map<mac, ip> {
        const DijkstraTopology = this.calculateLogicalRoutes(mac);
        // map of ip to ip
        const networkMap = new Map<mac, ip>();
        for (const node of DijkstraTopology) {
            if (node.mac === mac) {
                continue;
            }
            var prevNode = node.previous;
            if (!prevNode) {
                // a node not connected to the one currently in focus
                networkMap.set(node.mac, "0.0.0.0");
                continue;
            }
            // prevNode is not null and no prevNodes can be null
            // root.previous == root so if prevNode.previous.ip == ip the rootnode was found
            var routeIp : string = prevNode.mac;
            while (prevNode!.previous!.mac !== mac){

                // if the node is already in the map use the map of the prevNode
                var possibleNode = networkMap.get(prevNode!.mac);
                if(possibleNode !== undefined) {
                    routeIp = possibleNode;
                    break;
                }

                prevNode = prevNode!.previous;
                routeIp = prevNode!.mac;
            }
            networkMap.set(node.mac, routeIp);
        }
        return networkMap;
    }
}