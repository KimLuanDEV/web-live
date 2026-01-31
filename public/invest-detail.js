// invest-detail.js – REALTIME ROUND 60s

const params = new URLSearchParams(location.search);
const asset = params.get("asset") || "gold";
const historyEl = document.getElementById("roundHistory");

const ROUND_DURATION = 60; // giây


let currentRoundId = null;
let myEntryPrice = null;

const liveBadge = document.getElementById("liveBadge");
// 🔴 LIVE luôn hiển thị
if (liveBadge) {
  liveBadge.classList.remove("hidden");
}


function updateLiveRound(n){
  if (!liveBadge) return;
  currentRoundId = n;
  liveBadge.textContent = `LIVE • ROUND ${n}`;
}



const me = JSON.parse(localStorage.getItem("user_profile") || "{}");
const myCoinEl = document.getElementById("myCoin");
if (myCoinEl) myCoinEl.textContent = me.coins || 0;

// ================== CONFIG ==================


const config = {
  gold: {
    name: "Gold",
    icon: `<img src="/assets/gold.png" class="asset-icon">`,
    min: -5,
    max: 8,
    vol: 1
  },
  silver: {
    name: "Silver",
    icon: `<img src="/assets/silver.png" class="asset-icon">`,
    min: -3,
    max: 5,
    vol: 1.5
  },
  diamond: {
    name: "Diamond",
    icon: `<img src="/assets/diamond.png" class="asset-icon">`,
    min: -10,
    max: 15,
    vol: 3
  }
};


const c = config[asset] || config.gold;

document.getElementById("assetTitle").innerHTML =
  `${c.icon} ${c.name}`;


document.getElementById("analysisText").innerHTML = `
  <li>📉 Rủi ro tối đa: ${c.min}%</li>
  <li>📈 Lợi nhuận kỳ vọng: ${c.max}%</li>
  <li>⏱ Chốt mỗi 60 giây (phiên chung)</li>
`;

// ================== SOCKET + ROUND ==================

// 🔒 tạo deviceId cố định cho thiết bị
let deviceId = localStorage.getItem("device_id");
if (!deviceId) {
  deviceId = "dev_" + Math.random().toString(36).slice(2);
  localStorage.setItem("device_id", deviceId);
}



const ordersModal = document.getElementById("ordersModal");
const ordersModalList = document.getElementById("orderListModal");
const btnOpenOrders = document.getElementById("btnOpenOrders");
const btnCloseOrders = document.getElementById("btnCloseOrders");
const ordersBackdrop = document.getElementById("ordersBackdrop");


const pnlHistoryModal = document.getElementById("pnlHistoryModal");
const pnlHistoryList = document.getElementById("pnlHistoryList");

document
  .getElementById("btnOpenPnlHistory")
  ?.addEventListener("click", () => {
    pnlHistoryModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    fetch("/api/invest/my-history", {
      headers: { "x-uid": me.uid }
    })
    .then(r => r.json())
    .then(d => d.ok && renderPnlHistory(d.list));
  });

document
  .getElementById("btnClosePnlHistory")
  ?.addEventListener("click", closePnlHistory);

document
  .getElementById("pnlHistoryBackdrop")
  ?.addEventListener("click", closePnlHistory);

function closePnlHistory(){
  pnlHistoryModal.classList.add("hidden");
  document.body.style.overflow = "";
}


function renderPnlHistory(list){
  if (!list.length) {
    pnlHistoryList.innerHTML =
      `<li class="empty">Chưa có dữ liệu</li>`;
    return;
  }

  pnlHistoryList.innerHTML = list.map(i => `
    <li class="order-item ${i.percent >= 0 ? "up" : "down"}">
      <div>
        ${i.asset.toUpperCase()}
        ${i.direction === "up" ? "📈" :
          i.direction === "down" ? "📉" : "➖"}
      </div>
      <div>
        ${i.coin} 💎 →
        <b>${i.percent >= 0 ? "+" : ""}${i.percent}%</b>
        (${i.profit >= 0 ? "+" : ""}${i.profit})
      </div>
      <small>${new Date(i.ts).toLocaleString()}</small>
    </li>
  `).join("");
}


function openOrders(){
  if(!ordersModal) return;
  ordersModal.classList.remove("hidden");
  ordersModal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";

  renderOrdersModal(); // ✅ render trực tiếp từ roundOrders
}


function closeOrders(){
  if(!ordersModal) return;
  ordersModal.classList.add("hidden");
  ordersModal.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

if(btnOpenOrders) btnOpenOrders.addEventListener("click", openOrders);
if(btnCloseOrders) btnCloseOrders.addEventListener("click", closeOrders);
if(ordersBackdrop) ordersBackdrop.addEventListener("click", closeOrders);




const historyModalEl = document.getElementById("historyModal");
const historyModalBody = document.getElementById("roundHistoryModal");
const btnOpenHistory = document.getElementById("btnOpenHistory");
const btnCloseHistory = document.getElementById("btnCloseHistory");
const historyBackdrop = document.getElementById("historyBackdrop");

function openHistory(){
  if(!historyModalEl) return;
  historyModalEl.classList.remove("hidden");
  historyModalEl.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function closeHistory(){
  if(!historyModalEl) return;
  historyModalEl.classList.add("hidden");
  historyModalEl.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

if(btnOpenHistory){
  btnOpenHistory.addEventListener("click", () => {
    openHistory();
    // mở ra là refresh lịch sử luôn cho chắc
    fetch("/api/invest/history")
      .then(r => r.json())
      .then(d => d.ok && renderHistory(d.list));
  });
}
if(btnCloseHistory) btnCloseHistory.addEventListener("click", closeHistory);
if(historyBackdrop) historyBackdrop.addEventListener("click", closeHistory);
















// 🔥 CONNECT SOCKET CÓ AUTH
const socket = io({
  auth: {
    uid: me.uid,
    deviceId
  }
});



function renderHistory(list){
  if (!list?.length) return;

  const html = list.map(r => `
    <tr>
      <td>${new Date(r.ts).toLocaleTimeString()}</td>
      ${renderCell(r.result.silver)}
      ${renderCell(r.result.gold)}
      ${renderCell(r.result.diamond)}
    </tr>
  `).join("");

  // nếu còn section cũ thì vẫn render
  if (historyEl) historyEl.innerHTML = html;

  // render vào modal
  if (historyModalBody) historyModalBody.innerHTML = html;
}


function renderOrdersModal(){
  if (!ordersModalList) return;

  if (!roundOrders.length) {
    ordersModalList.innerHTML =
      `<li class="empty">Chưa có lệnh nào</li>`;
    return;
  }

  ordersModalList.innerHTML = roundOrders.map(o => `
    <li class="order-item ${o.uid === me.uid ? "me" : ""}">
      <span>
        ${o.uid === me.uid ? "🧑 Bạn" : "👤 Người chơi"}
      </span>
      <b>${o.coin} 💎</b>
    </li>
  `).join("");
}




function renderCell(v){
  if (v > 0)
    return `<td class="up">+${v}%</td>`;
  if (v < 0)
    return `<td class="down">${v}%</td>`;
  return `<td class="neutral">0%</td>`;
}



function showModal(title, content){
  const modal = document.getElementById("appModal");
  document.getElementById("appModalTitle").textContent = title;
  document.getElementById("appModalContent").innerHTML = content;
  modal.classList.remove("hidden");
}





function closeAppModal(){
  document.getElementById("appModal")
    .classList.add("hidden");
}




// ⏱ LẤY THÔNG TIN PHIÊN HIỆN TẠI KHI VÀO TRANG
fetch("/api/invest/round")
  .then(r => r.json())
  .then(d => {
    if (!d.ok) return;


// 🔴 update LIVE • ROUND (ưu tiên server)
if (typeof d.roundIndex === "number") {
  updateLiveRound(d.roundIndex);
}
else if (typeof d.roundId === "number") {
  updateLiveRound(d.roundId);
}
else {
  // fallback
  updateLiveRound((currentRoundId || 0) + 1);
}



    // ⏱ timer
    if (d.endAt) {
      startRoundTimer(d.endAt);
    }

    // 🧾 LOAD LẠI LỆNH ĐÃ VÀO (QUAN TRỌNG)
    if (Array.isArray(d.orders)) {

roundOrders = d.orders.filter(o => o.asset === asset);
renderOrdersModal(); // ✅


      // 🔒 nếu user đã vào lệnh → khoá luôn
const myOrder = roundOrders.find(o => o.uid === me.uid);
if (myOrder) {
  joinedRound = true;
  myEntryPrice = myOrder.entryPrice; // 🔥 PHỤC HỒI ENTRY

  if (investBtn) {
    investBtn.disabled = true;
    investBtn.textContent = "⛔ ĐÃ VÀO LỆNH";
  }
}



      // 📍 phục hồi marker vào lệnh
      entryMarkers = roundOrders
        .filter(o => typeof o.entrySec === "number")
        .map(o => ({
          sec: o.entrySec,
          price: o.entryPrice,
          mine: o.uid === me.uid
        }));

      drawChart(chartData);
    }
  });



socket.on("connect", () => {
  console.log("🔌 socket reconnected → resync chart");

  fetch("/api/invest/chart")
    .then(r => r.json())
    .then(d => {
      if (!d.ok) return;

      const nowSec = Math.floor(
        (Date.now() - d.startAt) / 1000
      );

      chartData = d.chart[asset].slice(0, nowSec + 1);
      drawChart(chartData);
    });
});






let roundEndAt = 0;
let timerInt = null;
let joinedRound = false;
let roundOrders = [];
let entryMarkers = []; // 📍 điểm vào lệnh



const timerEl = document.getElementById("roundTimer");
if (timerEl && !timerEl.querySelector(".timer-text")) {
  timerEl.innerHTML = `
    <span class="timer-text">⏳</span>
  `;
}




const investBtn = document.querySelector(".detail-invest button");




function startRoundTimer(endAt){
  roundEndAt = endAt;
  clearInterval(timerInt);

  timerInt = setInterval(() => {
    const left = Math.max(
      0,
      Math.floor((roundEndAt - Date.now()) / 1000)
    );

    if (!timerEl) return;

    // % tiến trình (0 → 1)
    const progress = Math.max(
      0,
      Math.min(1, left / ROUND_DURATION)
    );

    // set CSS variable cho vòng tròn
    timerEl.style.setProperty(
      "--progress",
      progress
    );

    const textEl =
      timerEl.querySelector(".timer-text");

    if (left > 5) {
      // 🟢 ĐANG CHẠY
      textEl.textContent = `⏳ ${left}s`;
      timerEl.className =
        "round-timer overlay-timer running";

  


      investBtn.disabled = false;
      investBtn.textContent = "🚀 VÀO LỆNH";
    }
    else if (left > 0) {
      // 🔴 SẮP CHỐT
      textEl.textContent = `🔒 ${left}s`;
      timerEl.className =
        "round-timer overlay-timer locked";



      investBtn.disabled = true;
      investBtn.textContent = "⛔ ĐÃ KHÓA";
    }
    else {
      // 🔐 ĐANG CHỐT
      textEl.textContent = "🔐";
      timerEl.className =
        "round-timer overlay-timer locked";




      timerEl.style.setProperty("--progress", 0);

      investBtn.disabled = true;
      investBtn.textContent = "⛔ ĐÃ KHÓA";
    }
  }, 500);
}




socket.on("invest-order-new", o => {
  if (o.asset !== asset) return;

  roundOrders.push(o);

  if (o.uid === me.uid && typeof o.entryPrice === "number") {
    myEntryPrice = o.entryPrice;
  }

  if (typeof o.entrySec === "number" && typeof o.entryPrice === "number") {
    entryMarkers.push({
      sec: o.entrySec,
      price: o.entryPrice,
      mine: o.uid === me.uid
    });
  }

  renderOrdersModal(); // ✅ QUAN TRỌNG
  drawChart(chartData);
});



// nhận phiên mới
socket.on("invest-round-new", d => {

  myEntryPrice = null;
const pnlBox = document.getElementById("pnlRealtime");
if (pnlBox) pnlBox.classList.add("hidden");


// 🔴 update LIVE • ROUND khi có phiên mới
if (typeof d.roundIndex === "number") {
  updateLiveRound(d.roundIndex);
}
else if (typeof d.roundId === "number") {
  updateLiveRound(d.roundId);
}
else {
  updateLiveRound((currentRoundId || 0) + 1);
}


  joinedRound = false;
  roundOrders = [];
  renderOrdersModal();
  startRoundTimer(d.endAt);
  chartData = [];
  resizeChartCanvas();
  entryMarkers = [];
});


socket.on("invest-round-result", d => {

  // ===============================
  // 1️⃣ HIỂN THỊ KẾT QUẢ PHIÊN (AI CŨNG THẤY)
  // ===============================
  const box = document.getElementById("lastRoundResult");
  if (box && d.result) {
    box.classList.remove("hidden");

    setResult("resGold", d.result.gold);
    setResult("resSilver", d.result.silver);
    setResult("resDiamond", d.result.diamond);
  }

  // luôn update bảng lịch sử
  fetch("/api/invest/history")
    .then(r => r.json())
    .then(h => h.ok && renderHistory(h.list));

  // ===============================
  // 2️⃣ CHỈ USER ĐÃ VÀO LỆNH → TÍNH THEO ENTRY
  // ===============================
  if (!joinedRound) return;

  // 🔍 tìm lệnh của chính user
  const myOrder = roundOrders.find(
    o => o.uid === me.uid && o.asset === asset
  );

  if (!myOrder) return;

  // 🎯 tính % từ điểm vào lệnh → giá cuối
  const entry = myOrder.entryPrice;
  const end   = chartData[chartData.length - 1];

  if (!entry || !end) return;

  let percent =
    Math.round((end - entry) / entry * 100);

  // 🔒 clamp UI (chỉ để hiển thị)
  percent = Math.max(-30, Math.min(30, percent));

const dirText =
  myOrder.direction === "up" ? "📈 Tăng" :
  myOrder.direction === "down" ? "📉 Giảm" :
  "➖ Side";

const coin = myOrder.coin;

// lãi / lỗ quy đổi coin (UI, server đã xử lý thật)
const profitCoin = Math.round(coin * percent / 100);

showModal(
  percent >= 0 ? "🎉 KẾT QUẢ LỆNH" : "💥 KẾT QUẢ LỆNH",
  `
  <div style="line-height:1.6">
    <div>📊 Tài sản: <b>${asset.toUpperCase()}</b></div>
    <div>🎯 Hướng: <b>${dirText}</b></div>
    <div>💎 Vốn: <b>${coin}</b> coin</div>

    <hr style="opacity:.15">

    <div>📍 Giá vào: <b>${entry.toFixed(2)}</b></div>
    <div>🏁 Giá chốt: <b>${end.toFixed(2)}</b></div>

    <hr style="opacity:.15">

    <div>
      ${percent >= 0
        ? `✅ Lãi: <b style="color:#00ff99">+${percent}%</b>`
        : `❌ Lỗ: <b style="color:#ff5c5c">${percent}%</b>`
      }
    </div>

    <div>
      ${profitCoin >= 0
        ? `💰 Nhận thêm: <b style="color:#00ff99">+${profitCoin}</b> coin`
        : `💸 Mất: <b style="color:#ff5c5c">${profitCoin}</b> coin`
      }
    </div>
  </div>
  `
);


  // 🔄 sync lại coin từ server (nguồn sự thật)
  fetch("/api/me/coin", {
    headers: { "x-uid": me.uid }
  })
    .then(r => r.json())
    .then(u => {
      if (u.ok) {
        me.coins = u.coins;
        myCoinEl.textContent = u.coins;
        localStorage.setItem(
          "user_profile",
          JSON.stringify(me)
        );
      }
    });
});



// ================== CHART REALTIME (SERVER SYNC) ==================

let chartData = [];

socket.on("invest-price", d => {
  const p = d.price?.[asset];
  if (typeof p !== "number") return;

  if (typeof d.second !== "number") return;

chartData[d.second] = p;
drawChart(chartData);


  chartData[d.second] = p;

  drawChart(chartData);

  // ===============================
  // 💰 PnL REALTIME TỪ ENTRY
  // ===============================
  const pnlBox = document.getElementById("pnlRealtime");

  if (joinedRound && myEntryPrice && pnlBox) {
    const last = p;

    let pnl =
      Math.round((last - myEntryPrice) / myEntryPrice * 100);

    // clamp UI
    pnl = Math.max(-30, Math.min(30, pnl));

    pnlBox.textContent =
      pnl >= 0 ? `PnL: +${pnl}%` : `PnL: ${pnl}%`;

    pnlBox.className =
      "pnl-overlay " + (pnl >= 0 ? "up" : "down");

    pnlBox.classList.remove("hidden");
  }
});





function resizeChartCanvas(){
  const canvas = document.getElementById("priceChart");
  const box = document.querySelector(".detail-chart");
  if (!canvas || !box) return;

  const rect = box.getBoundingClientRect();

  canvas.width  = rect.width;
  canvas.height = rect.height; // 🔥 theo chiều cao cinematic
}




function drawChart(data){
  const canvas = document.getElementById("priceChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = "rgba(255,255,255,.05)";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * H / 5);
    ctx.lineTo(W, i * H / 5);
    ctx.stroke();
  }

  if (data.length < 2) return;

  const first = data[0];
  const last  = data[data.length - 1];


// ===============================
// 📍 VẼ ĐƯỜNG ENTRY PRICE
// ===============================
if (joinedRound && typeof myEntryPrice === "number") {
  
// ===============================
// 📍 VẼ ĐƯỜNG ENTRY PRICE
// ===============================
if (joinedRound && typeof myEntryPrice === "number") {

  const y =
    H - (myEntryPrice - 80) * (H / 40);

  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle =
    last >= myEntryPrice ? "#00ff99" : "#ff5c5c";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();

  // label ENTRY + giá
  ctx.setLineDash([]);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = ctx.strokeStyle;

  ctx.fillText("ENTRY", 6, Math.max(12, y - 4));

  const priceText = myEntryPrice.toFixed(2);
  const textWidth = ctx.measureText(priceText).width;

  ctx.fillText(
    priceText,
    W - textWidth - 8,
    Math.max(12, y - 4)
  );

  ctx.restore();
}


}


  const color =
    last > first ? "#00ff99" :
    last < first ? "#ff5c5c" :
    "#aaa";

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  const points = data.filter(v => v !== undefined);


  points.forEach((v, i) => {
  const x = i * (W / Math.max(points.length - 1, 1));

    const y = H - (v - 80) * (H / 40);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
  ctx.shadowBlur = 0;

  // cập nhật text xu hướng
  const trendText = document.getElementById("trendText");

const chartBox = document.querySelector(".detail-chart");

if (trendText && chartBox) {
  chartBox.classList.remove(
    "trend-up",
    "trend-down",
    "trend-neutral"
  );

  if (last > first) {
    trendText.textContent = "Xu hướng tăng";
    trendText.className = "trend-overlay up";
    chartBox.classList.add("trend-up");
  } 
  else if (last < first) {
    trendText.textContent = "Xu hướng giảm";
    trendText.className = "trend-overlay down";
    chartBox.classList.add("trend-down");
  } 
  else {
    trendText.textContent = "Sideway";
    trendText.className = "trend-overlay neutral";
    chartBox.classList.add("trend-neutral");
  }
}



  // ============================
// 📍 VẼ ĐIỂM VÀO LỆNH
// ============================
entryMarkers.forEach(m => {
  const idx = m.sec;
  const price = m.price;

  if (idx < 0 || idx >= data.length) return;

  const x = idx * (W / Math.max(data.length - 1, 1));
  const y = H - (price - 80) * (H / 40);

  ctx.beginPath();
  ctx.fillStyle = m.mine ? "#ffd700" : "#ff5c5c";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;

  ctx.arc(x, y, m.mine ? 6 : 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
});

}




// ================== VÀO LỆNH ==================

function confirmInvest(){

  const left = Math.floor((roundEndAt - Date.now()) / 1000);
  if (left <= 5) {
    showModal(
      "⛔ Không thể vào lệnh",
      "Phiên sắp chốt, vui lòng chờ phiên tiếp theo."
    );
    return;
  }

  if (joinedRound) {
    showModal(
      "⛔ Đã vào lệnh",
      "Bạn đã vào lệnh trong phiên này."
    );
    return;
  }

  const coin = Number(
    document.getElementById("investAmount").value
  );

  if (!coin || coin <= 0) {
    showModal(
      "⚠️ Lỗi nhập liệu",
      "Vui lòng nhập số coin hợp lệ."
    );
    return;
  }

  fetch("/api/invest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({
      type: asset,
      coin
    })
  })
  .then(r => r.json())
  .then(d => {
    if (!d.ok) {
      showModal(
        "❌ Thao tác thất bại",
        d.message || "Không thể vào lệnh."
      );
      return;
    }

    // =========================
    // ✅ VÀO LỆNH THÀNH CÔNG
    // =========================
    joinedRound = true;

    // 🔻 TRỪ COIN NGAY TRÊN UI
    me.coins = Math.max(0, (me.coins || 0) - coin);
    myCoinEl.textContent = me.coins;

    localStorage.setItem(
      "user_profile",
      JSON.stringify(me)
    );

    // 🔒 KHOÁ NÚT
    const btn = document.querySelector(".detail-invest button");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⛔ ĐÃ VÀO LỆNH";
    }

    showModal(
      "✅ Thành công",
      "Đã vào lệnh, vui lòng chờ chốt phiên."
    );
  })
  .catch(() => {
    showModal(
      "❌ Lỗi mạng",
      "Không thể kết nối server."
    );
  });
}

// ================== START ==================



fetch("/api/invest/history")
  .then(r => r.json())
  .then(d => {
    if (d.ok) {
      renderHistory(d.list);
    }
  });






function setResult(id, val){
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = (val > 0 ? "+" : "") + val + "%";
  el.className =
    val > 0 ? "up" :
    val < 0 ? "down" : "neutral";
}



// resize canvas khi load
resizeChartCanvas();

// resize khi đổi kích thước màn hình
window.addEventListener("resize", resizeChartCanvas);


socket.on("coin-update", d => {
  if (d.uid !== me.uid) return;

  me.coins = d.coins;
  myCoinEl.textContent = d.coins;

  localStorage.setItem(
    "user_profile",
    JSON.stringify(me)
  );
});


// ================= BACK BUTTON SAFE =================
const btnBack = document.getElementById("btnBack");
if (btnBack) {
  btnBack.addEventListener("click", () => {
    // có trang trước đó
    if (window.history.length > 1) {
      history.back();
    } else {
      // fallback an toàn
      location.href = "/invest.html";
    }
  });
}






function showForceLogoutModal(message){
  let modal = document.getElementById("forceLogoutModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "forceLogoutModal";
    modal.innerHTML = `
      <div class="fl-backdrop"></div>
      <div class="fl-box">
        <div class="fl-icon">🚫</div>
        <div class="fl-title">Phiên đăng nhập kết thúc</div>
        <div class="fl-msg"></div>
        <div class="fl-sub">Bạn sẽ được chuyển về trang đăng nhập…</div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.querySelector(".fl-msg").textContent = message;
  modal.classList.add("show");
}


socket.on("force-logout", (data) => {
  const msg = data?.message || "Tài khoản của bạn đã bị đăng xuất";

  showForceLogoutModal(msg);

  // clear auth
  localStorage.removeItem("user_profile");
  localStorage.removeItem("login_uid");
  localStorage.removeItem("isGuest");

  // redirect sau 2s
  setTimeout(()=>{
    location.href = "/login.html";
  }, 3000);
});

