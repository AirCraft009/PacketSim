import { ip, ipAddress, Packet } from "./network.js";


// Utility functions for drawing and deleting lines

function centerOf(el: any): any {
  const r: any = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2
  };
}

export function drawLine(cellA: HTMLElement, cellB: HTMLElement, indexA: number, indexB: number) {
  const a = centerOf(cellA);
  const b = centerOf(cellB);
  const svg: any = document.getElementById("overlay");
  const svgRect = svg.getBoundingClientRect();

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

  line.setAttribute("x1", (a.x - svgRect.left).toString());
  line.setAttribute("y1", (a.y - svgRect.top).toString());
  line.setAttribute("x2", (b.x - svgRect.left).toString());
  line.setAttribute("y2", (b.y - svgRect.top).toString());
  line.setAttribute("stroke", "black");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("index-a", indexA.toString());
  line.setAttribute("index-b", indexB.toString());

  svg.appendChild(line);
}

export function removeConnections(index: number) {
  const svg: any = document.getElementById("overlay");
  const line: any = svg.querySelectorAll(`line[index-a='${index}'], line[index-b='${index}']`);
  line.forEach((e: Element) => {
    svg.removeChild(e);
  });
}

export function checkValidRouterIP(routerIp: string | null): boolean {
  if (!routerIp) {
    alert("No IP entered removing router");
    return false;
  }

  if (!ipAddress.checkValidIpString(routerIp)) {
    alert("Invalid IP adress entered removing router");
    return false;
  }
  const ipAdress = new ipAddress(routerIp);
  if (!ipAdress.isNetworkIP()) {
    alert("All router IP's must end in 0 as they are Network IP's");
    return false;
  }

  return true;
}


export function addLine(text: string) {

  const log = document.getElementById("log") as any;
  const container = document.getElementById("log-box") as any;
  const atBottom =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 5;

  const line = document.createElement("div");
  line.className = "log-line";
  line.textContent = text;
  log.appendChild(line);

  if (atBottom) {
    container.scrollTop = container.scrollHeight;
  }
}

export function addPacket(packet: Packet) {
  const log = document.getElementById("log") as any;
  const container = document.getElementById("log-box") as any;
  const atBottom =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 5;

  const line = document.createElement("div");
  const linkPacket = document.createElement("a");
  const linkSource = document.createElement("a");
  const linkDest = document.createElement("a");

  linkPacket.href = "#"
  linkSource.href = "#"
  linkDest.href = "#"

  linkSource.setAttribute("style", "color:orange")
  linkDest.setAttribute("style", "color:green")
  linkPacket.setAttribute("data-bs-toggle", "modal");
  linkPacket.setAttribute("data-bs-target", "#packetModal")

  line.className = "log-line";
  line.setAttribute("id", packet.id.toString());
  linkPacket.textContent = "Packet{" + "id: " + packet.id + "; ";
  linkSource.textContent = packet.sourceIP + "; ";
  linkDest.textContent = packet.destinationIP;
  // copy now so it keeps the set attr

  const linkPacketEnd = linkPacket.cloneNode(false);
  linkPacketEnd.textContent = "}"

  line.className = "modal-editable"
  line.appendChild(linkPacket);
  line.appendChild(linkSource);
  line.appendChild(linkDest);
  line.appendChild(linkPacketEnd);
  log.appendChild(line);

  if (atBottom) {
    container.scrollTop = container.scrollHeight;
  }
}

export function clearLog() {
  const log = document.getElementById("log") as any;
  log.innerHTML = "";
}
