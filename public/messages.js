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
  chatTitle.textContent = "Chat với " + u.name;
  chatBox.innerHTML = "";
  openChat();
};


    userList.appendChild(div);
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
  const div = document.createElement("div");
  div.className = "chat-line";
  div.textContent = `${name}: ${text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}


const chatModal = document.getElementById("chatModal");

function openChat(){
  chatModal.classList.remove("hidden");
  setTimeout(() => {
    document.getElementById("msgInput").focus();
  }, 100);
}

function closeChat(){
  chatModal.classList.add("hidden");
  currentTarget = null;
}
