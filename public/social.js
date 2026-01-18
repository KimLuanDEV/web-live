const socket = io();
const feed = document.getElementById("lpFeed");
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");


let composeImages = []; // 🔥 danh sách ảnh đang preview
let isPosting = false;


if (auth.uid) {
  socket.emit("auth-login", { uid: auth.uid });

  // keep-alive mỗi 20s để không bị rớt online
  setInterval(() => {
    socket.emit("auth-ping", { uid: auth.uid });
  }, 20000);
}


document.getElementById("meAvatar").src = auth.avatar;




socket.on("profile-update", data => {
  const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");

  if (data.avatar) {
    auth.avatar = data.avatar;
    localStorage.setItem("user_profile", JSON.stringify(auth));

    // update avatar góc đăng bài
    const me = document.getElementById("meAvatar");
    if (me) me.src = data.avatar;

    // 🔥 UPDATE TOÀN BỘ FEED CŨ
    document.querySelectorAll(".lp-post").forEach(post => {

      if (post.dataset.uid === auth.uid) {
    const ava = post.querySelector(".lp-ava");
    if (ava) ava.src = data.avatar;
  }

  post.querySelectorAll(".lp-comment").forEach(c => {
    if (c.dataset.uid === auth.uid) {
      const img = c.querySelector(".lp-cm-ava");
      if (img) img.src = data.avatar;
    }
  });

  post.querySelectorAll(".lp-reply").forEach(r => {
    if (r.dataset.uid === auth.uid) {
      const img = r.querySelector("img");
      if (img) img.src = data.avatar;
    }
  });

 

    });
  }

  if (data.name) {
    auth.name = data.name;
    localStorage.setItem("user_profile", JSON.stringify(auth));
  }
});


function openReplyChild(postId, cIndex, replyId){
  const box = document.getElementById(`rp2_${replyId}`);
  if(!box) return;

  // nếu đã có input → chỉ toggle input, KHÔNG xoá reply cũ
  const exist = box.querySelector(".lp-reply-box");
  if(exist){
    exist.remove();
    return;
  }

  const div = document.createElement("div");
  div.className = "lp-reply-box";
  div.innerHTML = `
    <input id="ri2_${replyId}" placeholder="Trả lời...">
    <button onclick="sendReplyChild('${postId}',${cIndex},'${replyId}')">➤</button>
  `;

  box.appendChild(div);
}



function sendReplyChild(postId, cIndex, replyId){
  const input = document.getElementById(`ri2_${replyId}`);
  if(!input || !input.value.trim()) return;

  socket.emit("lp-reply-child",{
    postId,
    commentIndex: cIndex,
    replyId,
    uid: auth.uid,
    name: auth.name,
    avatar: auth.avatar,
    text: input.value
  });

  // clear text
  input.value = "";

  // 🔥 đóng box trả lời cấp 2
  const box = document.getElementById(`rp2_${replyId}`);
  if(box){
    const inputBox = box.querySelector(".lp-reply-box");
    if(inputBox) inputBox.remove();
  }
}



function likeReply(postId, cIndex, replyId){
  socket.emit("lp-like-reply",{
    postId,
    commentIndex:cIndex,
    replyId,
    uid:auth.uid
  });
}

socket.on("lp-like-reply", ({ postId, commentIndex, replyId, likes })=>{
  const el = document.getElementById(`rl_${postId}_${commentIndex}_${replyId}`);

  if(el) el.textContent = likes;
});


function isPostOwner(postId){
  const el = document.querySelector(`.lp-post[data-id="${postId}"]`);
  return el && el.querySelector(".lp-del"); // có nút xóa bài => là chủ bài
}


function likePost(id){
  socket.emit("lp-like", {
    postId:id,
    uid: auth.uid
  });
}

socket.on("lp-like", ({ postId, likes })=>{
  const el = document.getElementById("like_"+postId);
  if(el) el.textContent = likes;
});

function toggleComments(id){
  document.getElementById("cm_"+id).classList.toggle("hidden");
}

function sendComment(id){
  const input = document.getElementById("ci_"+id);
  const text = input.value.trim();
  if(!text) return;

  socket.emit("lp-comment", {
    postId:id,
    uid:auth.uid,
    name:auth.name,
    avatar:auth.avatar,
    text
  });

  input.value="";
}


function openReply(postId, index){
  const box = document.getElementById(`rp_${postId}_${index}`);
  if(!box) return;

  // nếu đã có input thì toggle (đóng)
  const exist = box.querySelector(".lp-reply-box");
  if(exist){
    exist.remove();
    return;
  }

  // tạo input riêng, KHÔNG đụng reply cũ
  const div = document.createElement("div");
  div.className = "lp-reply-box";
  div.innerHTML = `
    <input id="ri_${postId}_${index}" placeholder="Trả lời...">
    <button onclick="sendReply('${postId}',${index})">➤</button>
  `;

  box.appendChild(div);
}


function sendReply(postId, index){
  const input = document.getElementById(`ri_${postId}_${index}`);
  const text = input.value.trim();
  if(!text) return;

  socket.emit("lp-reply",{
    postId,
    commentIndex:index,
    uid:auth.uid,
    name:auth.name,
    avatar:auth.avatar,
    text
  });

  // clear input
input.value="";

// 🔥 chỉ xóa input box, không xóa replies
const box = document.getElementById(`rp_${postId}_${index}`);
if(box){
  const inputBox = box.querySelector(".lp-reply-box");
  if(inputBox) inputBox.remove();
}


}


function deleteComment(postId, index){
  if(!confirm("Xóa bình luận này?")) return;

  socket.emit("lp-delete-comment", {
    postId,
    index,
    uid: auth.uid
  });
}

function likeComment(postId, index){
  socket.emit("lp-like-comment",{
    postId,
    index,
    uid: auth.uid
  });
}


function deleteReply(postId, cIndex, replyId){
  if(!confirm("Xóa trả lời này?")) return;

  socket.emit("lp-delete-reply",{
    postId,
    commentIndex:cIndex,
    replyId,
    uid:auth.uid
  });
}


function deleteReplyChild(postId, cIndex, replyId, childId){
  if(!confirm("Xóa trả lời này?")) return;

  socket.emit("lp-delete-reply-child",{
    postId,
    commentIndex:cIndex,
    replyId,
    childId,
    uid: auth.uid
  });
}


function likeReplyChild(postId, cIndex, replyId, childId){
  socket.emit("lp-like-reply-child",{
    postId,
    commentIndex: cIndex,
    replyId,
    childId,
    uid: auth.uid
  });
}


socket.on("social-name-sync", ({ uid, name }) => {
  document.querySelectorAll(".lp-post").forEach(post => {
    if (post.dataset.uid === uid) {
      const el = post.querySelector(".lp-post-name");
      if (el) el.textContent = name;
    }

    post.querySelectorAll(".lp-comment").forEach(c => {
      if (c.dataset.uid === uid) {
        const el = c.querySelector(".lp-cm-name");
        if (el) el.textContent = name;
      }
    });

    post.querySelectorAll(".lp-reply").forEach(r => {
      if (r.dataset.uid === uid) {
        const el = r.querySelector("b");
        if (el) el.textContent = name;
      }
    });
  });
});


socket.on("social-avatar-sync", ({ uid, avatar }) => {
  document.querySelectorAll(".lp-post").forEach(post => {
    if (post.dataset.uid === uid) {
      const img = post.querySelector(".lp-ava");
      if (img) img.src = avatar;
    }

    post.querySelectorAll(".lp-comment").forEach(c => {
      if (c.dataset.uid === uid) {
        const img = c.querySelector(".lp-cm-ava");
        if (img) img.src = avatar;
      }
    });

    post.querySelectorAll(".lp-reply").forEach(r => {
      if (r.dataset.uid === uid) {
        const img = r.querySelector("img");
        if (img) img.src = avatar;
      }
    });
  });
});


socket.on("lp-like-reply-child", ({ postId, commentIndex, replyId, childId, likes })=>{
  const el = document.getElementById(`rcl_${postId}_${commentIndex}_${replyId}_${childId}`);
  if(el) el.textContent = likes;
});



socket.on("lp-delete-reply-child", ({ replyId, childId })=>{
  const el = document.querySelector(`#rp2_${replyId} .lp-reply[data-id="${childId}"]`);
  if(el) el.remove();
});



socket.on("lp-delete-reply", ({ postId, commentIndex, replyId })=>{
  const el = document.querySelector(`#rp_${postId}_${commentIndex} .lp-reply[data-id="${replyId}"]`);
  if(el) el.remove();
});



socket.on("lp-delete-comment", ({ postId, index })=>{
  const wrap = document.getElementById("cm_"+postId);
  if(!wrap) return;

  const list = wrap.querySelector(".lp-comment-list");
  if(!list) return;

  const el = list.children[index];
  if(el) el.remove();

  // 🔥 TRỪ SỐ COMMENT
  const countEl = document.getElementById("c_"+postId);
  if(countEl){
    const cur = Number(countEl.textContent || 0);
    countEl.textContent = Math.max(0, cur - 1);
  }

  // 🔥 CẬP NHẬT LẠI INDEX ĐỂ KHÔNG LỆCH
  [...list.children].forEach((c,i)=>{
    c.dataset.index = i;
    const replyBtn = c.querySelector(".lp-cm-actions span");
    if(replyBtn) replyBtn.setAttribute("onclick", `openReply('${postId}',${i})`);

    const del = c.querySelector(".cm-del");
    if(del) del.setAttribute("onclick", `deleteComment('${postId}',${i})`);

    const like = c.querySelector(".cm-like b");
    if(like) like.id = `cl_${postId}_${i}`;

  });

});


socket.on("lp-like-comment", ({ postId, index, likes })=>{
  const el = document.getElementById(`cl_${postId}_${index}`);
  if(el) el.textContent = likes;
});


socket.on("lp-reply", ({ postId, commentIndex, reply })=>{
  const box = document.getElementById(`rp_${postId}_${commentIndex}`);
  if(!box) return;

  const div = document.createElement("div");
  div.className="lp-reply";
  div.dataset.id = reply.id;   // 🔥 bắt buộc

div.innerHTML=`
  <img src="${reply.avatar}">
  <div>
    <b>${reply.name}</b> ${reply.text}

   <div class="lp-cm-actions">
  <span class="cm-like" onclick="likeReply('${postId}',${commentIndex},'${reply.id}')">
    ❤️ <b id="rl_${postId}_${commentIndex}_${reply.id}">${reply.likes?.length||0}</b>
  </span>
  <span onclick="openReplyChild('${postId}',${commentIndex},'${reply.id}')">💬</span>
  ${(reply.uid === auth.uid || isPostOwner('${postId}')) ? 
    `<span class="cm-del" onclick="deleteReply('${postId}',${commentIndex},'${reply.id}')">🗑</span>` : ``}
</div>



    <div class="lp-replies" id="rp2_${reply.id}"></div>
  </div>
`;



  box.appendChild(div);
});


socket.on("lp-comment", ({ postId, postOwnerUid, comment, count })=>{

  const countEl = document.getElementById("c_"+postId);
  if(countEl) countEl.textContent = count;

  const list = document.querySelector(`#cm_${postId} .lp-comment-list`);
  if(!list) return;

  const idx = list.children.length;   // 🔥 tạo index đúng

  const div = document.createElement("div");
  div.className = "lp-comment";
  div.dataset.index = idx;

  div.innerHTML = `
    <img class="lp-cm-ava" src="${comment.avatar}">
    <div class="lp-cm-body">
      <div class="lp-cm-name">${comment.name}</div>
      <div class="lp-cm-text">${comment.text}</div>

<div class="lp-cm-actions">
  <span class="cm-like" onclick="likeComment('${postId}',${idx})">
    ❤️ <b id="cl_${postId}_${idx}">${comment.likes?.length || 0}</b>
  </span>
  <span onclick="openReply('${postId}',${idx})">💬</span>
  ${(comment.uid === auth.uid || postOwnerUid === auth.uid) ? `<span class="cm-del" onclick="deleteComment('${postId}',${idx})">🗑</span>` : ``}
</div>





      <div class="lp-replies" id="rp_${postId}_${idx}"></div>
    </div>
  `;

  list.appendChild(div);
});


async function submitPost(){
  const text = postText.value.trim();
  const imageFiles = [...postImage.files];
  const videoFile = postVideo.files[0];

  if(!text && imageFiles.length === 0 && !videoFile) return;

  let imageUrls = [];
  let videoUrl = "";

  // 🔥 UPLOAD NHIỀU ẢNH
  for(const file of imageFiles){
    const fd = new FormData();
    fd.append("image", file);

    const r = await fetch("/api/upload-post-image", {
      method: "POST",
      body: fd
    });

    const data = await r.json();
    if(data.url) imageUrls.push(data.url);
  }

  // upload video (giữ nguyên)
  if(videoFile){
    const fd = new FormData();
    fd.append("video", videoFile);
    const r = await fetch("/api/upload-post-video", {
      method:"POST",
      body:fd
    });
    const data = await r.json();
    videoUrl = data.url;
  }

  const cur = JSON.parse(localStorage.getItem("user_profile"));

  socket.emit("lp-post", {
    uid: cur.uid,
    name: cur.name,
    avatar: cur.avatar,
    text,
    images: imageUrls,   // 🔥 MẢNG ẢNH
    video: videoUrl,
    time: Date.now()
  });

  // reset
  postText.value="";
  postImage.value="";
  postVideo.value="";

  clearComposeMedia(); // 🔥 đảm bảo preview luôn sạch

  return true;
}





socket.on("lp-init", list=>{
  list.forEach(p=>renderPost(p,false));
});


socket.on("lp-post", post=>{
  renderPost(post,true);
});


socket.on("lp-reply-child", ({ postId, commentIndex, replyId, child })=>{
  const box = document.getElementById(`rp2_${replyId}`);
  if(!box) return;

 const div = document.createElement("div");
div.className="lp-reply";
div.dataset.id = child.id;   // 🔥 bắt buộc
div.style.marginLeft="16px";

div.innerHTML = `
  <img src="${child.avatar}">
  <div>
    <b>${child.name}</b> ${child.text}

    <div class="lp-cm-actions">
      <span class="cm-like"
        onclick="likeReplyChild('${postId}',${commentIndex},'${replyId}','${child.id}')">
        ❤️ <b id="rcl_${postId}_${commentIndex}_${replyId}_${child.id}">
          ${child.likes?.length || 0}
        </b>
      </span>

      ${(child.uid === auth.uid || isPostOwner(postId)) ?
        `<span class="cm-del"
          onclick="deleteReplyChild('${postId}',${commentIndex},'${replyId}','${child.id}')">🗑</span>` : ``}
    </div>
  </div>
`;


  


  box.appendChild(div);
});


function deletePost(id){
  if(!confirm("Xóa bài viết này?")) return;

  socket.emit("lp-delete", {
    postId: id,
    uid: auth.uid
  });
}

socket.on("lp-delete", ({ postId })=>{
  const el = document.querySelector(`.lp-post[data-id="${postId}"]`);
  if(el) el.remove();
});


function renderPost(p, top=false){
  const div = document.createElement("div");
  div.className="lp-post";
  div.dataset.id = p.id;
  div.dataset.uid = p.uid;   // 🔥 rất quan trọng

  const time = new Date(p.time).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"});

 div.innerHTML=`

 <div class="lp-post-inner">

<div class="lp-post-head">
  <img class="lp-ava" src="${p.avatar}">
  <div>
    <div class="lp-post-name">${p.name}</div>
    <div class="lp-post-time">${time}</div>
  </div>
  ${p.uid === auth.uid ? `<div class="lp-del" onclick="deletePost('${p.id}')">🗑</div>` : ``}
</div>


<div class="lp-post-text">${p.text.replace(/\n/g, "<br>")}</div>


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



  ` :
  (p.image ? `<img class="lp-post-img" src="${p.image}">` : "")
}



${p.video ? `
<video class="lp-post-video" controls playsinline>
  <source src="${p.video}" type="video/mp4">
</video>` : ""}



<div class="lp-actions">
  <div class="lp-action like" onclick="likePost('${p.id}')">
    ❤️ <span id="like_${p.id}">${p.likes?.length||0}</span>
  </div>
  <div class="lp-action" onclick="toggleComments('${p.id}')">
    💬 <span id="c_${p.id}">${p.comments?.length||0}</span>
  </div>
</div>

<div class="lp-comments hidden" id="cm_${p.id}">
  <div class="lp-comment-list"></div>

  <div class="lp-comment-box">
  <input id="ci_${p.id}" class="lp-comment-input" placeholder="Viết bình luận...">
  <button class="lp-comment-send" onclick="sendComment('${p.id}')">➤</button>
</div>
</div>

 </div>
`;


  if(top) feed.prepend(div);
  else feed.appendChild(div);

  // 🔥 Render lại comment đã có (khi reload)
if(p.comments && p.comments.length){
  const list = div.querySelector(".lp-comment-list");

  p.comments.forEach((comment, idx)=>{
    const c = document.createElement("div");
    c.className="lp-comment";
    c.dataset.index = idx;
    c.dataset.uid = comment.uid;

    c.innerHTML = `
      <img class="lp-cm-ava" src="${comment.avatar}">
      <div class="lp-cm-body">
        <div class="lp-cm-name">${comment.name}</div>
        <div class="lp-cm-text">${comment.text}</div>

<div class="lp-cm-actions">
  <span class="cm-like" onclick="likeComment('${p.id}',${idx})">
    ❤️ <b id="cl_${p.id}_${idx}">${comment.likes?.length || 0}</b>
  </span>
  <span onclick="openReply('${p.id}',${idx})">💬</span>
  ${(comment.uid === auth.uid || p.uid === auth.uid) ? `<span class="cm-del" onclick="deleteComment('${p.id}',${idx})">🗑</span>` : ``}
</div>



        <div class="lp-replies" id="rp_${p.id}_${idx}"></div>
      </div>
    `;

    list.appendChild(c);

    // 🔥 render replies nếu có
    if(comment.replies){
      const box = c.querySelector(".lp-replies");
      comment.replies.forEach(r=>{
        const rdiv = document.createElement("div");
        rdiv.className="lp-reply";
        rdiv.dataset.id = r.id;   // 🔥 bắt buộc
        rdiv.dataset.uid = r.uid;


     rdiv.innerHTML=`
  <img src="${r.avatar}">
  <div>
    <b>${r.name}</b> ${r.text}

<div class="lp-cm-actions">
  <span class="cm-like" onclick="likeReply('${p.id}',${idx},'${r.id}')">
    ❤️ <b id="rl_${p.id}_${idx}_${r.id}">${r.likes?.length||0}</b>
  </span>
  <span onclick="openReplyChild('${p.id}',${idx},'${r.id}')">💬</span>
  ${(r.uid === auth.uid || p.uid === auth.uid) ? 
    `<span class="cm-del" onclick="deleteReply('${p.id}',${idx},'${r.id}')">🗑</span>` : ``}
</div>



    <div class="lp-replies" id="rp2_${r.id}"></div>
  </div>
`;

        box.appendChild(rdiv);

        // 🔥 render reply-of-reply (cấp 2)
if(r.replies){
  const box2 = rdiv.querySelector(`#rp2_${r.id}`);

 r.replies.forEach(child=>{
  const c2 = document.createElement("div");
  c2.className="lp-reply";
  c2.dataset.id = child.id;   // 🔥 bắt buộc
  c2.dataset.uid = child.uid;

  c2.style.marginLeft="16px";

  c2.innerHTML = `
  <img src="${child.avatar}">
  <div>
    <b>${child.name}</b> ${child.text}

    <div class="lp-cm-actions">
      <span class="cm-like"
        onclick="likeReplyChild('${p.id}',${idx},'${r.id}','${child.id}')">
        ❤️ <b id="rcl_${p.id}_${idx}_${r.id}_${child.id}">
          ${child.likes?.length || 0}
        </b>
      </span>

      ${(child.uid === auth.uid || p.uid === auth.uid) ?
        `<span class="cm-del"
          onclick="deleteReplyChild('${p.id}',${idx},'${r.id}','${child.id}')">🗑</span>` : ``}
    </div>
  </div>
`;


  box2.appendChild(c2);
});
}

      });
    }
  });
}
}

document.querySelectorAll(".lp-tab").forEach(t=>t.classList.remove("active"));
document.querySelector('.lp-tab[data-tab="social"]').classList.add("active");

document.querySelectorAll(".lp-tab").forEach(tab=>{
  tab.onclick = ()=>{
    const t = tab.dataset.tab;

    if(t === "social") location.href="/social.html";
    if(t === "lobby") location.href="/lobby.html";
    if(t === "messages") location.href="/messages.html";
    if(t === "profile") location.href="/profile.html";
  };
});


socket.on("inbox-new", ()=>{
  document.getElementById("msgBadge")?.classList.remove("hidden");
});

socket.on("inbox-clear", ()=>{
  document.getElementById("msgBadge")?.classList.add("hidden");
});


let lastScroll = 0;

const tabbar =
  document.querySelector(".mobile-tabbar") ||
  document.querySelector(".lp-tabbar");

function isNearBottom(){
  const scrollY = window.scrollY;
  const winH = window.innerHeight;
  const docH = document.body.scrollHeight;

  return scrollY + winH >= docH - 120; // cách đáy 120px
}

window.addEventListener("scroll", ()=>{
  if(!tabbar) return;

  const cur = window.scrollY;

  // 🔽 Vuốt xuống → ẩn
  if(cur > lastScroll + 10){
    tabbar.classList.add("hide");
  }
  // 🔼 Vuốt lên → hiện
  else if(cur < lastScroll - 10){
    tabbar.classList.remove("hide");
  }

  // 🧲 Gần đáy → ép hiện lại
  if(isNearBottom()){
    tabbar.classList.remove("hide");
  }

  lastScroll = cur;
},{ passive:true });


// ===== COMPOSE COLLAPSE ON SCROLL =====
const compose = document.querySelector(".lp-compose");
const textarea = document.getElementById("postText");

let lastY = window.scrollY;

window.addEventListener("scroll", () => {
  const y = window.scrollY;

  // vuốt xuống → thu gọn
  if (y > lastY + 10) {
    compose.classList.add("compact");
  }
  // vuốt lên → mở lại
  else if (y < lastY - 10) {
    compose.classList.remove("compact");
  }

  lastY = y;
}, { passive: true });

// focus textarea → luôn mở
textarea?.addEventListener("focus", () => {
  compose.classList.remove("compact");
});



const postText = document.getElementById("postText");
const modal = document.getElementById("composeModal");
const modalTextarea = document.getElementById("postTextModal");

/* MỞ MODAL */
postText.addEventListener("pointerdown", e => {
  e.preventDefault();       // chặn focus
  postText.blur();          // đảm bảo KHÔNG bật keyboard
  openComposeModal();
});





let scrollTopBeforeModal = 0;

function openComposeModal(){
  scrollTopBeforeModal = window.scrollY;

  modal.classList.remove("hidden");

  modalTextarea.value = postText.value;

  // 🔒 khóa scroll nền (chuẩn iOS)
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollTopBeforeModal}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function closeComposeModal(){
  modal.classList.add("hidden");

  postText.value = modalTextarea.value;

  // 🔓 mở lại scroll nền
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";

  window.scrollTo(0, scrollTopBeforeModal);
}


async function submitFromModal(){
  if(isPosting) return;

  isPosting = true;
  submitBtn.classList.add("loading");
  submitBtn.disabled = true;

  postText.value = modalTextarea.value;

  try{
    await submitPost();            // 🔥 upload + emit
    showToast("✅ Đã đăng bài");
  }catch(e){
    console.error(e);
    showToast("❌ Lỗi đăng bài");
  }

  clearComposeMedia();             // 🔥 reset preview
  modalTextarea.value = "";

  isPosting = false;
  submitBtn.classList.remove("loading");
  submitBtn.disabled = false;

  closeComposeModal();
}




const modalText = document.getElementById("postTextModal");
const submitBtn = document.querySelector(".lp-submit.icon");

function toggleSubmitBtn(){
  submitBtn.disabled = !modalText.value.trim();
}

modalText.addEventListener("input", toggleSubmitBtn);
toggleSubmitBtn();


const modalImage = document.getElementById("modalImage");
const modalVideo = document.getElementById("modalVideo");


modalImage?.addEventListener("change", () => {
  document.getElementById("postImage").files = modalImage.files;
});

modalVideo?.addEventListener("change", () => {
  document.getElementById("postVideo").files = modalVideo.files;
});


const composeFooter = document.querySelector(".lp-compose-footer");

if (window.visualViewport && composeFooter) {
  const vv = window.visualViewport;

  const updateFooterPosition = () => {
    // chiều cao bàn phím
    const keyboardHeight =
      window.innerHeight - vv.height - vv.offsetTop;

    if (keyboardHeight > 0) {
      // 🔥 đẩy footer lên trên bàn phím
      composeFooter.style.transform =
        `translateY(-${keyboardHeight}px)`;
    } else {
      // bàn phím đóng
      composeFooter.style.transform = "translateY(0)";
    }
  };

  vv.addEventListener("resize", updateFooterPosition);
  vv.addEventListener("scroll", updateFooterPosition);
}



const previewBox = document.getElementById("composePreview");
const previewImage = document.getElementById("previewImage");
const previewVideo = document.getElementById("previewVideo");

function showPreview(){
  previewBox.classList.remove("hidden");
}

function hidePreview(){
  previewBox.classList.add("hidden");
  previewImage.classList.add("hidden");
  previewVideo.classList.add("hidden");
}

function clearComposeMedia(){
  composeImages = [];

  previewBox.classList.add("hidden");
  previewBox.innerHTML = "";

  modalImage.value = "";
  modalVideo.value = "";

  postImage.value = "";
  postVideo.value = "";

  updateCenterMode();
}


/* ===== IMAGE PREVIEW ===== */
modalImage?.addEventListener("change", () => {
  const files = [...modalImage.files];
  if (!files.length) return;

  previewVideo.classList.add("hidden");
  previewImage.classList.add("hidden");

  files.forEach(file => {
    composeImages.push(file);
  });

  renderImagePreview();
});


/* ===== VIDEO PREVIEW ===== */
modalVideo?.addEventListener("change", () => {
  const file = modalVideo.files[0];
  if (!file) return;

  previewImage.classList.add("hidden");

  const url = URL.createObjectURL(file);
  previewVideo.src = url;
  previewVideo.classList.remove("hidden");

  showPreview();
});


const composeBody = document.querySelector(".lp-compose-body");

function updateCenterMode(){
  const hasImage =
    previewImage && !previewImage.classList.contains("hidden");
  const hasText =
    modalText && modalText.value.trim().length > 0;

  if (hasImage && !hasText) {
    composeBody.classList.add("center-image");
  } else {
    composeBody.classList.remove("center-image");
  }
}

/* gọi khi nhập text */
modalText.addEventListener("input", updateCenterMode);

/* gọi khi chọn ảnh */
modalImage?.addEventListener("change", () => {
  setTimeout(updateCenterMode, 50);
});

/* khi xoá ảnh */
function clearComposeMedia(){
  hidePreview();
  modalImage.value = "";
  modalVideo.value = "";
  postImage.value = "";
  postVideo.value = "";

  updateCenterMode();
}


modal.addEventListener("touchmove", e => {
  // cho phép vuốt bên trong modal
}, { passive: true });

// ❌ chặn vuốt nền khi modal mở
document.addEventListener("touchmove", e => {
  if (!modal.classList.contains("hidden")) {
    if (!modal.contains(e.target)) {
      e.preventDefault();
    }
  }
}, { passive: false });



function renderImagePreview(){
  previewBox.classList.remove("hidden");
  previewBox.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "lp-preview-grid";

  composeImages.forEach((file, index) => {
    const wrap = document.createElement("div");
    wrap.className = "lp-preview-item";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);

    const del = document.createElement("button");
    del.className = "lp-preview-remove";
    del.textContent = "✕";
    del.onclick = () => removePreviewImage(index);

   img.onclick = () => openImageLightboxByIndex(index);

wrap.appendChild(img);


    wrap.appendChild(del);
    grid.appendChild(wrap);
  });

  previewBox.appendChild(grid);

  // 🔥 sync lại FileList cho submit
  syncPostImageFiles();
}


function removePreviewImage(index){
  composeImages.splice(index, 1);

  if(composeImages.length === 0){
    clearComposeMedia();
    return;
  }

  renderImagePreview();
}


function syncPostImageFiles(){
  const dt = new DataTransfer();

  composeImages.forEach(file => {
    dt.items.add(file);
  });

  postImage.files = dt.files;
}


const imgLightbox = document.getElementById("imgLightbox");
const imgLightboxView = document.getElementById("imgLightboxView");

function openImageLightbox(src){
  imgLightboxView.src = src;
  imgLightbox.classList.remove("hidden");

  // 🔒 khóa scroll nền
  document.body.style.overflow = "hidden";
}

function closeImageLightbox(){
  imgLightbox.classList.add("hidden");
  imgLightboxView.src = "";
  document.body.style.overflow = "";

  feedImages = [];
  feedLightboxIndex = 0;

  updateIndicator(0, 0); // 🔥 ẩn indicator
}



// click nền → đóng
imgLightbox?.addEventListener("click", e => {
  if(e.target === imgLightbox){
    closeImageLightbox();
  }
});


let lightboxIndex = 0;

function openImageLightboxByIndex(index){
  if(!composeImages.length) return;

  lightboxIndex = (index + composeImages.length) % composeImages.length;

  const file = composeImages[lightboxIndex];
  const src = URL.createObjectURL(file);

  openImageLightbox(src);
  updateIndicator(lightboxIndex + 1, composeImages.length);

}

function nextLightboxImage(){
  openImageLightboxByIndex(lightboxIndex + 1);
  updateIndicator(lightboxIndex + 1, composeImages.length);
}


function prevLightboxImage(){
  openImageLightboxByIndex(lightboxIndex - 1);
  updateIndicator(lightboxIndex + 1, composeImages.length);
}



let touchStartX = 0;
let touchEndX = 0;

imgLightbox?.addEventListener("touchstart", e => {
  touchStartX = e.changedTouches[0].screenX;
},{ passive:true });

imgLightbox?.addEventListener("touchend", e => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
},{ passive:true });

function handleSwipe(){
  const diff = touchEndX - touchStartX;
  if(Math.abs(diff) < 40) return;

  if(feedImages.length){
    if(diff < 0) nextFeedImage();
    else prevFeedImage();
  }else{
    if(diff < 0) nextLightboxImage();
    else prevLightboxImage();
  }
}



document.addEventListener("keydown", e => {
  if(imgLightbox.classList.contains("hidden")) return;

  if(e.key === "ArrowRight"){
    feedImages.length ? nextFeedImage() : nextLightboxImage();
  }

  if(e.key === "ArrowLeft"){
    feedImages.length ? prevFeedImage() : prevLightboxImage();
  }

  if(e.key === "Escape") closeImageLightbox();
});



let feedImages = [];
let feedLightboxIndex = 0;

function openFeedLightbox(images, index){
  if(!images || !images.length) return;

  feedImages = images;
  feedLightboxIndex = index;

  imgLightboxView.src = feedImages[feedLightboxIndex];
  imgLightbox.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  updateIndicator(feedLightboxIndex + 1, feedImages.length);
}


function nextFeedImage(){
  if(!feedImages.length) return;

  feedLightboxIndex = (feedLightboxIndex + 1) % feedImages.length;
  imgLightboxView.src = feedImages[feedLightboxIndex];

  updateIndicator(feedLightboxIndex + 1, feedImages.length);
}


function prevFeedImage(){
  if(!feedImages.length) return;

  feedLightboxIndex =
    (feedLightboxIndex - 1 + feedImages.length) % feedImages.length;

  imgLightboxView.src = feedImages[feedLightboxIndex];
  updateIndicator(feedLightboxIndex + 1, feedImages.length);
}




const imgIndicator = document.getElementById("imgIndicator");


function updateIndicator(current, total){
  if(!imgIndicator) return;

  if(total <= 1){
    imgIndicator.textContent = "";
    imgIndicator.style.display = "none";
    return;
  }

  imgIndicator.textContent = `${current} / ${total}`;
  imgIndicator.style.display = "block";
}



function showToast(text, timeout = 2000){
  const toast = document.createElement("div");
  toast.className = "lp-toast";
  toast.textContent = text;

  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(()=> toast.remove(), 300);
  }, timeout);
}
