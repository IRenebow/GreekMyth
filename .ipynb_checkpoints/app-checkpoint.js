// app.js (copy-paste entire file)

const graphEl = document.getElementById("graph");
const legendEl = document.getElementById("legend");

// High-contrast "oil painting" palette + styling
const RELATION_STYLE = {
  // Lineage (earths)
  parent:     { color: "#6B3F2A", width: 4.2, dash: null,   label: "Parent → child" },
  child:      { color: "#C08A4D", width: 2.8, dash: null,   label: "Child (inverse, avoid storing)" },
  ancestor:   { color: "#2F2117", width: 3.0, dash: "1,6",  label: "Ancestor (abstract)" },
  sibling:    { color: "#2F6B4F", width: 2.6, dash: "6,3",  label: "Siblings" },
  twin:       { color: "#6D8F74", width: 2.4, dash: "2,3",  label: "Twins" },

  // Romance & marriage (reds/purples)
  spouse:     { color: "#8B1E2D", width: 3.2, dash: "10,4", label: "Spouse" },
  consort:    { color: "#B04A2F", width: 2.8, dash: "8,4",  label: "Consort" },
  lover:      { color: "#B0476B", width: 2.6, dash: "3,4",  label: "Lovers" },
  affair:     { color: "#6E3B5E", width: 2.6, dash: "2,6",  label: "Affair" },
  rape:       { color: "#4A0F16", width: 5.2, dash: "14,6", label: "Non-consensual union" },

  // Creation & origin (blues)
  created:    { color: "#1F4E79", width: 3.0, dash: null,   label: "Created" },
  born_from:  { color: "#4E7FA6", width: 2.8, dash: "4,3",  label: "Born from" },
  fashioned:  { color: "#2F3E4E", width: 2.8, dash: "1,4",  label: "Fashioned / crafted" },

  // Conflict & power (darks/steel)
  overthrew:  { color: "#7A2E1A", width: 4.8, dash: null,   label: "Overthrew" },
  killed:     { color: "#1E1414", width: 6.0, dash: null,   label: "Killed" },
  punished:   { color: "#2B2E6B", width: 4.0, dash: "10,5", label: "Punished" },
  enemy:      { color: "#5A5A5A", width: 3.2, dash: "3,3",  label: "Enemies" },
  ally:       { color: "#3C7F77", width: 2.8, dash: null,   label: "Allies" },

  // Favor & guidance (golds)
  mentor:     { color: "#9C7A2F", width: 2.8, dash: null,   label: "Mentor" },
  patron:     { color: "#C2A13B", width: 3.0, dash: null,   label: "Patron" },
  blessed:    { color: "#E0C36A", width: 2.8, dash: "2,3",  label: "Blessed" },
  cursed:     { color: "#3F2C4D", width: 4.2, dash: "6,3",  label: "Cursed" },

  // Mythic events
  transformed:{ color: "#1F6A5B", width: 3.2, dash: "7,4",  label: "Transformed" },
  imprisoned: { color: "#3C3F45", width: 4.6, dash: "2,3",  label: "Imprisoned" },
  freed:      { color: "#88BDA2", width: 3.0, dash: "2,6",  label: "Freed" }
};

// Use one canonical direction; "child" is generally redundant.
// If your data contains "child", we convert it to "parent" reversed.
const NORMALIZE_CHILD_TO_PARENT = true;

// Which relations get arrows (directional)
const DIRECTED = new Set([
  "parent", "created", "fashioned",
  "killed", "punished", "cursed", "blessed",
  "mentor", "patron", "overthrew"
]);

function styleForRelation(rel) {
  const s = RELATION_STYLE[rel];
  if (s) return s;
  // fallback
  return { color: "#777", width: 2.4, dash: "4,4", label: rel };
}

function nodeRadius(d) {
  return d.type === "primordial" ? 14 : d.type === "titan" ? 12 : 10;
}

function markerId(rel) {
  return `arrow-${rel}`;
}

async function main() {
  if (!graphEl) {
    console.error('Missing <div id="graph"></div> in index.html');
    return;
  }

  const res = await fetch("data/relations.json");
  const g = await res.json();

  // Normalize redundant child edges (optional but recommended)
  if (NORMALIZE_CHILD_TO_PARENT) {
    g.links = g.links.map(l => {
      if (l.relation === "child") {
        return { ...l, relation: "parent", source: l.target, target: l.source };
      }
      return l;
    });
  }

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

  // Zoom / pan
  const zoomLayer = svg.append("g");
  const zoom = d3.zoom().on("zoom", (event) => {
    zoomLayer.attr("transform", event.transform);
  });
  svg.call(zoom);

  // Layers
  const linkLayer = zoomLayer.append("g").attr("stroke-opacity", 0.65);
  const nodeLayer = zoomLayer.append("g");

  // Arrow marker defs (one per relation present)
  const defs = svg.append("defs");
  const rels = Array.from(new Set(g.links.map(l => l.relation))).filter(Boolean);

  rels.forEach(rel => {
    const s = styleForRelation(rel);

    defs.append("marker")
      .attr("id", markerId(rel))
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 12)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", s.color)
      .attr("opacity", 0.95);
  });

  // Legend
  renderLegend(g);

  // Halo underlay (for contrast)
  const halo = linkLayer.selectAll("line.halo")
    .data(g.links)
    .join("line")
    .attr("class", "halo")
    .attr("stroke", "#F3EEE3") // warm parchment halo
    .attr("stroke-width", d => styleForRelation(d.relation).width + 3)
    .attr("stroke-linecap", "round")
    .attr("stroke-opacity", 1);

  // Colored links (with arrows for DIRECTED relations)
  const links = linkLayer.selectAll("line.link")
    .data(g.links)
    .join("line")
    .attr("class", "link")
    .attr("stroke", d => styleForRelation(d.relation).color)
    .attr("stroke-width", d => styleForRelation(d.relation).width)
    .attr("stroke-dasharray", d => styleForRelation(d.relation).dash)
    .attr("stroke-linecap", "round")
    .attr("stroke-opacity", 0.95)
    .attr("marker-end", d => DIRECTED.has(d.relation) ? `url(#${markerId(d.relation)})` : null);

  links.append("title")
    .text(d => `${d.relation}: ${d.source.id ?? d.source} → ${d.target.id ?? d.target}`);

  // Nodes
  const nodes = nodeLayer.selectAll("g.node")
    .data(g.nodes)
    .join("g")
    .attr("class", "node")
    .style("cursor", "grab");

  nodes.append("circle")
    .attr("r", d => nodeRadius(d))
    .attr("fill", "#fff")
    .attr("stroke", "#333")
    .attr("stroke-width", 1.5);

  nodes.append("text")
    .text(d => d.label)
    .attr("x", d => nodeRadius(d) + 6)
    .attr("y", 4)
    .attr("font-size", 12);

  // Shorten lines so arrows don't overlap target nodes
  function shortenToTarget(d) {
    const sx = d.source.x, sy = d.source.y;
    const tx = d.target.x, ty = d.target.y;

    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const pad = nodeRadius(d.target) + (DIRECTED.has(d.relation) ? 10 : 6);
    const ratio = Math.max((dist - pad) / dist, 0);

    return { x2: sx + dx * ratio, y2: sy + dy * ratio };
  }

  // Simulation
  const sim = d3.forceSimulation(g.nodes)
    .force("link", d3.forceLink(g.links).id(d => d.id).distance(90))
    .force("charge", d3.forceManyBody().strength(-320))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("y", d3.forceY(d => (d.generation ?? 0) * 120).strength(0.22))
    .force("collide", d3.forceCollide().radius(d => nodeRadius(d) + 18));

  sim.on("tick", () => {
    const end = d => shortenToTarget(d);

    halo
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => end(d).x2)
      .attr("y2", d => end(d).y2);

    links
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => end(d).x2)
      .attr("y2", d => end(d).y2);

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

  // Zoom-to-fit once after initial layout
  setTimeout(() => {
    const bounds = zoomLayer.node().getBBox();
    const padding = 50;

    const boundsWidth = bounds.width + padding * 2;
    const boundsHeight = bounds.height + padding * 2;

    if (boundsWidth === 0 || boundsHeight === 0) return;

    const scale = Math.min(width / boundsWidth, height / boundsHeight);
    const tx = width / 2 - scale * (bounds.x + bounds.width / 2);
    const ty = height / 2 - scale * (bounds.y + bounds.height / 2);

    svg.transition().duration(500).call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }, 700);

  // Re-render once on resize (simple + avoids accumulating listeners)
  window.addEventListener("resize", () => renderGraph(g), { once: true });

  // --- Legend renderer (uses relations present) ---
  function renderLegend(g) {
    if (!legendEl) return;

    const present = Array.from(new Set(g.links.map(l => l.relation))).filter(Boolean);

    const groups = [
      { title: "Lineage", keys: ["parent", "ancestor", "sibling", "twin"] },
      { title: "Romance & marriage", keys: ["spouse", "consort", "lover", "affair", "rape"] },
      { title: "Creation & origin", keys: ["created", "born_from", "fashioned"] },
      { title: "Conflict & power", keys: ["overthrew", "killed", "punished", "enemy", "ally"] },
      { title: "Favor & guidance", keys: ["mentor", "patron", "blessed", "cursed"] },
      { title: "Mythic events", keys: ["transformed", "imprisoned", "freed"] }
    ];

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

    let html = `<div class="legend-title">Legend</div>`;
    html += `<div class="legend-grid">`;

    for (const section of ordered) {
      for (const rel of section.keys) {
        const s = styleForRelation(rel);
        const dash = s.dash
          ? `border-top: ${s.width}px dashed ${s.color};`
          : `border-top: ${s.width}px solid ${s.color};`;

        const arrowNote = DIRECTED.has(rel) ? " →" : "";

        html += `
          <div class="legend-item" title="${rel}">
            <div class="legend-swatch" style="background:#fff;">
              <div style="height:0; margin-top:5px; ${dash}"></div>
            </div>
            <div><b>${rel}${arrowNote}</b>${s.label ? ` — ${s.label}` : ""}</div>
          </div>
        `;
      }
    }

    html += `</div>`;
    legendEl.innerHTML = html;
  }
}

main();