import { DijkstraEdge, DijkstraNode, ipAddress, Komponent, ip, mac, Network, Packet } from "./network.js";
import { checkValidRouterIP } from "./util.js";

export class CoreState {
    networks: Map<ip, Network>;
    unconnectedComponents: Map<mac, Komponent>;
    logicalNetworkTopology: Array<DijkstraNode>;
    connectionMap: Map<mac, Array<mac>>;
    // index of currently active packets 
    activePackets: Array<number>;
    allPackets: Array<Packet>

    constructor() {
        this.unconnectedComponents = new Map();
        this.networks = new Map();
        this.logicalNetworkTopology = [];
        this.connectionMap = new Map();
        this.activePackets = [];
        this.allPackets = [];
    }

    addComponent(type: string) : [mac, ip]{
        // Create a new component with a default IP of
        let component = new Komponent(type, new ipAddress("0.0.0.0"));
        this.unconnectedComponents.set(component.macAddress.toString(), component);
        return [component.macAddress.toString(), component.ipAddress.toString()];
    }

    addRouter(ipString : ip | null) : [mac, ip] | false {
        if(!checkValidRouterIP(ipString)) {
            return false;
        }
        //null is checked in checkValidRouterIP
        let router = new Komponent("router", new ipAddress(ipString as string));
        if (this.ipInUseByNetwork(router.ipAddress)){
            return false;
        }

        this.networks.set(router.ipAddress.toString(), new Network(router.ipAddress, router));
        this.logicalNetworkTopology.push(new DijkstraNode(router.ipAddress.toString(), router.macAddress.toString()));
        return [router.macAddress.toString(), router.ipAddress.toString()];
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
                let strIP = network.networkIp.toString()
                this.networks.delete(strIP);
                this.logicalNetworkTopology = this.logicalNetworkTopology.filter(node => node.ip !== network.networkIp.toString());
                
                // network gets deleted also delete all edges connecting the network to others
                this.logicalNetworkTopology.find(top => top.ip === strIP)?.outgoingEdges.filter(edge => edge.EndNode.ip !== strIP)
                return;
            }
            if(network.removeDevice(componentMac)){
                return;
            }
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
        if(!this.connectionMap.has(toMac)){
            this.connectionMap.set(toMac, []);
        }
        this.connectionMap.get(fromMac)?.push(toMac);
        this.connectionMap.get(toMac)?.push(fromMac);

        // connect components is only called after checking for existing connections with alreadyConnected and the other checks in 
        // isvalidConnection so we can assume both components exist and are not already connected
        let fromComp = this.getComponentByMac(fromMac) as Komponent;
        let toComp = this.getComponentByMac(toMac) as Komponent;

        if(fromComp.type === "router" && toComp.type === "router") {
            let fromIp = fromComp.ipAddress.toString()
            let toIP = toComp.ipAddress.toString()

            let fromNode = this.logicalNetworkTopology.filter((n) => n.ip.toString() === fromIp)[0];
            let toNode = this.logicalNetworkTopology.filter((n) => n.ip.toString() === toIP)[0];

            fromNode.outgoingEdges.push(new DijkstraEdge(1, fromNode, toNode))
            toNode.outgoingEdges.push(new DijkstraEdge(1,toNode, fromNode));

            let fromNet = this.networks.get(fromIp)!
            let toNet = this.networks.get(toIP)!
            fromNet.arpTable.set(toIP,  toNet.macAdress)
            toNet.arpTable.set(fromIp, fromNet.macAdress)
        }

        if (fromComp.inNetwork && !toComp.inNetwork) {
            let fromNetwork = this.networks.get(fromComp.ipAddress.getNetworkPart().toString()) as Network;
            fromNetwork.addDevice(toComp);
        } else if (toComp.inNetwork && !fromComp.inNetwork) {
            let toNetwork = this.networks.get(toComp.ipAddress.getNetworkPart().toString()) as Network;
            toNetwork.addDevice(fromComp);
        }        
    }

    getStateOfComponent(mac: mac) : string[] {
        let component = this.getComponentByMac(mac);
        if (component === null) {
            return [];
        }
        return [component.type, component.ipAddress.toString(), component.macAddress.toString(), component.connections.size.toString(), component.ipAddress.getNetworkPart().toString(), ];
    }



    RegisterPacket(fromMac: mac, toIp: ip, data: string) : Packet | null {

        // get Network of fromMac
        let fromComp = this.getComponentByMac(fromMac);
        if (fromComp === null) {
            console.error("Component not found");
            return null;
        }

        if (!fromComp.inNetwork) {
            console.error("Component not in a network connect to a router first");
            return null;
        }

        let fromNetwork = this.networks.get(fromComp.ipAddress.getNetworkPart().toString());
        if (fromNetwork) {

            // packet uses the fromNetwork.macAdress as source 
            // even when it comes from a in network device 
            // to make the handling easier by allowing the router to be found by getComponentByMac
            let packet = new Packet(data, toIp, fromComp.ipAddress.toString(), fromMac, fromNetwork.macAdress, this.allPackets.length);
            this.allPackets.push(packet);
            this.activePackets.push(this.allPackets.length-1)
            return packet;
        }
        return null;
    }

    sendPacket(packet: Packet) : [boolean, string] {
        let fromRouter = this.getComponentByMac(packet.destinationMac);
        if (!fromRouter) {
            return [false, ""];
        }
        // TODO: find a way to cache the network map in network and only updating when necesarry

        let data = this.networks.get(ipAddress.toNetwork(fromRouter.ipAddress.toString()))!.sendPacket(packet, this.makeNetworkMap(fromRouter.ipAddress.toString()))
        if(!data[0]){
            //not active anymore 
            this.activePackets = this.activePackets.filter(packet_index => this.allPackets[packet_index].id !== packet.id);
            return data;
        }
        return [true, ""];
    }

    stepTick() : Array<number>{
        const sentPackets = new Array<number>();
        for (const packet_index of this.activePackets){
            let activePacket = this.allPackets[packet_index];
            let data = this.sendPacket(activePacket)
            if(!data[0]){
                if (data[1] != ""){
                    this.RegisterPacket(activePacket.destinationMac, activePacket.sourceIP,data[1])
                }
            }
            sentPackets.push(activePacket.id);
        }
        return sentPackets;
    }


    getPacketInfo(id : number){
        let packet = this.allPackets.at(id)
        if(!packet || packet.id !== id) {
            return this.allPackets.find(packet => packet.id === id);
        }

        return packet;
    }


    calculateLogicalRoutes(ip: ip) : Array<DijkstraNode> {
        // Create a copy of the logical network topology
        const copiedTopology = this.logicalNetworkTopology.map(node => ({
            ip: node.ip,
            mac: node.mac,
            distance: node.distance,
            previous: node.previous,
            outgoingEdges: node.outgoingEdges
        }));

        // Dijkstra's algorithm using a priority queue approach
        const unvisited = new Set(copiedTopology);
        let current = copiedTopology.find(n => n.ip === ip);
        if (current) {
            current.previous = current;
            current.distance = 0;
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

    makeNetworkMap(ip: ip) : Map<ip, mac> {
        const DijkstraTopology = this.calculateLogicalRoutes(ip);
        // map of ip to ip
        const networkMap = new Map<ip, mac>();
        for (const node of DijkstraTopology) {
            if (node.ip === ip) {
                continue;
            }
            let prevNode = node.previous;
            if (!prevNode) {
                // a node not connected to the one currently in focus
                //TODO: null out mac not iP
                networkMap.set(node.ip, "0.0.0.0");
                continue;
            }
            // prevNode is not null and no prevNodes can be null
            // root.previous == root so if prevNode.previous.ip == ip the rootnode was found
            let routemac : string = prevNode.mac;
            while (prevNode!.previous!.ip !== ip){

                // if the node is already in the map use the map of the prevNode
                let possibleNode = networkMap.get(prevNode!.ip);
                if(possibleNode !== undefined) {
                    routemac = possibleNode;
                    break;
                }

                prevNode = prevNode!.previous;
                routemac = prevNode!.mac;
            }
            networkMap.set(node.ip, routemac);
        }
        return networkMap;
    }

    removeInactivePackets() {
        let currentPackets = new Array<Packet>();
        // iterable of active packets is iterated over so any changes to activePackets won't affect the loop
        for (const [index, packetIndex] of this.activePackets.entries()) {
            let relPacket = this.allPackets[packetIndex];
            relPacket.id = index;
            currentPackets.push(relPacket);
            this.activePackets[index] = index
        }
    }
}