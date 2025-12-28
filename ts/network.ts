

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
     * @param {a subnetmask expressed in the ammount of networkbits} subnet 
     * @param {The start of the Network addr} ip
     */
    subnet: number;
    modifyOctet: number
    hostIp: ip;
    numDevices: number
    networkDevices: Map<ip, number>;

    constructor(subnet: number, ip: ip) {
        this.subnet = subnet;
        this.modifyOctet = Math.floor(subnet / 8);
        this.hostIp = ip;
        this.numDevices = 0;
        //holds devices in terms of their IPs and indexes into the komponenten array
        this.networkDevices = new Map();
    }

    addDevice(index: number): ip | null {
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

    removeDevice(ip: ip) {
        this.networkDevices.delete(ip);
        this.numDevices--;
    }

    getDevice(ip: ip) {
        return this.networkDevices.get(ip);
    }


    static NewBaseNetwork() {
        return new Network(24, new ip("192.168.0.0"));
    }



}

export class Komponent {
    cell : any;
    type : string;
    connections : Set<number>;
    index : number;
    ipAddress : ip;


  constructor(cell : any, type: string, index: number, ipAddress: ip) {
    this.cell = cell;
    this.type = type;
    this.connections = new Set();
    this.index = index;
    this.ipAddress = ipAddress;
  }

  updateIpAddress(newIp: ip) {
    this.ipAddress = newIp;
  }
};