const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
if (!auth.uid) location.href = "/login.html";

const myCoinEl = document.getElementById("myCoin");
const agentList = document.getElementById("agentList");
const qrBox = document.getElementById("qrBox");
const bankInfo = document.getElementById("bankInfo");
const agentQr = document.getElementById("agentQr");

myCoinEl.textContent = `💰 Coin hiện tại: ${auth.coins || 0}`;

// 🧑‍💼 DANH SÁCH ĐẠI LÝ (tạm thời hardcode)
const AGENTS = [
  {
    name: "Đại lý Livestream Pro",
    avatar: "https://api.dicebear.com/7.x/thumbs/svg?seed=livestream",
    bank: "Techcombank",
    account: "9919891995",
    owner: "ĐẠI LÝ LIVESTREAM",
    qr: "/images/qr-demo.png",
    online: true
  },
  {
    name: "Đại lý Hỗ Trợ VIP",
    avatar: "https://api.dicebear.com/7.x/thumbs/svg?seed=vip",
    bank: "Vietcombank",
    account: "0021000313522",
    owner: "VIP SUPPORT",
    qr: "/images/qr-demo.png",
    online: false
  }
];

// render đại lý
AGENTS.forEach(agent => {
  const div = document.createElement("div");
  div.className = "agent-card";

  div.innerHTML = `
    <img class="agent-avatar" src="${agent.avatar}">
    <div class="agent-info">
      <div class="agent-name">${agent.name}</div>
      <div class="agent-bank">${agent.bank} • ${agent.account}</div>
      <div class="agent-status ${agent.online ? "" : "offline"}">
        ${agent.online ? "🟢 Đang online" : "⚪ Offline"}
      </div>
    </div>
    <div>➕</div>
  `;

  div.onclick = () => openAgent(agent);
  agentList.appendChild(div);
});

function openAgent(agent) {
  const content = `NAP ${auth.uid}`;

  agentQr.src = agent.qr;

  bankInfo.innerHTML = `
    <b>Đại lý:</b> ${agent.name}<br>
    <b>Ngân hàng:</b> ${agent.bank}<br>
    <b>STK:</b> ${agent.account}<br>
    <b>Chủ TK:</b> ${agent.owner}<br>
    <b>Nội dung:</b> <code id="transferText">${content}</code>
  `;

  qrBox.classList.remove("hidden");
}

function copyTransfer() {
  const text = document.getElementById("transferText")?.textContent;
  if (!text) return;

  navigator.clipboard.writeText(text);
  showToast("📋 Đã copy nội dung chuyển khoản");
}
