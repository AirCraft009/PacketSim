

export class ip {
    /**
     * 
     * @param {A string in the format 111.111.111.111} ip
     */
    octets: number[];


    constructor(ip: string) {
        this.octets = [];
        this.constructOctets(ip);
    }

    isNull(ip: ip) {
        return ip.octets.every(octet => octet === 0);
    }

    isHostIP() {
        return this.octets[3] === 0;
    }

    getHostPart() {
        var clone = this.clone();
        clone.modifyOctet(3, 0);
        return new ip(clone.toString());
    }

    /**
     * Checks if all octets except the last one equal eachother.\
     * Because all networks use a /24 subnetmask the network addr is always has a 0 in the 4th octet.\
     * So by checking 0 - 2 we only check if it's in the same network / the hostbits are the same
     * @param ip 
     * @returns 
     */
    equalsHost(ip: ip) { 
        for (let i = 0; i < this.octets.length-1; i++){
            if (this.octets[i] !== ip.octets[i]){
                return false;
            }
        }
        return true;
    }

    /**
     * Checks if all octets equal eachother
     * @param ip  
     * @returns 
     */
    equals(ip: ip) {
        for (let i = 0; i < this.octets.length; i++){
            if (this.octets[i] !== ip.octets[i]) {
                return false;
            }
        }
        return true;
    }

    constructOctets(ip: string) {
        var stringOctets = ip.split(".");
        if (stringOctets.length !== 4) {
            throw new Error("Invalid ip adress passed:" + ip);
        }
        stringOctets.forEach(octet => {
            try{
                this.octets.push(parseInt(octet));
            } catch (e) {
                throw new Error("non integer found in octet: " + octet);
            }
        });
    }

    toString() {
        return this.octets.join(".");
    }

    modifyOctet(index: number, value: number) {
        if (index < 0 || index > 3) {
            console.error("Invalid octet index:", index);
            return;
        }
        this.octets[index] = value;
    }

    clone () {
        return new ip(this.toString());
    }

    static checkValidIpString(ipString: string): boolean {
        const octets = ipString.split(".");
        if (octets.length !== 4) return false;
        for (let octet of octets) {
            const num = parseInt(octet);
            if (isNaN(num) || num < 0 || num > 255) {
                return false;
            }
        }
        return true;
    }

}

export class Network {
    /**
     * 
     * Implementation of a basic network with subnetmask 24
     * @param {The start of the Network addr} ip
     */
    subnet: number;
    modifyOctet: number
    hostIp: ip;
    numDevices: number
    networkDevices: Map<ip, Komponent>;
    travelNodes: Array<TransactionNode>;
    dijkstraNodes: Array<Node>;
    router : Komponent;


    constructor(ip: ip, router: Komponent) {
        this.subnet = 24;
        this.modifyOctet = 3 // 24(host-bits)/8(size of a octet)
        this.hostIp = ip;
        this.numDevices = 0;
        this.networkDevices = new Map();
        this.router = router;
        this.travelNodes = new Array();
        this.dijkstraNodes = new Array();
    }

    /**
     * 
     * doesn't correctly handle removal of comps yet if a device is removed that isn't at pos len-1
     * the next added device will be assigned the same ip as the current top(len-1) position
     * @param index 
     * @returns 
     */
    addDevice(component : Komponent) : boolean{
        // check if network is full
        // 32 - subnet gives the number of host bits
        // 2^hostbits - 2 gives the number of usable addresses (we subtract 2 for network and broadcast addresses)
        if (this.numDevices === Math.pow(2, 32 - this.subnet) - 2) {
            console.error("Network full");
            return false;
        }
        
        this.numDevices++;
        let newIp = this.hostIp.clone();
        newIp.modifyOctet(this.modifyOctet, this.hostIp.octets[this.modifyOctet] + this.numDevices);
        component.ipAddress = newIp;
        this.networkDevices.set(newIp, component);
        return true;
    }

    

    removeDevice(ip: ip) {
        this.numDevices--;
        this.networkDevices.delete(ip);
    }

    connectToRemoteRouter(targetRouterIp: ip){
        this.
    }
}

class nummberGenerator {
    static currentId = 0;

    static getNextId() {
        return this.currentId++;
    }
}

export class Komponent {
    type : string;
    connections : Set<ip>;
    ipAddress : ip;
    id: number;


  constructor(type: string, ipAddress: ip) {
    this.type = type;
    this.connections = new Set();
    this.ipAddress = ipAddress;
    this.id = nummberGenerator.getNextId();
  }

  updateIpAddress(newIp: ip) {
    this.ipAddress = newIp;
  }
};

/**
 * Node class for Dijkstra's algorithm
 */
class Node {
    id : ip;
    previous : Node | null;
    distance : number;

    constructor(id : ip){
        this.id = id;
        this.previous = null;
        this.distance = -1;
    }
}


/**
 * Node class for Router table
 * travel is the node the packet should be sent to next
 */
class TransactionNode {
    id : ip;
    distance : number;
    travel : Node;
    constructor(id : ip, distance : number, travel : number){
        this.id = id;
        this.distance = distance;
        this.travel = travel;
    }
}