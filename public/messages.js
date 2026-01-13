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
    div.className = "badge";
    div.innerHTML = `<img src="${u.avatar}" width="24" style="border-radius:50%"> ${u.name}`;

    div.onclick = () => {
  chatAvatar.src = u.avatar;
  currentTarget = u;
  chatTitle.textContent = "Chat với " + u.name;
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

  pushMsg(from.name, text, false);
  document.getElementById("msgInput").value = "";
};

socket.on("private-message", ({ from, text }) => {
  pushMsg(from.name, text);
});

function pushMsg(name, text, mine=false){
  const div = document.createElement("div");
  div.className = "msg-bubble " + (mine ? "msg-me" : "msg-other");
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
