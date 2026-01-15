const socket = io();
const feed = document.getElementById("lpFeed");
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");

document.getElementById("meAvatar").src = auth.avatar;

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

  box.innerHTML = `
    <div class="lp-reply-box">
      <input id="ri_${postId}_${index}" placeholder="Trả lời...">
      <button onclick="sendReply('${postId}',${index})">➤</button>
    </div>
  `;
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

  input.value="";
}


function deleteComment(postId, index){
  if(!confirm("Xóa bình luận này?")) return;

  socket.emit("lp-delete-comment", {
    postId,
    index,
    uid: auth.uid
  });
}

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
  });
});




socket.on("lp-reply", ({ postId, commentIndex, reply })=>{
  const box = document.getElementById(`rp_${postId}_${commentIndex}`);
  if(!box) return;

  const div = document.createElement("div");
  div.className="lp-reply";
  div.innerHTML=`
    <img src="${reply.avatar}">
    <div>
      <b>${reply.name}</b> ${reply.text}
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
  <span onclick="openReply('${postId}',${idx})">Trả lời</span>
  ${(comment.uid === auth.uid || postOwnerUid === auth.uid) ? `<span class="cm-del" onclick="deleteComment('${postId}',${idx})">🗑</span>` : ``}

</div>




      <div class="lp-replies" id="rp_${postId}_${idx}"></div>
    </div>
  `;

  list.appendChild(div);
});



function submitPost(){
  const text = postText.value.trim();
  if(!text) return;

  socket.emit("lp-post", {
    uid: auth.uid,
    name: auth.name,
    avatar: auth.avatar,
    text,
    time: Date.now()
  });

  postText.value="";
}

socket.on("lp-init", list=>{
  list.forEach(p=>renderPost(p,false));
});


socket.on("lp-post", post=>{
  renderPost(post,true);
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

  const time = new Date(p.time).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"});

 div.innerHTML=`
<div class="lp-post-head">
  <img class="lp-ava" src="${p.avatar}">
  <div>
    <div class="lp-post-name">${p.name}</div>
    <div class="lp-post-time">${time}</div>
  </div>
  ${p.uid === auth.uid ? `<div class="lp-del" onclick="deletePost('${p.id}')">🗑</div>` : ``}
</div>


<div class="lp-post-text">${p.text}</div>

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

    c.innerHTML = `
      <img class="lp-cm-ava" src="${comment.avatar}">
      <div class="lp-cm-body">
        <div class="lp-cm-name">${comment.name}</div>
        <div class="lp-cm-text">${comment.text}</div>

  <div class="lp-cm-actions">
  <span onclick="openReply('${p.id}',${idx})">Trả lời</span>
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
        rdiv.innerHTML=`
          <img src="${r.avatar}">
          <div><b>${r.name}</b> ${r.text}</div>
        `;
        box.appendChild(rdiv);
      });
    }
  });
}

}
