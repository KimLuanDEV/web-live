const socket = io();
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");

const feed = document.getElementById("lpFeed");
const photoGrid = document.getElementById("photoGrid");

let myPosts = [];

/* ===== INIT PROFILE ===== */

// AVATAR (có fallback)
const avatar =
  auth.avatar && auth.avatar.trim()
    ? auth.avatar
    : "/default-avatar.png";

document.getElementById("profileAvatar").src = avatar;
document.getElementById("meAvatar").src = avatar;

// COVER (có fallback)
const cover =
  auth.cover && auth.cover.trim()
    ? auth.cover
    : "/default-cover.jpg";

document.getElementById("profileCover").src = cover;

// TEXT INFO
document.getElementById("profileName").textContent = auth.name || "Người dùng";
document.getElementById("profileBio").textContent =
  auth.bio || "Chưa có giới thiệu";

document.getElementById("aboutName").textContent = auth.name || "—";
document.getElementById("aboutBio").textContent = auth.bio || "—";
document.getElementById("aboutDate").textContent =
  new Date(auth.createdAt || Date.now()).toLocaleDateString("vi-VN");


/* ===== LOAD POSTS ===== */
socket.on("lp-init", list => {
  myPosts = list.filter(p => p.uid === auth.uid);
  renderStats();
  renderPosts();
  renderPhotos();
});

socket.on("lp-post", post => {
  if(post.uid !== auth.uid) return;
  myPosts.unshift(post);
  renderStats();
  renderPosts();
  renderPhotos();
});

/* ===== RENDER ===== */
function renderPosts(){
  feed.innerHTML = "";
  myPosts.forEach(p => renderPost(p, false));
}

function renderPhotos(){
  const images = [];
  myPosts.forEach(p=>{
    if(p.images) images.push(...p.images);
  });

  photoGrid.innerHTML = images.map(src =>
    `<img src="${src}" onclick="openImageLightbox('${src}')">`
  ).join("");
}

function renderStats(){
  document.getElementById("postCount").textContent = myPosts.length;

  const likes = myPosts.reduce((sum,p)=> sum + (p.likes?.length||0), 0);
  document.getElementById("likeCount").textContent = likes;
}

/* ===== TABS ===== */
document.querySelectorAll(".lp-profile-tabs .tab").forEach(tab=>{
  tab.onclick = ()=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");

    ["posts","photos","about"].forEach(id=>{
      document.getElementById("tab-"+id).classList.add("hidden");
    });
    document.getElementById("tab-"+tab.dataset.tab).classList.remove("hidden");
  };
});

/* ===== TAB BAR ===== */
document.querySelectorAll(".lp-tab").forEach(tab=>{
  tab.onclick = ()=>{
    const t = tab.dataset.tab;
    if(t==="social") location.href="/social.html";
    if(t==="lobby") location.href="/lobby.html";
    if(t==="messages") location.href="/messages.html";
    if(t==="profile") location.href="/profile.html";
  };
});

/* ===== COMPOSE ===== */
const postText = document.getElementById("postText");
postText.addEventListener("pointerdown", e=>{
  e.preventDefault();
  location.href="/social.html"; // dùng composer chính
});

/* ===== EDIT PROFILE (PLACEHOLDER) ===== */
function openEditProfile(){
  alert("Sắp có: chỉnh avatar / bio / cover");
}


/* ===== UPLOAD AVATAR ===== */
function uploadAvatar(){
  document.getElementById("avatarInput").click();
}

document.getElementById("avatarInput").addEventListener("change", async e=>{
  const file = e.target.files[0];
  if(!file) return;

  const fd = new FormData();
  fd.append("avatar", file);

  const r = await fetch("/api/upload-avatar", {
    method:"POST",
    body: fd
  });

  const data = await r.json();
  if(!data.url) return;

  // update local
  auth.avatar = data.url;
  localStorage.setItem("user_profile", JSON.stringify(auth));

  // update UI
  document.getElementById("profileAvatar").src = data.url;
  document.getElementById("meAvatar").src = data.url;

  // realtime sync
  socket.emit("profile-update", {
    uid: auth.uid,
    avatar: data.url
  });
});


/* ===== UPLOAD COVER ===== */
function uploadCover(){
  document.getElementById("coverInput").click();
}

document.getElementById("coverInput").addEventListener("change", async e=>{
  const file = e.target.files[0];
  if(!file) return;

  const fd = new FormData();
  fd.append("cover", file);

  const r = await fetch("/api/upload-cover", {
    method:"POST",
    body: fd
  });

  const data = await r.json();
  if(!data.url) return;

  auth.cover = data.url;
  localStorage.setItem("user_profile", JSON.stringify(auth));

  document.getElementById("profileCover").src = data.url;

  socket.emit("profile-update", {
    uid: auth.uid,
    cover: data.url
  });
});
