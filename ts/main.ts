import * as Utils from "./util.js"
import * as Core from "./core.js";
import { ipAddress, mac } from "./network.js";



// force types for bootstrap elements to be any
declare var bootstrap: any;

const grid: HTMLElement = document.getElementById("grid") as HTMLElement;
const modalEl = document.getElementById('textModal') as HTMLElement;
const modal = new bootstrap.Modal(modalEl);


var connectingMode = false;
var connStartCell: HTMLElement | null = null;
var connStartIndex: number = 0;
var selected = false;
var draggedTemplate: HTMLElement | null = null;
const indexToMacMap: Map<number, mac> = new Map();
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
export function createGrid(n: number) {

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

    if(draggedTemplate.dataset.type === "router") {
      getRouterIpModal().then((ipString) => {
        var routerMac = coreState.addRouter(ipString);
        if(routerMac !== false) {
          indexToMacMap.set(index, routerMac.toString());
          return;
        }
        removeVisual(index, cell);
      });
      return;
    }

    indexToMacMap.set(index, coreState.addComponent(draggedTemplate.dataset.type as string).toString());
  });
}

function resetHighlight() {
  if (connStartCell == null) return;
  connStartCell.style.backgroundColor = "";
  selected = false;
  var sendBtn =document.querySelector<HTMLButtonElement>("button.btn.btn-dark")!;
  sendBtn.disabled = true;
}

function removeVisual(i : number, cell : HTMLElement) {
  // remove the picture
  cell.removeChild(cell.firstChild as ChildNode);
  //remove lines connecting to other comps.
  Utils.removeConnections(i);
  connectingMode = false;
  selected = false;
  return;
}

function connectComponents(i: number, cell: HTMLElement) {
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
  document.addEventListener("dragstart", (e: DragEvent) => {
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

function openEditBox() {
  if (!selected || connStartCell == null) {
    return;
  }
  updateState();
  renderEditBox();
}

function updateState() {
  var componentState = coreState.getStateOfComponent(indexToMacMap.get(connStartIndex)!);
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


function activateEditMode() {
  if (connectingMode && connStartCell != null) {
    connStartCell.style.backgroundColor = "blue";
    selected = true;
    document.querySelector<HTMLButtonElement>("button.btn.btn-dark")!.disabled = false;
    openEditBox();
  }
}

function addConnection(cell: HTMLElement, index: number) {
  // connstartCell was alr checked for null before calling this function
  Utils.drawLine(connStartCell as HTMLElement, cell, connStartIndex, index);
  coreState.connectComponents(indexToMacMap.get(connStartIndex)!, indexToMacMap.get(index)!);
}

function isvalidConnection(fromindex: number, toindex: number) {
  if (connectingMode) {
    // check for connection to self
    if (fromindex == toindex) return false;
    // check if connection already exists
    if(indexToMacMap.get(fromindex) === undefined || indexToMacMap.get(toindex) === undefined) {
      return false;
    }

    return !coreState.alreadyConnected(indexToMacMap.get(fromindex)!, indexToMacMap.get(toindex)!);
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
  
  coreState.SendPacket(indexToMacMap.get(connStartIndex)!, targetIp, data);
}