class Network {
    /**
     * 
     * @param {a subnetmask expressed in the /hostbits format} subnet 
     * @param {The start of the Network addr as string in format 111.111.111.111} ip
     */
    constructor(subnet, ip) {
        this.subnet = subnet;
        this.hostIp = ip;
    }
}