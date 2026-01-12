import * as main from "./main.js";
import * as Network from "./network.js";
import * as util from "./util.js";
var packet = new Network.Packet("this is some data", "192.168.1.0", "192.168.0.0", "00:1A:2B:3C:4D:5E", "00:1A:2B:3C:4D:43");
for (var i = 0; i < 5; i++) {
    packet.status = i;
    util.addPacket(packet);
}
document.getElementById("sendPacket-button")
    .addEventListener("click", main.sendPacket);
document.getElementById("tickStep-button")
    .addEventListener("click", main.stepTick);
main.InitDocumentListeners();
main.createGrid(121);
