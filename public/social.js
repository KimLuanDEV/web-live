const socket = io();
const feed = document.getElementById("lpFeed");
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");

document.getElementById("meAvatar").src = auth.avatar;

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
  `;

  if(top) feed.prepend(div);
  else feed.appendChild(div);
}
