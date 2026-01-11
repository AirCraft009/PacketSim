import * as main from "./main.js";
import * as Network from "./network.js";

const log = document.getElementById("log") as any;
const container = document.getElementById("log-container") as any;

function addLine(text : string) {
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

var packet = new Network.Packet("this is some data", "192.168.1.0", "192.168.0.0", "00:1A:2B:3C:4D:5E", "00:1A:2B:3C:4D:43");

for (let i = 0; i < 5; i++){
    packet.status = i;
    addLine(packet.formatMessage() + "\n");
}

document.getElementById("sendPacket-button")!
    .addEventListener("click", main.sendPacket);

document.getElementById("tickStep-button")!
    .addEventListener("click", main.stepTick);

main.InitDocumentListeners();
main.createGrid(121);

