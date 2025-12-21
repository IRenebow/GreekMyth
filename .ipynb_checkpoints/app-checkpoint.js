const graphEl = document.getElementById("graph");

async function main() {
  const res = await fetch("data/relations.json");
  const g = await res.json();

  renderGraph(g);
}

function renderGraph(g) {
  // Clear container
  graphEl.innerHTML = "";

  const width = graphEl.clientWidth;
  const height = graphEl.clientHeight;

  const svg = d3.select(graphEl)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Zoom / pan
  const zoomLayer = svg.append("g");
  svg.call(
    d3.zoom().on("zoom", (event) => {
      zoomLayer.attr("transform", event.transform);
    })
  );

  // Build link + node layers
  const linkLayer = zoomLayer.append("g").attr("stroke", "#999").attr("stroke-opacity", 0.6);
  const nodeLayer = zoomLayer.append("g");

  // Optional: different line styles by relation
  function linkStrokeDash(rel) {
    if (rel === "spouse" || rel === "consort") return "6,4";
    return null; // solid for parent by default
  }

  const links = linkLayer.selectAll("line")
    .data(g.links)
    .join("line")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", d => linkStrokeDash(d.relation));

  // Node groups
  const nodes = nodeLayer.selectAll("g")
    .data(g.nodes)
    .join("g")
    .style("cursor", "grab");

  // Simple node radius by type (optional)
  function nodeRadius(type) {
    if (type === "primordial") return 14;
    if (type === "titan") return 12;
    return 10;
  }

  nodes.append("circle")
    .attr("r", d => nodeRadius(d.type))
    .attr("fill", "#fff")
    .attr("stroke", "#333")
    .attr("stroke-width", 1.5);

  nodes.append("text")
    .text(d => d.label)
    .attr("x", d => nodeRadius(d.type) + 6)
    .attr("y", 4)
    .attr("font-size", 12);

  // Click behavior (you can wire this to your existing detail panel later)
  nodes.on("click", (event, d) => {
    // For now: jump to a hash you can use elsewhere
    location.hash = `character=${encodeURIComponent(d.id)}`;
  });

  // Force simulation (graph layout)
  const sim = d3.forceSimulation(g.nodes)
    .force("link", d3.forceLink(g.links).id(d => d.id).distance(80))
    .force("charge", d3.forceManyBody().strength(-250))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("y",d3.forceY(d => (d.generation ?? 0) * 120).strength(0.2))
    .force("collide", d3.forceCollide().radius(d => nodeRadius(d.type) + 18));

  sim.on("tick", () => {
    links
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    nodes.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  // Dragging
  nodes.call(
    d3.drag()
      .on("start", (event, d) => {
        nodes.style("cursor", "grabbing");
        if (!event.active) sim.alphaTarget(0.2).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y;
      })
      .on("end", (event, d) => {
        nodes.style("cursor", "grab");
        if (!event.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      })
  );
}

main();