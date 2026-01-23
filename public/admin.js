

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

// ===== LIVE ROOMS (Realtime) =====
let LIVE_ROOMS = [];
let liveSocket = null;

function fmtTime(ts){
  try{
    return new Date(ts).toLocaleString("vi-VN");
  }catch{
    return "";
  }
}
function fmtDuration(ms){
  ms = Math.max(0, ms|0);
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  const h = Math.floor(m/60);
  const mm = String(m%60).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return h>0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function renderLiveRooms(list){
  const tbody = document.querySelector("#liveTable tbody");
  if(!tbody) return;

  tbody.innerHTML = "";
  const now = Date.now();

  list.forEach(r=>{
    const tr = document.createElement("tr");

    const host = r.host || {};
    const hostName = host.name || "Host";
    const hostUid  = host.uid || "";
    const hostAva  = host.avatar || "/avatar-default.png";

    tr.innerHTML = `
      <td><b>${r.roomId}</b></td>

      <td>
        <div class="user-cell">
          <img src="${hostAva}" onerror="this.src='/avatar-default.png'">
          <div>
            <b>${hostName}</b><br>
            <small>${hostUid}</small>
          </div>
        </div>
      </td>

      <td><b style="color:#00e5ff">${r.viewers || 0}</b></td>
      <td>${fmtTime(r.liveStartTs)}</td>
      <td>${fmtDuration(now - (r.liveStartTs || now))}</td>

      <td>
        <button class="btn-mini"
          onclick="event.stopPropagation(); adminCloseRoom('${r.roomId}')">
          🚫 Đóng
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function filterLiveRooms(){
  const q = (document.getElementById("searchRoom")?.value || "").toLowerCase().trim();
  if(!q) return LIVE_ROOMS;

  return LIVE_ROOMS.filter(r=>{
    const rid = String(r.roomId||"").toLowerCase();
    const hostName = String(r.host?.name||"").toLowerCase();
    const hostUid  = String(r.host?.uid||"").toLowerCase();
    return rid.includes(q) || hostName.includes(q) || hostUid.includes(q);
  });
}

async function refreshLiveRooms(){
  const elLog = document.getElementById("liveLog");
  if(elLog) elLog.textContent = "⏳ Đang tải live rooms...";

  const res = await fetch("/api/admin/live-rooms", {
    headers: { "x-uid": admin.uid }
  });

  const data = await res.json();
  if(!data.ok){
    if(elLog) elLog.textContent = "❌ Không tải được live rooms";
    return;
  }

  LIVE_ROOMS = data.rooms || [];
  renderLiveRooms(filterLiveRooms());

  if(elLog) elLog.textContent =
    `✅ Live rooms: ${LIVE_ROOMS.length} (ts: ${fmtTime(data.ts)})`;
}

// realtime from server: io.emit("lobby-update", { rooms, ts })
function initLiveRoomsRealtime(){
  if(typeof io !== "function") return;

  liveSocket = io();

  liveSocket.on("connect", ()=>{
    // load lần đầu ngay khi connect
    refreshLiveRooms();
  });

  liveSocket.on("lobby-update", ({ rooms })=>{
    LIVE_ROOMS = rooms || [];
    renderLiveRooms(filterLiveRooms());
  });
}

// nút đóng ngay trong bảng
async function adminCloseRoom(roomId){
  const reason = prompt("🚫 Lý do đóng room (tuỳ chọn):") || "";

  const ok = confirm(`Xác nhận đóng room "${roomId}" ?`);
  if(!ok) return;

  const res = await fetch("/api/admin/close-room", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      adminUid: admin.uid,
      roomId,
      reason
    })
  });

  const data = await res.json();
  const elLog = document.getElementById("liveLog");

  if(data.ok){
    if(elLog) elLog.textContent = `✅ Đã đóng room ${roomId}`;
    // server sẽ tự emitLobbyUpdate() nên bảng tự cập nhật
  }else{
    if(elLog) elLog.textContent = `❌ Đóng thất bại: ${data.error || "fail"}`;
  }
}

// search live rooms
const roomSearch = document.getElementById("searchRoom");
if(roomSearch){
  roomSearch.addEventListener("input", ()=>{
    renderLiveRooms(filterLiveRooms());
  });
}

// start realtime
initLiveRoomsRealtime();


async function closeLiveRoom(){
  const roomId = document.getElementById("closeRoomId").value.trim();
  const reason = document.getElementById("closeReason").value.trim();

  if(!roomId){
    alert("⚠️ Nhập roomId");
    return;
  }

  const ok = confirm(`Xác nhận đóng room "${roomId}" ?`);
  if(!ok) return;

  const res = await fetch("/api/admin/close-room", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      adminUid: admin.uid,
      roomId,
      reason
    })
  });

  const data = await res.json();

  document.getElementById("closeLog").textContent =
    data.ok
      ? `✅ Đã đóng room ${roomId}`
      : `❌ Lỗi: ${data.error || "fail"}`;
}
