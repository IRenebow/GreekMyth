const graphEl = document.getElementById("graph");
const legendEl = document.getElementById("legend");

// Oil-painting style palette + relation styling
const RELATION_STYLE = {
  // Lineage (warm earths)
  parent:    { color: "#6B3F2A", width: 4.2, dash: null,   label: "Parent → child" },      // deep burnt umber
  child:     { color: "#C08A4D", width: 2.8, dash: null,   label: "Child (inverse)" },     // ochre
  ancestor:  { color: "#2F2117", width: 3.0, dash: "1,6",  label: "Ancestor (abstract)" }, // near-sepia, dotted

  sibling:   { color: "#2F6B4F", width: 2.6, dash: "6,3",  label: "Siblings" },            // viridian green
  twin:      { color: "#6D8F74", width: 2.4, dash: "2,3",  label: "Twins" },               // pale viridian

  // Marriage & sexual (reds / purples)
  spouse:    { color: "#8B1E2D", width: 3.2, dash: "10,4", label: "Spouse (marriage)" },   // alizarin crimson
  consort:   { color: "#B04A2F", width: 2.8, dash: "8,4",  label: "Consort" },             // burnt sienna
  lover:     { color: "#B0476B", width: 2.6, dash: "3,4",  label: "Lovers" },              // rose/magenta
  affair:    { color: "#6E3B5E", width: 2.6, dash: "2,6",  label: "Affair" },              // aubergine
  rape:      { color: "#4A0F16", width: 5.2, dash: "14,6", label: "Non-consensual union" },// dried blood

  // Creation & origin (blues)
  created:   { color: "#1F4E79", width: 3.0, dash: null,   label: "Created" },             // ultramarine-ish
  born_from: { color: "#4E7FA6", width: 2.8, dash: "4,3",  label: "Born from (mythic)" },  // cerulean
  fashioned: { color: "#2F3E4E", width: 2.8, dash: "1,4",  label: "Fashioned / crafted" }, // slate blue-gray

  // Conflict & power (darks / steel)
  overthrew: { color: "#7A2E1A", width: 4.8, dash: null,   label: "Overthrew" },           // iron oxide red
  killed:    { color: "#1E1414", width: 6.0, dash: null,   label: "Killed" },              // near-black umber
  punished:  { color: "#2B2E6B", width: 4.0, dash: "10,5", label: "Punished" },            // deep indigo
  enemy:     { color: "#5A5A5A", width: 3.2, dash: "3,3",  label: "Enemies" },             // ash gray
  ally:      { color: "#3C7F77", width: 2.8, dash: null,   label: "Allies" },              // verdigris

  // Favor & guidance (golden pigments)
  mentor:    { color: "#9C7A2F", width: 2.8, dash: null,   label: "Mentor" },              // aged gold
  patron:    { color: "#C2A13B", width: 3.0, dash: null,   label: "Patron" },              // antique gold
  blessed:   { color: "#E0C36A", width: 2.8, dash: "2,3",  label: "Blessed" },             // pale gold
  cursed:    { color: "#3F2C4D", width: 4.2, dash: "6,3",  label: "Cursed" },              // bruised violet

  // Mythic events
  transformed:{ color: "#1F6A5B", width: 3.2, dash: "7,4", label: "Transformed" },         // deep teal/viridian
  imprisoned:{ color: "#3C3F45", width: 4.6, dash: "2,3",  label: "Imprisoned" },          // payne's gray
  freed:     { color: "#88BDA2", width: 3.0, dash: "2,6",  label: "Freed" }                // celadon
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

    // --- Arrowhead definitions (one per relation type) ---
    const defs = svg.append("defs");
    
    function markerId(rel) {
      return `arrow-${rel}`;
    }
    
    // Create markers only for relations that appear
    const rels = Array.from(new Set(g.links.map(l => l.relation))).filter(Boolean);
    
    rels.forEach(rel => {
      const s = styleForRelation(rel);
    
      defs.append("marker")
        .attr("id", markerId(rel))
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 12)          // position of arrow relative to end of line
        .attr("refY", 0)
        .attr("markerWidth", 7)
        .attr("markerHeight", 7)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", s.color)
        .attr("opacity", 0.95);
    });


  const zoomLayer = svg.append("g");
  const zoom = d3.zoom().on("zoom", (event) => {
      zoomLayer.attr("transform", event.transform);
    });
    svg.call(zoom);

  const linkLayer = zoomLayer.append("g").attr("stroke-opacity", 0.6);
  const nodeLayer = zoomLayer.append("g");

    const halo = linkLayer.selectAll("line.halo")
      .data(g.links)
      .join("line")
      .attr("class", "halo")
      .attr("stroke", "#F3EEE3") // warm parchment
      .attr("stroke-width", d => styleForRelation(d.relation).width + 3)
      .attr("stroke-linecap", "round")
      .attr("stroke-opacity", 1);

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
    const DIRECTED = new Set(["parent","created","fashioned","killed","punished","cursed","blessed","mentor","patron","overthrew"]);
    
    const links = linkLayer.selectAll("line")
      .data(g.links)
      .join("line")
      .attr("stroke", d => styleForRelation(d.relation).color)
      .attr("stroke-width", d => styleForRelation(d.relation).width)
      .attr("stroke-dasharray", d => styleForRelation(d.relation).dash)
      .attr("stroke-linecap", "round")
      .attr("marker-end", d => DIRECTED.has(d.relation) ? `url(#${markerId(d.relation)})` : null);

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

    function nodeRadius(d) {
      return d.type === "primordial" ? 14 : d.type === "titan" ? 12 : 10;
    }
    
    // Move the end of the line back from the target node by its radius (plus a little padding)
    function shortenLinkToTarget(d) {
      const sx = d.source.x, sy = d.source.y;
      const tx = d.target.x, ty = d.target.y;
    
      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    
      const pad = nodeRadius(d.target) + 6; // 6px extra for arrowhead
      const ratio = (dist - pad) / dist;
    
      return {
        x2: sx + dx * ratio,
        y2: sy + dy * ratio
      };
    }


    sim.on("tick", () => {
  halo
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => shortenLinkToTarget(d).x2)
    .attr("y2", d => shortenLinkToTarget(d).y2);

  links
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => shortenLinkToTarget(d).x2)
    .attr("y2", d => shortenLinkToTarget(d).y2);

  nodes.attr("transform", d => `translate(${d.x},${d.y})`);
});


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
    }, 600);

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
