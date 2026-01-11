import * as main from "./main.js";
const log = document.getElementById("log");
const container = document.getElementById("log-container");
function addLine(text) {
    const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 5;
    const line = document.createElement("div");
    line.className = "log-line";
    line.textContent = text;
    log.appendChild(line);
    if (atBottom) {
        container.scrollTop = container.scrollHeight;
    }
}
for (let i = 0; i < 10; i++) {
    addLine("this is some text");
}
document.getElementById("sendPacket-button")
    .addEventListener("click", main.sendPacket);
main.InitDocumentListeners();
main.createGrid(121);
