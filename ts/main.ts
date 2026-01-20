// main.ts combines input & visual(unnecessary to split them up for such a small project)

import * as Utils from "./util.js"
import * as Core from "./core.js";
import { ipAddress, mac, ip } from "./network.js";

declare global {
  interface Window {
    bootstrap: any
  }
}

const modal = new window.bootstrap.Modal(getModalEL());
//const modalPacket = new window.bootstrap.Modal(getPacketModalEl());



// global mutables

// has on component been selected and will connect to the next clicked comp
let connectingMode = false;
// where did the connection originateFrom
let connStartCell: HTMLElement | null = null;
// from 0 - side * side what index does the cell have (for Utils.drawLine() because it adds the index for easier removal)
let connStartIndex: number = 0;
// is smth selected(highlighted blue)
// TODO: find a better sol so adding other highlights is easier
let selected = false;
// the logical sim works with macAddresses
// so a cell index to mac map is used to query for data from the coreState
const indexToMacMap: Map<number, mac> = new Map();
// the logical simulation
// exchanges information that should be rendered
// packet-log; device addition; device removal; device connection
const coreState = new Core.CoreState();


// state of the component-editor on the right
// all keys are also in id=editor
// there the attribute data-key reflects these vals
// this is used to exchange information with the HTML
const state = {
  ip: "192.168.1.0",
  type: "router",
  mac: "aa:bb:cc:dd:ee:ff",
  connection: "0",
  gateway: "192.168.1.0",
  subnetmask: "/24"
};

// like above, but it's the state of the packetModal
// It opens up whe clicking on the blue part of a new Packet message in the log
// then the information in loaded into this and synced
const packetModalState = {
  targetIp: "192.168.1.0",
  sourceIp: "192.168.1.0",
  sourceMac: "aa:bb:cc:dd:ee:ff",
  targetMac: "aa:bb:cc:dd:ee:ff",
  textContent: "Hello, World!"
}

/**
 * Initialize document listeners for drag and drop and input disabling
 */
export function InitDocumentListeners() {
  initDocumentDrag();
  disableInput();
  enableLogClick();
}

/**
 * helper method to make sure IDE's serve static JS and don't try to use Node.js
 */
function getGrid() {
  return document.getElementById("grid") as HTMLElement;
}

/**
 * helper method to make sure IDE's serve static JS and don't try to use Node.js
 */
function getModalEL(){
  return document.getElementById('textModal') as HTMLElement;
}




/**
 * create cells & core visual functionality\
 * drag and drop, click to connect/components\
 * right click to remove component
 * 
 * @param n number of cells
 */
export function createGrid(n: number) {

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

/**
 * enables hover listeners
 * then handles adding devices via the dropListener's
 * @param cell the cell to add the listener to
 * @param index the index of the cell (because it's added to the indexToMacMap)
 */
function setDragListeners(cell: HTMLElement, index: number) {
  boilerDragListeners(cell);
  dropListener(cell, index);
}


/**
 * set/resets highlights \
 * handles device removal (right click) \
 * handles device connection (left click when one device is alr. connected) \
 * handles opening the component-editor on the left\
 * removing from the coreState requires the indexToMacMap
 *
 * @param cell the cell to add the listener to
 * @param i the index of the cell
 */
function handleMouseClick(cell: HTMLElement, i: number) {
  cell.addEventListener("mousedown", (e) => {
    removeFocusFromDevice();
    if (hasChild(cell)) {
      // right click to remove component
      if (e.button == 2) {
        coreState.stepTick()
        removeVisual(i, cell);
        coreState.removeComponent(indexToMacMap.get(i)!);
      }
      // left click to connect components
      if (e.button == 0) {
        connectComponents(i, cell);
      }

      activateEditMode();
    }
  });
}


/**
 * basic dragListeners
 * @param cell the specific cell to add them to
 */
function boilerDragListeners(cell: HTMLElement) {
  cell.addEventListener("dragover", (e) => e.preventDefault());

  cell.addEventListener("dragenter", () => {
    cell.classList.add("hover");
  });

  cell.addEventListener("dragleave", () => {
    cell.classList.remove("hover");
  });
}

/**
 * removes id & data-template\
 * no double id and no duplicating when dragging(expand)\
 * no dragging currently (recalculating all connection lines)
 * @param clone the dragged device
 */
function removeAttributesFromClone(clone: HTMLElement) {
  clone.removeAttribute("id");
  clone.removeAttribute("data-template");

  clone.draggable = false; // false because I don't want to move the lines along with the component
  clone.style.pointerEvents = "none"; // optional
}


/**
 * placing device\
 * \
 * opens the routerIpModal if device is a router\
 * on invalid ip; not unique; -> \
 * ip not ending in 0 (/24 subnet)\
 * => removes device and alerts user\
 * \
 * index to add to indexToMacMap\
 * resets highlight and connectionStart\
 *
 * @param cell the specific cell to add the device to
 * @param index the index of the cell
 */
function dropListener(cell: HTMLElement, index: number) {
  cell.addEventListener("drop", (e: DragEvent) => {
    e.preventDefault();
    //  remove the highlight of the currently selected component on drop
    removeFocusFromDevice();
    cell.classList.remove("hover");
    const type = e.dataTransfer?.getData("text/plain")
    if (!type) return;
    // prevent multiple pieces per cell
    if (cell.children.length > 0) return;

    const template = document.querySelector(
      `[data-template][data-type="${type}"]`
    ) as HTMLElement;

    if (!template){
      return
    }

    const clone = template.cloneNode(true) as HTMLElement;
    removeAttributesFromClone(clone);
    cell.appendChild(clone);

    
    if(type === "router") {
      getRouterIpModal().then((ipString) => {
        let routerMac = coreState.addRouter(ipString);
        if(routerMac !== false) {
          indexToMacMap.set(index, routerMac[0]);
          return;
        }
        removeVisual(index, cell);
      });
      return;
    }
    let comp = coreState.addComponent(type);
    indexToMacMap.set(index, comp[0]);
  });
}

/**
 * resets highlight\
 * deselects the device currently selected(connStart)
 */
function removeFocusFromDevice() {
  if (connStartCell == null) return;
  connStartCell.style.backgroundColor = "";
  selected = false;
  let sendBtn =document.querySelector<HTMLButtonElement>("button.btn.btn-dark")!;
  sendBtn.disabled = true;
}

/**
 * Remove a device visually from a cell\
 * also removes it's connections to other devices visually
 * @param i index of the cell
 * @param cell the specific cell to remove the device from
 */
function removeVisual(i : number, cell : HTMLElement) {
  // remove the picture
  cell.removeChild(cell.firstChild as ChildNode);
  //remove lines connecting to other comps.
  Utils.removeConnections(i);
  connectingMode = false;
  selected = false;
  return;
}

/**
 * second device clicked after one was connStart\
 * Connects the components and checks for valid connection(surface)\
 * real logical checks in coreState\
 * also connects logical not only visually\
 *
 * selects end devices
 *
 * @param i
 * @param cell
 */
function connectComponents(i: number, cell: HTMLElement) {
  if (isValidConnection(connStartIndex, i)) {
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
 * @returns Promise - ip or null if an invalid IP is entered
 */
function getRouterIpModal() : Promise<string | null> {
  // return a promise that resolves when the modal form is submitted
  //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
  return new Promise(resolve => {
    modal.show();

    const submitHandler = (e: Event) => {
      e.preventDefault();
      cleanup();
      const textInput = document.getElementById('textInput') as HTMLInputElement;

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
        if (modalForm) modalForm.removeEventListener('submit', submitHandler);
        getModalEL().removeEventListener('hidden.bs.modal', closeHandler);
    };



    const modalForm = document.getElementById('modalForm');
    if (modalForm) {
      modalForm.addEventListener('submit', submitHandler);
    }
    getModalEL().addEventListener('hidden.bs.modal', closeHandler);
  });
}


/**
 * sets up documentDrag\
 *
 * readies e.dataTransfer so the dropListener can extract type data\
 */
function initDocumentDrag() {

  document.querySelectorAll(".draggable").forEach((el : any) => {
    el.addEventListener("dragstart", (e: DragEvent) => {
      if (!e.dataTransfer) return;

      const type = (el as HTMLElement).dataset.type;
      if (!type) return;

      // REQUIRED for Firefox
      e.dataTransfer.setData("text/plain", type);
      e.dataTransfer.effectAllowed = "copy";
    });
  });
}

/**
 *
 */
function disableInput() {
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  window.addEventListener("keydown", () => {
    connectingMode = false;
  });

  // prevent new lines cause they look bad
  document.querySelectorAll(".editable").forEach((element: any) => {
    element.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // remove focus from the element
        element.blur();
      }
    });
  });
}

function enableLogClick(){
  document.querySelectorAll(".modal-editable").forEach((editable: any) =>{
    editable.addEventListener("mousedown", (e: MouseEvent) =>{
      if(e.button !== 0){
        return;
      }
      let packetId : string = editable.getAttribute("id");
      let packet = coreState.getPacketInfo(parseInt(packetId));
      if (!packet){
        console.error("log packet id not found")
        return
      }
      
      updatePacketModal(packet.destinationIP, packet.sourceIP, packet.sourceMac, packet.destinationMac, packet.data)
      renderPacketModal()
    })
  })
}

function openEditBox() {
  if (!selected || connStartCell == null) {
    return;
  }
  updateState();
  renderEditBox();
}

function updateState() {
  let componentState = coreState.getStateOfComponent(indexToMacMap.get(connStartIndex)!);
  state.type = componentState[0];
  state.ip = componentState[1];
  state.mac = componentState[2];
  state.connection = componentState[3]; 
  state.gateway = componentState[4];
}


// renders new information to the edit box
function renderEditBox() {
  document.querySelectorAll(".editable").forEach((el: any) => {
    const key = el.dataset.key as string;
    if (key in state) {
      el.textContent = state[key as keyof typeof state];
    }
  });
}

function renderPacketModal(){
  document.querySelectorAll(".modal-editable").forEach((el : any) => {
    const key = el.dataset.key as string;
    if (key in packetModalState){
      el.textContent = packetModalState[key as keyof typeof packetModalState];
    }
  })
}

function updatePacketModal(targetIP : ip, sourceIP : ip, sourceMac : mac, targetMac : mac, data : string) {
    packetModalState.targetIp = targetIP;
    packetModalState.sourceIp = sourceIP;
    packetModalState.sourceMac = sourceMac;
    packetModalState.targetMac = targetMac;
    packetModalState.textContent = data;
}


function activateEditMode() {
  if (connectingMode && connStartCell != null) {
    connStartCell.style.backgroundColor = "blue";
    selected = true;
    document.querySelector<HTMLButtonElement>("button.btn.btn-dark")!.disabled = false;
    openEditBox();
  }
}

function addConnection(cell: HTMLElement, index: number) {
  // connStartCell was alr checked for null before calling this function
  Utils.drawLine(connStartCell as HTMLElement, cell, connStartIndex, index);
  coreState.connectComponents(indexToMacMap.get(connStartIndex)!, indexToMacMap.get(index)!);
}

function isValidConnection(fromIndex: number, toIndex: number) {
  if (connectingMode) {
    // check for connection to self
    if (fromIndex == toIndex) return false;
    // check if connection already exists
    if(indexToMacMap.get(fromIndex) === undefined || indexToMacMap.get(toIndex) === undefined) {
      return false;
    }

    return !coreState.alreadyConnected(indexToMacMap.get(fromIndex)!, indexToMacMap.get(toIndex)!);
  }
  return false;
}

function hasChild(cell: HTMLElement): boolean {
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
  const dataInput = document.getElementById("packet-data-input") as HTMLInputElement;
  const targetIpInput = document.getElementById("target-ip-input") as HTMLInputElement;

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
  
  let packet = coreState.RegisterPacket(indexToMacMap.get(connStartIndex)!, targetIp, data);
  if (!packet){
    return;
  }
  Utils.addPacket(packet);
  enableLogClick()
}

export function stepTick(){
  let packet_indexes = coreState.stepTick();
  for (let i of packet_indexes) {
    let packet = coreState.getPacketInfo(i);
    if (!packet) {
      continue;
    }
    Utils.addLine(packet.formatMessage());
  }
}

export function clearLog(){
  Utils.clearLog();
  coreState.removeInactivePackets();
}
