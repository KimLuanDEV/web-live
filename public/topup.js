const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
if (!auth.uid) location.href = "/login.html";

// ✅ KHỞI TẠO SOCKET (BẮT BUỘC)
const socket = io();

const myCoinEl  = document.getElementById("myCoin");
const agentList = document.getElementById("agentList");
const qrBox     = document.getElementById("qrBox");
const bankInfo  = document.getElementById("bankInfo");
const agentQr   = document.getElementById("agentQr");
const sheetOverlay = document.getElementById("sheetOverlay");
const qrSheet = document.getElementById("qrSheet");
const sheetQr = document.getElementById("sheetQr");
const sheetBankInfo = document.getElementById("sheetBankInfo");
const agentSheet = document.getElementById("agentSheet");
const agentSheetList = document.getElementById("agentSheetList");

// hiển thị coin hiện tại
if (myCoinEl) {
  myCoinEl.textContent = `Kim cương hiện tại: ${auth.coins || 0} 💰`;
}

// 🔄 LOAD DANH SÁCH ĐẠI LÝ TỪ SERVER
fetch("/api/topup-agents")
  .then(r => r.json())
  .then(res => {
    console.log("TOPUP AGENTS:", res); // 🔍 DEBUG
    if (!res || !res.ok) {
      showToast("❌ Không tải được danh sách đại lý");
      return;
    }
    renderAgents(res.agents || []);
  })
  .catch(err => {
    console.error(err);
    showToast("❌ Lỗi kết nối server");
  });

// render danh sách đại lý
function renderAgents(list) {
  const target = agentSheetList || agentList;
  if (!target) return;

  target.innerHTML = "";



  if (!agentList) return;

  agentList.innerHTML = "";

  if (!list.length) {
    agentList.innerHTML = `
      <div style="opacity:.6;text-align:center;padding:12px">
        ⚠️ Hiện chưa có đại lý nạp coin
      </div>
    `;
    return;
  }

  list.forEach(agent => {
    if (!agent.account || !agent.bank) {
      console.warn("Agent thiếu bank/account:", agent);
    }

    const div = document.createElement("div");
    div.className = "agent-card";
    div.dataset.uid = agent.uid; // 🔥 QUAN TRỌNG
    div.innerHTML = `
      <img class="agent-avatar" src="${agent.avatar}">
      <div class="agent-info">
        <div class="agent-name">${agent.name}</div>
        <div class="agent-bank">${agent.bank || "?"} • ${agent.account || "?"}</div>
        <div class="agent-status ${agent.online ? "" : "offline"}">
          ${agent.online ? "🟢 Đang online" : "⚪ Offline"}
        </div>
      </div>
      <div>➕</div>
    `;

    div.onclick = () => openAgent(agent);
    target.appendChild(div);
  });
}

// mở chi tiết đại lý + QR
function openAgent(agent) {
  // đóng sheet chọn đại lý
  agentSheet.classList.remove("show");

  const content = `NAP ${auth.uid}`;

  sheetQr.src = agent.qr || "/images/qr-demo.png";

  sheetBankInfo.innerHTML = `
    <b>Đại lý:</b> ${agent.name}<br>
    <b>Ngân hàng:</b> ${agent.bank}<br>
    <b>STK:</b> ${agent.account}<br>
    <b>Chủ TK:</b> ${agent.owner || ""}<br>
    <b>Nội dung:</b> <code id="transferText">${content}</code>
  `;

  // mở sheet QR
  qrSheet.classList.add("show");
}



// copy nội dung chuyển khoản
function copyTransfer() {
  const text = document.getElementById("transferText")?.textContent;
  if (!text) return;

  navigator.clipboard.writeText(text);
  showToast("📋 Đã copy nội dung chuyển khoản");
}


socket.on("agent-status", ({ uid, online }) => {
  const card = document.querySelector(
    `.agent-card[data-uid="${uid}"]`
  );
  if (!card) return;

  const statusEl = card.querySelector(".agent-status");
  if (!statusEl) return;

  statusEl.textContent = online ? "🟢 Đang online" : "⚪ Offline";
  statusEl.classList.toggle("offline", !online);
});


socket.on("connect", () => {
  socket.emit("socket-login", {
    uid: auth.uid
  });
});


sheetOverlay.onclick = () => {
  qrSheet.classList.remove("show");
  cardSheet.classList.remove("show");
  agentSheet.classList.remove("show");

  sheetOverlay.classList.add("hidden");
  document.body.style.overflow = "";
};


myCoinEl.innerHTML = `Số dư khả dụng · <b>${auth.coins || 0}</b> 💎`;

const agentOption = document.getElementById("agentOption");

if (agentOption && agentSheet) {
  const header = agentOption.querySelector(".option-header");

  header.onclick = () => {
    // mở bottom sheet đại lý
    sheetOverlay.classList.remove("hidden");
    agentSheet.classList.add("show");

    document.body.style.overflow = "hidden";
  };
}




const cardOption = document.getElementById("cardOption");
const cardSheet = document.getElementById("cardSheet");

if (cardOption && cardSheet) {
  const header = cardOption.querySelector(".option-header");

  header.onclick = () => {
    // đóng option nếu đang mở
    cardOption.classList.remove("open");

    // mở bottom sheet
    sheetOverlay.classList.remove("hidden");
    cardSheet.classList.add("show");

    document.body.style.overflow = "hidden";
  };
}


