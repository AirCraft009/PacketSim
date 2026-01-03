import { Komponent } from "./network.js";

const svg : any = document.getElementById("overlay");


// Utility functions for drawing and deleting lines

function centerOf(el : any) : any {
  const r : any = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2
  };
}

export function drawLine(cellA: HTMLElement, cellB: HTMLElement, indexA: number, indexB: number) {
  const a = centerOf(cellA);
  const b = centerOf(cellB);
  const svgRect = svg.getBoundingClientRect();

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

  line.setAttribute("x1", (a.x - svgRect.left).toString());
  line.setAttribute("y1", (a.y - svgRect.top).toString());
  line.setAttribute("x2", (b.x - svgRect.left).toString());
  line.setAttribute("y2", (b.y - svgRect.top).toString());
  line.setAttribute("stroke", "black");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("index-a", indexA.toString());
  line.setAttribute("index-b", indexB.toString());

  svg.appendChild(line);
}

export function removeConnections(index: number) {
  const line : any = svg.querySelectorAll(`line[index-a='${index}'], line[index-b='${index}']`);
  line.forEach((e: Element) => {
    svg.removeChild(e);
  });
}