const socket = io();
const feed = document.getElementById("lpFeed");
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");

document.getElementById("meAvatar").src = auth.avatar;

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

socket.on("lp-comment", ({ postId, comment, count })=>{
  document.getElementById("c_"+postId).textContent = count;

  const list = document
    .querySelector(`#cm_${postId} .lp-comment-list`);

  const div = document.createElement("div");
  div.className="lp-comment";
  div.innerHTML=`<b>${comment.name}</b>: ${comment.text}`;
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

function renderPost(p, top=false){
  const div = document.createElement("div");
  div.className="lp-post";

  const time = new Date(p.time).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"});

 div.innerHTML=`
<div class="lp-post-head">
  <img class="lp-ava" src="${p.avatar}">
  <div>
    <div class="lp-post-name">${p.name}</div>
    <div class="lp-post-time">${time}</div>
  </div>
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
    <input id="ci_${p.id}" placeholder="Viết bình luận...">
    <button onclick="sendComment('${p.id}')">Gửi</button>
  </div>
</div>
`;


  if(top) feed.prepend(div);
  else feed.appendChild(div);
}
