import * as Utils from "./util";
import * as Network from "./network";
const grid = document.getElementById("grid");
<<<<<<< HEAD
const modalEl = document.getElementById('textModal');
const modal = new bootstrap.Modal(modalEl);
const svg = document.getElementById("overlay");
=======
const editBox = document.getElementById("editor");

>>>>>>> 43fcf3eb3d5ba3701d941bb4230d52cdbe97353c
var connectingMode = false;
var connStart = null;
var selected = false;
var draggedTemplate = null;
let komponenten;
let network = new Network.Network(24, new Network.ip("192.168.9.3"));
<<<<<<< HEAD
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
=======

// default state for the editor on the right
// also used for rendering new information
const state = {
  ip: "192.168.3.4",
  type: "static",
  mac: "aa:bb:cc:dd:ee:ff",
  connection: "ethernet",
  gateway: "192.168.3.1"
};



>>>>>>> 43fcf3eb3d5ba3701d941bb4230d52cdbe97353c
/**
 * Initialize document listeners for drag and drop and input disabling
 */
export function InitDocumentListeners() {
<<<<<<< HEAD
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
export function createGrid(n) {
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
function setDragListeners(cell, index) {
    boilerDragListeners(cell);
    dropListener(cell, index);
}
function handleMouseClick(cell, i) {
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
function boilerDragListeners(cell) {
    cell.addEventListener("dragover", (e) => e.preventDefault());
    cell.addEventListener("dragenter", () => {
        cell.classList.add("hover");
    });
    cell.addEventListener("dragleave", () => {
        cell.classList.remove("hover");
    });
}
function removeAtrributesFromClone(clone) {
    clone.removeAttribute("id");
    clone.removeAttribute("data-template");
    clone.draggable = false; // false because I don't want to move the lines along with the component
    clone.style.pointerEvents = "none"; // optional
=======
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


// utility functions for component management and visual connection

function resetHighlight(){
  if(connStart == null) return;
  connStart.cell.style.backgroundColor = "";
  selected = false;
>>>>>>> 43fcf3eb3d5ba3701d941bb4230d52cdbe97353c
}
function dropListener(cell, index) {
    cell.addEventListener("drop", () => {
        //  remove the highlight of the currently selected component on drop
        resetHighlight();
        cell.classList.remove("hover");
        if (!draggedTemplate)
            return;
        // prevent multiple pieces per cell
        if (cell.children.length > 0)
            return;
        const clone = draggedTemplate.cloneNode(true);
        removeAtrributesFromClone(clone);
        cell.appendChild(clone);
        // the device is added to the base network.
        // the Ip adress will newly be assigned if it's connected to a router and then belong to the routers network
        komponenten[index] = new Network.Komponent(cell, clone.dataset.type, index, network.addDevice(index));
        manageNetwork(komponenten[index]);
    });
}
function resetHighlight() {
    if (connStart == null)
        return;
    connStart.cell.style.backgroundColor = "";
    selected = false;
}
function removeComponent(cell, i) {
    cell.removeChild(cell.firstChild);
    if (komponenten[i] == null)
        return;
    for (let connIndex of komponenten[i].connections) {
        if (komponenten[connIndex] == null)
            continue;
        komponenten[connIndex].connections.delete(i);
    }
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
<<<<<<< HEAD
/**
 * Takes in a component and check if it's a router\
 * Depending on that it then aranges it into a network accordingly\
 * It will be in the standard network and it needs a new ip adress\
 * @param {a newly added network komponent} komponent
 */
function manageNetwork(komponent) {
    if (komponent.type === "router") {
        // ask user for ip adress via modal
        getRouterIpModal().then((ipString) => {
            if (Network.ip.checkValidIpString(ipString)) {
                const ipAdress = new Network.ip(ipString);
                komponent.updateIpAddress(ipAdress);
                // create a new network for this router
                const newNetwork = new Network.Network(24, ipAdress);
                networks.push(newNetwork);
            }
            else {
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
        const submitHandler = (e) => {
            e.preventDefault();
            // close modal
            modal.hide();
            const textInput = document.getElementById('textInput');
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
    document.addEventListener("dragstart", (e) => {
        const target = e.target;
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
    document.querySelectorAll(".editable").forEach((element) => {
        element.addEventListener("keydown", (e) => {
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
function updateState(komponent) {
    state.ip = komponent.ipAddress.toString();
    state.type = komponent.type;
    state.connection = (komponent.connections.size).toString();
    //TODO: Implement MAC-Adress and Default Gateway
    // state.mac = komponent.macAddress;
    // state.gateway = komponent.gateway;
}
// renders new information to the edit box
function renderEditBox() {
    document.querySelectorAll(".editable").forEach((el) => {
        const key = el.dataset.key;
        if (key in state) {
            el.textContent = state[key];
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
function addConnection(komponent, index) {
    connStart = connStart;
    Utils.drawLine(komponent, connStart);
    if (komponenten[index] == null)
        return;
    connStart.connections.add(index);
    komponenten[index].connections.add(connStart.index);
}
function isvalidConnection(index) {
    connStart = connStart;
    if (connectingMode) {
        connectingMode = false;
        // check for connection to self
        if (connStart.index == index)
            return false;
        // check if connection already exists
        if (komponenten[index] != null && komponenten[index].connections.has(connStart.index)) {
            return false;
        }
        return true;
    }
    return false;
}
function hasChild(cell) {
    if (!cell.firstChild) {
        connectingMode = false;
        return false;
    }
    return true;
}
=======

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

  // prevent new lines cause they look bad
  document.querySelectorAll(".editable").forEach((element) => {
    element.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // remove focus from the element
        element.blur();
      }
    });
  });
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
  updateState(connStart);
  renderEditBox();
}

function updateState(komponent){
  state.ip = komponent.ipAddress.toString();
  state.type = komponent.type;
  state.connection = komponent.connections.size;
  //TODO: Implement MAC-Adress and Default Gateway
  // state.mac = komponent.macAddress;
  // state.gateway = komponent.gateway;
}


// renders new information to the edit box
function renderEditBox() {
  document.querySelectorAll(".editable").forEach(el => {
    const key = el.dataset.key;
    if (key in state) {
      el.textContent = state[key];
    }
  });
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

function addConnection(komponent, index){
    Utils.drawLine(komponent, connStart, index);

    connStart.connections.add(index);
    komponenten[index].connections.add(index);
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

function hasChild(cell){
  if (!cell.firstChild) {
    connectingMode = false;
    return false;
  }
  return true;
}

>>>>>>> 43fcf3eb3d5ba3701d941bb4230d52cdbe97353c
