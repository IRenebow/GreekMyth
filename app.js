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
  union: { color: "#2F6B4F", width: 2.6, dash: "2,6", label: "Union (parents → union)" },

  // Creation & origin (blues)
  raised:    { color: "#1F4E79", width: 3.0, dash: null,   label: "Raised" },
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
  "mentor", "patron", "overthrew", "freed", "raised", "imprisoned"
]);

function styleForRelation(rel) {
  const s = RELATION_STYLE[rel];
  if (s) return s;
  // fallback
  return { color: "#777", width: 2.4, dash: "4,4", label: rel };
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
  const g0 = await res.json();

  if (NORMALIZE_CHILD_TO_PARENT) {
      g0.links = g0.links.map(l => {
        if (l.relation === "child") {
          return { ...l, relation: "parent", source: l.target, target: l.source };
        }
        return l;
      });
    }
    
    const g = buildUnionFamilyGraph(g0);

  renderGraph(g);
}

function buildUnionFamilyGraph(g) {
  // Clone to avoid mutating original too hard
  const nodes = g.nodes.map(n => ({ ...n }));
  const links = g.links.map(l => ({ ...l }));

  // Helper: normalize link endpoints to ids
  const sid = l => (typeof l.source === "object" ? l.source.id : l.source);
  const tid = l => (typeof l.target === "object" ? l.target.id : l.target);

  // --- 1) Collect parents for each child from "parent" relations ---
  const parentsByChild = new Map(); // childId -> Set(parentId)
  links.forEach(l => {
    if (l.relation !== "parent") return;
    const p = sid(l);
    const c = tid(l);
    if (!parentsByChild.has(c)) parentsByChild.set(c, new Set());
    parentsByChild.get(c).add(p);
  });

  // --- 2) Create union nodes for children with exactly 2 parents ---
  // We'll replace (A->child, B->child) with (A->union, B->union, union->child)
  const unionIdByPair = new Map(); // "A|B" -> unionNodeId

  function pairKey(a, b) {
    return [a, b].sort().join("|");
  }

  function ensureUnionNode(a, b) {
    const key = pairKey(a, b);
    if (unionIdByPair.has(key)) return unionIdByPair.get(key);

    const id = `union:${key}`;
    unionIdByPair.set(key, id);

    const g1 = g.nodes.find(n => n.id === a)?.generation ?? 0;
    const g2 = g.nodes.find(n => n.id === b)?.generation ?? 0;
    
    nodes.push({
      id,
      label: "",
      isUnion: true,
      type: "union",
      generation: (g1 + g2) / 2   // 🔑 sits slightly below parents
    });

    return id;
  }

  // We'll build a new links array
  const newLinks = [];

  // Keep all non-parent links as-is (spouse, enemy, etc.)
  links.forEach(l => {
    if (l.relation !== "parent") newLinks.push(l);
  });

  // For each child, decide whether to route through union or direct
  parentsByChild.forEach((pset, childId) => {
    const parents = Array.from(pset);

    if (parents.length === 2) {
      const [p1, p2] = parents;
      const u = ensureUnionNode(p1, p2);

      // parent -> union links (you can style these as "union" or reuse "spouse")
      newLinks.push({ source: p1, target: u, relation: "union" });
      newLinks.push({ source: p2, target: u, relation: "union" });

      // union -> child is the actual parentage arrow
      newLinks.push({ source: u, target: childId, relation: "parent" });
    } else {
      // 0 or 1 or >2 parents:
      // - 1 parent = single-parent birth: keep direct
      // - >2 = unusual: keep direct from each parent
      parents.forEach(p => {
        newLinks.push({ source: p, target: childId, relation: "parent" });
      });
    }
  });

  // Ensure your style table has a "union" entry
  return { nodes, links: newLinks };
}


function renderGraph(g) {
  graphEl.innerHTML = "";

  const width = graphEl.clientWidth;
  const height = graphEl.clientHeight;

  // --- (A) Compute degree (#relations) for each node ---
    const degree = new Map();
    g.nodes.forEach(n => degree.set(n.id, 0));
    
    g.links.forEach(l => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      degree.set(s, (degree.get(s) || 0) + 1.5);
      degree.set(t, (degree.get(t) || 0) + 1.5);
    });
    
    // --- (B) Map degree -> radius ---
    const degVals = [...degree.values()];
    const degExtent = d3.extent(degVals); // [min,max]
    
    const radiusScale = d3.scaleSqrt()
      .domain(degExtent)
      .range([10, 56]); // <-- tweak these to make portraits bigger overall

    function nodeRadius(d) {
      const deg = degree?.get(d.id) || 0;
    
      // Optional: small type boost (keeps primordials slightly bigger)
      const typeBoost =
        d.type === "primordial" ? 1 :
        d.type === "titan" ? 1 : 
        d.type === "olympian" ? 1 :0;
    
      return radiusScale(deg + typeBoost);
    }


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
  // --- Image patterns for character portraits ---
    g.nodes.forEach(d => {
      if (d.isUnion) return;
      if (!d.img) return;
    
      const size = nodeRadius(d) * 2;
    
      const pat = defs.append("pattern")
        .attr("id", `img-${d.id}`)
        .attr("patternUnits", "objectBoundingBox")
        .attr("width", 1)
        .attr("height", 1);
    
      pat.append("image")
        .attr("href", d.img)
        .attr("width", size)
        .attr("height", size)
        .attr("preserveAspectRatio", "xMidYMid slice");
    });

  const rels = Array.from(new Set(g.links.map(l => l.relation))).filter(Boolean);

  rels.forEach(rel => {
    const s = styleForRelation(rel);

    defs.append("marker")
      .attr("id", markerId(rel))
      .attr("viewBox", "0 -3 6 6")
      .attr("refX", 6.5)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .attr("markerUnits", "strokeWidth")
      .append("path")
      .attr("d", "M0,-3L6,0L0,3")   // 🔑 THIS is the key change
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

  // Main shape
    nodes.each(function(d) {
      const g = d3.select(this);
    
      if (d.isUnion) {
        const r = 10; // union size
        g.append("rect")
          .attr("x", -r)
          .attr("y", -r)
          .attr("width", 2 * r)
          .attr("height", 2 * r)
          .attr("transform", "rotate(45)")
          .attr("fill", "#F3EEE3")
          .attr("stroke", "#333")
          .attr("stroke-width", 1.5);
      } else {
        g.append("circle")
          .attr("r", d => nodeRadius(d))
          .attr("fill", d => d.img ? `url(#img-${d.id})` : "#fff")
          .attr("stroke", "#333")
          .attr("stroke-width", 1.5);
    
        g.append("circle")
          .attr("r", d => nodeRadius(d))
          .attr("fill", "none")
          .attr("stroke", "rgba(0,0,0,0.15)")
          .attr("stroke-width", 1);
      }
    });



    nodes.filter(d => !d.isUnion).append("text")
      .text(d => d.label)
      .attr("x", d => nodeRadius(d) + 6)
      .attr("y", 4)
      .attr("font-size", 12);

    nodes.on("click", (event, d) => {
      event.stopPropagation();
      if (d.isUnion) return;
      window.location.href = `character.html?id=${encodeURIComponent(d.id)}`;
    });

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
    .force("y", d3.forceY(d => (d.generation ?? 0) * 120).strength(0.35))
    .force("collide", d3.forceCollide().radius(d => nodeRadius(d) + 20));

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