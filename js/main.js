import * as Utils from "./util.js";
import * as Core from "./core.js";
import * as Network from "./network.js";
const grid = document.getElementById("grid");
const modalEl = document.getElementById('textModal');
const modal = new bootstrap.Modal(modalEl);
var connectingMode = false;
var connStartCell = null;
var connStartIndex = 0;
var selected = false;
var draggedTemplate = null;
const indexToIpMap = new Map();
const coreState = new Core.CoreState();
// default state for the editor on the right
// also used for rendering new information
const state = {
    ip: "192.168.1.0",
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
export function createGrid(n) {
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
                removeVisual(i, cell);
                coreState.removeComponent(indexToIpMap.get(i));
            }
            // left click to connect components
            if (e.button == 0) {
                connectComponents(i, cell);
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
        if (draggedTemplate.dataset.type === "router") {
            getRouterIpModal().then((ipString) => {
                if (coreState.addRouter(ipString)) {
                    // ipString is guaranteed to be non-null and valid inside addRouter
                    indexToIpMap.set(index, new Network.ip(ipString));
                }
                removeVisual(index, cell);
            });
        }
        coreState.addComponent(draggedTemplate.dataset.type);
    });
}
function resetHighlight() {
    if (connStartCell == null)
        return;
    connStartCell.style.backgroundColor = "";
    selected = false;
}
function removeVisual(i, cell) {
    // remove the picture
    cell.removeChild(cell.firstChild);
    //remove lines connecting to other comps.
    Utils.removeConnections(i);
    connectingMode = false;
    selected = false;
    return;
}
function connectComponents(i, cell) {
    if (isvalidConnection(connStartIndex, i)) {
        connectingMode = false;
        addConnection(cell, i);
        return;
    }
    connStartCell = cell;
    connStartIndex = i;
    connectingMode = true;
}
//TODO: rewrite this function to use CoreState
/**
 * Takes in a component and check if it's a router\
 * Depending on that it then aranges it into a network accordingly\
 * It will be in the standard network and it needs a new ip adress\
 * @param {a newly added network komponent} komponent
function manageNetwork(komponent: Network.Komponent) {
  if (komponent.type !== "router") {
    return;
  }

  networks[0].removeDevice(komponent.ipAddress);
  // ask user for ip adress via modal
  getRouterIpModal().then((ipString) => {
    if (!ipString) {
      alert("No IP entered removing router");
      removeComponent(komponent);
      return;
    }

    if (!Network.ip.checkValidIpString(ipString as string)) {
      alert("Invalid IP adress entered removing router");
      removeComponent(komponent);
      return;
    }
    const ipAdress = new Network.ip(ipString as string);
    if (!ipAdress.isHostIP()){
      alert("All router IP's must end in 0 as they are Network IP's");
      removeComponent(komponent);
      return;
    }
    networks.forEach((network) => {

      if (ipAdress.equalsHost(network.hostIp)) {
        alert("Host part of IP already in use for other Network")
        removeComponent(komponent);
        return;
      }
    })
    komponent.updateIpAddress(ipAdress);
    komponent.standardGateway = ipAdress;
    // create a new network for this router
    const newNetwork = new Network.Network(ipAdress);
    networks.push(newNetwork);
    return;
  })
  .catch((error) => {
    console.error("Error getting IP from modal:", error);
    removeComponent(komponent);
    return;
  });
}
*/
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
            cleanup();
            const textInput = document.getElementById('textInput');
            // resolve the promise with the entered value
            // same things as return in async functions
            resolve(textInput?.value || '');
        };
        const closeHandler = () => {
            cleanup();
            resolve(null);
        };
        const cleanup = () => {
            modal.hide();
            const modalForm = document.getElementById('modalForm');
            if (modalForm)
                modalForm.removeEventListener('submit', submitHandler);
            modalEl.removeEventListener('hidden.bs.modal', closeHandler);
        };
        const modalForm = document.getElementById('modalForm');
        if (modalForm) {
            modalForm.addEventListener('submit', submitHandler);
        }
        modalEl.addEventListener('hidden.bs.modal', closeHandler);
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
    if (!selected || connStartCell == null) {
        return;
    }
    updateState();
    renderEditBox();
}
function updateState() {
    // TODO: get component from CoreState
    /*
    state.ip = komponent.ipAddress.toString();
    state.type = komponent.type;
    state.connection = (komponent.connections.size).toString();
    //TODO: Implement MAC-Adress
    // state.mac = komponent.macAddress;
    state.gateway = komponent.standardGateway.toString();
    */
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
    if (connectingMode && connStartCell != null) {
        connStartCell.style.backgroundColor = "blue";
        selected = true;
        openEditBox();
    }
}
function addConnection(cell, index) {
    // connstartCell was alr checked for null before calling this function
    Utils.drawLine(connStartCell, cell, connStartIndex, index);
    // TODO: update CoreState connections
    //TODO: chenge network of connected component and get new ip from router network of CoreState
}
//TODO: rewrite this function to use CoreState
/**
 * Changes the network of the networkComp to the network of the router
 * and gets a new ip from the network of the router
 *
 * @param networkComp a network component connected to the router
 * @param routerComp router that the networkComp is connected to

function changeComponentNetwork(networkComp : Network.Komponent, routerComp : Network.Komponent) {
  networkComp.standardGateway = routerComp.standardGateway;
  var routerNetwork = networks.filter(n=> n.hostIp === routerComp.ipAddress)[0];
  if (routerNetwork === null) {
    // impossible control path can't be null just for typescript
    return;
  }
  var ip = routerNetwork.addDevice(networkComp.index);
  if (!ip) {
    //basically impossible as the 8x8 map doesn't allow for 253 devices
    return;
  }
  networkComp.ipAddress = ip;
}
   */
//TODO make new way to keep track of connection start and end
function isvalidConnection(fromindex, toindex) {
    if (connectingMode) {
        // check for connection to self
        if (fromindex == toindex)
            return false;
        // check if connection already exists
        //TODO query CoreState for existing connections
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
