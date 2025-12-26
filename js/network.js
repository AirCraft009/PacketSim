export class ip {
    /**
     * 
     * @param {A string in the format 111.111.111.111} ip
     */
    constructor(ip) {
        this.octets = [];
        this.constructOctets(ip);
    }

    constructOctets(ip) {
        var stringOctets = ip.split(".");
        if (stringOctets.length !== 4) {
            console.error("Invalid ip adress passed:", ip);
            return;
        }
        stringOctets.forEach(octet => {
            try{
                this.octets.push(parseInt(octet));
            } catch (e) {
                console.error(e);
                console.error("Invalid ip adress passed:", octet);
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

    clone () {
        return new ip(this.toString());
    }
}

export class Network {
    /**
     * 
     * @param {a subnetmask expressed in the ammount of networkbits} subnet 
     * @param {The start of the Network addr} ip
     */
    constructor(subnet, ip) {
        this.subnet = subnet;
        this.modifyOctet = Math.floor(subnet / 8);
        this.hostIp = ip;
        this.numDevices = 0;
        //holds devices in terms of their IPs and indexes into the komponenten array
        this.networkDevices = new Map();
    }

    addDevice(index) {
        // check if network is full
        // 32 - subnet gives the number of host bits
        // 2^hostbits - 2 gives the number of usable addresses (we subtract 2 for network and broadcast addresses)
        if (this.numDevices === Math.pow(2, 32 - this.subnet) - 2) {
            console.error("Network full");
            return null;
        }
        if (index < 0){
            console.error("index can't be below 0", index);
        }
        this.numDevices++;
        let newIp = this.hostIp.clone();
        newIp.modifyOctet(this.modifyOctet, this.hostIp.octets[this.modifyOctet] + this.numDevices);
        this.networkDevices.set(newIp, index);
        return newIp;
    }

    removeDevice(ip) {
        this.networkDevices.delete(ip);
    }

    getDevice(ip) {
        return this.networkDevices.get(ip);
    }

    static NewBaseNetwork() {
        return new Network(24, new ip("192.168.1.0"));
    }

}

export class Komponent {
  constructor(cell, type, index, ipAddress) {
    this.cell = cell;
    this.type = type;
    this.connections = new Set();
    this.index = index;
    this.ipAddress = ipAddress;
  }

  updateIpAddress(newIp) {
    this.ipAddress = newIp;
  }
};