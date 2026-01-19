const socket = io();
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
const feed = document.getElementById("profileFeed");

profileAvatar.src = auth.avatar;
profileName.textContent = auth.name;

// ===== INIT: chỉ lấy bài của mình =====
socket.on("lp-init", list => {
  list
    .filter(p => p.uid === auth.uid)
    .forEach(p => renderPostProfile(p));
});

// ===== NEW POST (nếu user đăng từ nơi khác) =====
socket.on("lp-post", post => {
  if (post.uid === auth.uid) {
    renderPostProfile(post, true);
  }
});

// ===== EDIT POST (đồng bộ realtime) =====
socket.on("lp-edit-post", ({ postId, text, images }) => {
  const el = document.querySelector(`.lp-post[data-id="${postId}"]`);
  if (!el) return;

  el.querySelector(".lp-post-text").innerHTML =
    text.replace(/\n/g, "<br>");

  const imgWrap = el.querySelector(".lp-post-images");
  if (imgWrap) {
    imgWrap.innerHTML = images.map(u => `<img src="${u}">`).join("");
  }
});

// ===== DELETE POST =====
socket.on("lp-delete", ({ postId }) => {
  const el = document.querySelector(`.lp-post[data-id="${postId}"]`);
  if (el) el.remove();
});

// ===== RENDER =====
function renderPostProfile(p, top=false){
  const div = document.createElement("div");
  div.className = "lp-post";
  div.dataset.id = p.id;
  div.dataset.uid = p.uid;

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

      <div class="lp-post-text">${p.text.replace(/\n/g,"<br>")}</div>
    </div>
  `;

  if (top) feed.prepend(div);
  else feed.appendChild(div);
}
