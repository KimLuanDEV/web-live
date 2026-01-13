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
    if(u.name === auth.name) return;

  const div = document.createElement("div");
div.className = "user-item";
div.innerHTML = `
  <img class="user-avatar" src="${u.avatar}">
  <div class="user-name">${u.name}</div>
`;

div.onclick = () => {
  document.querySelectorAll(".user-item").forEach(x=>x.classList.remove("active"));
  div.classList.add("active");

  currentTarget = u;
  chatTitle.textContent = "💬 " + u.name;
  chatBox.innerHTML = "";
  socket.emit("load-private-chat", { uid: u.uid });
};



    userList.appendChild(div);
  });
});


socket.on("private-chat-history", (list) => {
  chatBox.innerHTML = "";
  list.forEach(m => {
    const name = m.from.uid === auth.uid ? "Bạn" : m.from.name;
    pushMsg(name, m.text);
  });
});

document.getElementById("sendBtn").onclick = () => {
  const txt = document.getElementById("msgInput").value.trim();
  if(!txt || !currentTarget) return;

  socket.emit("private-message", {
    to: currentTarget.socketId,
    text: txt
  });

  pushMsg("Bạn", txt);
  document.getElementById("msgInput").value = "";
};

socket.on("private-message", ({ from, text }) => {
  pushMsg(from.name, text);
});

function pushMsg(name, text){
  const isMe = name === "Bạn";
  const div = document.createElement("div");
  div.className = "msg " + (isMe ? "me" : "other");
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
