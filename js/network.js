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
    isNull(ip) {
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
export class Network {
    /**
     *
     * Implementation of a basic network with subnetmask 24
     * @param {The start of the Network addr} ip
     */
    subnet;
    modifyOctet;
    hostIp;
    numDevices;
    networkDevices;
    router;
    constructor(ip, router) {
        this.subnet = 24;
        this.modifyOctet = 3; // 24(host-bits)/8(size of a octet)
        this.hostIp = ip;
        this.numDevices = 0;
        this.networkDevices = new Map();
        this.router = router;
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
        let newIp = this.hostIp.clone();
        newIp.modifyOctet(this.modifyOctet, this.hostIp.octets[this.modifyOctet] + this.numDevices);
        component.ipAddress = newIp;
        this.networkDevices.set(newIp, component);
        return true;
    }
    removeDevice(ip) {
        this.numDevices--;
        this.networkDevices.delete(ip);
    }
}
export class Komponent {
    cell;
    type;
    connections;
    index;
    ipAddress;
    standardGateway;
    constructor(cell, type, index, ipAddress, standardGateway) {
        this.cell = cell;
        this.type = type;
        this.connections = new Set();
        this.index = index;
        this.ipAddress = ipAddress;
        this.standardGateway = standardGateway;
    }
    updateIpAddress(newIp) {
        this.ipAddress = newIp;
    }
}
;
