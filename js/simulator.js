import * as main from "./main.js";
document.getElementById("sendPacket-button")
    .addEventListener("click", main.sendPacket);
document.getElementById("tickStep-button")
    .addEventListener("click", main.stepTick);
main.InitDocumentListeners();
main.createGrid(121);
