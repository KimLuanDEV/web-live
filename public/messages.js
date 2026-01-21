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


// 🔒 CHỐNG XỬ LÝ OFFLINE-MESSAGES NHIỀU LẦN
let offlineHandled = false;


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




socket.on("connect", async () => {
  offlineHandled = false;

  if (auth?.uid) {
    socket.emit("auth-login", { uid: auth.uid });

    // 🔔 ĐĂNG KÝ PUSH
    setTimeout(() => {
      enablePush().catch(console.error);
    }, 1000);
  }
});



socket.on("offline-messages", (list)=>{
  // 🔥 CHỈ XỬ LÝ 1 LẦN / LOAD
  if (offlineHandled) return;
  offlineHandled = true;

  console.log("📥 Offline messages:", list);

  list.forEach(m=>{
    const peer = m.from === auth.uid ? m.to : m.from;
    const key =
      auth.uid < peer
        ? "chat_" + auth.uid + "_" + peer
        : "chat_" + peer + "_" + auth.uid;

    const arr = JSON.parse(localStorage.getItem(key) || "[]");

    if(!arr.find(x => x.id === m.id)){
      arr.push({
        id: m.id,
        from: m.from,
        to: m.to,
        text: m.text,
        time: m.time,
        peer
      });
      localStorage.setItem(key, JSON.stringify(arr));
    }
  });

  if(list.length){
  showInboxDot(list.length); // 🔔 hiện badge
  renderUserList();          // 🔄 refresh danh sách
}


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
  peer: currentTargetUID,   // 🔥 QUAN TRỌNG
  seen: true
});

 // ✅ XÓA INPUT NGAY LẬP TỨC (QUAN TRỌNG)
  input.value = "";
  input.blur();
  setTimeout(()=>input.focus(),20);
};


socket.on("private-message", ({ from, text, msgId }) => {

  const peer = from.uid;

  // 🔐 xác định đúng chatKey
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
      peer,
      seen: false        // 🔥 QUAN TRỌNG
    });
    localStorage.setItem(key, JSON.stringify(arr));
  }

  // 2️⃣ NẾU MODAL ĐANG MỞ & ĐÚNG CHAT → RENDER
  if (!chatModal.classList.contains("hidden")) {
    const curKey = chatKey();

    if (curKey === key) {
      pushMsg(
        from.name,
        text,
        false,
        msgId,
        "",
        from.avatar
      );

      socket.emit("msg-seen", { to: peer, msgId });
      return;
    }
  }

  // 🔔 3️⃣ MODAL ĐANG ĐÓNG → BẬT DOT ĐỎ (FIX QUAN TRỌNG)
  showInboxDot(1);

// 🔔 HIỆN TOAST KHI MODAL ĐANG ĐÓNG
if (chatModal.classList.contains("hidden")) {
  showMessageToast({
    name: from.name,
    text,
    avatar: from.avatar,
    uid: from.uid
  });
}


});





socket.on("msg-status", ({ msgId, status }) => {
  const el = document.querySelector(`[data-msg-id="${msgId}"] .msg-status`);
  if(!el) return;

  if(status === "delivered") el.textContent = "✓";
  if(status === "seen") el.textContent = "👁";
});




function pushMsg(name, text, isMe=false, msgId=null, status="", avatar="") {
  if (msgId && renderedMsgIds.has(msgId)) return;
  if (msgId) renderedMsgIds.add(msgId);

  const div = document.createElement("div");
  div.className = "chat-line " + (isMe ? "me" : "other");
  div.dataset.msgId = msgId || "";

  let html = "";

  // 🖼️ IMAGE → KHÔNG BUBBLE
  if (text?.startsWith("/img ")) {
    const url = text.slice(5);

    html = `
      <div class="chat-media ${isMe ? "me" : "other"}">
        <img src="${url}" class="chat-img">
      </div>
    `;
  }

  // 🎥 VIDEO → KHÔNG BUBBLE
  else if (text?.startsWith("/video ")) {
    const url = text.slice(7);

    html = `
      <div class="chat-media ${isMe ? "me" : "other"}">
        <video src="${url}" controls playsinline class="chat-video"></video>
      </div>
    `;
  }

  // 💬 TEXT → GIỮ BUBBLE
  else {
    html = `
      <div>
         <span class="bubble-text ${isMe ? "me" : "other"}">${text}</span>
      </div>
    `;
  }

  div.innerHTML = `
    ${html}
    <div class="chat-time">
      ${new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}
      ${isMe ? `<span class="msg-status">${status}</span>` : ""}
    </div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
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
    ${countUnread(u.uid) > 0
      ? `<span class="msg-badge">${countUnread(u.uid) > 9 ? "9+" : countUnread(u.uid)}</span>`
      : ""}
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
  ${u.verified ? `<span class="tick-blue">
  <svg viewBox="0 0 24 24" width="10" height="10" fill="white">
    <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.4-1.4z"/>
  </svg>
</span>
` : ``}
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

  clearInboxDot(); // 🔥 THÊM DÒNG NÀY

if (currentTargetUID) {
  markPeerSeen(currentTargetUID);   // 🔥 local
  socket.emit("msg-seen-all", { peer: currentTargetUID });
}

}


function markPeerSeen(peer){
  const key =
    auth.uid < peer
      ? "chat_" + auth.uid + "_" + peer
      : "chat_" + peer + "_" + auth.uid;

  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  let changed = false;

  arr.forEach(m=>{
    if (!m.seen && m.from === peer) {
      m.seen = true;
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem(key, JSON.stringify(arr));
    renderUserList(); // 🔄 update badge
  }
}

function countUnread(peer){
  const key =
    auth.uid < peer
      ? "chat_" + auth.uid + "_" + peer
      : "chat_" + peer + "_" + auth.uid;

  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  return arr.filter(m => !m.seen && m.from === peer).length;
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





// 🔔 THÔNG BÁO CÓ TIN NHẮN MỚI Ở SẢNH MESSAGES
socket.on("inbox-new", (data = {}) => {
  showInboxDot(data.count);
});


function showInboxDot(count){
  const dot = document.querySelector(".msg-title .dot");
  if(!dot) return;

  dot.classList.add("active");

  // nếu muốn hiện số (tuỳ chọn)
  if(count && count > 0){
    dot.textContent = count > 9 ? "9+" : count;
  }
}

function clearInboxDot(){
  const dot = document.querySelector(".msg-title .dot");
  if(!dot) return;

  dot.classList.remove("active");
  dot.textContent = "";
}


// 🔔 TOAST TIN NHẮN (MESSAGES)
function showMessageToast({ name, text, avatar, uid }) {
  // tránh spam nhiều toast cùng lúc
  if (document.querySelector(".msg-toast")) return;

  const div = document.createElement("div");
  div.className = "msg-toast";

  div.innerHTML = `
    <img src="${avatar || '/icons/icon-192.png'}" class="toast-ava">
    <div class="toast-body">
      <div class="toast-name">${name}</div>
      <div class="toast-text">${text}</div>
    </div>
  `;

  Object.assign(div.style, {
    position: "fixed",
    left: "50%",
    bottom: "90px",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,.88)",
    color: "#fff",
    borderRadius: "14px",
    padding: "10px 14px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    maxWidth: "90%",
    zIndex: 9999,
    boxShadow: "0 0 18px rgba(255,59,107,.6)",
    cursor: "pointer"
  });

  div.querySelector(".toast-ava").style.cssText = `
    width:36px;height:36px;border-radius:50%;object-fit:cover
  `;

  div.onclick = () => {
    // 👉 mở chat ngay khi click toast
    const u = allUsers.find(x => x.uid === uid);
    if (u) {
      currentTarget = u;
      currentTargetUID = u.uid;
      loadChat();
      openChat();
    }
    div.remove();
  };

  document.body.appendChild(div);

  setTimeout(() => div.remove(), 2500);
}


async function enablePush() {
  if (!("serviceWorker" in navigator)) return;
  if (!auth?.uid) return;

  const reg = await navigator.serviceWorker.register("/sw.js");

  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: "BPG9kTxtU0Fso5VZqUFhqn_ZZLvTeKM32km3pLDnH2UCdKce-owuTMZ5PLzrKyrw_patHMVavHdDM4axJ7L9N7E"
    });
  }

  // 🔥 GỬI SUB LÊN SERVER MỖI LẦN (UPSERT)
  await fetch("/api/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: auth.uid, sub })
  });
}


socket.on("msg-blocked", ({ reason }) => {
  if (reason === "not_friend") {
    alert("🔒 Bạn chỉ có thể nhắn tin với người đã kết bạn.");
  }
});



async function uploadChatFile(file, type) {
  const fd = new FormData();
  fd.append(type, file);

  const res = await fetch(
    type === "image"
      ? "/api/upload-chat-image"
      : "/api/upload-chat-video",
    { method: "POST", body: fd }
  );

  return res.json(); // { url }
}


document.getElementById("imgInput").onchange = async e => {
  const file = e.target.files[0];
  if (!file || !currentTarget) return;

  const msgId = Date.now() + "_" + Math.random().toString(36).slice(2);

  // 1️⃣ upload ảnh
  const { url } = await uploadChatFile(file, "image");

  const text = "/img " + url;

  // 2️⃣ HIỂN THỊ NGAY BÊN NGƯỜI GỬI ✅
  pushMsg("Bạn", text, true, msgId, "✓");

  // 3️⃣ LƯU LOCAL (để reload vẫn thấy)
  saveChat({
    id: msgId,
    from: auth.uid,
    to: currentTarget.uid,
    text,
    time: Date.now(),
    peer: currentTarget.uid,
    seen: true
  });

  // 4️⃣ GỬI SOCKET
  socket.emit("private-message", {
    to: currentTarget.uid,
    msgId,
    type: "image",
    media: url
  });
};



document.getElementById("videoInput").onchange = async e => {
  const file = e.target.files[0];
  if (!file || !currentTarget) return;

  const msgId = Date.now() + "_" + Math.random().toString(36).slice(2);

  const { url } = await uploadChatFile(file, "video");
  const text = "/video " + url;

  pushMsg("Bạn", text, true, msgId, "✓");

  saveChat({
    id: msgId,
    from: auth.uid,
    to: currentTarget.uid,
    text,
    time: Date.now(),
    peer: currentTarget.uid,
    seen: true
  });

  socket.emit("private-message", {
    to: currentTarget.uid,
    msgId,
    type: "video",
    media: url
  });
};


const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

msgInput.addEventListener("input", () => {
  sendBtn.style.opacity = msgInput.value.trim() ? "1" : "0.4";
});
