const svg = document.getElementById("overlay");


// Utility functions for drawing and deleting lines

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2
  };
}

export function drawLine(componentA, componentB) {
  const a = centerOf(componentA.cell);
  const b = centerOf(componentB.cell);
  const svgRect = svg.getBoundingClientRect();

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

  line.setAttribute("x1", a.x - svgRect.left);
  line.setAttribute("y1", a.y - svgRect.top);
  line.setAttribute("x2", b.x - svgRect.left);
  line.setAttribute("y2", b.y - svgRect.top);
  line.setAttribute("stroke", "black");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("index-a", componentA.index);
  line.setAttribute("index-b", componentB.index);

  svg.appendChild(line);
}

export function removeConnections(index) {
  const line = document.getElementById("overlay").querySelectorAll(`line[index-a='${index}'], line[index-b='${index}']`);
  line.forEach(e => {
    svg.removeChild(e);
  });
}