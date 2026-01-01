import * as Utils from "./util.js";
import * as Network from "./network.js";
const grid = document.getElementById("grid");
const modalEl = document.getElementById('textModal');
const modal = new bootstrap.Modal(modalEl);
const svg = document.getElementById("overlay");
var connectingMode = false;
var connStart = null;
var selected = false;
var draggedTemplate = null;
let komponenten;
let networks = [];
networks[0] = Network.Network.NewBaseNetwork();
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
                removeComponent(komponenten[i]);
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
        komponenten[index] = new Network.Komponent(cell, clone.dataset.type, index, networks[0].addDevice(index), networks[0].hostIp);
        manageNetwork(komponenten[index]);
    });
}
function resetHighlight() {
    if (connStart == null)
        return;
    connStart.cell.style.backgroundColor = "";
    selected = false;
}
function removeComponent(komponent) {
    removeVisual(komponent.index, komponent.cell);
    var i = komponent.index;
    const comp = komponenten[i];
    for (let connIndex of comp.connections) {
        if (komponenten[connIndex] == null)
            continue;
        komponenten[connIndex].connections.delete(i);
    }
    if (comp.type === "router") {
        networks = networks.filter(c => !c.hostIp.equalsHost(comp.ipAddress));
    }
    komponenten[i] = null;
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
function connectComponents(i) {
    if (isvalidConnection(i)) {
        addConnection(komponenten[i], i);
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
function manageNetwork(komponent) {
    networks[0].removeDevice(komponent.ipAddress);
    if (komponent.type !== "router") {
        return;
    }
    // ask user for ip adress via modal
    getRouterIpModal().then((ipString) => {
        if (!ipString) {
            alert("No IP entered removing router");
            removeComponent(komponent);
            return;
        }
        if (!Network.ip.checkValidIpString(ipString)) {
            alert("Invalid IP adress entered removing router");
            removeComponent(komponent);
            return;
        }
        const ipAdress = new Network.ip(ipString);
        if (!ipAdress.isHostIP()) {
            alert("All router IP's must end in 0 as they are Network IP's");
            removeComponent(komponent);
            return;
        }
        networks.forEach((network) => {
            if (ipAdress.equalsHost(network.hostIp)) {
                alert("Host part of IP already in use for other Network");
                removeComponent(komponent);
                return;
            }
        });
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
    //TODO: Implement MAC-Adress 
    // state.mac = komponent.macAddress;
    state.gateway = komponent.standardGateway.toString();
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
    if (connStart.type == "router") {
    }
    if (komponent.type == "router") {
    }
}
/**
 * Changes the network of the networkComp to the network of the router
 * and gets a new ip from the network of the router
 *
 * @param networkComp a network component connected to the router
 * @param routerComp router that the networkComp is connected to
 */
function changeComponentNetwork(networkComp, routerComp) {
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
