

const admin = JSON.parse(localStorage.getItem("user_profile") || "{}");


const PAGE_SIZE = 5;
let userPage = 1;
let userSearchKey = "";

// ===== WITHDRAW PAGINATION =====
const WITHDRAW_PAGE_SIZE = 5;
let withdrawPage = 1;
let WITHDRAWS = [];


let currentAdminTab = "users";

function gotoUserPage(page){
  let list = USERS;

  if (userSearchKey) {
    list = USERS.filter(u =>
      u.uid.toLowerCase().includes(userSearchKey) ||
      u.name.toLowerCase().includes(userSearchKey)
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));

  // 🔒 chặn vượt biên
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  userPage = page;
  renderUserPage();
}


function renderUserPage(){
  let list = USERS;

  // 🔍 áp dụng search nếu có
  if (userSearchKey) {
    list = USERS.filter(u =>
      u.uid.toLowerCase().includes(userSearchKey) ||
      u.name.toLowerCase().includes(userSearchKey)
    );
  }

  const start = (userPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const slice = list.slice(start, end);

  if (currentAdminTab === "users") {
    renderUsers(slice);      // desktop
    renderUserCards(slice);  // mobile
  }

  const info = document.getElementById("userPageInfo");
  if (info) {
    info.textContent =
      `Trang ${userPage} / ${Math.max(1, Math.ceil(list.length / PAGE_SIZE))}`;
  }

  // 🔒 DISABLE PAGER BUTTON
  const pager = document.querySelector(".pager");
  if (pager) {
    const btnPrev = pager.querySelector("button:first-child");
    const btnNext = pager.querySelector("button:last-child");

    let totalList = USERS;
    if (userSearchKey) {
      totalList = USERS.filter(u =>
        u.uid.toLowerCase().includes(userSearchKey) ||
        u.name.toLowerCase().includes(userSearchKey)
      );
    }

    const totalPages = Math.max(1, Math.ceil(totalList.length / PAGE_SIZE));

    if (btnPrev) btnPrev.disabled = userPage <= 1;
    if (btnNext) btnNext.disabled = userPage >= totalPages;
  }




}




function renderUserCards(list){
  const wrap = document.getElementById("userCardList");
  if (!wrap) return;

  wrap.innerHTML = "";

  list.forEach(u=>{
    const card = document.createElement("div");
    card.className = "user-card";

    card.innerHTML = `
      <div class="user-card-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
        <img src="${u.avatar || '/avatar-default.png'}">
        <div>
          <b>${u.name}</b><br>
          <small>${u.uid}</small>
        </div>
      </div>

      <div class="user-card-detail hidden">
        💰 Coin: <b>${u.coins}</b><br>
        ⭐ Level: <b>${u.level}</b><br>
        📈 EXP: <b>${u.exp}</b><br>
        🎁 Đã tặng: <b>${u.coinSent}</b> |
        💎 Đã nhận: <b>${u.coinReceived}</b><br><br>

        <button class="action-btn"
          onclick="quickTopup('${u.uid}')">➕</button>
        <button class="action-btn"
          onclick="quickWithdraw('${u.uid}')">➖</button>
        <button class="action-btn"
          onclick="toggleLock('${u.uid}', ${u.blocked})">
          ${u.blocked ? "🔓" : "🚫"}
        </button>
      </div>
    `;

    wrap.appendChild(card);
  });
}


if (!admin.uid) {
  showModal({
    title: "❌ Chưa đăng nhập",
    body: "Vui lòng đăng nhập lại"
  }).then(() => {
    location.href = "/login.html";
  });
}

else {
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


  renderUserPage();

}

function renderUsers(list){
  const tbody = document.querySelector("#userTable tbody");
  tbody.innerHTML = "";

 list.forEach(u => {
  const tr = document.createElement("tr");

  if (u.blocked) {
    tr.style.opacity = "0.5";
    tr.style.filter = "grayscale(1)";
  }

  tr.innerHTML = `
    <td>
      <div class="user-row" onclick="toggleUserDetail(this)">
        <div class="user-cell">
          <img src="${u.avatar || '/avatar-default.png'}">
          <div>
            <b>${u.name}</b><br>
            <small>${u.uid}</small>
          </div>
        </div>

        <div class="user-detail hidden">
          <div class="user-meta">
            💰 Coin: <b>${u.coins}</b> |
            ⭐ Level: <b>${u.level}</b> |
            📈 EXP: <b>${u.exp}</b><br>
            🎁 Đã tặng: <b>${u.coinSent}</b> |
            💎 Đã nhận: <b>${u.coinReceived}</b><br>
            🧩 Role:
            <b class="${u.role === "admin" ? "role-admin" : ""}">
              ${u.role}
            </b>
          </div>

          <div class="user-actions">
            <button class="action-btn"
              onclick="event.stopPropagation(); quickTopup('${u.uid}')">➕</button>

            <button class="action-btn"
              onclick="event.stopPropagation(); quickWithdraw('${u.uid}')">➖</button>

            <button class="action-btn"
              onclick="event.stopPropagation(); toggleLock('${u.uid}', ${u.blocked})">
              ${u.blocked ? "🔓 Mở khoá" : "🚫 Khoá"}
            </button>
          </div>
        </div>
      </div>
    </td>
  `;

  tbody.appendChild(tr);
});




}





async function quickTopup(uid){
  const amount = await showModal({
    title: "➕ Nạp coin",
    body: "Nhập số coin:",
    input: true,
    confirm: true
  });
  if (!amount) return;

  await fetch("/api/admin/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminUid: admin.uid,
      targetUid: uid,
      amount: Number(amount)
    })
  });

  loadUsers();
}





async function toggleLock(uid, isBlocked){
  const reason = await showModal({
    title: isBlocked ? "🔓 Mở khoá tài khoản" : "🚫 Khoá tài khoản",
    body: "Nhập lý do:",
    input: true,
    confirm: true
  });

  if (reason === false) return;

  if (!isBlocked && !reason.trim()) {
    await showModal({
      title: "⚠️ Thiếu lý do",
      body: "Vui lòng nhập lý do khoá tài khoản"
    });
    return;
  }

  const ok = await showModal({
    title: "Xác nhận",
    body: isBlocked
      ? "Bạn chắc chắn muốn MỞ KHOÁ tài khoản này?"
      : "Bạn chắc chắn muốn KHOÁ tài khoản này?",
    confirm: true
  });
  if (!ok) return;

  await fetch("/api/admin/lock-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminUid: admin.uid,
      targetUid: uid,
      lock: !isBlocked,
      reason
    })
  });

  loadUsers();
}




const searchInput = document.getElementById("searchUser");

if (searchInput) {
  searchInput.addEventListener("input", e => {
    userSearchKey = e.target.value.trim().toLowerCase();
    userPage = 1;          // 🔁 reset về trang đầu
    renderUserPage();      // 🔥 render đúng flow
  });
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

async function adminCloseRoom(roomId){
  const reason = await showModal({
    title: "🚫 Đóng room live",
    body: "Nhập lý do (tuỳ chọn):",
    input: true,
    confirm: true
  });
  if (reason === false) return;

  const ok = await showModal({
    title: "Xác nhận",
    body: `Bạn chắc chắn muốn đóng room "${roomId}" ?`,
    confirm: true
  });
  if (!ok) return;

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

  await showModal({
    title: data.ok ? "✅ Thành công" : "❌ Thất bại",
    body: data.ok ? `Đã đóng room ${roomId}` : "Không đóng được room"
  });
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


async function quickWithdraw(uid){
  const amount = await showModal({
    title: "➖ Rút coin",
    body: "Nhập số coin cần rút:",
    input: true,
    confirm: true
  });
  if (!amount) return;

  const note = await showModal({
    title: "📝 Ghi chú",
    body: "Nhập lý do rút coin:",
    input: true,
    confirm: true
  });
  if (note === false) return;

  await fetch("/api/admin/withdraw", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      adminUid: admin.uid,
      targetUid: uid,
      amount: Number(amount),
      note
    })
  });

  loadUsers();
}




function renderWithdrawCards(list){
  const wrap = document.getElementById("withdrawCardList");
  if (!wrap) return;

  wrap.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    wrap.innerHTML = `<div class="muted">Chưa có yêu cầu rút tiền.</div>`;
    return;
  }

  list.forEach(w=>{
    const card = document.createElement("div");
    card.className = "withdraw-card";

    const status = (w.status || "pending").toLowerCase();
    const chipClass = status === "approved" ? "w-approved" : status === "rejected" ? "w-rejected" : "w-pending";
    const time = w.createdAt ? new Date(w.createdAt).toLocaleString("vi-VN") : "-";
    const bank = w.bank || "-";
    const amountText = (Number(w.amount) || 0).toLocaleString();

    card.innerHTML = `
      <div class="withdraw-card-head">
        <img src="${w.avatar || "/avatar-default.png"}" onerror="this.src='/avatar-default.png'">
        <div style="flex:1">
          <b>${w.name || "Unknown"}</b><br>
          <small>${w.uid || ""}</small>
        </div>

        <span class="w-chip ${chipClass}">${status}</span>
      </div>

      <div class="withdraw-card-meta">
        💎 Số tiền: <b>${amountText}</b><br>
        🏦 ${bank}<br>
        🕒 ${time}
      </div>

      <div class="withdraw-card-actions">
        ${
          status === "pending"
            ? `
              <button onclick="withdrawAction('${w.id}','approve')">✅ Duyệt</button>
              <button onclick="withdrawAction('${w.id}','reject')">❌ Từ chối</button>
            `
            : `<span class="muted">Đã xử lý</span>`
        }
      </div>
    `;

    wrap.appendChild(card);
  });
}


async function loadWithdraws() {
  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

  const res = await fetch("/api/admin/withdraw-requests", {
    headers: { "x-uid": me.uid }
  });

  const data = await res.json();
  if (!data.ok) return;

  const tbody = document.querySelector("#withdrawTable tbody");
  tbody.innerHTML = "";

  data.list.forEach(w => {
    const tr = document.createElement("tr");


tr.innerHTML = `
  <td>
    <div class="withdraw-user">
      <img src="${w.avatar || '/avatar-default.png'}"
           onerror="this.src='/avatar-default.png'">
      <div>
        <b>${w.name}</b><br>
        <small>${w.uid}</small>
      </div>
    </div>
  </td>

  <td><b>${w.amount.toLocaleString()}</b></td>
  <td>${w.bank || "-"}</td>
  <td>${new Date(w.createdAt).toLocaleString("vi-VN")}</td>

  <td>
    <span class="st-${w.status}">
      ${w.status}
    </span>
  </td>

  <td class="withdraw-actions">
    ${
      w.status === "pending"
        ? `
        <button onclick="withdrawAction('${w.id}','approve')">✅</button>
        <button onclick="withdrawAction('${w.id}','reject')">❌</button>
        `
        : "-"
    }
  </td>
`;

    tbody.appendChild(tr);
  });


WITHDRAWS = data.list || [];
withdrawPage = 1;
renderWithdrawPage();



}



function renderWithdrawPage(){
  const totalPages = Math.max(1, Math.ceil(WITHDRAWS.length / WITHDRAW_PAGE_SIZE));
  if (withdrawPage < 1) withdrawPage = 1;
  if (withdrawPage > totalPages) withdrawPage = totalPages;

  const start = (withdrawPage - 1) * WITHDRAW_PAGE_SIZE;
  const slice = WITHDRAWS.slice(start, start + WITHDRAW_PAGE_SIZE);

  // 🖥 render TABLE
  const tbody = document.querySelector("#withdrawTable tbody");
  if (tbody) {
    tbody.innerHTML = "";
    slice.forEach(w=>{
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>
          <div class="withdraw-user">
            <img src="${w.avatar || '/avatar-default.png'}"
                 onerror="this.src='/avatar-default.png'">
            <div>
              <b>${w.name}</b><br>
              <small>${w.uid}</small>
            </div>
          </div>
        </td>

        <td><b>${Number(w.amount).toLocaleString()}</b></td>
        <td>${w.bank || "-"}</td>
        <td>${new Date(w.createdAt).toLocaleString("vi-VN")}</td>

        <td>
          <span class="st-${w.status}">
            ${w.status}
          </span>
        </td>

        <td class="withdraw-actions">
          ${
            w.status === "pending"
              ? `
              <button onclick="withdrawAction('${w.id}','approve')">✅</button>
              <button onclick="withdrawAction('${w.id}','reject')">❌</button>
              `
              : "-"
          }
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 📱 render CARD LIST
  renderWithdrawCards(slice);

  // 🔢 update pager
  const info = document.getElementById("withdrawPageInfo");
  if (info) {
    info.textContent = `Trang ${withdrawPage} / ${totalPages}`;
  }

  const btnPrev = document.getElementById("withdrawPrev");
  const btnNext = document.getElementById("withdrawNext");

  if (btnPrev) btnPrev.disabled = withdrawPage <= 1;
  if (btnNext) btnNext.disabled = withdrawPage >= totalPages;
}



async function withdrawAction(id, action) {
  const note = await showModal({
    title: action === "approve" ? "✅ Duyệt rút tiền" : "❌ Từ chối rút tiền",
    body: "Nhập ghi chú (tuỳ chọn):",
    input: true,
    confirm: true
  });
  if (note === false) return;

  const res = await fetch("/api/admin/withdraw-action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-uid": admin.uid
    },
    body: JSON.stringify({
      adminUid: admin.uid,
      id,
      action,
      note
    })
  });

  const data = await res.json();

  await showModal({
    title: data.ok ? "✅ Thành công" : "❌ Thất bại",
    body: data.ok
      ? "Đã xử lý yêu cầu rút tiền"
      : ("Lỗi: " + (data.error || "unknown"))
  });

  if (data.ok) loadWithdraws();
}


loadWithdraws();


let withdrawSocket = null;

function initWithdrawRealtime(){
  if (typeof io !== "function") return;

  withdrawSocket = io();

  withdrawSocket.on("connect", () => {
    console.log("🔔 Withdraw realtime connected");
  });

  withdrawSocket.on("withdraw-update", ({ ts }) => {
  const ping = document.getElementById("withdrawPing");
  if (ping) ping.classList.remove("hidden");

  loadWithdraws();

  // tự tắt ping sau 2s
  setTimeout(() => {
    ping && ping.classList.add("hidden");
  }, 2000);
});



}

initWithdrawRealtime();


document.querySelectorAll(".admin-tabs .tab").forEach(tab=>{
  tab.onclick = ()=>{


    document.querySelectorAll(".admin-tabs .tab")
      .forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");

    const key = tab.dataset.tab;
    currentAdminTab = key;

if (key === "withdraws") {
  loadWithdraws();   // 🔥 BẮT BUỘC
}



    document.querySelectorAll(".admin-section")
      .forEach(sec=>{
        sec.classList.toggle("hidden", sec.dataset.section !== key);
      });

    // 🔥 QUAN TRỌNG: ẨN / HIỆN USER CARD LIST
    const userCardList = document.getElementById("userCardList");
    if (userCardList) {
      userCardList.style.display =
        key === "users" ? "" : "none";
    }
  };
});





function toggleUserDetail(el){
  const detail = el.querySelector(".user-detail");
  if (!detail) return;

  detail.classList.toggle("hidden");
}



const wPrev = document.getElementById("withdrawPrev");
const wNext = document.getElementById("withdrawNext");

if (wPrev) {
  wPrev.onclick = () => {
    withdrawPage--;
    renderWithdrawPage();
  };
}

if (wNext) {
  wNext.onclick = () => {
    withdrawPage++;
    renderWithdrawPage();
  };
}


function adminGoBack(){
  if (history.length > 1) {
    history.back();
  } else {
    location.href = "/"; // fallback
  }
}


async function adminDeletePost(postId){
  const reason = await showModal({
    title: "🗑️ Xoá bài đăng",
    body: "Nhập lý do xoá (tuỳ chọn):",
    input: true,
    confirm: true
  });
  if (reason === false) return;

  const ok = await showModal({
    title: "Xác nhận",
    body: "Bạn chắc chắn muốn xoá bài đăng này?",
    confirm: true
  });
  if (!ok) return;

  const res = await fetch("/api/admin/delete-post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminUid: admin.uid,
      postId,
      reason
    })
  });

  const data = await res.json();

  await showModal({
    title: data.ok ? "✅ Thành công" : "❌ Thất bại",
    body: data.ok ? "Đã xoá bài đăng" : "Không xoá được bài"
  });
}






function showModal({ title, body, input=false, confirm=false }) {
  return new Promise(resolve => {
    const modal = document.getElementById("adminModal");
    const titleEl = document.getElementById("modalTitle");
    const bodyEl  = document.getElementById("modalBody");
    const inputEl = document.getElementById("modalInput");
    const btnOk   = document.getElementById("modalOk");
    const btnCancel = document.getElementById("modalCancel");

    titleEl.textContent = title || "Thông báo";
    bodyEl.innerHTML = body || "";
    modal.classList.remove("hidden");

    inputEl.classList.toggle("hidden", !input);
    inputEl.value = "";

    btnCancel.classList.toggle("hidden", !confirm);

    btnOk.onclick = () => {
      modal.classList.add("hidden");
      resolve(input ? inputEl.value : true);
    };

    btnCancel.onclick = () => {
      modal.classList.add("hidden");
      resolve(false);
    };
  });
}



async function loadDisputes(){
  const me = JSON.parse(localStorage.getItem("user_profile"));

  const res = await fetch("/api/admin/market/disputes",{
    headers:{ "x-uid": me.uid }
  });
  const data = await res.json();
  if(!data.ok) return;

  const wrap = document.getElementById("disputeList");
  wrap.innerHTML = "";

  if(data.list.length === 0){
    wrap.innerHTML = `<div class="empty">Không có khiếu nại</div>`;
    return;
  }

  data.list.forEach(item=>{
    const o = item.order;

    const div = document.createElement("div");
    div.className = "admin-card";

const evidences = o.dispute?.evidences || [];

div.innerHTML = `
  <b>📦 ${o.productName} ×${o.qty}</b>
  <div>🏪 Gian hàng: ${item.boothName}</div>
  <div>👤 Buyer: ${o.buyerUid}</div>

  <div style="color:#ff9800;margin-top:4px">
    ⚠️ Lý do: ${o.dispute?.reason || ""}
  </div>

  ${
    evidences.length
      ? `
      <div style="
        margin-top:8px;
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:6px
      ">
        ${evidences.map((m, i) => 
          m.type === "video"
            ? `
              <video
                src="${m.url}"
                controls
                style="width:100%;border-radius:8px">
              </video>
            `
            : `
              <img
                src="${m.url}"
                style="
                  width:100%;
                  border-radius:8px;
                  cursor:zoom-in
                "
               onclick='openGallery(${JSON.stringify(evidences)}, ${i})'

              >
            `
        ).join("")}
      </div>
      `
      : `<div class="muted" style="margin-top:6px">Không có bằng chứng đính kèm</div>`
  }

  <div style="display:flex;gap:8px;margin-top:10px">
    <button style="color:#ff5f6d"
      onclick="adminRefund('${o.id}')">
      ❌ Hoàn tiền
    </button>

    <button style="color:#25F09A"
      onclick="adminApprove('${o.id}')">
      ✅ Chấp nhận đơn
    </button>
  </div>
`;


    wrap.appendChild(div);
  });
}


async function adminRefund(orderId){
  const me = JSON.parse(localStorage.getItem("user_profile"));

  const ok = await showModal({
    title:"❌ Hoàn tiền",
    body:"Xác nhận hoàn tiền cho người mua?",
    confirm:true
  });
  if(!ok) return;

  const res = await fetch("/api/admin/market/refund",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      adminUid: me.uid,
      orderId
    })
  });

  const data = await res.json();
  if(data.ok){
    await showModal({
      title:"✅ Đã hoàn tiền",
      body:"Hoàn tiền thành công."
    });
    loadDisputes();
  }
}




async function adminApprove(orderId){
  const me = JSON.parse(localStorage.getItem("user_profile"));

  const ok = await showModal({
    title:"✅ Chấp nhận đơn khiếu nại",
    body:"Xác nhận cho shop nhận tiền?",
    confirm:true
  });
  if(!ok) return;

  const res = await fetch("/api/admin/market/approve-dispute",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      adminUid: me.uid,
      orderId
    })
  });

  const data = await res.json();
  if(data.ok){
    await showModal({
      title:"✅ Thành công",
      body:"Đơn hàng đã được chấp nhận."
    });
    loadDisputes();
  }else{
    showModal({
      title:"❌ Lỗi",
      body:data.error || "Không xử lý được"
    });
  }
}



document.querySelector('[data-tab="disputes"]')?.addEventListener("click",()=>{
  loadDisputes();
});


function openAdminImage(url){
  showModal({
    title: "📎 Bằng chứng",
    body: `
      <img src="${url}"
        style="max-width:100%;border-radius:10px">
    `
  });
}
