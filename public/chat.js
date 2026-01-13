const socket = io();
const auth = JSON.parse(localStorage.getItem("user_profile")||"{}");

const params = new URLSearchParams(location.search);
const targetUid = params.get("uid");

socket.emit("auth-login", { uid: auth.uid });

let targetSocketId = null;

socket.on("active-users", ({ users })=>{
  const u = users.find(x=>x.uid===targetUid);
  if(!u) return;
  targetSocketId = u.socketId;
  document.getElementById("chatTitle").textContent = "💬 " + u.name;
});

socket.emit("load-private-chat", { uid: targetUid });

const chatBox = document.getElementById("chatBox");

socket.on("private-chat-history", list=>{
  chatBox.innerHTML="";
  list.forEach(m=>{
    const me = m.from.uid === auth.uid;
    addBubble(m.text, me);
  });
});

socket.on("private-message", msg=>{
  const me = msg.from.uid === auth.uid;
  addBubble(msg.text, me);
});

document.getElementById("sendBtn").onclick = ()=>{
  const txt = msgInput.value.trim();
  if(!txt || !targetSocketId) return;

  socket.emit("private-message", {
    to: targetSocketId,
    text: txt
  });

  msgInput.value="";
};

function addBubble(text, me){
  const div = document.createElement("div");
  div.className = "msg " + (me ? "me" : "other");
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
