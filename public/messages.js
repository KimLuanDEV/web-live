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
  if(!key || !msg?.id) return;

  const arr = JSON.parse(localStorage.getItem(key) || "[]");

  // 🔥 CHỐNG TRÙNG msgId
  const exist = arr.find(m => m.id === msg.id);
  if (exist) {
    // nếu bản mới là revoke → ghi đè
    if (msg.revoked || msg.text === "__REVOKED__") {
      exist.text = "__REVOKED__";
      exist.revoked = true;
    }
    return;
  }

  arr.push(msg);
  localStorage.setItem(key, JSON.stringify(arr));
}




function loadChat(){
  renderedMsgIds.clear(); // 🔥 reset chống trùng khi đổi chat

  const key = chatKey();
  if(!key) return;

let arr = JSON.parse(localStorage.getItem(key) || "[]");

// 🔥 DEDUPE THEO msgId (CỰC KỲ QUAN TRỌNG)
const map = new Map();
arr.forEach(m => {
  if (!m?.id) return;

  // ưu tiên bản revoked
  if (!map.has(m.id) || m.revoked) {
    map.set(m.id, m);
  }
});

arr = [...map.values()];

// 🔥 ghi ngược lại localStorage (dọn rác)
localStorage.setItem(key, JSON.stringify(arr));

chatBox.innerHTML = "";

arr.forEach(m => {
  const isMe = m.from === auth.uid;
  const text = m.revoked ? "__REVOKED__" : m.text;

  pushMsg(
    isMe ? "Bạn" : currentTarget.name,
    text,
    isMe,
    m.id,
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



socket.on("offline-messages", (list) => {
  // 🔥 CHỈ XỬ LÝ 1 LẦN / LOAD
  if (offlineHandled) return;
  offlineHandled = true;

  console.log("📥 Offline messages:", list);

  list.forEach(m => {
    const peer = m.from === auth.uid ? m.to : m.from;
    const key =
      auth.uid < peer
        ? "chat_" + auth.uid + "_" + peer
        : "chat_" + peer + "_" + auth.uid;

    const arr = JSON.parse(localStorage.getItem(key) || "[]");

    const exist = arr.find(x => x.id === m.id);

    // 🆕 CHƯA CÓ → THÊM MỚI
    if (!exist) {
      arr.push({
        id: m.id,
        from: m.from,
        to: m.to,
        text: m.text === "__REVOKED__" ? "__REVOKED__" : m.text,
        time: m.time,
        peer,
        revoked: m.text === "__REVOKED__"
      });
    } 
    // ♻️ ĐÃ CÓ → TUYỆT ĐỐI KHÔNG GHI ĐÈ REVOKE
    else {
      // nếu local đã revoke → bỏ qua server
      if (exist.revoked) return;

      // nếu server báo revoke → cập nhật
      if (m.text === "__REVOKED__") {
        exist.text = "__REVOKED__";
        exist.revoked = true;
      }
    }

    localStorage.setItem(key, JSON.stringify(arr));
  });

  if (list.length) {
    showInboxDot(list.length);
    renderUserList();
  }
});



const userList = document.getElementById("userList");
const chatBox = document.getElementById("chatBox");
const chatTitle = document.getElementById("chatTitle");
// 🔽 NÚT KÉO XUỐNG CUỐI CHAT
const btnScrollBottom = document.getElementById("btnScrollBottom");

// bấm nút → về cuối
btnScrollBottom.onclick = () => {
  scrollChatToBottom(true);
  btnScrollBottom.classList.add("hidden");
};

// theo dõi scroll để hiện / ẩn nút
chatBox.addEventListener("scroll", () => {
  const nearBottom =
    chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 80;

  if (nearBottom) {
    btnScrollBottom.classList.add("hidden");
  } else {
    btnScrollBottom.classList.remove("hidden");
  }
});


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
  id: msgId,  
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

 

  // 2️⃣ NẾU MODAL ĐANG MỞ & ĐÚNG CHAT → RENDER
  if (!chatModal.classList.contains("hidden")) {
    const curKey = chatKey();

 if (curKey === key) {

  // 🔥 BẮT BUỘC: LƯU LOCAL CHO NGƯỜI NHẬN
  saveChat({
    id: msgId,
    from: peer,
    to: auth.uid,
    text,
    time: Date.now(),
    peer,
    seen: true
  });

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


if (text === "__REVOKED__") {
  div.innerHTML = `
    <div class="msg-revoked">
      🚫 Tin nhắn đã được thu hồi
    </div>
  `;






const nearBottom =
  chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 80;

chatBox.appendChild(div);

if (nearBottom) {
  scrollChatToBottom(true);
} else {
  btnScrollBottom.classList.remove("hidden"); // 🔔 có tin mới
}


  return;
}


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

// 🖼️ ALBUM + INDICATOR
else if (text?.startsWith("/album ")) {
  const urls = text.slice(7).split("|");
  const total = urls.length;
  const showUrls = total > 4 ? urls.slice(0, 4) : urls;

  html = `
    <div class="chat-album ${isMe ? "me" : "other"}">
      ${showUrls.map((u, i) => {
        const isLast = i === 3 && total > 4;
        const more = total - 3;

        return `
          <div class="album-item"
               onclick='openAlbumZoom(${JSON.stringify(urls)}, ${i})'>
            <img src="${u}" class="album-img">
            ${isLast ? `<div class="album-more">+${more}</div>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
  
}// 📍 LOCATION
else if (text?.startsWith("/location ")) {
  const raw = text.slice(10);
  const [coords, url] = raw.split("|");

  html = `
    <div class="chat-location ${isMe ? "me" : "other"}">
      <div class="location-card">
        <div class="location-icon">📍</div>
        <div class="location-text">
          <div class="location-title">Vị trí hiện tại</div>
          <div class="location-coords">${coords}</div>
        </div>
        <a href="${url}" target="_blank" class="location-open">
          Mở bản đồ
        </a>
      </div>
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



// 🗑️ THU HỒI – chỉ cho tin của mình
if (isMe && msgId) {
  // PC: click phải
  div.oncontextmenu = e => {
    e.preventDefault();
    confirmRevoke(msgId);
  };

  // Mobile: giữ lâu
  let pressTimer;
  div.addEventListener("touchstart", () => {
    pressTimer = setTimeout(() => {
      confirmRevoke(msgId);
    }, 500);
  });

  div.addEventListener("touchend", () => {
    clearTimeout(pressTimer);
  });
}


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
      scrollChatToBottom(true); // 🔥 CHÈN DÒNG NÀY
   
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
      scrollChatToBottom(true); // ✅
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



function uploadChatFileWithProgress(file, type, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append(type, file);

    xhr.open(
      "POST",
      type === "image"
        ? "/api/upload-chat-image"
        : "/api/upload-chat-video"
    );

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject();
      }
    };

    xhr.onerror = reject;
    xhr.send(fd);
  });
}



function pushUploadProgress(msgId) {
  const div = document.createElement("div");
  div.className = "chat-line me";
  div.dataset.msgId = msgId;

  div.innerHTML = `
    <div class="upload-ring" id="ring-${msgId}">
      <span id="ring-text-${msgId}">0%</span>
    </div>
  `;

  chatBox.appendChild(div);
  scrollChatToBottom(true);
}


function updateUploadProgress(msgId, percent) {
  const ring = document.getElementById(`ring-${msgId}`);
  const text = document.getElementById(`ring-text-${msgId}`);
  if (!ring || !text) return;

  ring.style.background =
    `conic-gradient(#00eaff ${percent * 3.6}deg, rgba(255,255,255,.15) 0deg)`;

  text.textContent = percent + "%";
}







const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");


// 🔥 AUTO GROW TEXTAREA
msgInput.addEventListener("input", () => {
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";

  // giữ logic mờ / hiện nút gửi
  sendBtn.style.opacity = msgInput.value.trim() ? "1" : "0.4";
});


function openImgZoom(url) {
  const modal = document.getElementById("imgZoom");
  const img = document.getElementById("imgZoomView");
  img.src = url;
  modal.classList.remove("hidden");
}





  let zoomImages = [];
let zoomIndex = 0;

// mở viewer với danh sách ảnh
function openAlbumZoom(urls, index = 0) {
  zoomImages = urls;
  zoomIndex = index;

  const modal = document.getElementById("imgZoom");
  modal.classList.remove("hidden");

  renderZoomImage();
}

// render ảnh + indicator
function renderZoomImage() {
  const img = document.getElementById("imgZoomView");
  const ind = document.getElementById("imgZoomIndicator");

  img.src = zoomImages[zoomIndex];
  ind.textContent = `${zoomIndex + 1} / ${zoomImages.length}`;
}

// điều hướng
function nextImg() {
  if (!zoomImages.length) return;

  zoomIndex = (zoomIndex + 1) % zoomImages.length;
  renderZoomImage();
}

function prevImg() {
  if (!zoomImages.length) return;

  zoomIndex =
    (zoomIndex - 1 + zoomImages.length) % zoomImages.length;
  renderZoomImage();
}



// phím ← →
window.addEventListener("keydown", e => {
  const modal = document.getElementById("imgZoom");
  if (modal.classList.contains("hidden")) return;

  if (e.key === "ArrowRight") nextImg();
  if (e.key === "ArrowLeft") prevImg();
  if (e.key === "Escape")
    modal.classList.add("hidden");
});

// 👉 SWIPE MOBILE
let touchStartX = 0;

document
  .getElementById("imgZoomView")
  .addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
  });

document
  .getElementById("imgZoomView")
  .addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx > 50) prevImg();
    if (dx < -50) nextImg();
  });


  function scrollChatToBottom(force = false) {
  if (!chatBox) return;

  // đợi DOM render xong (rất quan trọng)
  requestAnimationFrame(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}



const imgZoom = document.getElementById("imgZoom");
const imgZoomBackdrop = imgZoom.querySelector(".img-zoom-backdrop");
const imgZoomInner = imgZoom.querySelector(".img-zoom-inner");

// 👉 Click RA NGOÀI → đóng
imgZoomBackdrop.addEventListener("click", () => {
  imgZoom.classList.add("hidden");
});

// 👉 Click BÊN TRONG (ảnh, nút) → KHÔNG đóng
imgZoomInner.addEventListener("click", e => {
  e.stopPropagation();
});


function closeImgZoom() {
  document.getElementById("imgZoom").classList.add("hidden");
}


async function confirmRevoke(msgId) {
  const ok = await showModal(
    "Thu hồi tin nhắn này?",
    "Thu hồi",
    "Huỷ"
  );
  if (!ok) return;

  revokeMessage(msgId);
}


function revokeMessage(msgId) {
  // 1️⃣ cập nhật localStorage
  Object.keys(localStorage)
    .filter(k => k.startsWith("chat_"))
    .forEach(key => {
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      let changed = false;

      arr.forEach(m => {
        if (m.id === msgId && m.from === auth.uid) {
          m.text = "__REVOKED__";
          m.revoked = true;
          changed = true;
        }
      });

      if (changed) {
        localStorage.setItem(key, JSON.stringify(arr));
      }
    });

  // 2️⃣ update UI ngay
  const el = document.querySelector(
    `[data-msg-id="${msgId}"]`
  );
  if (el) {
    el.innerHTML = `
      <div class="msg-revoked">
        🚫 Tin nhắn đã được thu hồi
      </div>
    `;
  }

  // 3️⃣ báo cho người kia
  socket.emit("revoke-message", { msgId });
}


// 🔥 NHẬN TIN THU HỒI TỪ NGƯỜI KHÁC
socket.on("revoke-message", ({ msgId }) => {
  if (!msgId) return;

  // 1️⃣ update UI nếu đang hiển thị
  const el = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (el) {
    el.innerHTML = `
      <div class="msg-revoked">
        🚫 Tin nhắn đã được thu hồi
      </div>
    `;
  }

  // 2️⃣ update localStorage (KHÔNG CHECK auth.uid)
  Object.keys(localStorage)
    .filter(k => k.startsWith("chat_"))
    .forEach(key => {
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      let changed = false;

      arr.forEach(m => {
        if (m.id === msgId) {
          m.text = "__REVOKED__";
          m.revoked = true;
          changed = true;
        }
      });

      if (changed) {
        localStorage.setItem(key, JSON.stringify(arr));
      }
    });
});



async function confirmClearMyMessages(){
  if(!currentTargetUID) return;

  const ok = await showModal(
    "Xóa toàn bộ tin nhắn bạn đã gửi?\nTin nhắn của đối phương sẽ được giữ nguyên.",
    "Xóa tin của tôi",
    "Huỷ"
  );

  if(!ok) return;

  clearMyMessages(currentTargetUID);
}


function clearMyMessages(peer){
  const me = auth.uid;
  if(!me || !peer) return;

  const key =
    me < peer ? `chat_${me}_${peer}` : `chat_${peer}_${me}`;

  // 1️⃣ XÓA TOÀN BỘ LOCAL CHAT
  localStorage.removeItem(key);

  // 2️⃣ RESET UI + STATE
  renderedMsgIds.clear();
  chatBox.innerHTML = "";

  // 3️⃣ BÁO SERVER (chỉ để dọn inbox offline)
  socket.emit("clear-my-messages", { peer });
}



socket.on("peer-cleared-my-messages", ({ by }) => {
  // 🔥 NẾU CHÍNH MÌNH LÀ NGƯỜI BẤM CLEAR → BỎ QUA
  if (by === auth.uid) return;

  const me = auth.uid;
  if(!me || !by) return;

  const key =
    me < by ? `chat_${me}_${by}` : `chat_${by}_${me}`;

  let arr = JSON.parse(localStorage.getItem(key) || "[]");

  // ❌ xóa tin của người kia
  arr = arr.filter(m => m.from !== by);
  localStorage.setItem(key, JSON.stringify(arr));

  // ❌ chỉ render nếu đang mở chat
  if (currentTargetUID === by) {
    renderedMsgIds.clear();
    chatBox.innerHTML = "";

    arr.forEach(m => {
      const isMe = m.from === me;
      pushMsg(
        isMe ? "Bạn" : currentTarget.name,
        m.revoked ? "__REVOKED__" : m.text,
        isMe,
        m.id,
        "",
        isMe ? auth.avatar : currentTarget.avatar
      );
    });
  }

  renderUserList();
});





document.getElementById("btnLocation").onclick = async () => {
  if (!currentTarget) return;

  if (!navigator.geolocation) {
    alert("Thiết bị không hỗ trợ GPS");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);

      const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

      const text = `/location ${lat},${lng}|${mapUrl}`;

      const msgId =
        Date.now() + "_" + Math.random().toString(36).slice(2);

      socket.emit("private-message", {
        to: currentTarget.uid,
        text,
        msgId
      });

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
    },
    err => {
      alert("❌ Không lấy được vị trí");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
};


// 📷 click nút → mở chọn ảnh
document.getElementById("btnImage").onclick = () => {
  document.getElementById("imgInput").click();
};

// 🎥 click nút → mở chọn video
document.getElementById("btnVideo").onclick = () => {
  document.getElementById("videoInput").click();
};


function setToolLoading(btn, loading=true){
  if(!btn) return;
  btn.classList.toggle("is-loading", loading);
}

const btnImage = document.getElementById("btnImage");
const imgInput = document.getElementById("imgInput");

btnImage.onclick = () => imgInput.click();

imgInput.onchange = async e => {
  if (!currentTarget) return;

  const files = Array.from(e.target.files);
  if (!files.length) return;

  const msgId = Date.now() + "_" + Math.random().toString(36).slice(2);
  pushUploadProgress(msgId);

  const urls = [];

  for (const file of files) {
    const { url } = await uploadChatFileWithProgress(
  file,
  "image",
  p => {
    updateUploadProgress(msgId, p);   // progress trong chat (nếu muốn giữ)
    updateToolProgress(btnImage, p);  // 🔥 progress ngay nút 📷
  }
);
    urls.push(url);
  }

  // 🔥 XÓA PROGRESS
  document.querySelector(`[data-msg-id="${msgId}"]`)?.remove();

  const text = "/album " + urls.join("|");

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

  socket.emit("private-message", { to: currentTarget.uid, msgId, text });
  e.target.value = "";
};


const btnVideo = document.getElementById("btnVideo");
const videoInput = document.getElementById("videoInput");

btnVideo.onclick = () => videoInput.click();

videoInput.onchange = async e => {
  if (!currentTarget) return;

  const file = e.target.files[0];
  if (!file) return;

  const msgId = Date.now() + "_" + Math.random().toString(36).slice(2);

  // 1️⃣ Hiện progress ring
  pushUploadProgress(msgId);

  // 2️⃣ Upload video + %
  const { url } = await uploadChatFileWithProgress(
  file,
  "video",
  p => {
    updateUploadProgress(msgId, p);
    updateToolProgress(btnVideo, p);  // 🔥 progress ngay nút 🎥
  }
);


  // 3️⃣ Xóa progress
  document.querySelector(`[data-msg-id="${msgId}"]`)?.remove();

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

  socket.emit("private-message", { to: currentTarget.uid, msgId, text });
  e.target.value = "";
};



const btnLocation = document.getElementById("btnLocation");

btnLocation.onclick = () => {
  if (!currentTarget) return;

  setToolLoading(btnLocation, true);

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      const text = `/location ${lat},${lng}|${url}`;
      const msgId = Date.now() + "_" + Math.random().toString(36).slice(2);

      pushMsg("Bạn", text, true, msgId, "✓");
      saveChat({ id: msgId, from: auth.uid, to: currentTarget.uid, text, time: Date.now(), peer: currentTarget.uid, seen:true });
      socket.emit("private-message", { to: currentTarget.uid, msgId, text });
    },
    () => alert("❌ Không lấy được vị trí"),
    { enableHighAccuracy:true, timeout:10000 }
  );

  setTimeout(()=>setToolLoading(btnLocation,false),1200);
};



function updateToolProgress(btn, percent) {
  if (!btn) return;

  btn.classList.add("uploading");

  const ring = btn.querySelector(".tool-ring");
  const icon = btn.querySelector(".tool-icon");

  ring.style.background =
    `conic-gradient(#00eaff ${percent * 3.6}deg, rgba(255,255,255,.15) 0deg)`;

  icon.textContent = percent + "%";

  if (percent >= 100) {
    setTimeout(() => {
      btn.classList.remove("uploading");
      icon.textContent = btn.id === "btnImage" ? "📷" : "🎥";
    }, 400);
  }
}

