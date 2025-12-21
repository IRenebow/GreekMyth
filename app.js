const elChars = document.getElementById("characters");
const elStories = document.getElementById("stories");
const elDetail = document.getElementById("detail");
const elSearch = document.getElementById("search");

let data = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function renderLists(query = "") {
  const q = query.trim().toLowerCase();

  const chars = data.characters.filter(c =>
    !q || [c.name, c.role, ...(c.domain||[]), c.description].join(" ").toLowerCase().includes(q)
  );

  const stories = data.stories.filter(s =>
    !q || [s.title, s.summary].join(" ").toLowerCase().includes(q)
  );

  elChars.innerHTML = chars.map(c => `
    <div class="item" data-type="character" data-id="${c.id}">
      <div class="title">${escapeHtml(c.name)}</div>
      <div class="meta">${escapeHtml(c.role || "")}</div>
    </div>
  `).join("");

  elStories.innerHTML = stories.map(s => `
    <div class="item" data-type="story" data-id="${s.id}">
      <div class="title">${escapeHtml(s.title)}</div>
      <div class="meta">${escapeHtml(s.summary || "")}</div>
    </div>
  `).join("");
}

function showCharacter(id) {
  const c = data.characters.find(x => x.id === id);
  if (!c) return;
  elDetail.innerHTML = `
    <div class="card">
      <div class="title" style="font-size:18px;font-weight:700;">${escapeHtml(c.name)}</div>
      <div style="margin-top:6px;color:#444;">${escapeHtml(c.description || "")}</div>
    </div>
  `;
}

function showStory(id) {
  const s = data.stories.find(x => x.id === id);
  if (!s) return;
  elDetail.innerHTML = `
    <div class="card">
      <div class="title" style="font-size:18px;font-weight:700;">${escapeHtml(s.title)}</div>
      <div style="margin-top:6px;color:#444;">${escapeHtml(s.summary || "")}</div>
    </div>
  `;
}

async function main() {
  const res = await fetch("data/myths.json");
  data = await res.json();

  renderLists();

  document.body.addEventListener("click", (e) => {
    const item = e.target.closest(".item");
    if (!item) return;
    const type = item.dataset.type;
    const id = item.dataset.id;
    if (type === "character") showCharacter(id);
    if (type === "story") showStory(id);
  });

  elSearch.addEventListener("input", () => renderLists(elSearch.value));
}

main();
