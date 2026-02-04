/* ===============================
   STORY DETAIL CONTROLLER
================================ */

const params = new URLSearchParams(location.search);
const storyId = params.get("story");

if (!storyId) {
  alert("Thiếu ID truyện");
  history.back();
}

const coverEl  = document.getElementById("storyCover");
const titleEl  = document.getElementById("storyTitle");
const authorEl = document.getElementById("storyAuthor");
const descEl   = document.getElementById("storyDesc");
const tagEl    = document.getElementById("storyTags");
const listEl   = document.getElementById("chapterList");
const btnDesc  = document.getElementById("btnToggleDesc");

let storyData = null;

async function loadStoryDetail() {
  try {
    const res = await fetch(`/data/stories/story-${storyId}.json`);
    if (!res.ok) throw new Error("Story not found");

    storyData = await res.json();
    renderStory();
  } catch (e) {
    alert("Không tải được truyện");
    console.error(e);
  }
}

function renderStory() {
  titleEl.textContent  = storyData.title;
  authorEl.textContent = "✍️ " + storyData.author;

  // cover (nếu có trong index sau này)
  coverEl.src =
    storyData.cover ||
    "https://i.ibb.co/3mY0H4Xh/Chat-GPT-Image-Jan-19-2026-09-44-27-AM.jpg";

  // mô tả (nếu có)
  descEl.textContent =
    storyData.desc || "Chưa có mô tả cho truyện này.";

// tags
tagEl.innerHTML = "";

if (Array.isArray(storyData.tags)) {
  storyData.tags.forEach(t => {
    const span = document.createElement("div");
    span.className = "tag";
    span.textContent = t;
    tagEl.appendChild(span);
  });
}


  // chapters
  listEl.innerHTML = "";

  storyData.chapters.forEach(ch => {
    const item = document.createElement("div");
    item.className = "chapter-item";

    item.innerHTML = `
      <div class="name">Chương ${ch.id}: ${ch.title}</div>
      ${ch.vip ? `<div class="lock">VIP</div>` : ``}
    `;

    if (!ch.vip) {
      item.onclick = () => {
        location.href =
          `/chapter-read.html?story=${storyId}&chapter=${ch.id}`;
      };
    }

    listEl.appendChild(item);
  });
}

// toggle desc
btnDesc.onclick = () => {
  descEl.classList.toggle("collapsed");
  btnDesc.textContent =
    descEl.classList.contains("collapsed")
      ? "Xem thêm"
      : "Thu gọn";
};

loadStoryDetail();
