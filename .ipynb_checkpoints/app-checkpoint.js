const graphEl = document.getElementById("graph");

async function main() {
  const res = await fetch("data/relations.json");
  const g = await res.json();
  renderGraph(g);
}

function renderGraph(g) {
  graphEl.innerHTML = "";

  const width = graphEl.clientWidth;
  const height = graphEl.clientHeight;

  const svg = d3.select(graphEl)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const zoomLayer = svg.append("g");
  const zoom = d3.zoom().on("zoom", (event) => {
      zoomLayer.attr("transform", event.transform);
    });
    svg.call(zoom);

  const linkLayer = zoomLayer.append("g").attr("stroke", "#999").attr("stroke-opacity", 0.6);
  const nodeLayer = zoomLayer.append("g");

  const links = linkLayer.selectAll("line")
    .data(g.links)
    .join("line")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", d => (d.relation === "spouse" || d.relation === "consort") ? "6,4" : null);

  const nodes = nodeLayer.selectAll("g")
    .data(g.nodes)
    .join("g")
    .style("cursor", "grab");

  const r = d => d.type === "primordial" ? 14 : d.type === "titan" ? 12 : 10;

  nodes.append("circle")
    .attr("r", d => r(d))
    .attr("fill", "#fff")
    .attr("stroke", "#333")
    .attr("stroke-width", 1.5);

  nodes.append("text")
    .text(d => d.label)
    .attr("x", d => r(d) + 6)
    .attr("y", 4)
    .attr("font-size", 12);

  const sim = d3.forceSimulation(g.nodes)
    .force("link", d3.forceLink(g.links).id(d => d.id).distance(80))
    .force("charge", d3.forceManyBody().strength(-250))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("y", d3.forceY(d => (d.generation ?? 0) * 120).strength(0.2))
    .force("collide", d3.forceCollide().radius(d => r(d) + 18));

  sim.on("tick", () => {
    links
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    // After a short moment, zoom-to-fit the whole graph
    setTimeout(() => {
      // bounding box of everything inside zoomLayer
      const bounds = zoomLayer.node().getBBox();
      const fullWidth = width;
      const fullHeight = height;
    
      const padding = 40;
      const boundsWidth = bounds.width + padding * 2;
      const boundsHeight = bounds.height + padding * 2;
    
      // Avoid divide-by-zero
      if (boundsWidth === 0 || boundsHeight === 0) return;
    
      const scale = Math.min(fullWidth / boundsWidth, fullHeight / boundsHeight);
    
      const translateX = fullWidth / 2 - scale * (bounds.x + bounds.width / 2);
      const translateY = fullHeight / 2 - scale * (bounds.y + bounds.height / 2);
    
      svg.transition().duration(500).call(
        zoom.transform,
        d3.zoomIdentity.translate(translateX, translateY).scale(scale)
      );
    }, 500);


    nodes.attr("transform", d => `translate(${d.x},${d.y})`);
  });

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

    window.addEventListener("resize", () => {
      renderGraph(g);
    }, { once: true });

}

main();
