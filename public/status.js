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
  div.dataset.uid = p.uid; // 🔥 bắt buộc

  const time = new Date(p.time).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  div.innerHTML = `
    <div class="lp-post-inner">

      <!-- HEADER -->
      <div class="lp-post-head">
        <img class="lp-ava" src="${p.avatar}">
        <div>
          <div class="lp-post-name">${p.name}</div>
          <div class="lp-post-time">${time}</div>
        </div>

        ${p.uid === auth.uid ? `
          <div class="lp-post-tools">
            <span class="lp-edit" onclick="editPost('${p.id}')">✏️</span>
            <span class="lp-del" onclick="deletePost('${p.id}')">🗑</span>
          </div>
        ` : ``}
      </div>

      <!-- TEXT -->
      ${p.text ? `
        <div class="lp-post-text">
          ${p.text.replace(/\n/g, "<br>")}
        </div>
      ` : ``}

      <!-- IMAGES (FB STYLE) -->
      ${(p.images && p.images.length) ? `
        <div class="lp-post-images fb-${Math.min(p.images.length, 5)}">
          ${p.images.slice(0,5).map((url, index) => `
            <div class="fb-img img-${index}"
              onclick='openFeedLightbox(${JSON.stringify(p.images)}, ${index})'>
              <img src="${url}">
              ${
                index === 4 && p.images.length > 5
                  ? `<div class="fb-more">+${p.images.length - 5}</div>`
                  : ``
              }
            </div>
          `).join("")}
        </div>
      ` : ``}

      <!-- VIDEO -->
      ${p.video ? `
        <video class="lp-post-video" controls playsinline>
          <source src="${p.video}" type="video/mp4">
        </video>
      ` : ``}

      <!-- ACTIONS -->
      <div class="lp-actions">
        <div class="lp-action like" onclick="likePost('${p.id}')">
          ❤️ <span id="like_${p.id}">${p.likes?.length || 0}</span>
        </div>
        <div class="lp-action" onclick="toggleComments('${p.id}')">
          💬 <span id="c_${p.id}">${p.comments?.length || 0}</span>
        </div>
      </div>

      <!-- COMMENTS -->
      <div class="lp-comments hidden" id="cm_${p.id}">
        <div class="lp-comment-list"></div>

        <div class="lp-comment-box">
          <input id="ci_${p.id}" class="lp-comment-input"
            placeholder="Viết bình luận...">
          <button onclick="sendComment('${p.id}')">➤</button>
        </div>
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


// ===== DRAG REPOSITION COVER + SAVE / CANCEL =====
let isDragging = false;
let startY = 0;

let currentOffsetY = 0;      // offset đang hiển thị
let originalOffsetY = 0;     // offset trước khi kéo

const coverBox = document.querySelector(".st-cover");
const coverActions = document.getElementById("coverActions");
const btnSave = document.getElementById("saveCover");
const btnCancel = document.getElementById("cancelCover");

// load offset đã lưu
const savedOffset = localStorage.getItem("cover_offset_y");
if (savedOffset) {
  currentOffsetY = parseFloat(savedOffset);
  stCover.style.transform = `translateY(${currentOffsetY}px)`;
}

// ===== START DRAG =====
stCover.addEventListener("mousedown", startDrag);
stCover.addEventListener("touchstart", startDrag, { passive:false });

function startDrag(e){
  e.preventDefault();
  isDragging = true;
  startY = getY(e);
  originalOffsetY = currentOffsetY; // lưu để hủy
  coverBox.classList.add("dragging");
  coverActions.classList.add("show");
}

// ===== DRAGGING =====
window.addEventListener("mousemove", onDrag);
window.addEventListener("touchmove", onDrag, { passive:false });

function onDrag(e){
  if (!isDragging) return;
  e.preventDefault();

  const delta = getY(e) - startY;
  let nextOffset = originalOffsetY + delta;

  // giới hạn kéo
  nextOffset = Math.max(-120, Math.min(120, nextOffset));

  currentOffsetY = nextOffset;
  stCover.style.transform = `translateY(${currentOffsetY}px)`;
}

// ===== END DRAG =====
window.addEventListener("mouseup", stopDrag);
window.addEventListener("touchend", stopDrag);

function stopDrag(){
  if (!isDragging) return;
  isDragging = false;
  coverBox.classList.remove("dragging");
}

// ===== SAVE =====
btnSave.onclick = () => {
  localStorage.setItem("cover_offset_y", currentOffsetY);
  coverActions.classList.remove("show");
};

// ===== CANCEL =====
btnCancel.onclick = () => {
  currentOffsetY = originalOffsetY;
  stCover.style.transform = `translateY(${currentOffsetY}px)`;
  coverActions.classList.remove("show");
};

// ===== UTILS =====
function getY(e){
  return e.touches ? e.touches[0].clientY : e.clientY;
}


// ===== MOBILE TAB BAR LOGIC =====
const tabbar = document.querySelector(".mobile-tabbar");
let lastScrollY = window.scrollY;

window.addEventListener("scroll", () => {
  const y = window.scrollY;

  if (y > lastScrollY && y > 80) {
    tabbar.classList.add("hide"); // scroll xuống
  } else {
    tabbar.classList.remove("hide"); // scroll lên
  }

  lastScrollY = y;
});

// click tab
document.querySelectorAll(".lp-tab").forEach(tab => {
  tab.onclick = () => {
    const t = tab.dataset.tab;

    if (t === "social") location.href = "/social.html";
    if (t === "lobby") location.href = "/lobby.html";
    if (t === "messages") location.href = "/messages.html";
    if (t === "profile") location.href = "/status.html";
  };
});


// ===== DELETE POST =====
function deletePost(postId){
  if (!confirm("Xóa bài viết này?")) return;

  socket.emit("lp-delete", {
    postId,
    uid: auth.uid
  });
}


// ===== EDIT POST (BASIC) =====

function editPost(postId){
  const postEl = document.querySelector(`.lp-post[data-id="${postId}"]`);
  if(!postEl) return;


  const oldImages = [...postEl.querySelectorAll(".lp-post-images img")]
  .map(img => img.src);

  const textEl = postEl.querySelector(".lp-post-text");
  const oldText = textEl?.innerText || "";

  const modal = document.createElement("div");
  modal.className = "lp-compose-modal";

  modal.innerHTML = `
    <div class="lp-compose-sheet">
    
      <div class="lp-compose-header">
  <button class="lp-close">✕</button>

  <div class="lp-header-title">Chỉnh sửa bài viết</div>

<button class="lp-submit icon" id="saveEdit" title="Lưu" disabled>
  ✓
</button>

</div>


      <div class="lp-compose-body">
        <textarea id="editText"
          style="width:100%;height:100%;background:transparent;color:#fff;font-size:16px;">${oldText}</textarea>

            <!-- preview ảnh cũ -->
  <div id="editImagePreview" class="lp-preview-grid"></div>

      </div>
    </div>

<!-- footer -->
<div class="lp-compose-footer">
  <label class="lp-tool">
    📷
    <input type="file" id="editImageInput" accept="image/*" multiple hidden>
  </label>
</div>

  `;

  document.body.appendChild(modal);


// ===== EDIT IMAGE LOGIC (PHẢI Ở TRONG editPost) =====
let editImages = [...oldImages]; // string url hoặc { file, preview }

const preview = modal.querySelector("#editImagePreview");
const input = modal.querySelector("#editImageInput");

function renderEditImages(){
  preview.innerHTML = "";

  editImages.forEach((img, index) => {
    const wrap = document.createElement("div");
    wrap.className = "lp-preview-item";

    const src = typeof img === "string" ? img : img.preview;

    wrap.innerHTML = `
      <img src="${src}">
      <button class="lp-preview-remove">✕</button>
    `;

    wrap.querySelector("button").onclick = () => {
      editImages.splice(index, 1);
      renderEditImages();
      checkEditChanged();
    };

    preview.appendChild(wrap);
  });
}

renderEditImages();

input.onchange = () => {
  [...input.files].forEach(file => {
    editImages.push({
      file,
      preview: URL.createObjectURL(file)
    });
  });
  input.value = "";
  renderEditImages();
  checkEditChanged();
};






  const textarea = modal.querySelector("#editText");
const saveBtn  = modal.querySelector("#saveEdit");

const originalText = oldText.trim();

// trạng thái ban đầu
saveBtn.disabled = true;

function checkEditChanged(){
  const textChanged =
    textarea.value.trim() !== originalText;

  const imageChanged =
    editImages.length !== oldImages.length ||
    editImages.some((img, i) => img !== oldImages[i]);

  saveBtn.disabled = !(textChanged || imageChanged);
}

textarea.addEventListener("input", checkEditChanged);



  modal.querySelector(".lp-close").onclick = () => modal.remove();


saveBtn.onclick = async () => {
  if (saveBtn.disabled) return;

  const newText = textarea.value.trim();

  let imageUrls = [];

  for(const img of editImages){
    if(typeof img === "string"){
      imageUrls.push(img); // ảnh cũ
    }else{
      const fd = new FormData();
      fd.append("image", img.file);

      const r = await fetch("/api/upload-post-image", {
        method: "POST",
        body: fd
      });

      const d = await r.json();
      if(d.url) imageUrls.push(d.url);
    }
  }

  socket.emit("lp-edit-post", {
    postId,
    uid: auth.uid,
    text: newText,
    images: imageUrls
  });

  modal.remove();
};


}
