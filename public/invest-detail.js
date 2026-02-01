// invest-detail.js – REALTIME ROUND 60s

const params = new URLSearchParams(location.search);
const asset = params.get("asset") || "gold";
const historyEl = document.getElementById("roundHistory");

const ROUND_DURATION = 60; // giây


let currentRoundId = null;
let myEntryPrice = null;
let myDirection = "up";
let myOrderDirection = null; // 🔥 HƯỚNG THẬT CỦA LỆNH
let myEntryTime = null; // timestamp khi vào lệnh
let closedEarlyThisRound = false; // 🔒 đã chốt sớm trong round này





const btnUp = document.getElementById("btnUp");
const btnDown = document.getElementById("btnDown");

if (btnUp && btnDown) {
  btnUp.onclick = () => {
    myDirection = "up";
    btnUp.classList.add("active");
    btnDown.classList.remove("active");
  };
  btnDown.onclick = () => {
    myDirection = "down";
    btnDown.classList.add("active");
    btnUp.classList.remove("active");
  };
}



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
  },

  // 🔥 NEW
  oil: {
    name: "Oil",
    icon: `<img src="/assets/oil.png" class="asset-icon">`,
    min: -18,
    max: 25,
    vol: 5          // ⚠️ rất rung
  },
  estate: {
    name: "Real Estate",
    icon: `<img src="/assets/estate.png" class="asset-icon">`,
    min: -12,
    max: 20,
    vol: 3.5
  },
  atomic: {
  name: "Nguyên Tử",
  icon: `<img src="/assets/atomic.png" class="asset-icon">`,
  min: -30,
  max: 45,
  vol: 8.5
}
};



const c = config[asset] || config.gold;

document.getElementById("assetTitle").innerHTML =
  `${c.name}`;


document.getElementById("analysisText").innerHTML = `
  <li>📉 Rủi ro tối đa: ${c.min}%</li>
  <li>📈 Lợi nhuận kỳ vọng: ${c.max}%</li>
  <li>⏱ Chốt lệnh sớm trước khi kết thúc phiên</li>
  <li>🛡️ Tối ưu kiểm soát vốn</li>
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
      ${renderCell(r.result?.silver)}
      ${renderCell(r.result?.gold)}
      ${renderCell(r.result?.diamond)}
      ${renderCell(r.result?.oil)}
      ${renderCell(r.result?.estate)}
      ${renderCell(r.result?.atomic)}
    </tr>
  `).join("");

  if (historyEl) historyEl.innerHTML = html;
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

  // 🔥 PHỤC HỒI TRẠNG THÁI LỆNH
  myEntryPrice = myOrder.entryPrice;
  myOrderDirection = myOrder.direction;
  myEntryTime = myOrder.entryTime;

  // 🔒 ẨN NÚT LÊN / XUỐNG
  document.getElementById("directionBox")?.classList.add("hidden");

  // 🔁 ĐÚNG UI: ẨN VÀO LỆNH → HIỆN CHỐT SỚM
  showCloseEarlyButton();
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
  console.log("🔌 socket connected");

  // ❌ nếu đã có chart từ cache → KHÔNG fetch đè
  if (chartData.length) {
    console.log("↪ dùng chart cache, bỏ qua fetch");
    return;
  }

  fetch("/api/invest/chart")
    .then(r => r.json())
    .then(d => {
      if (!d.ok) return;

      const nowSec = Math.floor(
        (Date.now() - d.startAt) / 1000
      );

      chartData = d.chart[asset]
        .slice(0, nowSec + 1)
        .slice(-MAX_POINTS);

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


const btnCloseEarly = document.getElementById("btnCloseEarly");

function showCloseEarlyButton(){
  if (!investBtn || !btnCloseEarly) return;

  investBtn.classList.add("hidden");   // ẨN nút vào lệnh
  btnCloseEarly.classList.remove("hidden");
}

function hideCloseEarlyButton(){
  if (!investBtn || !btnCloseEarly) return;

  investBtn.classList.remove("hidden");
  btnCloseEarly.classList.add("hidden");
}







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

  

if (!joinedRound) {
  investBtn.disabled = false;
  investBtn.textContent = "VÀO LỆNH";
}



    }
    else if (left > 0) {
      // 🔴 SẮP CHỐT
      textEl.textContent = `🔒 ${left}s`;
      timerEl.className =
        "round-timer overlay-timer locked";



if (!joinedRound) {
  investBtn.disabled = true;
  investBtn.textContent = "⛔ ĐÃ KHÓA";
}


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
  myOrderDirection = o.direction; // 🔥 LẤY HƯỚNG TỪ SERVER
}


  if (typeof o.entrySec === "number" && typeof o.entryPrice === "number") {

entryMarkers.push({
  index: chartData.length - 1, // 🔥 index THỰC trên chart
  price: o.entryPrice,
  mine: o.uid === me.uid
});


  }

  renderOrdersModal(); // ✅ QUAN TRỌNG
  drawChart(chartData);
});



socket.on("invest-round-new", d => {

  // =========================
  // 🔥 LƯU GIÁ CUỐI ROUND TRƯỚC
  // =========================
  lastPriceOfPrevRound = null;
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (typeof chartData[i] === "number") {
      lastPriceOfPrevRound = chartData[i];
      break;
    }
  }

  // =========================
  // 🔁 CHUẨN BỊ OFFSET CHO ROUND MỚI (QUAN TRỌNG)
  // =========================
  roundBasePrice = lastPriceOfPrevRound; // neo round mới
  roundZeroPrice = null;                 // chờ tick đầu

  // =========================
  // 🔄 RESET TRẠNG THÁI USER
  // =========================
  myEntryPrice = null;

  const pnlBox = document.getElementById("pnlRealtime");
  if (pnlBox) pnlBox.classList.add("hidden");

  // =========================
  // 🔴 UPDATE LIVE • ROUND
  // =========================
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
  closedEarlyThisRound = false;
  roundOrders = [];
  renderOrdersModal();
  startRoundTimer(d.endAt);

  // ❌ KHÔNG RESET chartData
  // chartData = [];

  resizeChartCanvas();

  // marker chỉ áp dụng cho round hiện tại
  entryMarkers = [];

  // 🧱 lưu mốc bắt đầu round mới (vạch phân cách)
  roundMarkers.push(chartData.length);

  // 🔓 MỞ LẠI NÚT CHỌN HƯỚNG
  document
    .getElementById("directionBox")
    ?.classList.remove("hidden");

  hideCloseEarlyButton(); // 🔁 RESET UI
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

// ✅ ưu tiên giá chốt từ server (nếu server gửi)
let end = d?.endPrice?.[asset];

// ✅ fallback: lấy điểm cuối cùng có số trong chartData
if (typeof end !== "number") {
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (typeof chartData[i] === "number") {
      end = chartData[i];
      break;
    }
  }
}


  if (!entry || !end) return;

let percent =
  Math.round((end - entry) / entry * 100);

if (myOrder.direction === "down") percent = -percent;

  // 🔒 clamp UI (chỉ để hiển thị)
  percent = Math.max(-30, Math.min(30, percent));

const dirText =
  myOrder.direction === "up" ? "📈 Tăng" :
  myOrder.direction === "down" ? "📉 Giảm" :
  "➖ Side";

const coin = myOrder.coin;

// lãi / lỗ quy đổi coin (UI, server đã xử lý thật)
const profitCoin = Math.round(coin * percent / 100);

const isWin = percent >= 0;
const pnlColor = isWin ? "#00ff99" : "#ff5c5c";

openResultModal({
  percent,
  profit: profitCoin,
  asset,
  dir: dirText,
  coin,
  entry,
  end
});



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
const MAX_POINTS = 100;
let chartData = [];
let lastPriceOfPrevRound = null; // 🔥 lưu giá cuối round trước

let roundMarkers = [];
let roundBasePrice = null;  // 🔥 neo giá round mới
let roundZeroPrice = null;  // 🔥 giá server tại second = 0





// =========================
// 🔁 KHÔI PHỤC CHART TỪ CACHE (RELOAD KHÔNG MẤT LINE)
// =========================
try {
  const cache = JSON.parse(
    localStorage.getItem("chart_cache_" + asset)
  );

  if (cache?.data?.length) {
    chartData = cache.data.slice(-MAX_POINTS);
    roundMarkers = cache.rounds || [];
    lastPriceOfPrevRound = cache.lastPrice || null;

    drawChart(chartData);
    console.log("✅ chart restored from cache");
  }
} catch (e) {
  console.warn("⚠️ chart cache invalid");
}



socket.on("invest-price", d => {
  const p = d.price?.[asset];
  if (typeof p !== "number") return;
  if (typeof d.second !== "number") return;

  // 🔥 nối giá đầu round mới từ giá cuối round cũ
let drawPrice = p;

// 🔥 tick đầu tiên của round mới
if (d.second === 0) {
  roundZeroPrice = p;

  // neo round mới vào giá cuối round cũ
  if (typeof roundBasePrice === "number") {
    drawPrice = roundBasePrice;
  }
}
// 🔥 các tick tiếp theo: offset theo delta
else if (
  typeof roundBasePrice === "number" &&
  typeof roundZeroPrice === "number"
) {
  drawPrice =
    roundBasePrice + (p - roundZeroPrice);
}

// 👉 CHỈ PUSH GIÁ ĐÃ OFFSET
chartData.push(drawPrice);


  // =========================
  // 🔁 GIỮ TỐI ĐA 100 ĐIỂM
  // =========================
if (chartData.length > MAX_POINTS) {
  const removed = chartData.length - MAX_POINTS;

  // ❌ bỏ điểm cũ
  chartData.splice(0, removed);

  // 🔁 dời lại index marker
  entryMarkers.forEach(m => {
    m.index -= removed;
  });

  // ❌ loại marker đã trôi khỏi chart
  entryMarkers = entryMarkers.filter(
    m => m.index >= 0
  );

  // 🔁 dời mốc round (⚠️ PHẢI NẰM TRONG IF)
  roundMarkers = roundMarkers
    .map(i => i - removed)
    .filter(i => i >= 0);
}




  drawChart(chartData);


// 💾 cache chart để reload không mất line
localStorage.setItem(
  "chart_cache_" + asset,
  JSON.stringify({
    data: chartData,
    rounds: roundMarkers,
    lastPrice: lastPriceOfPrevRound
  })
);



  // =========================
  // 💰 PnL realtime (GIỮ NGUYÊN)
  // =========================
  const pnlBox = document.getElementById("pnlRealtime");
  if (joinedRound && myEntryPrice && pnlBox && myOrderDirection) {
    const last = p;

    let percent = Math.round(
      (last - myEntryPrice) / myEntryPrice * 100
    );

    if (myOrderDirection === "down") percent = -percent;

    percent = Math.max(-30, Math.min(30, percent));

    const myOrder = roundOrders.find(
      o => o.uid === me.uid && o.asset === asset
    );

    const coin = myOrder?.coin || 0;
    const pnlCoin = Math.round(coin * percent / 100);

    const dirIcon =
      myOrderDirection === "down" ? "📉" : "📈";

    pnlBox.textContent =
      `${dirIcon} Lợi nhuận: ` +
      `${percent > 0 ? "+" : ""}${percent}% ` +
      `(${pnlCoin > 0 ? "+" : ""}${pnlCoin} 💎)`;

    pnlBox.className =
      "pnl-overlay " + (percent >= 0 ? "up" : "down");

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

// grid (dày hơn)
const GRID_Y = 8;

ctx.strokeStyle = "rgba(255,255,255,.05)";
for (let i = 0; i <= GRID_Y; i++) {
  const y = i * H / GRID_Y;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();
}



// =========================
// 🧱 VẠCH PHÂN CÁCH ROUND (MỜ)
// =========================
if (roundMarkers.length) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1;

  roundMarkers.forEach(idx => {
    if (idx <= 0 || idx >= data.length) return;

    const x = idx * (W / Math.max(data.length - 1, 1));

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  });

  ctx.restore();
}



  // =========================
  // 🔥 FILTER DATA
  // =========================
  const points = data.filter(v => typeof v === "number");
  if (points.length < 2) return;

  // =========================
  // 🔥 AUTO SCALE
  // =========================
  let min = Math.min(...points);
  let max = Math.max(...points);

  const padding = (max - min) * 0.15 || 1;
  min -= padding;
  max += padding;

  const toY = price =>
    H - ((price - min) / (max - min)) * H;

  const first = points[0];
  const last  = points[points.length - 1];



// =========================
// 🎯 ENTRY BAND (VÙNG MỜ)
// =========================
if (joinedRound && typeof myEntryPrice === "number") {
  const entryY = toY(myEntryPrice);

  const bandHeight = 16; // 14–20px là đẹp

  const isProfit = last >= myEntryPrice;

  ctx.save();
  ctx.fillStyle = isProfit
    ? "rgba(0,255,153,0.12)"   // 🟢 xanh mờ
    : "rgba(255,92,92,0.12)"; // 🔴 đỏ mờ

  ctx.fillRect(
    0,
    entryY - bandHeight / 2,
    W,
    bandHeight
  );
  ctx.restore();
}

  // =========================
  // 📍 ENTRY LINE
  // =========================
  if (joinedRound && typeof myEntryPrice === "number") {
    const y = toY(myEntryPrice);

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle =
      last >= myEntryPrice ? "#00ff99" : "#ff5c5c";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = ctx.strokeStyle;

    ctx.fillText("ENTRY", 6, Math.max(12, y - 4));

    const txt = myEntryPrice.toFixed(2);
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, W - tw - 8, Math.max(12, y - 4));

    ctx.restore();
  }

  // =========================
  // 📈 LINE CHART
  // =========================
  const color =
    last > first ? "#00ff99" :
    last < first ? "#ff5c5c" :
    "#aaa";

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  points.forEach((v, i) => {
    const x = i * (W / Math.max(data.length - 1, 1));
    const y = toY(v);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
  ctx.shadowBlur = 0;

  // =========================
  // 📍 ENTRY MARKERS
  // =========================
  entryMarkers.forEach(m => {
if (m.index < 0 || m.index >= data.length) return;
const x = m.index * (W / Math.max(data.length - 1, 1));


    const y = toY(m.price);

    ctx.beginPath();
    ctx.fillStyle = m.mine ? "#ffd700" : "#ff5c5c";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.arc(x, y, m.mine ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // =========================
  // 📊 TREND
  // =========================
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
    } else if (last < first) {
      trendText.textContent = "Xu hướng giảm";
      trendText.className = "trend-overlay down";
      chartBox.classList.add("trend-down");
    } else {
      trendText.textContent = "Sideway";
      trendText.className = "trend-overlay neutral";
      chartBox.classList.add("trend-neutral");
    }
  }
}



// ================== VÀO LỆNH ==================

function confirmInvest(){


if (closedEarlyThisRound) {
  showModal(
    "⛔ Không thể vào lệnh",
    "Bạn đã chốt lệnh sớm trong phiên này. Vui lòng chờ phiên tiếp theo."
  );
  return;
}



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
  coin,
  direction: myDirection   // 🔥 QUAN TRỌNG
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
myEntryTime = Date.now(); // 🔥 lưu thời điểm vào lệnh
myOrderDirection = myDirection; // 🔥 lưu hướng lệnh

showCloseEarlyButton(); // 🔁 ĐỔI NÚT



// 🔒 ẨN NÚT CHỌN HƯỚNG
document.getElementById("directionBox")?.classList.add("hidden");



    // 🔻 TRỪ COIN NGAY TRÊN UI
    me.coins = Math.max(0, (me.coins || 0) - coin);
    myCoinEl.textContent = me.coins;

    localStorage.setItem(
      "user_profile",
      JSON.stringify(me)
    );

    // 🔒 KHOÁ NÚT
    const btn = document.querySelector(".detail-invest button");


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


// ================= RESULT FULLSCREEN MODAL =================

function openResultModal({ percent, profit, asset, dir, coin, entry, end }) {
  const modal = document.getElementById("resultModal");
  if (!modal) return;

  // ✅ CHUẨN NHẤT: dựa vào profit
  const isWin = profit > 0;
  const isLose = profit < 0;

  modal.classList.remove("win", "loss");
  if (isWin) modal.classList.add("win");
  if (isLose) modal.classList.add("loss");

  document.getElementById("rmStatus").textContent =
    isWin ? "LỆNH THẮNG" :
    isLose ? "LỆNH THUA" :
    "HOÀ VỐN";

  document.getElementById("rmPercent").textContent =
    (percent > 0 ? "+" : "") + percent + "%";

  document.getElementById("rmCoin").textContent =
    (profit > 0 ? "+" : "") + profit + " 💎";

  document.getElementById("rmAsset").textContent = asset.toUpperCase();
  document.getElementById("rmDir").textContent = dir;
  document.getElementById("rmCapital").textContent = coin;
  document.getElementById("rmEntry").textContent = entry.toFixed(2);
  document.getElementById("rmEnd").textContent = end.toFixed(2);

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}



function closeResultModal() {
  const modal = document.getElementById("resultModal");
  if (!modal) return;

  modal.classList.add("hidden");
  document.body.style.overflow = "";
}



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





setInterval(() => {
  if (!btnCloseEarly) return;

  // ❌ chưa vào lệnh → ẩn
  if (!joinedRound || !myEntryTime) {
    btnCloseEarly.classList.add("hidden");
    return;
  }

  const now = Date.now();

  // ⏱ đã qua bao lâu từ lúc vào lệnh
  const passed = Math.floor((now - myEntryTime) / 1000);

  // ⏳ còn bao nhiêu giây của phiên
  const leftRound = Math.floor((roundEndAt - now) / 1000);

// ❌ còn ≤ 15s của phiên
// 👉 chỉ ẨN nếu CHƯA vào lệnh
if (leftRound <= 15 && !joinedRound) {
  btnCloseEarly.classList.add("hidden");
  return;
}

  // ⏳ chưa đủ 10s từ lúc vào → disable
  if (passed < 10) {
    btnCloseEarly.disabled = true;
    btnCloseEarly.textContent =
      `⏳ Chờ ${10 - passed}s để chốt`;
    btnCloseEarly.classList.remove("hidden");
    return;
  }

  // ✅ ĐỦ ĐIỀU KIỆN
  btnCloseEarly.disabled = false;
  btnCloseEarly.textContent = "Chốt lệnh sớm";
  btnCloseEarly.classList.remove("hidden");

}, 500);


btnCloseEarly?.addEventListener("click", () => {
  fetch("/api/invest/close-early", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-uid": me.uid
    }
  })
  .then(r => r.json())
  .then(d => {
    if (!d.ok) {
      showModal("⛔ Không thể chốt", d.message || "Thao tác thất bại");
      return;
    }

    // ✅ RESET TRẠNG THÁI NGAY
    joinedRound = false;
    closedEarlyThisRound = true;
    myEntryPrice = null;
    myOrderDirection = null;
    myEntryTime = null;

    const pnlBox = document.getElementById("pnlRealtime");
    if (pnlBox) pnlBox.classList.add("hidden");

    btnCloseEarly.classList.add("hidden");

// 🔄 SYNC LẠI COIN NGAY SAU KHI CHỐT SỚM
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

// 🔔 MỞ MODAL KẾT QUẢ
openResultModal({
  percent: d.percent,
  profit: d.profit,
  asset,
  dir: d.direction === "down" ? "📉 Giảm" : "📈 Tăng",
  coin: d.coin,
  entry: d.entryPrice,
  end: d.endPrice
});

  })
  .catch(() => {
    showModal("❌ Lỗi mạng", "Không thể kết nối server.");
  });
});



socket.on("invest-closed-early", d => {
  // reset trạng thái
  joinedRound = false;
  myEntryPrice = null;
  myOrderDirection = null;
  myEntryTime = null;

  const pnlBox = document.getElementById("pnlRealtime");
  if (pnlBox) pnlBox.classList.add("hidden");

  // mở modal kết quả
  openResultModal({
    percent: d.percent,
    profit: d.profit,
    asset,
    dir: d.percent >= 0 ? "📈" : "📉",
    coin: d.profit,
    entry: myEntryPrice,
    end: d.priceNow
  });
});
