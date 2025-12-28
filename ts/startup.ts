import * as Utils from "./util.js"
import * as Network from "./network.js";

// force types for bootstrap elements to be any
declare var bootstrap: any;

const grid: HTMLElement = document.getElementById("grid") as HTMLElement;
const modalEl = document.getElementById('textModal');
const modal = new bootstrap.Modal(modalEl);
const svg = document.getElementById("overlay") as HTMLElement;

var connectingMode = false;
var connStart: Network.Komponent | null = null;
var selected = false;

var draggedTemplate: HTMLElement | null = null;

let komponenten: Array<Network.Komponent | null>;
let network = new Network.Network(24, new Network.ip("192.168.9.3"));
let networks = [];

// default state for the editor on the right
// also used for rendering new information
const state = {
  ip: "192.168.1.1",
  type: "router",
  mac: "aa:bb:cc:dd:ee:ff",
  connection: "0",
  gateway: "192.168.1.0",
  subnetmask: "/24"
};



/**
 * Initialize document listeners for drag and drop and input disabling
 */
export function InitDocumentListeners() {
  initDocumentDrag();
  disableInput();
}




/**
 * create cells & core visual functionality\
 * drag and drop, click to connect/components\
 * right click to remove component
 * 
 * @param {ammount of cells} n 
 */
export function createGrid(n: number) {

  komponenten = Array.apply(null, Array(n)).map(function () { return null; });

  for (let i = 0; i < n; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";

    // set basic drag and drop listeners
    setDragListeners(cell, i);
    handleMouseClick(cell, i);

    grid.appendChild(cell);
  }
}

// utility functions for component management and visual connection

function setDragListeners(cell: HTMLElement, index: number) {

  boilerDragListeners(cell);
  dropListener(cell, index);
}



function handleMouseClick(cell: HTMLElement, i: number) {
  cell.addEventListener("mousedown", (e) => {
    resetHighlight();
    if (hasChild(cell)) {
      // right click to remove component
      if (e.button == 2) {
        removeComponent(cell, i);
      }
      // left click to connect components
      if (e.button == 0) {
        connectComponents(i);
      }
      highlightCell();
    }
  });
}

function boilerDragListeners(cell: HTMLElement) {
  cell.addEventListener("dragover", (e) => e.preventDefault());

  cell.addEventListener("dragenter", () => {
    cell.classList.add("hover");
  });

  cell.addEventListener("dragleave", () => {
    cell.classList.remove("hover");
  });
}

function removeAtrributesFromClone(clone: HTMLElement) {
  clone.removeAttribute("id");
  clone.removeAttribute("data-template");

  clone.draggable = false; // false because I don't want to move the lines along with the component
  clone.style.pointerEvents = "none"; // optional
}


function dropListener(cell: HTMLElement, index: number) {
  cell.addEventListener("drop", () => {
    //  remove the highlight of the currently selected component on drop
    resetHighlight();
    cell.classList.remove("hover");
    if (!draggedTemplate) return;
    // prevent multiple pieces per cell
    if (cell.children.length > 0) return;


    const clone = draggedTemplate.cloneNode(true) as HTMLElement;
    removeAtrributesFromClone(clone);
    cell.appendChild(clone);


    // the device is added to the base network.
    // the Ip adress will newly be assigned if it's connected to a router and then belong to the routers network
    komponenten[index] = new Network.Komponent(cell, clone.dataset.type as string, index, network.addDevice(index) as Network.ip);
    manageNetwork(komponenten[index]);

  });
}

function resetHighlight() {
  if (connStart == null) return;
  connStart.cell.style.backgroundColor = "";
  selected = false;
}
function removeComponent(cell: HTMLElement, i: number) {
  cell.removeChild(cell.firstChild as ChildNode);
  if (komponenten[i] == null) return;
  for (let connIndex of komponenten[i].connections) {
    if (komponenten[connIndex] == null) continue;
    komponenten[connIndex].connections.delete(i);
  }
  Utils.removeConnections(i);
  komponenten[i] = null;
  connectingMode = false;
  return;
}

function connectComponents(i: number) {
  if (isvalidConnection(i)) {
    addConnection(komponenten[i] as Network.Komponent, i);
    return;
  }
  connStart = komponenten[i];
  connectingMode = true;
}

/**
 * Takes in a component and check if it's a router\
 * Depending on that it then aranges it into a network accordingly\
 * It will be in the standard network and it needs a new ip adress\
 * @param {a newly added network komponent} komponent 
 */
function manageNetwork(komponent: Network.Komponent) {
  if (komponent.type === "router") {
    // ask user for ip adress via modal
    getRouterIpModal().then((ipString) => {
        if (Network.ip.checkValidIpString(ipString as string)) {
            const ipAdress = new Network.ip(ipString as string);
            komponent.updateIpAddress(ipAdress);
            // create a new network for this router
            const newNetwork = new Network.Network(24, ipAdress);
            networks.push(newNetwork);
        } else {
            alert("Invalid IP adress entered removing router");
            removeComponent(komponent.cell, komponent.index);
        }
    });
  }
}

/**
 * Asks the user for an IP address via a modal.
 * @returns The ip that was entered into the modal
 */
function getRouterIpModal() {
  // return a promise that resolves when the modal form is submitted
  //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
  return new Promise(resolve => {
    modal.show();

    const submitHandler = (e: Event) => {
      e.preventDefault();
      // close modal
      modal.hide();

      const textInput = document.getElementById('textInput') as HTMLInputElement;
      const value = textInput?.value || '';
      const modalForm = document.getElementById('modalForm');
      if (modalForm) {
        modalForm.removeEventListener('submit', submitHandler);
      }

      // resolve the promise with the entered value
      // same things as return in async functions
      resolve(value);
    };

    const modalForm = document.getElementById('modalForm'); 
    if (modalForm) {
      modalForm.addEventListener('submit', submitHandler);
    }
  });
}


function initDocumentDrag() {
  document.addEventListener("dragstart", (e : DragEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.template) {
      draggedTemplate = target;
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

  // prevent new lines cause they look bad
  document.querySelectorAll(".editable").forEach((element : any) => {
    element.addEventListener("keydown", (e : KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // remove focus from the element
        element.blur();
      }
    });
  });
}

function openEditBox() {
  if (!selected || connStart == null) {
    return;
  }
  updateState(connStart);
  renderEditBox();
}

function updateState(komponent : Network.Komponent) {
  state.ip = komponent.ipAddress.toString();
  state.type = komponent.type;
  state.connection = (komponent.connections.size).toString();
  //TODO: Implement MAC-Adress and Default Gateway
  // state.mac = komponent.macAddress;
  // state.gateway = komponent.gateway;
}


// renders new information to the edit box
function renderEditBox() {
  document.querySelectorAll(".editable").forEach((el : any) => {
    const key = el.dataset.key as string;
    if (key in state) {
      el.textContent = state[key as keyof typeof state];
    }
  });
}


function highlightCell() {
  if (connectingMode && connStart != null) {
    var cell = connStart.cell;
    cell.style.backgroundColor = "blue";
    selected = true;
    openEditBox();
  }
}

function addConnection(komponent : Network.Komponent, index : number) {
  connStart = connStart as Network.Komponent;
  Utils.drawLine(komponent, connStart);

  if (komponenten[index] == null) return;
  connStart.connections.add(index);
  komponenten[index].connections.add(connStart.index);
}

function isvalidConnection(index : number) {
  connStart = connStart as Network.Komponent;
  if (connectingMode) {
    connectingMode = false;
    // check for connection to self
    if (connStart.index == index) return false;
    // check if connection already exists

    if (komponenten[index] != null && komponenten[index].connections.has(connStart.index)) {
      return false;
    }
    return true;
  }
  return false;
}

function hasChild(cell: HTMLElement) : boolean {
  if (!cell.firstChild) {
    connectingMode = false;
    return false;
  }
  return true;
}