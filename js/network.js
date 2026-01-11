export class ipAddress {
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
    /**
     *
     * @param ip a correctly formed ip string if unsure check with ipAdress.checkValidIpString()
     */
    static isNull(ip) {
        ip.split(".").every(octet => parseInt(octet, 10) === 0);
    }
    static toNetwork(ip) {
        return (ip.slice(0, ip.lastIndexOf(".") + 1)) + "0";
    }
    isNetworkIP() {
        return this.octets[3] === 0;
    }
    getNetworkPart() {
        var clone = this.clone();
        clone.modifyOctet(3, 0);
        return new ipAddress(clone.toString());
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
    constructOctets(ipString) {
        var stringOctets = ipString.split(".");
        if (stringOctets.length !== 4) {
            throw new Error("Invalid ip adress passed:" + ipString);
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
        return new ipAddress(this.toString());
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
    macAdress;
    constructor(ip, router) {
        this.subnet = 24;
        this.modifyOctet = 3; // 24(host-bits)/8(size of a octet)
        this.networkIp = ip;
        this.numDevices = 0;
        this.networkDevices = new Map();
        this.router = router;
        this.travelNodes = new Array();
        this.arpTable = new Map();
        this.macAdress = router.macAddress.toString();
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
            return true;
        }
        ;
        return false;
    }
    isRouterof(komponentMac) {
        return this.macAdress === komponentMac;
    }
    destroyNetwork() {
        // reset all components in the network to unconnected state
        this.networkDevices.forEach((component) => {
            component.inNetwork = false;
            component.ipAddress = new ipAddress("0.0.0.0");
            component.connections.delete(this.router.ipAddress.toString());
        });
        return this.networkDevices.entries();
    }
    sendPacket(packet, netMap) {
        if (packet.destinationMac !== this.macAdress) {
            packet.status = status.FAILED;
            return packet;
        }
        var networkIP = ipAddress.toNetwork(packet.destinationIP);
        // handle packet sending in local network
        var toMac = this.arpTable.get(packet.destinationIP);
        if (toMac === undefined) {
            var sendIP = netMap.get(networkIP);
            //TODO : mac Adress
            if (!sendIP || ipAddress.isNull(sendIP)) {
                packet.status = status.FAILED;
                return packet;
            }
            // send to next Network
            packet.status = status.SUCCESS;
            packet.travelNetwork(this.macAdress, sendIP);
            return packet;
        }
        var toDevice = this.networkDevices.get(toMac);
        if (toDevice === undefined) {
            packet.status = status.FAILED;
            return packet;
        }
        toDevice.receiveAndHandlePacket(packet);
        packet.status = status.TERMINATED_SUCCESS;
        return packet;
    }
}
var status;
(function (status) {
    status[status["SUCCESS"] = 0] = "SUCCESS";
    status[status["FAILED"] = 1] = "FAILED";
    status[status["TERMINATED_SUCCESS"] = 2] = "TERMINATED_SUCCESS";
    status[status["TERMINATED_FAILED"] = 3] = "TERMINATED_FAILED";
    status[status["PENDING"] = 4] = "PENDING";
})(status || (status = {}));
export class Packet {
    data;
    destinationIP;
    sourceIP;
    destinationMac;
    sourceMac;
    status;
    constructor(data, destinationIP, sourceIP, sourceMac, destinationMac) {
        this.data = data;
        this.destinationIP = destinationIP;
        this.sourceIP = sourceIP;
        this.destinationMac = destinationMac;
        this.sourceMac = sourceMac;
        this.status = status.PENDING;
    }
    travelNetwork(sourceMac, destinationMac) {
        this.sourceMac = sourceMac;
        this.destinationMac = destinationMac;
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
    receiveAndHandlePacket(packet) {
        if (this.type !== "server") {
            return null;
        }
        //TODO: implement packet handling and return more than a simple echo response back to the sender
        return packet.data;
    }
}
;
/**
 * Node class for Dijkstra's algorithm
 */
export class DijkstraNode {
    ip;
    mac;
    previous;
    // right now all distances are equal so this is just a placeholder
    distance;
    outgoingEdges;
    constructor(ip, mac) {
        this.ip = ip;
        this.mac = mac;
        this.previous = null;
        this.distance = Infinity;
        this.outgoingEdges = [];
    }
}
export class DijkstraEdge {
    lenght;
    StartNode;
    EndNode;
    constructor(lenght, StartNode, EndNode) {
        this.lenght = lenght;
        this.StartNode = StartNode;
        this.EndNode = EndNode;
    }
}
