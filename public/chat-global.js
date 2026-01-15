const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
if(!auth?.uid) return;

window.socket = window.socket || io();
const socket = window.socket;

// 🔥 luôn đăng ký uid cho socket
socket.emit("auth-login", { uid: auth.uid });

setInterval(()=>{
  socket.emit("auth-ping", { uid: auth.uid });
}, 15000);


// ===== RECEIVE PRIVATE MESSAGE ANYWHERE =====
socket.on("private-message", ({ from, text, msgId }) => {

  // lưu vào localStorage
  const a = auth.uid;
  const b = from.uid;
  const key = a < b ? "chat_" + a + "_" + b : "chat_" + b + "_" + a;

  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  arr.push({
    from: from.uid,
    to: a,
    text,
    time: Date.now(),
    peer: from.uid
  });
  localStorage.setItem(key, JSON.stringify(arr));

  // nếu không ở messages.html → hiển thị popup
  if(!location.pathname.includes("messages.html")){
    showMsg(`📩 Tin nhắn từ ${from.name}: ${text.slice(0,60)}`);
  }

  socket.emit("msg-seen", { to: from.uid, msgId });
});
