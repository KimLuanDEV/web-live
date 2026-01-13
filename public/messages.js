const socket = io();
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");

let currentTarget = null;

socket.emit("auth-login", { uid: auth.uid });

const userList = document.getElementById("userList");
const chatBox = document.getElementById("chatBox");
const chatTitle = document.getElementById("chatTitle");

socket.on("active-users", ({ users }) => {
  userList.innerHTML = "";

  users.forEach(u => {
   if(u.uid === auth.uid) return;


    const div = document.createElement("div");
    div.className = "badge";
    div.innerHTML = `<img src="${u.avatar}" width="24" style="border-radius:50%"> ${u.name}`;

    div.onclick = () => {
  currentTarget = u;
  chatTitle.textContent = u.name;
  chatBox.innerHTML = "";
  openChat();
};


    userList.appendChild(div);
  });
});

document.getElementById("sendBtn").onclick = () => {
  const txt = document.getElementById("msgInput").value.trim();
  if(!txt || !currentTarget) return;

const msgId = Date.now() + "_" + Math.random().toString(36).slice(2);

socket.emit("private-message", {
  to: currentTarget.socketId,
  text: txt,
  msgId
});

pushMsg("Bạn", txt, true, msgId, "sent");




  document.getElementById("msgInput").value = "";
};

socket.on("private-message", ({ from, text, msgId }) => {
 pushMsg(from.name, text, false);
  

  // báo là đã xem
  socket.emit("msg-seen", {
    to: from.socketId,
    msgId
  });
});

socket.on("msg-status", ({ msgId, status }) => {
  const el = document.querySelector(`[data-msg-id="${msgId}"] .msg-status`);
  if(el){
    if(status === "delivered") el.textContent = "✓";
    if(status === "seen") el.textContent = "👁";
  }
});


function pushMsg(name, text, isMe=false, msgId=null, status=""){
  const div = document.createElement("div");
  div.className = "chat-line " + (isMe ? "me" : "other");
  div.dataset.msgId = msgId || "";

  const time = new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"});

  div.innerHTML = `
    <div class="bubble">${text}</div>
    <div class="chat-time">
      ${time}
      ${isMe ? `<span class="msg-status">${status}</span>` : ""}
    </div>
  `;

  chatBox.appendChild(div);
  requestAnimationFrame(() => chatBox.scrollTop = chatBox.scrollHeight);
}




const chatModal = document.getElementById("chatModal");

function openChat(){
  document.body.style.overflow = "hidden"; // khóa nền
  chatModal.classList.remove("hidden");

  setTimeout(() => {
    document.getElementById("msgInput").focus();
  }, 120);
}

function closeChat(){
  document.body.style.overflow = ""; // mở lại
  chatModal.classList.add("hidden");
  currentTarget = null;
}


let baseHeight = window.innerHeight;

window.addEventListener("resize", () => {
  const h = window.innerHeight;
  const diff = baseHeight - h;

  // nếu bàn phím mở
  if(diff > 150){
    document
      .getElementById("chatModal")
      .style.setProperty("--kb", diff + "px");
  }else{
    document
      .getElementById("chatModal")
      .style.setProperty("--kb", "0px");
  }
});
