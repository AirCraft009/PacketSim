function centerOf(el) {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2
  };
}

export function drawLine(elA, elB) {
  const svg = document.getElementById("overlay");
  const a = centerOf(elA);
  const b = centerOf(elB);
  const svgRect = svg.getBoundingClientRect();

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

  line.setAttribute("x1", a.x - svgRect.left);
  line.setAttribute("y1", a.y - svgRect.top);
  line.setAttribute("x2", b.x - svgRect.left);
  line.setAttribute("y2", b.y - svgRect.top);
  line.setAttribute("stroke", "black");
  line.setAttribute("stroke-width", "2");

  svg.appendChild(line);
}