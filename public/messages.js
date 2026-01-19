const socket = io();

const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
const sysModal = document.getElementById("sysModal");
const sysText = document.getElementById("sysText");
const sysOk = document.getElementById("sysOk");
const sysCancel = document.getElementById("sysCancel");




let currentTargetUID = null;
let currentTarget = null;
let allUsers = [];
let onlineSet = new Set();

// 🔒 CHỐNG RENDER TRÙNG TIN NHẮN
const renderedMsgIds = new Set();


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
  renderedMsgIds.clear(); // 🔥 reset chống trùng khi đổi chat

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
      m.id,                  // 🔥 TRUYỀN msgId
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




socket.on("connect", () => {
  if (auth?.uid) {
    socket.emit("auth-login", { uid: auth.uid });
  }
});


socket.on("offline-messages", (list)=>{
  console.log("📥 Offline messages:", list);

  list.forEach(m=>{
    // lưu vào localStorage theo đúng key chat
    const peer = m.from === auth.uid ? m.to : m.from;
    const key =
      auth.uid < peer
        ? "chat_" + auth.uid + "_" + peer
        : "chat_" + peer + "_" + auth.uid;

    const arr = JSON.parse(localStorage.getItem(key) || "[]");

    // tránh trùng
    if(!arr.find(x=>x.id === m.id)){
      arr.push({
        id: m.id,
        from: m.from,
        to: m.to,
        text: m.text,
        time: m.time,
        peer
      });
    }

    localStorage.setItem(key, JSON.stringify(arr));
  });
});


const userList = document.getElementById("userList");
const chatBox = document.getElementById("chatBox");
const chatTitle = document.getElementById("chatTitle");


socket.on("active-users", ({ online }) => {
  onlineSet = new Set(online || []);
  if (allUsers.length) {
    renderUserList();
  }
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

 // ✅ XÓA INPUT NGAY LẬP TỨC (QUAN TRỌNG)
  input.value = "";
  input.blur();
  setTimeout(()=>input.focus(),20);
};


socket.on("private-message", ({ from, text, msgId }) => {

  const peer = from.uid;

  // 🔐 xác định đúng chatKey (KHÔNG phụ thuộc state tạm)
  const key =
    auth.uid < peer
      ? "chat_" + auth.uid + "_" + peer
      : "chat_" + peer + "_" + auth.uid;

  // 1️⃣ LƯU VÀO LOCALSTORAGE (CHỐNG TRÙNG)
  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  if (!arr.find(x => x.id === msgId)) {
    arr.push({
      id: msgId,
      from: peer,
      to: auth.uid,
      text,
      time: Date.now(),
      peer
    });
    localStorage.setItem(key, JSON.stringify(arr));
  }

  // 2️⃣ NẾU MODAL ĐANG MỞ & ĐÚNG CHAT → RENDER NGAY
  if (!chatModal.classList.contains("hidden")) {
    const curKey = chatKey(); // chat hiện tại user đang mở

    if (curKey === key) {
      pushMsg(
        from.name,
        text,
        false,
        null,
        "",
        from.avatar
      );

      // 👁 seen realtime
      socket.emit("msg-seen", { to: peer, msgId });
    }
  }
});




socket.on("msg-status", ({ msgId, status }) => {
  const el = document.querySelector(`[data-msg-id="${msgId}"] .msg-status`);
  if(!el) return;

  if(status === "delivered") el.textContent = "✓";
  if(status === "seen") el.textContent = "👁";
});




function pushMsg(name, text, isMe=false, msgId=null, status=""){
  // 🔒 CHẶN RENDER TRÙNG
  if (msgId && renderedMsgIds.has(msgId)) return;
  if (msgId) renderedMsgIds.add(msgId);

  const div = document.createElement("div");
  div.className = "chat-line " + (isMe ? "me" : "other");
  div.dataset.msgId = msgId || "";

  const time = new Date().toLocaleTimeString("vi-VN",{
    hour:"2-digit",
    minute:"2-digit"
  });

  div.innerHTML = `
    <div class="msg-bubble ${isMe ? "me":"other"}">${text}</div>
    <div class="chat-time">
      ${time}
      ${isMe ? `<span class="msg-status">${status}</span>` : ""}
    </div>
  `;

  chatBox.appendChild(div);

  requestAnimationFrame(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}





const chatModal = document.getElementById("chatModal");


function renderUserList(){
  userList.innerHTML = "";

allUsers.forEach(u=>{
  if(!u || !u.uid || !u.name) return;
  if(u.uid === auth.uid) return;

    const isOnline = onlineSet.has(u.uid);

    const div = document.createElement("div");
    div.className = "msg-user " + (isOnline ? "online" : "offline");


div.innerHTML = `
  <img class="msg-ava" src="${u.avatar}">
  <div class="msg-uinfo">
    <div class="msg-uname">
      ${u.name}
      ${u.verified ? `<span class="tick-blue">✔</span>` : ""}
    </div>
    <div class="msg-ustatus ${isOnline ? "on":"off"}">
      ${isOnline ? "Online" : "Offline"}
    </div>
  </div>
`;



    div.onclick = ()=>{
      currentTarget = u;
      currentTargetUID = u.uid;

      chatTitle.innerHTML = `
  ${u.name}
  ${u.verified ? `<span class="tick-blue tick-chat">✔</span>` : ``}
`;
document.getElementById("chatHeaderAvatar").src = u.avatar || "";


      loadChat();
      openChat();
    };

    userList.appendChild(div);
  });
}

function openChat(){
  document.body.style.overflow = "hidden";
  chatModal.classList.remove("hidden");

  if (currentTargetUID) {
    socket.emit("msg-seen-all", { peer: currentTargetUID });
  }
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




