function getCharacterId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function li(text) {
  const el = document.createElement("li");
  el.textContent = text;
  return el;
}

async function main() {
  const id = getCharacterId();
  if (!id) {
    document.getElementById("name").textContent = "Character not found";
    return;
  }

  const res = await fetch("data/characters.json");
  const characters = await res.json();

  const c = characters[id];
  if (!c) {
    document.getElementById("name").textContent = `Unknown character: ${id}`;
    return;
  }
  const portrait = document.getElementById("portrait");

    if (c.img) {
      portrait.src = c.img;
      portrait.alt = c.name ? `${c.name} portrait` : "Character portrait";
      portrait.style.display = "";
    } else {
      // hide the <img> if no picture provided
      portrait.style.display = "none";
    }


  document.title = c.name;
  document.getElementById("name").textContent = c.name;
  document.getElementById("title").textContent = c.title ?? "";
  document.getElementById("bio").textContent = c.bio ?? "";

  const domains = document.getElementById("domains");
  domains.innerHTML = "";
  (c.domains ?? []).forEach(x => domains.appendChild(li(x)));

  const symbols = document.getElementById("symbols");
  symbols.innerHTML = "";
  (c.symbols ?? []).forEach(x => symbols.appendChild(li(x)));

  const stories = document.getElementById("stories");
  stories.innerHTML = "";
  (c.stories ?? []).forEach(st => {
      const item = document.createElement("li");
      const a = document.createElement("a");
      a.href = `story.html?id=${encodeURIComponent(st)}`;
      a.textContent = st;
      item.appendChild(a);
      stories.appendChild(item);
    });

}

main();
