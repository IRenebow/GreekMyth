function getStoryId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function p(text) {
  const el = document.createElement("p");
  el.textContent = text;
  return el;
}

async function main() {
  const id = getStoryId();
  if (!id) {
    document.getElementById("storyTitle").textContent = "Story not found";
    return;
  }

  const res = await fetch("data/stories.json");
  const stories = await res.json();

  const s = stories[id];
  if (!s) {
    document.getElementById("storyTitle").textContent = `Unknown story: ${id}`;
    return;
  }

  document.title = s.title ?? id;
  document.getElementById("storyTitle").textContent = s.title ?? id;
  document.getElementById("summary").textContent = s.summary ?? "";

  // Events as paragraphs
  const eventsEl = document.getElementById("events");
  eventsEl.innerHTML = "";
  (s.events ?? []).forEach(e => {
    eventsEl.appendChild(p(e));
  });

  // Characters remain as a list
  const charsEl = document.getElementById("characters");
  charsEl.innerHTML = "";
  (s.characters ?? []).forEach(cid => {
    const item = document.createElement("li");
    const a = document.createElement("a");
    a.href = `character.html?id=${encodeURIComponent(cid)}`;
    a.textContent = cid;
    item.appendChild(a);
    charsEl.appendChild(item);
  });
}

main();
