const socket = io();
const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");

socket.emit("auth-login", { uid: auth.uid });

const userList = document.getElementById("userList");

socket.on("active-users", ({ users }) => {
  userList.innerHTML = "";

  users.forEach(u => {
    if (u.uid === auth.uid) return;

    const div = document.createElement("div");
    div.className = "inbox-item";
    div.innerHTML = `
      <img class="inbox-avatar" src="${u.avatar}">
      <div class="inbox-name">${u.name}</div>
    `;

    div.onclick = () => {
      location.href = "/chat.html?uid=" + u.uid;
    };

    userList.appendChild(div);
  });
});
