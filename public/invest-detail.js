// ================== HARD GUARD: KHÓA VÀO LẠI KHI ĐANG TRONG PHIÊN ==================
(async function guardInvestEntry(){
  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");
  if (!me.uid) return;

  try {
    const res = await fetch("/api/invest/can-enter", {
      headers: { "x-uid": me.uid }
    }).then(r => r.json());

    // 🔒 ĐANG BỊ KHÓA → KHÔNG CHO LOAD TRANG
    if (res?.locked && res.endAt) {
      showHardLock(res.endAt);

      // ⛔ CHẶN TOÀN BỘ JS PHÍA DƯỚI
      throw new Error("INVEST_LOCKED");
    }
  } catch (e) {
    if (e.message === "INVEST_LOCKED") {
      // dừng script
      return;
    }
    console.warn("⚠️ can-enter check failed", e);
  }
})();



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
let myEntryPriceDraw = null; // 🔥 giá entry theo hệ draw
let lastRoundChart = [];





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
    vol: 1
  },
  silver: {
    name: "Silver",
    icon: `<img src="/assets/silver.png" class="asset-icon">`,
    vol: 1.5
  },
  diamond: {
    name: "Diamond",
    icon: `<img src="/assets/diamond.png" class="asset-icon">`,
    vol: 3
  },
  oil: {
    name: "Oil",
    icon: `<img src="/assets/oil.png" class="asset-icon">`,
    vol: 5
  },
  estate: {
    name: "Real Estate",
    icon: `<img src="/assets/estate.png" class="asset-icon">`,
    vol: 3.5
  },
  atomic: {
    name: "Atomic",
    icon: `<img src="/assets/atomic.png" class="asset-icon">`,
    vol: 8.5
  }
};




const c = config[asset] || config.gold;

document.getElementById("assetTitle").innerHTML =
  `${c.name}`;


document.getElementById("analysisText").innerHTML = `
  <li>🌊 Biến động: ${c.vol >= 6 ? "CỰC CAO" : c.vol >= 3 ? "CAO" : "TRUNG BÌNH"}</li>
  <li>🎯 Biên độ giao động mở</li>
  <li>⏱ Có thể chốt lệnh sớm trong phiên</li>
  <li>🛡️ Lãi / lỗ được kiểm soát theo vốn</li>
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
  // 🔥 FIX aria-hidden warning
  document.activeElement?.blur();

  pnlHistoryModal.classList.add("hidden");
  document.body.style.overflow = "";
}



function renderPnlHistory(list){
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // 🔥 chỉ lấy dữ liệu 24h
  list = (list || []).filter(
    i => i.ts && now - i.ts <= ONE_DAY
  );

  if (!list.length) {
    pnlHistoryList.innerHTML = `
      <li class="pnl-empty">
        <div style="font-size:26px">🕒</div>
        <div>Không có lịch sử trong 24 giờ</div>
        <small>Dữ liệu cũ hơn sẽ tự động xoá</small>
      </li>
    `;
    return;
  }

  pnlHistoryList.innerHTML = list.map(i => {
    const win = i.percent >= 0;

    const entry =
      typeof i.entryPrice === "number"
        ? i.entryPrice.toFixed(2)
        : "--";

    const end =
      typeof i.endPrice === "number"
        ? i.endPrice.toFixed(2)
        : "--";

    const roundId =
      i.roundId !== undefined && i.roundId !== null
        ? `#${i.roundId}`
        : "#--";

    return `
      <li class="pnl-item ${win ? "win" : "loss"}">
        <!-- HÀNG TRÊN -->
        <div class="pnl-main">
          <div class="pnl-left">
            <div class="pnl-asset">
              ${i.asset.toUpperCase()}

              <span class="pnl-round"
               data-round="${i.roundId}"
               data-asset="${i.asset}">
              ${roundId}
              </span>

            </div>
            <div class="pnl-dir">
              ${i.direction === "up" ? "UP" :
                i.direction === "down" ? "DOWN" : "➖"}
            </div>
          </div>

          <div class="pnl-right">
            <div class="pnl-percent">
              ${win ? "+" : ""}${i.percent}%
            </div>
          </div>
        </div>

        <!-- GIÁ -->
        <div class="pnl-price-row">
          <div>
            <span>ENTRY</span>
            <b>${entry}</b>
          </div>
          <div>
            <span>CLOSE</span>
            <b>${end}</b>
          </div>
        </div>

        <!-- FOOT -->
        <div class="pnl-sub">
          <span>${i.coin} 💎 → <b>${win ? "+" : ""}${i.profit}</b></span>
          <span class="pnl-time">
            ${new Date(i.ts).toLocaleString()}
          </span>
        </div>
      </li>
    `;
  }).join("");
}


// 👉 click ROUND → mở chart snapshot
pnlHistoryList.addEventListener("click", e => {
  const el = e.target.closest(".pnl-round");
  if (!el) return;

  const roundId = el.dataset.round;
  const asset   = el.dataset.asset;

  if (!roundId || roundId === "--") {
    showModal("⚠️ Không khả dụng", "Phiên này không có dữ liệu chart.");
    return;
  }

  openRoundSnapshot(roundId, asset);
});



function openRoundSnapshot(roundId, asset){


  // 🔥 ĐÓNG PNL HISTORY TRƯỚC KHI MỞ SNAPSHOT
  closePnlHistory();

  // fetch lịch sử round
  fetch("/api/invest/history")
    .then(r => r.json())
    .then(d => {
      if (!d.ok) return;

      const round = d.list.find(r => String(r.roundId) === String(roundId));
      if (!round) {
        showModal("❌ Lỗi", "Không tìm thấy dữ liệu round.");
        return;
      }

      // chart snapshot chỉ cần giá đầu → cuối
openSnapshotFS(
  round.chart?.[asset],
  round.orders,
  asset
);

    });
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

  // 🔥 FIX aria-hidden warning
  document.activeElement?.blur();

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

  // 🔥 FIX aria-hidden warning
  document.activeElement?.blur();

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

ordersModalList.innerHTML = roundOrders.map(o => {
  const dirIcon =
    o.direction === "up" ? "UP" :
    o.direction === "down" ? "DOWN" :
    "➖";

  return `
    <li class="order-item ${o.uid === me.uid ? "me" : ""}">
      <div>
        ${o.uid === me.uid ? "🧑 YOU" : "👤 PLAYER"}
      </div>
      <div>
        <b>${o.coin} 💎</b>
        <span style="margin-left:8px;opacity:.85">${dirIcon}</span>
      </div>
    </li>
  `;
}).join("");
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
  // 🔥 FIX aria-hidden warning
  document.activeElement?.blur();

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

  // 🔥 PHỤC HỒI ENTRY DRAW (RELOAD)
  myEntryPriceDraw = toDrawPrice(myEntryPrice);


  // 🔒 ẨN NÚT LÊN / XUỐNG
  document.getElementById("directionBox")?.classList.add("hidden");

  // 🔁 ĐÚNG UI: ẨN VÀO LỆNH → HIỆN CHỐT SỚM
  showCloseEarlyButton();
}



      // 📍 phục hồi marker vào lệnh
entryMarkers = roundOrders
  .filter(o => typeof o.entrySec === "number")
  .map(o => {
    // 🔥 quy đổi giây vào lệnh → index hiện tại trong chartData
    const idx = Math.max(
      0,
      Math.min(
        chartData.length - 1,
        chartData.length - (ROUND_DURATION - o.entrySec)
      )
    );

    return {
      index: idx,
      priceRaw: o.entryPrice,
      mine: o.uid === me.uid
    };
  });



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
    <span class="timer-text">60s</span>
  `;
}




const investBtn = document.querySelector(".btn-invest-main");



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
  textEl.textContent = `${left}`;
  timerEl.className =
    "round-timer overlay-timer running";

  if (!joinedRound) {
    investBtn.disabled = false;
    investBtn.textContent = "START";
  }
}
else if (left > 0) {
  // 🔴 SẮP CHỐT
  textEl.textContent = `${left}`;
  timerEl.className =
    "round-timer overlay-timer locked";

  if (!joinedRound) {
    investBtn.disabled = true;
    investBtn.textContent = "LOCKED";
  }
}
else {
  // 🔒 HẾT GIỜ
  textEl.textContent = "0";
  timerEl.className =
    "round-timer overlay-timer locked";

  timerEl.style.setProperty("--progress", 0);

  investBtn.disabled = true;
  investBtn.textContent = "LOCKED";
}

  }, 500);
}




socket.on("invest-order-new", o => {
  if (o.asset !== asset) return;

  roundOrders.push(o);

if (o.uid === me.uid && typeof o.entryPrice === "number") {

  myEntryPrice = o.entryPrice;                 // raw (tính PnL)
myEntryPriceDraw = toDrawPrice(o.entryPrice); // 🔥 draw (vẽ)


  myOrderDirection = o.direction; // 🔥 LẤY HƯỚNG TỪ SERVER
}


  if (typeof o.entrySec === "number" && typeof o.entryPrice === "number") {

entryMarkers.push({
  index: chartData.length - 1,     // vị trí thực trên chart
  priceRaw: o.entryPrice,          // 🔹 giá thật (tính PnL)
  priceDraw: toDrawPrice(o.entryPrice), // 🔥 giá đã offset để vẽ
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
myEntryPriceDraw = null; // sẽ cập nhật khi có tick đầu


// 🎞 bắt đầu fade round mới
roundFadeStart = Date.now();

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
  updateBackButtonState();
  hideReloadLock(); // 🔓 mở khóa reload

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
  myOrder.direction === "up" ? "UP" :
  myOrder.direction === "down" ? "DOWN" :
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
const MAX_POINTS = 60;
let chartData = [];
let lastPriceOfPrevRound = null; // 🔥 lưu giá cuối round trước

let roundMarkers = [];
let roundBasePrice = null;  // 🔥 neo giá round mới
let roundZeroPrice = null;  // 🔥 giá server tại second = 0

// 🎞 fade khi sang round mới
let roundFadeStart = 0;
const ROUND_FADE_DURATION = 600; // ms


function toDrawPrice(raw){
  if (typeof raw !== "number") return raw;

  if (
    typeof roundBasePrice === "number" &&
    typeof roundZeroPrice === "number"
  ) {
    return roundBasePrice + (raw - roundZeroPrice);
  }
  return raw;
}





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

  // 🔥 KHÔI PHỤC OFFSET STATE SAU RELOAD
// 🔥 KHÔI PHỤC OFFSET STATE SAU RELOAD (CHUẨN)
roundBasePrice = lastPriceOfPrevRound;

// ⚠️ KHÔNG ĐƯỢC SUY RA roundZeroPrice TỪ chartData
roundZeroPrice = null;

// 🔁 entry + marker tạm thời dùng raw
if (typeof myEntryPrice === "number") {
  myEntryPriceDraw = myEntryPrice;
}

entryMarkers.forEach(m => {
  if (typeof m.priceRaw === "number") {
    m.priceDraw = m.priceRaw;
  }
});


// 🔁 RECALC ENTRY DRAW + MARKER DRAW
if (typeof myEntryPrice === "number") {
  myEntryPriceDraw = toDrawPrice(myEntryPrice);
}

entryMarkers.forEach(m => {
  if (typeof m.priceRaw === "number") {
    m.priceDraw = toDrawPrice(m.priceRaw);
  }
});


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
  // lưu giá reset của server
  roundZeroPrice = p;

  // 🔥 neo round mới vào giá cuối round cũ
  if (typeof roundBasePrice === "number") {
    drawPrice = roundBasePrice;
  }

  // 🔥 cập nhật ENTRY DRAW (sau khi base đã ổn định)
  if (typeof myEntryPrice === "number") {
    myEntryPriceDraw = toDrawPrice(myEntryPrice);
  }

  // 🔥 cập nhật lại DRAW cho toàn bộ marker
  entryMarkers.forEach(m => {
    if (typeof m.priceRaw === "number") {
      m.priceDraw = toDrawPrice(m.priceRaw);
    }
  });
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

lastRoundChart = chartData.slice();

  // =========================
  // 🔁 GIỮ TỐI ĐA 60 ĐIỂM
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
// 💰 PnL realtime (PILL GỌN)
// =========================
const pnlBox = document.getElementById("pnlRealtime");
if (joinedRound && myEntryPrice && pnlBox && myOrderDirection) {

  const arrowEl = pnlBox.querySelector(".pnl-arrow");
  const valueEl = pnlBox.querySelector(".pnl-value");
  if (!arrowEl || !valueEl) return;

  const last = p;

  let percent = Math.round(
    (last - myEntryPrice) / myEntryPrice * 100
  );

  if (myOrderDirection === "down") percent = -percent;

  // clamp an toàn
  percent = Math.max(-30, Math.min(30, percent));

  // reset state
  pnlBox.classList.remove("up","down","neutral");
  pnlBox.classList.remove("hidden");

  // hiển thị %
  valueEl.textContent =
    (percent > 0 ? "+" : "") + percent + "%";

  if (percent > 0) {
    pnlBox.classList.add("up");
    arrowEl.textContent = "▲";
  }
  else if (percent < 0) {
    pnlBox.classList.add("down");
    arrowEl.textContent = "▼";
  }
  else {
    pnlBox.classList.add("neutral");
    arrowEl.textContent = "●";
  }
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
// 🎯 ENTRY BAND (VÙNG MỜ) — LẤY THEO INDEX THẬT
// =========================
if (joinedRound) {
  const myMarker = entryMarkers.find(m => m.mine);
  if (myMarker && typeof data[myMarker.index] === "number") {
    const entryDraw = data[myMarker.index];     // ✅ đúng hệ
    const entryY = toY(entryDraw);

    const bandHeight = 16;

    const lastDraw = points[points.length - 1]; // last numeric để so màu
    const isProfit =
      myOrderDirection === "up"
        ? lastDraw >= entryDraw
        : lastDraw <= entryDraw;

    ctx.save();
    ctx.fillStyle = isProfit
      ? "rgba(0,255,153,0.12)"
      : "rgba(255,92,92,0.12)";
    ctx.fillRect(0, entryY - bandHeight / 2, W, bandHeight);
    ctx.restore();
  }
}


// =========================
// 📍 ENTRY LINE (THEO INDEX THẬT)
// =========================
if (joinedRound) {
  const myMarker = entryMarkers.find(m => m.mine);
  if (myMarker && typeof data[myMarker.index] === "number") {
    const entryDraw = data[myMarker.index];
    const y = toY(entryDraw);

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle =
      (points[points.length - 1] >= entryDraw) ? "#00ff99" : "#ff5c5c";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = ctx.strokeStyle;

    const dirLabel =
      myOrderDirection === "up" ? "ENTRY 📈" :
      myOrderDirection === "down" ? "ENTRY 📉" : "ENTRY";

    ctx.fillText(dirLabel, 6, Math.max(12, y - 4));

    const txt = (typeof myEntryPrice === "number") ? myEntryPrice.toFixed(2) : "";
    const tw = ctx.measureText(txt).width;
    if (txt) ctx.fillText(txt, W - tw - 8, Math.max(12, y - 4));

    ctx.restore();
  }
}



  // =========================
  // 📈 LINE CHART
  // =========================
  const color =
    last > first ? "#00ff99" :
    last < first ? "#ff5c5c" :
    "#aaa";

// =========================
// 🌊 AREA HIGHLIGHT DƯỚI ĐƯỜNG LINE
// =========================
ctx.save();

ctx.beginPath();

// bắt đầu từ đáy chart tại điểm đầu
ctx.moveTo(0, H);

points.forEach((v, i) => {
  const x = i * (W / Math.max(data.length - 1, 1));
  const y = toY(v);
  ctx.lineTo(x, y);
});

// đóng shape về đáy chart
ctx.lineTo(W, H);
ctx.closePath();

// gradient mờ từ line xuống đáy
const grad = ctx.createLinearGradient(0, 0, 0, H);

if (last > first) {
  // 📈 xanh
  grad.addColorStop(0, "rgba(0,255,153,0.35)");
  grad.addColorStop(1, "rgba(0,255,153,0)");
} else if (last < first) {
  // 📉 đỏ
  grad.addColorStop(0, "rgba(255,92,92,0.35)");
  grad.addColorStop(1, "rgba(255,92,92,0)");
} else {
  grad.addColorStop(0, "rgba(180,180,180,0.25)");
  grad.addColorStop(1, "rgba(180,180,180,0)");
}

ctx.fillStyle = grad;
ctx.fill();

ctx.restore();


// =========================
// 📈 LINE CHART (FADE ROUND)
// =========================
let alpha = 1;

// nếu đang trong giai đoạn fade
if (roundFadeStart) {
  const elapsed = Date.now() - roundFadeStart;
  alpha = Math.min(1, elapsed / ROUND_FADE_DURATION);

  if (alpha >= 1) {
    roundFadeStart = 0; // kết thúc fade
  }
}

ctx.beginPath();
ctx.strokeStyle = color;
ctx.globalAlpha = alpha;
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
  ctx.globalAlpha = 1; // reset alpha
  // =========================
  // 📍 ENTRY MARKERS
  // =========================
  entryMarkers.forEach(m => {
if (m.index < 0 || m.index >= data.length) return;
const x = m.index * (W / Math.max(data.length - 1, 1));


const v = data[m.index];
if (typeof v !== "number") return;
const y = toY(v);




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


let investCoin = 0;
const coinDisplay = document.getElementById("coinDisplay");

function updateCoin(){
  if (coinDisplay) {
    coinDisplay.textContent = investCoin.toLocaleString();
  }
}


// ⚡ ALL IN / 50% / 25%
document
  .querySelectorAll(".coin-ratio button")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      const ratio = Number(btn.dataset.ratio);
      const maxCoin = Number(me.coins) || 0;

      if (maxCoin <= 0) return;

      investCoin = Math.floor(maxCoin * ratio);
      updateCoin();
    });
  });



// ⚡ coin quick
document
  .querySelectorAll(".coin-quick button")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      investCoin += Number(btn.dataset.add);
      updateCoin();
    });
  });

// 🔘 nút XÓA
document
  .querySelector(".key-clear")
  ?.addEventListener("click", () => {
    investCoin = 0;
    updateCoin();
  });



  function formatTime(ts){
  if (!ts) return "--:--:--";
  const d = new Date(ts);
  return d.toLocaleTimeString("vi-VN");
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

const coin = investCoin;


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

updateBackButtonState();

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

    // 🔄 reset keypad coin sau khi vào lệnh
investCoin = 0;
updateCoin();



    // 🔒 KHOÁ NÚT
    const btn = document.querySelector(".detail-invest button");


const dirText =
  myDirection === "up" ? "UP" :
  myDirection === "down" ? "DOWN" :
  "➖";

showModal(
  "",
  `
  <div class="enter-sheet">

    <!-- HEADER -->
    <div class="es-header">
      <div class="es-status">ĐÃ VÀO LỆNH</div>
      <div class="es-dir">${dirText}</div>
    </div>

    <!-- META -->
    <div class="es-meta">
      <div class="es-meta-item">
        <span>ROUND</span>
        <b>#${currentRoundId ?? "--"}</b>
      </div>
      <div class="es-meta-item">
        <span>THỜI GIAN VÀO</span>
        <b>${formatTime(myEntryTime)}</b>
      </div>
    </div>

    <!-- BODY -->
    <div class="es-body">

      <div class="es-entry">
        <span>ENTRY PRICE</span>
        <b>${
          typeof myEntryPrice === "number"
            ? myEntryPrice.toFixed(2)
            : "--"
        }</b>
      </div>

      <div class="es-card">
        <span>Vốn vào lệnh</span>
        <b>${coin} 💎</b>
      </div>

      <div class="es-note">
        ⏳ Lệnh đang được xử lý
        <small>Vui lòng chờ kết thúc phiên</small>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="es-footer">
      <button onclick="closeAppModal()">Đã hiểu</button>
    </div>

  </div>
  `
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



function openSnapshotFS(prices, orders, asset){
  const fs = document.getElementById("snapshotFS");
  const canvas = document.getElementById("snapshotFSCanvas");

  fs.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // resize canvas đúng theo viewport
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  drawFullSnapshotOnCanvas(
    canvas,
    prices,
    orders,
    asset
  );
}


function drawFullSnapshotOnCanvas(canvas, prices, orders, asset){
  if (!Array.isArray(prices) || prices.length < 2) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0,0,W,H);

  const padX = 20;
  const padY = 40; // 👈 dư trên/dưới cho dọc
  const usableW = W - padX*2;
  const usableH = H - padY*2;

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  const toX = i =>
    padX + i * (usableW / (prices.length - 1));

  const toY = p =>
    padY + usableH - (p - min) / (max - min) * usableH;

  // GRID
  ctx.strokeStyle = "rgba(255,255,255,.06)";
  for(let i=0;i<6;i++){
    const y = padY + i * (usableH/5);
    ctx.beginPath();
    ctx.moveTo(padX,y);
    ctx.lineTo(W-padX,y);
    ctx.stroke();
  }

  // LINE
  ctx.strokeStyle = "#00ff99";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#00ff99";

  ctx.beginPath();
  prices.forEach((p,i)=>{
    const x = toX(i);
    const y = toY(p);
    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.shadowBlur = 0;

// 🎯 ENTRY LINE – CHỈ CỦA USER HIỆN TẠI
const myOrder = orders?.find(
  o => o.uid === me.uid && o.asset === asset
);

if (myOrder && typeof myOrder.entryPrice === "number") {
  const y = toY(myOrder.entryPrice);

  ctx.save();
  ctx.strokeStyle = "#ffd54f";
  ctx.setLineDash([6,6]);
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(W - padX, y);
  ctx.stroke();

  ctx.setLineDash([]);

  // label ENTRY
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#ffd54f";
  ctx.fillText("ENTRY", padX + 6, Math.max(16, y - 6));

  ctx.restore();
}


  // CLOSE
  const closeY = toY(prices.at(-1));
  ctx.strokeStyle = "#ff5252";
  ctx.beginPath();
  ctx.moveTo(padX, closeY);
  ctx.lineTo(W-padX, closeY);
  ctx.stroke();
}


function closeSnapshotFS(){
  // 🔥 FIX aria-hidden / focus
  document.activeElement?.blur();

  const fs = document.getElementById("snapshotFS");
  fs.classList.add("hidden");
  document.body.style.overflow = "";
}


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

  
  // 📊 VẼ LỊCH SỬ CHART PHIÊN
setTimeout(() => {
  drawResultChart(lastRoundChart, entry);
}, 80);


}



function closeResultModal() {
  const modal = document.getElementById("resultModal");
  if (!modal) return;

  modal.classList.add("hidden");
  document.body.style.overflow = "";
}



// ================= BACK BUTTON LOCK WHEN IN ORDER =================
const btnBack = document.getElementById("btnBack");

if (btnBack) {
  btnBack.addEventListener("click", () => {

    // 🔒 ĐÃ VÀO LỆNH → KHÔNG CHO THOÁT
    if (joinedRound) {
      showModal(
        "🔒 Không thể quay lại",
        "Bạn đã vào lệnh. Vui lòng chờ kết thúc phiên để quay lại."
      );
      return;
    }

    // ✅ CHƯA VÀO LỆNH → CHO QUAY LẠI
    if (window.history.length > 1) {
      history.back();
    } else {
      location.href = "/invest.html";
    }
  });
}

// ===== UPDATE BACK BUTTON UI STATE =====
function updateBackButtonState(){
  if (!btnBack) return;
  btnBack.style.opacity = joinedRound ? "0.4" : "1";
  btnBack.style.pointerEvents = "auto"; // vẫn click để hiện modal
}

// chạy lần đầu khi load trang
updateBackButtonState();







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
      `⏳ Wait ${10 - passed}s to stop`;
    btnCloseEarly.classList.remove("hidden");
    return;
  }

  // ✅ ĐỦ ĐIỀU KIỆN
  btnCloseEarly.disabled = false;
  btnCloseEarly.textContent = "STOP";
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
    updateBackButtonState();
    hideReloadLock();


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
  dir: d.direction === "down" ? "DOWN" : "UP",
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
  updateBackButtonState();
  hideReloadLock();



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





// ================= BLOCK RELOAD WHEN IN ORDER =================

// 🔒 Browser reload (nút refresh / đóng tab)
window.addEventListener("beforeunload", (e) => {
  if (!joinedRound) return;

  showReloadLock();        // 👉 hiện overlay
  e.preventDefault();
  e.returnValue = "";      // bắt buộc cho Chrome
  return "";
});

// 🔒 F5 / Ctrl+R / Cmd+R
window.addEventListener("keydown", (e) => {
  if (!joinedRound) return;

  const key = e.key.toLowerCase();

  if (
    key === "f5" ||
    ((e.ctrlKey || e.metaKey) && key === "r")
  ) {
    e.preventDefault();
    showReloadLock();      // 👉 hiện overlay
  }
});



// ================= RELOAD LOCK OVERLAY =================
const reloadLock = document.getElementById("reloadLock");

function showReloadLock() {
  if (!reloadLock) return;
  reloadLock.classList.remove("hidden");
}

function hideReloadLock() {
  if (!reloadLock) return;
  reloadLock.classList.add("hidden");
}



function showHardLock(endAt){
  // xoá sạch UI để không tương tác được
  document.body.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position:fixed;
    inset:0;
    background:#000;
    z-index:999999;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#fff;
    text-align:center;
  `;

  wrap.innerHTML = `
    <div>
      <div style="font-size:52px">🔒</div>
      <h2>Phiên đang diễn ra</h2>
      <p>Bạn đã vào lệnh ở phiên này.</p>
      <p id="lockCountdown" style="font-size:18px;margin-top:8px"></p>
      <p style="opacity:.6;font-size:12px;margin-top:12px">
        Vui lòng chờ phiên kết thúc để tiếp tục
      </p>
    </div>
  `;

  document.body.appendChild(wrap);

  const cd = document.getElementById("lockCountdown");

  const tick = () => {
    const left = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
    if (cd) cd.textContent = `⏳ Còn ${left}s`;

    if (left <= 0) {
      location.reload(); // 🔓 HẾT PHIÊN → LOAD LẠI TRANG
    }
  };

  tick();
  setInterval(tick, 1000);
}



const fabToggle = document.getElementById("fabToggle");
const fabGroup  = document.getElementById("fabGroup");

if (fabToggle && fabGroup) {
  fabToggle.addEventListener("click", () => {
    fabGroup.classList.toggle("hidden");
    fabToggle.textContent =
      fabGroup.classList.contains("hidden") ? "⋮" : "✕";
  });
}


function drawResultChart(data, entryPrice){
  const canvas = document.getElementById("rmChart");
  if (!canvas || !data || data.length < 2) return;

  const ctx = canvas.getContext("2d");

  // resize canvas
  const W = canvas.width = canvas.offsetWidth;
  const H = canvas.height;

  const points = data.filter(v => typeof v === "number");
  if (points.length < 2) return;

  let min = Math.min(...points);
  let max = Math.max(...points);
  const pad = (max - min) * 0.2 || 1;
  min -= pad;
  max += pad;

  const toY = v =>
    H - ((v - min) / (max - min)) * H;

  const first = points[0];
  const last  = points[points.length - 1];

  const color =
    last > first ? "#00ff99" :
    last < first ? "#ff5c5c" : "#aaa";

  // ===== ENTRY LINE (vẽ tĩnh phía dưới) =====
  function drawEntryLine(){
    if (typeof entryPrice !== "number") return;
    const y = toY(entryPrice);

    ctx.save();
    ctx.setLineDash([4,4]);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.restore();
  }

  // ===== ANIMATE LINE =====
  const duration = 600; // ms
  const start = performance.now();

  function animate(now){
    const progress = Math.min(1, (now - start) / duration);
    const count = Math.max(
      2,
      Math.floor(points.length * progress)
    );

    ctx.clearRect(0, 0, W, H);

    // entry line luôn ở dưới
    drawEntryLine();

    // line
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    for (let i = 0; i < count; i++) {
      const x = i * (W / (points.length - 1));
      const y = toY(points[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}
