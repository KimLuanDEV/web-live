const socket = io();


socket.on("lobby-update", ({ rooms }) => {
  const box = document.getElementById("liveRooms");
  if (!box) return;

  if (!rooms.length) {
    box.innerHTML = "<i>Không có phòng đang live</i>";
    return;
  }

  box.innerHTML = rooms.map(r => `
    <div style="margin-bottom:8px">
      🔴 <b>${r.roomId}</b>
      (${r.viewers} viewers)
      <button onclick="forceCloseRoom('${r.roomId}')">
        🚫 Đóng room
      </button>
    </div>
  `).join("");
});


function forceCloseRoom(roomId){
  const ok = confirm("🚨 Đóng sập room này?");
  if (!ok) return;

  socket.emit("admin-close-room", {
    roomId,
    reason: "Vi phạm quy định"
  });
}


const admin = JSON.parse(localStorage.getItem("user_profile") || "{}");

if (!admin.uid) {
  alert("❌ Chưa đăng nhập");
  location.href = "/login.html";
} else {
  const el = document.getElementById("adminUid");
  if (el) el.textContent = admin.uid;
}


async function topup(){
  const uid = document.getElementById("uid").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const note = document.getElementById("note").value;

  const res = await fetch("/api/admin/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminUid: admin.uid,
      targetUid: uid,
      amount,
      note
    })
  });

  const data = await res.json();

if (data.ok) {
  document.getElementById("log").textContent =
    `✅ Đã nạp ${amount.toLocaleString()} coin cho ${uid}`;
  loadUsers(); // refresh bảng
} else {
  document.getElementById("log").textContent =
    "❌ Nạp coin thất bại";
}


}


let USERS = [];

async function loadUsers(){
  const res = await fetch("/api/admin/users", {
    headers: {
      "x-uid": admin.uid
    }
  });
  const data = await res.json();
  if (!data.ok) return;

  USERS = data.users;


document.getElementById("statUsers").textContent = USERS.length;
document.getElementById("statCoins").textContent =
  USERS.reduce((s,u)=>s+(u.coins||0),0).toLocaleString();
document.getElementById("statBlocked").textContent =
  USERS.filter(u=>u.blocked).length;
document.getElementById("statAdmins").textContent =
  USERS.filter(u=>u.role==="admin").length;


  renderUsers(USERS);
}

function renderUsers(list){
  const tbody = document.querySelector("#userTable tbody");
  tbody.innerHTML = "";

  list.forEach(u => {
    const tr = document.createElement("tr");
if (u.blocked) {
  tr.style.opacity = "0.45";
  tr.style.filter = "grayscale(1)";
  tr.style.background = "rgba(255,80,80,.06)";
}

    tr.innerHTML = `
  <td>
  <div class="user-cell">
    <img src="${u.avatar || '/avatar-default.png'}">
    <div>
      <b>${u.name}</b><br>
      <small>${u.uid}</small>
    </div>
  </div>
</td>


      <td>${u.coins}</td>
      <td>${u.level}</td>
      <td>${u.exp}</td>
      <td>${u.coinSent}</td>
      <td>${u.coinReceived}</td>

      <td class="${u.role === "admin" ? "role-admin" : ""}">
  ${u.role}
</td>

 <td>
  <button
  class="action-btn"
  onclick="event.stopPropagation(); quickTopup('${u.uid}')"
>
  ➕
</button>

<button
  class="action-btn"
  style="color:${u.blocked ? '#ff6b6b' : '#00e5ff'}"
  onclick="event.stopPropagation(); toggleLock('${u.uid}', ${u.blocked})"
>
  ${u.blocked ? "🔓" : "🚫"}
</button>
</td>


    `;
    tbody.appendChild(tr);
  });
}

// 🔍 SEARCH
document.getElementById("searchUser").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  const filtered = USERS.filter(u =>
    u.uid.toLowerCase().includes(q) ||
    u.name.toLowerCase().includes(q)
  );
  renderUsers(filtered);
});

// ➕ NẠP NHANH
async function quickTopup(uid){
  const amount = prompt("Nạp bao nhiêu coin?");
  if (!amount) return;

  await fetch("/api/admin/topup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      adminUid: admin.uid,
      targetUid: uid,
      amount: Number(amount)
    })
  });

  loadUsers(); // refresh list
}




// 🚫 KHOÁ / MỞ KHOÁ USER
async function toggleLock(uid, isBlocked){
  const reason = prompt(
    isBlocked
      ? "🔓 Lý do mở khoá (tuỳ chọn):"
      : "🚫 Lý do khoá tài khoản:"
  );

  // khi khoá → bắt buộc có lý do
  if (!isBlocked && (!reason || !reason.trim())) {
    alert("⚠️ Vui lòng nhập lý do khoá");
    return;
  }

  const ok = confirm(
    isBlocked
      ? "Xác nhận MỞ KHOÁ tài khoản này?"
      : "Xác nhận KHOÁ tài khoản này?"
  );
  if (!ok) return;


await fetch("/api/admin/lock-user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    adminUid: admin.uid,
    targetUid: uid,
    lock: !isBlocked,
    reason: reason || ""
  })
});

  loadUsers();
}



loadUsers();

