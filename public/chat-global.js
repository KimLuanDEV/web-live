function getChatKey(a, b) {
  if (!a || !b) return null;
  return a < b
    ? "chat_" + a + "_" + b
    : "chat_" + b + "_" + a;
}



(() => {
  const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
  if (!auth?.uid) return;

  window.socket = window.socket || io();
  const socket = window.socket;

  // 🔥 luôn đăng ký uid cho socket
  socket.emit("auth-login", { uid: auth.uid });

socket.on("offline-messages", msgs => {
  if (!Array.isArray(msgs) || !msgs.length) return;

  let notifyCount = 0;
  let lastFrom = null;

  msgs.forEach(m => {
    const key = getChatKey(m.from, m.to);
    if (!key) return;

    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    arr.push(m);
    localStorage.setItem(key, JSON.stringify(arr));

    notifyCount++;
    lastFrom = m.from;
  });

  // 🔔 chỉ hiện 1 thông báo gộp
  if (!location.pathname.includes("messages.html") && notifyCount > 0) {
    if (notifyCount === 1) {
      showMsg(`📩 Tin nhắn từ ${lastFrom}`);
    } else {
      showMsg(`📩 Bạn có ${notifyCount} tin nhắn mới`);
    }
  }
});



  setInterval(() => {
    socket.emit("auth-ping", { uid: auth.uid });
  }, 15000);

  // ===== RECEIVE PRIVATE MESSAGE ANYWHERE =====
  socket.on("private-message", ({ from, text, msgId }) => {

    if (!from?.uid || !text) return;


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

    if (!location.pathname.includes("messages.html")) {
      showMsg(`📩 Tin nhắn từ ${from.name}: ${text.slice(0, 60)}`);
      document.querySelector('[data-tab="chat"]')?.classList.add("has-new"); 
    }

    socket.emit("msg-seen", { to: from.uid, msgId });
  });

})();


