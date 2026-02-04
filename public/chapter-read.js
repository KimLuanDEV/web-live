/* ===============================
   CHAPTER READ CONTROLLER
================================ */

// ===== PARAMS =====
const params = new URLSearchParams(location.search);
const storyId   = params.get("story") || "1";
const chapterId = Number(params.get("chapter") || "1");
const totalChapters = 10; // TODO: load từ server

// ===== ELEMENTS =====
const reader = document.getElementById("reader");
const titleEl = document.getElementById("chapterTitle");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

// ===== TITLE =====
titleEl.textContent = `Chương ${chapterId}: Gặp gỡ`;

// ===============================
// 📌 SCROLL POSITION (REMEMBER)
// ===============================
const SCROLL_KEY = `read_pos_${storyId}_${chapterId}`;

// restore
const savedScroll = localStorage.getItem(SCROLL_KEY);
if (savedScroll) {
  requestAnimationFrame(() => {
    window.scrollTo(0, Number(savedScroll));
  });
}

// save (debounce)
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
// ⬅️ ➡️ CHAPTER NAV
// ===============================
if (chapterId <= 1) btnPrev.disabled = true;
if (chapterId >= totalChapters) btnNext.disabled = true;

btnPrev.addEventListener("click", () => {
  if (chapterId > 1) jumpTo(chapterId - 1);
});

btnNext.addEventListener("click", () => {
  if (chapterId < totalChapters) jumpTo(chapterId + 1);
});

function jumpTo(ch) {
  // clear scroll vị trí chương mới
  localStorage.removeItem(`read_pos_${storyId}_${ch}`);

  location.href =
    `/chapter-read.html?story=${storyId}&chapter=${ch}`;
}
