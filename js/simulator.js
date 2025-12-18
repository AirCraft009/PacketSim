const grid = document.getElementById("grid");
const piece = document.getElementById("piece");


let connectingMode = false;
var connStart;

let draggedTemplate = null;

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2
  };
}

function drawLine(elA, elB) {
  const svg = document.getElementById("overlay");
  const a = centerOf(elA);
  const b = centerOf(elB);
  const svgRect = svg.getBoundingClientRect();
  console.log(a.x, a.y, b.x, b.y);

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

  line.setAttribute("x1", a.x - svgRect.left);
  line.setAttribute("y1", a.y - svgRect.top);
  line.setAttribute("x2", b.x - svgRect.left);
  line.setAttribute("y2", b.y - svgRect.top);
  line.setAttribute("stroke", "red");
  line.setAttribute("stroke-width", "2");

  svg.appendChild(line);
}



document.addEventListener("dragstart", (e) => {
  if (e.target.dataset.template) {
    draggedTemplate = e.target;
  }
});

document.addEventListener("dragend", () => {
  draggedTemplate = null;
});

window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

window.addEventListener("keydown", (e) =>{
  connectingMode = false;
})

// create cells
for (let i = 0; i < 256; i++) {
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
  });

  cell.addEventListener("mousedown", (e) => {
    if (!cell.firstChild) {
      return;
    }
    if (e.button == 2) {
      cell.removeChild(cell.firstChild);
    }
    if (e.button == 0) {
      if(connectingMode){
        connectingMode = false;
        return
      }
      connStart = cell
      connectingMode = true;
    }
  });

  grid.appendChild(cell);
}