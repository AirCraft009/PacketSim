import * as main from "./main.js";
import * as Network from "./network.js";
console.log(new Network.macAddress().toString());
main.InitDocumentListeners();
main.createGrid(64);