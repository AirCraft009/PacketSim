export class ip {
    /**
     *
     * @param {A string in the format 111.111.111.111} ip
     */
    octets;
    constructor(ip) {
        this.octets = [];
        this.constructOctets(ip);
    }
    isNull() {
        return this.octets.every(octet => octet === 0);
    }
    isNetworkIP() {
        return this.octets[3] === 0;
    }
    getNetworkPart() {
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
    equalsHost(ip) {
        for (let i = 0; i < this.octets.length - 1; i++) {
            if (this.octets[i] !== ip.octets[i]) {
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
    equals(ip) {
        for (let i = 0; i < this.octets.length; i++) {
            if (this.octets[i] !== ip.octets[i]) {
                return false;
            }
        }
        return true;
    }
    constructOctets(ip) {
        var stringOctets = ip.split(".");
        if (stringOctets.length !== 4) {
            throw new Error("Invalid ip adress passed:" + ip);
        }
        stringOctets.forEach(octet => {
            try {
                this.octets.push(parseInt(octet));
            }
            catch (e) {
                throw new Error("non integer found in octet: " + octet);
            }
        });
    }
    toString() {
        return this.octets.join(".");
    }
    modifyOctet(index, value) {
        if (index < 0 || index > 3) {
            console.error("Invalid octet index:", index);
            return;
        }
        this.octets[index] = value;
    }
    clone() {
        return new ip(this.toString());
    }
    static checkValidIpString(ipString) {
        const octets = ipString.split(".");
        if (octets.length !== 4)
            return false;
        for (let octet of octets) {
            const num = parseInt(octet);
            if (isNaN(num) || num < 0 || num > 255) {
                return false;
            }
        }
        return true;
    }
}
class NextMacAddr {
    static byte_4 = 0;
    static byte_5 = 0;
    static byte_6 = 0;
    static getNextMacAddr() {
        if (this.byte_6 === 255) {
            this.byte_6 = 0;
            if (this.byte_5 === 255) {
                this.byte_5 = 0;
                //byte 4 cannot possibly overflow in our usecase
                this.byte_4++;
            }
            else {
                this.byte_5++;
            }
        }
        else {
            this.byte_6++;
        }
        return [this.byte_4, this.byte_5, this.byte_6];
    }
}
export class macAddress {
    prefix;
    specific;
    constructor() {
        this.prefix = [0x00, 0x07, 0xE9];
        this.specific = NextMacAddr.getNextMacAddr();
    }
    toString() {
        const fullMac = this.prefix.concat(this.specific);
        return fullMac.map(byte => byte.toString(16).padStart(2, '0')).join(':');
    }
    equals(mac) {
        return this.specific.every((value, index) => value === mac.specific[index]);
    }
}
export class Network {
    /**
     *
     * Implementation of a basic network with subnetmask 24
     * @param {The start of the Network addr} ip
     */
    subnet;
    modifyOctet;
    networkIp;
    numDevices;
    // map of mac addresses to components in the network
    networkDevices;
    travelNodes;
    router;
    arpTable; //map of ip string to mac address string
    constructor(ip, router) {
        this.subnet = 24;
        this.modifyOctet = 3; // 24(host-bits)/8(size of a octet)
        this.networkIp = ip;
        this.numDevices = 0;
        this.networkDevices = new Map();
        this.router = router;
        this.travelNodes = new Array();
        this.arpTable = new Map();
    }
    /**
     *
     * doesn't correctly handle removal of comps yet if a device is removed that isn't at pos len-1
     * the next added device will be assigned the same ip as the current top(len-1) position
     * @param index
     * @returns
     */
    addDevice(component) {
        // check if network is full
        // 32 - subnet gives the number of host bits
        // 2^hostbits - 2 gives the number of usable addresses (we subtract 2 for network and broadcast addresses)
        if (this.numDevices === Math.pow(2, 32 - this.subnet) - 2) {
            console.error("Network full");
            return false;
        }
        this.numDevices++;
        let newIp = this.networkIp.clone();
        newIp.modifyOctet(this.modifyOctet, this.networkIp.octets[this.modifyOctet] + this.numDevices);
        component.ipAddress = newIp;
        component.inNetwork = true;
        this.networkDevices.set(component.macAddress.toString(), component);
        this.arpTable.set(newIp.toString(), component.macAddress.toString());
        return true;
    }
    removeDevice(macAddress) {
        var ipComp = this.networkDevices.get(macAddress);
        if (this.networkDevices.delete(macAddress)) {
            this.numDevices--;
            this.arpTable.delete(ipComp.ipAddress.toString());
        }
        ;
    }
    isRouterof(komponentMac) {
        return this.router.macAddress.toString() === komponentMac;
    }
    destroyNetwork() {
        // reset all components in the network to unconnected state
        this.networkDevices.forEach((component) => {
            component.inNetwork = false;
            component.ipAddress = new ip("0.0.0.0");
            component.connections.delete(this.router.ipAddress.toString());
        });
        return this.networkDevices.entries();
    }
    sendPacket(fromDevice, toIp, data) {
        // handle packet sending in local network
        var toMac = this.arpTable.get(toIp);
        if (toMac === undefined) {
            // destination ip outside of local network
            //TODO: handle routing via router
            return false;
        }
        var toDevice = this.networkDevices.get(toMac);
        if (toDevice === undefined) {
            return false;
        }
        toDevice.receiveAndHandlePacket(fromDevice, toIp, data);
        console.log(`Packet sent from ${fromDevice} to ${toDevice.macAddress.toString()} with data: ${data}`);
        return true;
    }
}
export class Komponent {
    type;
    connections;
    ipAddress;
    macAddress;
    inNetwork;
    constructor(type, ipAddress) {
        this.type = type;
        this.connections = new Set();
        this.ipAddress = ipAddress;
        this.macAddress = new macAddress();
        this.inNetwork = type === "router";
    }
    receiveAndHandlePacket(fromMac, toIp, data) {
        if (this.type !== "server") {
            return null;
        }
        //TODO: implement packet handling and return a simple echo response back to the sender
        return [fromMac, toIp, data];
    }
}
;
/**
 * Node class for Dijkstra's algorithm
 */
export class DijkstraNode {
    id;
    previous;
    // right now all distances are equal so this is just a placeholder
    distance;
    constructor(id) {
        this.id = id;
        this.previous = null;
        this.distance = -1;
    }
}
/**
 * Node class for Router table
 * travel is the node the packet should be sent to next
 */
class TravelNodes {
    id;
    distance;
    travel;
    constructor(id, distance, travel) {
        this.id = id;
        this.distance = distance;
        this.travel = travel;
    }
}
