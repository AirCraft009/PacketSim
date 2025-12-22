import * as Utils from "./util.js"

const grid = document.getElementById("grid");
const piece = document.getElementById("piece");

let connectingMode = false;
var connStart;

let draggedTemplate = null;

var komponenten = Array.apply(null, Array(64)).map(function () {});

function Komponent(cell, type, index) {
  this.cell = cell
  this.type = type
  this.connections = new Set()
  this.index = index
};

function initDrag() {
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

export function InitListeners(){
    initDrag();
    disableInput();
}

// create cells
export function createGrid(n) {
  for (let i = 0; i < n; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";

    cell.addEventListener("dragover", (e) => e.preventDefault());

    cell.addEventListener("dragenter", () => {
      cell.classList.add("hover");
    });

    cell.addEventListener("dragleave", () => {
      cell.classList.remove("hover");
    });

    cell.addEventListener("drop", () => {
      cell.classList.remove("hover");

      if (!draggedTemplate) return;

      // prevent multiple pieces per cell
      if (cell.children.length > 0) return;

      const clone = draggedTemplate.cloneNode(true);
      clone.removeAttribute("id");
      clone.removeAttribute("data-template");

      clone.draggable = false; // or true if you want re-drag
      clone.style.pointerEvents = "none"; // optional

      cell.appendChild(clone);

      komponenten[i] = new Komponent(cell, clone.dataset.type, i);
    });

    
    cell.addEventListener("mousedown", (e) => {
      if (!cell.firstChild) {
        connectingMode = false;
        return;
      }
      if (e.button == 2) {
        cell.removeChild(cell.firstChild);
        Array.from(komponenten[i].connections.connections).forEach(element => {
            console.log(element)
        });
      }
      if (e.button == 0) {

        if (connectingMode) {
          connectingMode = false;
          Utils.drawLine(cell, connStart.cell);
          connStart.connections.add(i);
          komponenten[i].connections.add(connStart.index)
          return;
        }
        connStart = komponenten[i];
        connectingMode = true;
      }
    });

    grid.appendChild(cell);
  }
}
