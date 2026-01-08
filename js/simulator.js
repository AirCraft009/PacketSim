import * as main from "./main.js";
document.getElementById("sendPacket-button")
    .addEventListener("click", main.sendPacket);
main.InitDocumentListeners();
main.createGrid(121);
