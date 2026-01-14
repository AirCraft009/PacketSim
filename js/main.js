import * as Utils from "./util.js";
import * as Core from "./core.js";
import { ipAddress } from "./network.js";
const modal = new window.bootstrap.Modal(getModalEL());
const modalPacket = new window.bootstrap.Modal(getPacketModalEl());
var connectingMode = false;
var connStartCell = null;
var connStartIndex = 0;
var selected = false;
const IPToIndexMap = new Map();
const indexToMacMap = new Map();
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
const packetModalState = {
    targetIp: "192.168.1.0",
    sourceIp: "192.168.1.0",
    sourceMac: "aa:bb:cc:dd:ee:ff",
    targetMac: "aa:bb:cc:dd:ee:ff",
};
/**
 * Initialize document listeners for drag and drop and input disabling
 */
export function InitDocumentListeners() {
    initDocumentDrag();
    disableInput();
    enableLogClick();
}
function getGrid() {
    return document.getElementById("grid");
}
function getModalEL() {
    return document.getElementById('textModal');
}
function getPacketModalEl() {
    return document.getElementById('packetModal');
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
        getGrid().appendChild(cell);
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
                coreState.stepTick();
                removeVisual(i, cell);
                coreState.removeComponent(indexToMacMap.get(i));
            }
            // left click to connect components
            if (e.button == 0) {
                connectComponents(i, cell);
            }
            activateEditMode();
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
    cell.addEventListener("drop", (e) => {
        e.preventDefault();
        //  remove the highlight of the currently selected component on drop
        resetHighlight();
        cell.classList.remove("hover");
        const type = e.dataTransfer?.getData("text/plain");
        if (!type)
            return;
        // prevent multiple pieces per cell
        if (cell.children.length > 0)
            return;
        const template = document.querySelector(`[data-template][data-type="${type}"]`);
        if (!template) {
            return;
        }
        const clone = template.cloneNode(true);
        removeAtrributesFromClone(clone);
        cell.appendChild(clone);
        if (type === "router") {
            getRouterIpModal().then((ipString) => {
                var routerMac = coreState.addRouter(ipString);
                if (routerMac !== false) {
                    indexToMacMap.set(index, routerMac[0]);
                    IPToIndexMap.set(routerMac[1], index);
                    return;
                }
                removeVisual(index, cell);
            });
            return;
        }
        var comp = coreState.addComponent(type);
        indexToMacMap.set(index, comp[0]);
        IPToIndexMap.set(comp[1], index);
    });
}
function resetHighlight() {
    if (connStartCell == null)
        return;
    connStartCell.style.backgroundColor = "";
    selected = false;
    var sendBtn = document.querySelector("button.btn.btn-dark");
    sendBtn.disabled = true;
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
            getModalEL().removeEventListener('hidden.bs.modal', closeHandler);
        };
        const modalForm = document.getElementById('modalForm');
        if (modalForm) {
            modalForm.addEventListener('submit', submitHandler);
        }
        getModalEL().addEventListener('hidden.bs.modal', closeHandler);
    });
}
function initDocumentDrag() {
    document.querySelectorAll(".draggable").forEach((el) => {
        el.addEventListener("dragstart", (e) => {
            if (!e.dataTransfer)
                return;
            const type = el.dataset.type;
            if (!type)
                return;
            // REQUIRED for Firefox
            e.dataTransfer.setData("text/plain", type);
            e.dataTransfer.effectAllowed = "copy";
        });
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
function enableLogClick() {
    document.querySelectorAll(".modal-editable").forEach((editable) => {
        editable.addEventListener("mousedown", (e) => {
            if (e.button !== 0) {
                return;
            }
            var packetId = editable.getAttribute("id");
            var packet = coreState.getPacketInfo(parseInt(packetId));
            if (!packet) {
                return;
            }
            updatePacketModal(packet.destinationIP, packet.sourceIP, packet.destinationMac, packet.sourceMac);
            renderPacketModal();
        });
    });
}
function openEditBox() {
    if (!selected || connStartCell == null) {
        console.log("thats why!!!");
        return;
    }
    updateState();
    renderEditBox();
}
function updateState() {
    var componentState = coreState.getStateOfComponent(indexToMacMap.get(connStartIndex));
    state.type = componentState[0];
    state.ip = componentState[1];
    state.mac = componentState[2];
    state.connection = componentState[3];
    state.gateway = componentState[4];
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
function renderPacketModal() {
    document.querySelectorAll(".modal-ediatble").forEach((el) => {
        const key = el.dataset.key;
        if (key in packetModalState) {
            el.textContent = packetModalState[key];
        }
    });
}
function updatePacketModal(targetIP, sourceIP, sourceMac, targetMac) {
    packetModalState.targetIp = targetIP;
    packetModalState.sourceIp = sourceIP;
    packetModalState.targetMac = targetMac;
    packetModalState.sourceMac = sourceMac;
}
function activateEditMode() {
    if (connectingMode && connStartCell != null) {
        connStartCell.style.backgroundColor = "blue";
        selected = true;
        document.querySelector("button.btn.btn-dark").disabled = false;
        openEditBox();
    }
}
function addConnection(cell, index) {
    // connstartCell was alr checked for null before calling this function
    Utils.drawLine(connStartCell, cell, connStartIndex, index);
    coreState.connectComponents(indexToMacMap.get(connStartIndex), indexToMacMap.get(index));
}
function isvalidConnection(fromindex, toindex) {
    if (connectingMode) {
        // check for connection to self
        if (fromindex == toindex)
            return false;
        // check if connection already exists
        if (indexToMacMap.get(fromindex) === undefined || indexToMacMap.get(toindex) === undefined) {
            return false;
        }
        return !coreState.alreadyConnected(indexToMacMap.get(fromindex), indexToMacMap.get(toindex));
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
export function sendPacket() {
    if (!selected) {
        return;
    }
    const dataInput = document.getElementById("packet-data-input");
    const targetIpInput = document.getElementById("target-ip-input");
    const data = dataInput.value;
    const targetIp = targetIpInput.value;
    if (!data || !targetIp) {
        alert("Please enter both packet data and target IP.");
        return;
    }
    if (!ipAddress.checkValidIpString(targetIp)) {
        alert("Invalid target IP address.");
        return;
    }
    var packet = coreState.RegisterPacket(indexToMacMap.get(connStartIndex), targetIp, data);
    if (!packet) {
        return;
    }
    Utils.addPacket(packet);
    enableLogClick();
}
export function stepTick() {
    var packet_indexes = coreState.stepTick();
    for (var i of packet_indexes) {
        var packet = coreState.getPacketInfo(i);
        if (!packet) {
            continue;
        }
        Utils.addLine(packet.formatMessage());
    }
}
//# sourceMappingURL=main.js.map