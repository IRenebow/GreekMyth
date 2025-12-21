const graphEl = document.getElementById("graph");
const legendEl = document.getElementById("legend");

// Oil-painting style palette + relation styling
const RELATION_STYLE = {
  // Kinship / lineage (biological)
  parent:    { color: "#7A5C3E", width: 3.0, dash: null,  label: "Parent → child" },
  child:     { color: "#B08968", width: 2.2, dash: null,  label: "Child (inverse)" },
  ancestor:  { color: "#4E3B2A", width: 2.6, dash: "2,6", label: "Ancestor (abstract)" },
  sibling:   { color: "#6B7C5A", width: 2.0, dash: "3,4", label: "Siblings" },
  twin:      { color: "#9AAA88", width: 2.4, dash: "1,3", label: "Twins" },

  // Marriage & sexual
  spouse:    { color: "#8E3B2F", width: 2.4, dash: "6,4", label: "Spouse (marriage)" },
  consort:   { color: "#A0522D", width: 2.2, dash: "6,4", label: "Consort" },
  lover:     { color: "#B56576", width: 2.0, dash: "2,4", label: "Lovers" },
  affair:    { color: "#8F5D6E", width: 2.0, dash: "2,6", label: "Affair" },
  rape:      { color: "#5B1F1F", width: 4.2, dash: "10,6", label: "Non-consensual union" },

  // Creation / origin
  created:   { color: "#2F5D8C", width: 2.6, dash: "1,0", label: "Created" },
  born_from: { color: "#6C8EBF", width: 2.4, dash: "4,3", label: "Born from (mythic)" },
  fashioned: { color: "#4A6070", width: 2.2, dash: "1,4", label: "Fashioned / crafted" },

  // Conflict / power
  overthrew: { color: "#7C2D12", width: 4.0, dash: null,  label: "Overthrew" },
  killed:    { color: "#3A1F1F", width: 4.6, dash: null,  label: "Killed" },
  punished:  { color: "#3F4A7A", width: 3.4, dash: "8,4", label: "Punished" },
  enemy:     { color: "#6B6B6B", width: 2.6, dash: "3,3", label: "Enemies" },
  ally:      { color: "#5F8D7A", width: 2.2, dash: "1,0", label: "Allies" },

  // Favor / guidance
  mentor:    { color: "#B08D57", width: 2.3, dash: "1,0", label: "Mentor" },
  patron:    { color: "#C9A44C", width: 2.4, dash: "1,0", label: "Patron" },
  blessed:   { color: "#E0C878", width: 2.2, dash: "1,0", label: "Blessed" },
  cursed:    { color: "#5D4A66", width: 3.2, dash: "6,3", label: "Cursed" },

  // Transformation / events
  transformed:{ color: "#3E7A6D", width: 2.6, dash: "5,4", label: "Transformed" },
  imprisoned:{ color: "#4A4A4A", width: 3.4, dash: "2,3", label: "Imprisoned" },
  freed:     { color: "#A3C9A8", width: 2.4, dash: "2,4", label: "Freed" }
};

// Defines which relations count as "biological" for dash defaults (if missing)
const BIOLOGICAL = new Set(["parent", "child"]);

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

function renderLegend(g) {
  if (!legendEl) return;

  // Only show relations that actually appear in your data
  const present = Array.from(new Set(g.links.map(l => l.relation))).filter(Boolean);

  // Grouping (optional but nice)
  const groups = [
    { title: "Lineage", keys: ["parent", "child", "ancestor", "sibling", "twin"] },
    { title: "Romance & marriage", keys: ["spouse", "consort", "lover", "affair", "rape"] },
    { title: "Creation & origin", keys: ["created", "born_from", "fashioned"] },
    { title: "Conflict & power", keys: ["overthrew", "killed", "punished", "enemy", "ally"] },
    { title: "Favor & guidance", keys: ["mentor", "patron", "blessed", "cursed"] },
    { title: "Mythic events", keys: ["transformed", "imprisoned", "freed"] }
  ];

  // Flatten groups to only what's present; put unrecognized relations at the end
  const ordered = [];
  const used = new Set();

  for (const grp of groups) {
    const keys = grp.keys.filter(k => present.includes(k));
    if (keys.length) {
      ordered.push({ header: grp.title, keys });
      keys.forEach(k => used.add(k));
    }
  }

  const extras = present.filter(r => !used.has(r));
  if (extras.length) ordered.push({ header: "Other", keys: extras });

  // Build HTML
  let html = `<div class="legend-title">Legend</div>`;
  html += `<div class="legend-grid">`;

  for (const section of ordered) {
    for (const rel of section.keys) {
      const s = styleForRelation(rel);
      const dash = s.dash ? `border-top: ${s.width}px dashed ${s.color};` : `border-top: ${s.width}px solid ${s.color};`;

      // We draw the "line" as a top border inside the swatch for dash accuracy
      html += `
        <div class="legend-item" title="${rel}">
          <div class="legend-swatch" style="background:#fff;">
            <div style="height:0; margin-top:5px; ${dash}"></div>
          </div>
          <div><b>${rel}</b>${s.label ? ` — ${s.label}` : ""}</div>
        </div>
      `;
    }
  }

  html += `</div>`;
  legendEl.innerHTML = html;
}

renderLegend(g);


  function styleForRelation(rel) {
      const s = RELATION_STYLE[rel];
      if (s) return s;
    
      // fallback: biological = solid, otherwise dashed
      if (BIOLOGICAL.has(rel)) return { color: "#7A5C3E", width: 2.6, dash: null, label: rel };
      return { color: "#777", width: 2.0, dash: "4,4", label: rel };
    }
    
    const links = linkLayer.selectAll("line")
      .data(g.links)
      .join("line")
      .attr("stroke", d => styleForRelation(d.relation).color)
      .attr("stroke-width", d => styleForRelation(d.relation).width)
      .attr("stroke-dasharray", d => styleForRelation(d.relation).dash)
      .attr("stroke-linecap", "round");

    links.append("title").text(d => `${d.relation}: ${d.source.id ?? d.source} → ${d.target.id ?? d.target}`);

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
