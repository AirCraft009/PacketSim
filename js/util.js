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
    line.setAttribute("x1", (a.x - svgRect.left).toString());
    line.setAttribute("y1", (a.y - svgRect.top).toString());
    line.setAttribute("x2", (b.x - svgRect.left).toString());
    line.setAttribute("y2", (b.y - svgRect.top).toString());
    line.setAttribute("stroke", "black");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("index-a", componentA.index.toString());
    line.setAttribute("index-b", componentB.index.toString());
    svg.appendChild(line);
}
export function removeConnections(index) {
    const line = svg.querySelectorAll(`line[index-a='${index}'], line[index-b='${index}']`);
    line.forEach((e) => {
        svg.removeChild(e);
    });
}
