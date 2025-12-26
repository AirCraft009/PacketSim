import * as Utils from "./util.js"
import * as Network from "./network.js"

const grid = document.getElementById("grid");
const editBox = document.getElementById("edit-box");

var connectingMode = false;
var connStart;
var selected = false;

var draggedTemplate = null;

let komponenten;
let network = new Network.Network(24, new Network.ip("192.168.9.3"));






// create cells & core visual functionality
// drag and drop, click to connect/remove
// right click to remove component
// n = number of cells
export function createGrid(n) {
  
  komponenten = Array.apply(null, Array(n)).map(function () { });

  for (let i = 0; i < n; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";


    // set basic drag and drop listeners
    setDragListeners(cell, i);
    handleMouseClick(cell, i);

    grid.appendChild(cell);
  }
}








function handleMouseClick(cell, i){
  cell.addEventListener("mousedown", (e) => {
    resetHighlight();
    if(hasChild(cell)) {
      if (e.button == 2) {
        removeComponent(cell, i);
      }
      if (e.button == 0) { 
        connectComponents(i);
      }
      highlightCell();
    }
    });
}

function highlightCell(){
  if(connectingMode){
    var cell = connStart.cell;
    cell.style.backgroundColor = "blue";
    selected = true;
    openEditBox();
  }
}









// utility functions for component management and visual connection

function resetHighlight(){
  if(connStart == null) return;
  connStart.cell.style.backgroundColor = "";
  selected = false;
}
function removeComponent(cell, i){
  cell.removeChild(cell.firstChild);
  Utils.removeConnections(i);
  komponenten[i] = null;
  connectingMode = false;
  return;
}

function connectComponents(i) {
    if (isvalidConnection(i)) {
      addConnection(komponenten[i], i);
      return;
    }
    connStart = komponenten[i];
    connectingMode = true;
}

function hasChild(cell){
  if (!cell.firstChild) {
    connectingMode = false;
    return false;
  }
  return true;
}
function initDocumentDrag() {
  document.addEventListener("dragstart", (e) => {
    if (e.target.dataset.template) {
      draggedTemplate = e.target;
    }
  });

  document.addEventListener("dragend", () => {
    draggedTemplate = null;
  });
}

function disableInput() {
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  window.addEventListener("keydown", (e) => {
    connectingMode = false;
  });
}

export function InitDocumentListeners() {
  initDocumentDrag();
  disableInput();
}

function setDragListeners(cell, index) {
  cell.addEventListener("dragover", (e) => e.preventDefault());

  cell.addEventListener("dragenter", () => {
    cell.classList.add("hover");
  });

  cell.addEventListener("dragleave", () => {
    cell.classList.remove("hover");
  });


  cell.addEventListener("drop", () => {
    resetHighlight();
    cell.classList.remove("hover");

    if (!draggedTemplate) return;

    // prevent multiple pieces per cell
    if (cell.children.length > 0) return;

    const clone = draggedTemplate.cloneNode(true);
    clone.removeAttribute("id");
    clone.removeAttribute("data-template");

    clone.draggable = false; // false because I don't want to move the lines along with the component
    clone.style.pointerEvents = "none"; // optional

    cell.appendChild(clone);


    // the device is added to the base network.
    // the Ip adress will newly be assigned if it's connected to a router and then belong to the routers network
    komponenten[index] = new Network.Komponent(cell, clone.dataset.type, index, network.addDevice(index));
  });
}

function isvalidConnection(index) {
  if (connectingMode) {
    connectingMode = false;
    // check for connection to self
    if (connStart.index == index) return false;
    // check if connection already exists
    if (komponenten[index].connections.has(connStart.index)) {
      return false;
    }
    return true;
  }
  return false;
}

function addConnection(komponent, index){
    Utils.drawLine(komponent, connStart, index);

    connStart.connections.add(index);
    komponenten[index].connections.add(index);
}

function resetSimulation() {
  grid.innerHTML = "";
  document.getElementById("overlay").innerHTML = "";
  komponenten = [];
  connStart = null;
  connectingMode = false;
  selected = false;
}

function openEditBox() {
  if (!selected || connStart == null) {
    return;
  } 

  editBox.style.display = "block";
  editBox.innerHTML = `
    <h5>Component Editor</h5>
    <p>Type: ${connStart.type}</p>
    <p>Connections: ${Array.from(connStart.connections).length}</p>
  `;
}

