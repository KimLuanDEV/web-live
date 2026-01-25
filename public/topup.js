const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
if (!auth.uid) location.href = "/login.html";

const myCoinEl  = document.getElementById("myCoin");

if (!agentList) {
  console.warn("agentList not found");
  return;
}


const qrBox     = document.getElementById("qrBox");
const bankInfo  = document.getElementById("bankInfo");
const agentQr   = document.getElementById("agentQr");

// hiển thị coin hiện tại
myCoinEl.textContent = `Kim cương hiện tại: ${auth.coins || 0}💰`;

// 🔄 LOAD DANH SÁCH ĐẠI LÝ TỪ SERVER
fetch("/api/topup-agents")
  .then(r => r.json())
  .then(res => {
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
    if (!agent.account || !agent.bank) return; // skip agent lỗi
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
}

// mở chi tiết đại lý + QR
function openAgent(agent) {
  qrBox.classList.add("hidden"); // reset trước

  const content = `NAP ${auth.uid}`;

  agentQr.src = agent.qr || "/images/qr-demo.png";

  bankInfo.innerHTML = `
    <b>Đại lý:</b> ${agent.name}<br>
    <b>Ngân hàng:</b> ${agent.bank}<br>
    <b>STK:</b> ${agent.account}<br>
    <b>Chủ TK:</b> ${agent.owner}<br>
    <b>Nội dung:</b> <code id="transferText">${content}</code>
  `;

  qrBox.classList.remove("hidden");
}




// copy nội dung chuyển khoản
function copyTransfer() {
  const text = document.getElementById("transferText")?.textContent;
  if (!text) return;

  navigator.clipboard.writeText(text);
  showToast("📋 Đã copy nội dung chuyển khoản");
}
