const $ = (id) => document.getElementById(id);

const roomInput = $("roomInput");
const enterBtn = $("enterBtn");
const main = $("main");
const roomTitle = $("roomTitle");
const roomMeta = $("roomMeta");

const authorInput = $("authorInput");
const contentInput = $("contentInput");
const tagInput = $("tagInput");
const imgUrlInput = $("imgUrlInput");
const postBtn = $("postBtn");

const searchInput = $("searchInput");
const sortSelect = $("sortSelect");

const list = $("list");
const empty = $("empty");
const exportBtn = $("exportBtn");

let currentRoom = null;

function storageKey(room) {
  return `couple_notes_room_${room}`;
}

function loadPosts(room) {
  const raw = localStorage.getItem(storageKey(room));
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function savePosts(room, posts) {
  localStorage.setItem(storageKey(room), JSON.stringify(posts));
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function render() {
  if (!currentRoom) return;
  const posts = loadPosts(currentRoom);

  const q = searchInput.value.trim().toLowerCase();
  let filtered = posts.filter(p => {
    if (!q) return true;
    return (
      (p.author || "").toLowerCase().includes(q) ||
      (p.content || "").toLowerCase().includes(q) ||
      (p.tag || "").toLowerCase().includes(q)
    );
  });

  filtered.sort((a,b) => sortSelect.value === "new" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);

  list.innerHTML = "";
  empty.classList.toggle("hidden", filtered.length !== 0);

  for (const p of filtered) {
    const li = document.createElement("li");
    li.className = "item";

    li.innerHTML = `
      <div class="meta">
        <div>
          <strong>${escapeHtml(p.author || "匿名")}</strong>
          ${p.tag ? `<span class="badge">#${escapeHtml(p.tag)}</span>` : ""}
        </div>
        <div>${formatTime(p.createdAt)}</div>
      </div>
      <div class="content">${escapeHtml(p.content || "")}</div>
      ${p.imgUrl ? `<img src="${escapeAttr(p.imgUrl)}" alt="image" loading="lazy" />` : ""}
      <div class="actions">
        <button class="ghost" data-action="copy" data-id="${p.id}">复制</button>
        <button class="danger" data-action="delete" data-id="${p.id}">删除</button>
      </div>
    `;

    li.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === "delete") {
        const next = posts.filter(x => x.id !== id);
        savePosts(currentRoom, next);
        render();
      }
      if (action === "copy") {
        const target = posts.find(x => x.id === id);
        if (!target) return;
        navigator.clipboard?.writeText(`${target.author || ""}：${target.content || ""}`); // best effort
        btn.textContent = "已复制";
        setTimeout(() => (btn.textContent = "复制"), 900);
      }
    });

    list.appendChild(li);
  }

  roomMeta.textContent = `共 ${posts.length} 条记录（本地存储）。`;
}

function enterRoom() {
  const room = roomInput.value.trim();
  if (!room) return;
  currentRoom = room;
  main.classList.remove("hidden");
  roomTitle.textContent = `空间：${room}`;
  render();
}

function post() {
  if (!currentRoom) return;
  const content = contentInput.value.trim();
  if (!content) return;

  const posts = loadPosts(currentRoom);
  const p = {
    id: uid(),
    author: authorInput.value.trim(),
    content,
    tag: tagInput.value.trim(),
    imgUrl: imgUrlInput.value.trim(),
    createdAt: Date.now()
  };
  posts.push(p);
  savePosts(currentRoom, posts);

  contentInput.value = "";
  tagInput.value = "";
  imgUrlInput.value = "";
  render();
}

function exportJson() {
  if (!currentRoom) return;
  const posts = loadPosts(currentRoom);
  const blob = new Blob([JSON.stringify({ room: currentRoom, posts }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `couple-notes-${currentRoom}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}
function escapeAttr(s) {
  // for src attribute minimal escaping
  return (s || "").replace(/"/g, "%22");
}

enterBtn.addEventListener("click", enterRoom);
roomInput.addEventListener("keydown", (e) => { if (e.key === "Enter") enterRoom(); });

postBtn.addEventListener("click", post);
contentInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") post();
});

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);
exportBtn.addEventListener("click", exportJson);
