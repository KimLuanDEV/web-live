const socket = io();
const auth = JSON.parse(localStorage.getItem("user_profile") || {});
const feed = document.getElementById("statusFeed");

// ===== GÁN THÔNG TIN USER =====
stAvatar.src = auth.avatar;
stName.textContent = auth.name;

// ===== STATS =====
let postCount = 0;
let likeCount = 0;
let commentCount = 0;

// ===== INIT FEED =====
socket.on("lp-init", posts => {
  posts.forEach(p => {
    if (p.uid !== auth.uid) return;

    postCount++;
    likeCount += p.likes?.length || 0;
    commentCount += p.comments?.length || 0;

    renderPost(p);
  });

  updateStats();
});

// ===== NEW POST =====
socket.on("lp-post", p => {
  if (p.uid !== auth.uid) return;

  postCount++;
  renderPost(p, true);
  updateStats();
});

// ===== EDIT POST (REALTIME) =====
socket.on("lp-edit-post", ({ postId, text, images }) => {
  const el = document.querySelector(`.lp-post[data-id="${postId}"]`);
  if (!el) return;

  el.querySelector(".lp-post-text").innerHTML =
    text.replace(/\n/g, "<br>");

  const imgWrap = el.querySelector(".lp-post-images");
  if (imgWrap && images) {
    imgWrap.innerHTML = images.map(u => `<img src="${u}">`).join("");
  }
});

// ===== DELETE POST =====
socket.on("lp-delete", ({ postId }) => {
  const el = document.querySelector(`.lp-post[data-id="${postId}"]`);
  if (el) {
    el.remove();
    postCount--;
    updateStats();
  }
});

// ===== RENDER BÀI VIẾT =====
function renderPost(p, top = false) {
  const div = document.createElement("div");
  div.className = "lp-post";
  div.dataset.id = p.id;

  div.innerHTML = `
    <div class="lp-post-inner">
      <div class="lp-post-head">
        <img class="lp-ava" src="${p.avatar}">
        <div>
          <div class="lp-post-name">${p.name}</div>
          <div class="lp-post-time">
            ${new Date(p.time).toLocaleString("vi-VN")}
          </div>
        </div>

        <div class="lp-post-tools">
          <span onclick="editPost('${p.id}')">✏️</span>
          <span onclick="deletePost('${p.id}')">🗑</span>
        </div>
      </div>

      <div class="lp-post-text">
        ${p.text.replace(/\n/g, "<br>")}
      </div>
    </div>
  `;

  top ? feed.prepend(div) : feed.appendChild(div);
}

// ===== UPDATE STATS =====
function updateStats() {
  stPosts.textContent = postCount;
  stLikes.textContent = likeCount;
  stComments.textContent = commentCount;
}



// ===== COVER UPLOAD =====
const coverInput = document.getElementById("coverInput");
const stCover = document.getElementById("stCover");

// load cover đã lưu
const savedCover = localStorage.getItem("user_cover");
if (savedCover) {
  stCover.src = savedCover;
} else {
  stCover.src = "https://i.ibb.co/3mY0H4Xh/Chat-GPT-Image-Jan-19-2026-09-44-27-AM.jpg";
}

// khi chọn ảnh mới
coverInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    resizeCover(ev.target.result, 900, 400, result => {
      stCover.src = result;
      localStorage.setItem("user_cover", result);
    });
  };
  reader.readAsDataURL(file);
});

// resize + crop cover
function resizeCover(src, w, h, cb){
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const scale = Math.max(w / img.width, h / img.height);
    const nw = img.width * scale;
    const nh = img.height * scale;

    ctx.drawImage(
      img,
      (w - nw) / 2,
      (h - nh) / 2,
      nw,
      nh
    );

    cb(canvas.toDataURL("image/jpeg", 0.9));
  };
  img.src = src;
}


// ===== DRAG REPOSITION COVER =====
let isDragging = false;
let startY = 0;
let currentOffsetY = 0;

const savedOffset = localStorage.getItem("cover_offset_y");
if (savedOffset) {
  currentOffsetY = parseFloat(savedOffset);
  stCover.style.transform = `translateY(${currentOffsetY}px)`;
}

// mouse + touch start
stCover.addEventListener("mousedown", startDrag);
stCover.addEventListener("touchstart", startDrag, { passive:false });

function startDrag(e){
  e.preventDefault();
  isDragging = true;
  startY = getY(e);
  document.querySelector(".st-cover").classList.add("dragging");
}

// move
window.addEventListener("mousemove", onDrag);
window.addEventListener("touchmove", onDrag, { passive:false });

function onDrag(e){
  if (!isDragging) return;
  e.preventDefault();

  const delta = getY(e) - startY;
  let newOffset = currentOffsetY + delta;

  // 🔒 GIỚI HẠN KÉO (tránh lố)
  newOffset = Math.max(-120, Math.min(120, newOffset));

  stCover.style.transform = `translateY(${newOffset}px)`;
}

// end
window.addEventListener("mouseup", endDrag);
window.addEventListener("touchend", endDrag);

function endDrag(){
  if (!isDragging) return;
  isDragging = false;

  const transform = stCover.style.transform;
  const match = transform.match(/-?\d+\.?\d*/);
  currentOffsetY = match ? parseFloat(match[0]) : 0;

  localStorage.setItem("cover_offset_y", currentOffsetY);
  document.querySelector(".st-cover").classList.remove("dragging");
}

function getY(e){
  return e.touches ? e.touches[0].clientY : e.clientY;
}
