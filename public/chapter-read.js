/* ===============================
   CHAPTER READ CONTROLLER
================================ */

// ===== PARAMS =====
const params = new URLSearchParams(location.search);
const storyId   = params.get("story") || "1";
const chapterId = Number(params.get("chapter") || "1");

let totalChapters = 1;

// ===== ELEMENTS =====
const reader = document.getElementById("reader");
const titleEl = document.getElementById("chapterTitle");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

// ===============================
// 📥 LOAD STORY JSON
// ===============================
let storyData = null;

async function loadStory() {
  try {
    const res = await fetch(`/data/stories/story-${storyId}.json`);
    if (!res.ok) throw new Error("Story not found");

    storyData = await res.json();
    totalChapters = storyData.chapters.length;

    renderChapter();
    updateNav();
  } catch (e) {
    reader.innerHTML = "<p>❌ Không tải được nội dung truyện</p>";
    console.error(e);
  }
}

// ===============================
// 🧾 RENDER CHAPTER
// ===============================
function renderChapter() {
  if (!storyData) return;

  const chapter = storyData.chapters.find(c => c.id === chapterId);

  if (!chapter) {
    reader.innerHTML = "<p>❌ Không tìm thấy chương</p>";
    return;
  }

  // TITLE
  titleEl.textContent = `Chương ${chapter.id}: ${chapter.title}`;

  // CONTENT
  reader.innerHTML = "";

  chapter.content.forEach(text => {
    const p = document.createElement("p");
    p.textContent = text;
    reader.appendChild(p);
  });

  const footer = document.createElement("div");
  footer.className = "reader-footer";
  footer.textContent = "— Hết chương —";
  reader.appendChild(footer);
}

// ===============================
// ⬅️ ➡️ UPDATE NAV
// ===============================
function updateNav() {
  btnPrev.disabled = chapterId <= 1;
  btnNext.disabled = chapterId >= totalChapters;
}

btnPrev.addEventListener("click", () => {
  if (chapterId > 1) jumpTo(chapterId - 1);
});

btnNext.addEventListener("click", () => {
  if (chapterId < totalChapters) jumpTo(chapterId + 1);
});

function jumpTo(ch) {
  localStorage.removeItem(`read_pos_${storyId}_${ch}`);
  location.href = `/chapter-read.html?story=${storyId}&chapter=${ch}`;
}

// ===============================
// 📌 SCROLL POSITION (REMEMBER)
// ===============================
const SCROLL_KEY = `read_pos_${storyId}_${chapterId}`;

const savedScroll = localStorage.getItem(SCROLL_KEY);
if (savedScroll) {
  requestAnimationFrame(() => {
    window.scrollTo(0, Number(savedScroll));
  });
}

let scrollTimer;
window.addEventListener("scroll", () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    localStorage.setItem(SCROLL_KEY, window.scrollY);
  }, 200);
});

// ===============================
// 🔠 FONT SIZE
// ===============================
let fontSize =
  Number(localStorage.getItem("reader_font")) || 18;

function applyFont() {
  reader.style.fontSize = fontSize + "px";
  localStorage.setItem("reader_font", fontSize);
}
applyFont();

document.querySelector(".reader-toolbar button:nth-child(1)")
  ?.addEventListener("click", () => changeFont(-1));

document.querySelector(".reader-toolbar button:nth-child(2)")
  ?.addEventListener("click", () => changeFont(1));

function changeFont(step) {
  fontSize = Math.min(26, Math.max(14, fontSize + step));
  applyFont();
}

// ===============================
// 🌙 THEME
// ===============================
function setTheme(theme) {
  document.body.classList.remove("theme-dark", "theme-sepia");
  document.body.classList.add("theme-" + theme);
  localStorage.setItem("reader_theme", theme);
}

document.querySelector(".reader-toolbar button:nth-child(3)")
  ?.addEventListener("click", () => setTheme("dark"));

document.querySelector(".reader-toolbar button:nth-child(4)")
  ?.addEventListener("click", () => setTheme("sepia"));

const savedTheme =
  localStorage.getItem("reader_theme") || "dark";
setTheme(savedTheme);

// ===============================
// 🚀 INIT
// ===============================
loadStory();
