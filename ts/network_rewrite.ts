// network.ts

export type ComponentId = number;

export class IP {
  readonly octets: readonly number[];

  constructor(ip: string) {
    const parts = ip.split(".");
    if (parts.length !== 4) {
      throw new Error(`Invalid IP address: ${ip}`);
    }

    const octets = parts.map(p => {
      const n = Number(p);
      if (!Number.isInteger(n) || n < 0 || n > 255) {
        throw new Error(`Invalid octet: ${p}`);
      }
      return n;
    });

    this.octets = octets;
  }

  isNetworkAddress(): boolean {
    return this.octets[3] === 0;
  }

  equals(other: IP): boolean {
    return this.octets.every((o, i) => o === other.octets[i]);
  }

  equalsNetwork(other: IP): boolean {
    return this.octets.slice(0, 3)
      .every((o, i) => o === other.octets[i]);
  }

  withOctet(index: number, value: number): IP {
    if (index < 0 || index > 3) {
      throw new Error("Invalid octet index");
    }
    const next = [...this.octets];
    next[index] = value;
    return new IP(next.join("."));
  }

  toString(): string {
    return this.octets.join(".");
  }

  static isValid(ip: string): boolean {
    try {
      new IP(ip);
      return true;
    } catch {
      return false;
    }
  }
}

export class Network {
  readonly subnet = 24;
  readonly hostIp: IP;

  private nextHost = 1;
  private devices = new Map<string, ComponentId>();

  constructor(hostIp: IP) {
    if (!hostIp.isNetworkAddress()) {
      throw new Error("Network IP must end in .0");
    }
    this.hostIp = hostIp;
  }

  addDevice(id: ComponentId): IP | null {
    const maxHosts = Math.pow(2, 32 - this.subnet) - 2;
    if (this.devices.size >= maxHosts) {
      return null;
    }

    const ip = this.hostIp.withOctet(3, this.nextHost++);
    this.devices.set(ip.toString(), id);
    return ip;
  }

  removeDevice(ip: IP): void {
    this.devices.delete(ip.toString());
  }

  getDevice(ip: IP): ComponentId | undefined {
    return this.devices.get(ip.toString());
  }

  static createBase(): Network {
    return new Network(new IP("192.168.0.0"));
  }
}
