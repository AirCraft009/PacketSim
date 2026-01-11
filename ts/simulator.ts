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

for (let i = 0; i < 10; i++){
    addLine("this is some text");
}

document.getElementById("sendPacket-button")!
    .addEventListener("click", main.sendPacket);

main.InitDocumentListeners();
main.createGrid(121);

