const socket = io();

const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
const sysModal = document.getElementById("sysModal");
const sysText = document.getElementById("sysText");
const sysOk = document.getElementById("sysOk");
const sysCancel = document.getElementById("sysCancel");





let currentTarget = null;
let allUsers = [];
let onlineSet = new Set();


async function loadAllUsers(){
  const res = await fetch("/api/all-users");
  allUsers = await res.json();
  renderUserList();
}

loadAllUsers();




function chatKey(){
  if(!auth?.uid || !currentTargetUID) return null;

  const a = auth.uid;
  const b = currentTargetUID;

  return a < b
    ? "chat_" + a + "_" + b
    : "chat_" + b + "_" + a;
}




function saveChat(msg){
  const key = chatKey();
  if(!key) return;

  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  arr.push(msg);
  localStorage.setItem(key, JSON.stringify(arr));
}



function loadChat(){
  const key = chatKey();
  if(!key) return;

  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  chatBox.innerHTML = "";

  arr.forEach(m=>{
    const isMe = m.from === auth.uid;

    pushMsg(
      isMe ? "Bạn" : currentTarget.name,
      m.text,
      isMe,
      null,
      "",
      isMe ? auth.avatar : currentTarget.avatar
    );
  });
}




function showModal(text, okText="OK", cancelText=null){
  return new Promise(resolve=>{
    sysText.textContent = text;
    sysOk.textContent = okText;
    sysCancel.style.display = cancelText ? "block" : "none";
    sysCancel.textContent = cancelText || "";

    sysModal.classList.remove("hidden");

    sysOk.onclick = () => {
      sysModal.classList.add("hidden");
      resolve(true);
    };
    sysCancel.onclick = () => {
      sysModal.classList.add("hidden");
      resolve(false);
    };
  });
}




socket.emit("auth-login", { uid: auth.uid });

const userList = document.getElementById("userList");
const chatBox = document.getElementById("chatBox");
const chatTitle = document.getElementById("chatTitle");


socket.on("active-users", ({ online }) => {
  onlineSet = new Set(online || []);
  renderUserList();
});


document.getElementById("sendBtn").onclick = () => {
  const input = document.getElementById("msgInput");
  const txt = input.value.trim();
  if(!txt || !currentTarget) return;

  const msgId = Date.now() + "_" + Math.random().toString(36).slice(2);

 socket.emit("private-message", {
  to: currentTarget.uid,   // 🔥 GỬI THEO UID
  text: txt,
  msgId
});

  pushMsg("Bạn", txt, true, msgId, "⏳");

saveChat({
  from: auth.uid,
  to: currentTargetUID,
  text: txt,
  time: Date.now(),
  peer: currentTargetUID   // 🔥 QUAN TRỌNG
});


};


socket.on("private-message", ({ from, text, msgId }) => {
 pushMsg(from.name, text, false);
  
saveChat({
  from: from.uid,
  to: auth.uid,
  text: text,
  time: Date.now(),
  peer: from.uid   // 🔥 QUAN TRỌNG
});



 
socket.emit("msg-seen", {
  to: from.uid,
  msgId
});

});

socket.on("msg-status", ({ msgId, status }) => {
  const el = document.querySelector(`[data-msg-id="${msgId}"] .msg-status`);
  if(el){
    if(status === "delivered"){
      el.textContent = "✓";

      // ✅ XÓA INPUT TẠI ĐÂY
      const input = document.getElementById("msgInput");
      input.value = "";
      input.blur();
      setTimeout(()=>input.focus(),20);
    }
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

 // ⬇️ Luôn cuộn xuống tin mới nhất
requestAnimationFrame(() => {
  chatBox.scrollTop = chatBox.scrollHeight;
});

}




const chatModal = document.getElementById("chatModal");


function renderUserList(){
  userList.innerHTML = "";

  allUsers.forEach(u=>{
    if(u.uid === auth.uid) return;

    const isOnline = onlineSet.has(u.uid);

    const div = document.createElement("div");
    div.className = "badge " + (isOnline ? "online" : "offline");

div.innerHTML = `
  <img src="${u.avatar}" width="28" style="border-radius:50%">
  <div style="flex:1">
    <div>${u.name}</div>
    <small style="display:flex;align-items:center;gap:6px">
      <span class="dot ${isOnline ? "on" : "off"}"></span>
      ${isOnline ? "Online" : "Offline"}
    </small>
  </div>
`;


    div.onclick = ()=>{
      currentTarget = u;
      currentTargetUID = u.uid;

      chatTitle.textContent = u.name;
      document.getElementById("chatHeaderAvatar").src = u.avatar || "";

      loadChat();
      openChat();
    };

    userList.appendChild(div);
  });
}


function openChat(){
  document.body.style.overflow = "hidden"; // khóa nền
  chatModal.classList.remove("hidden");


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




