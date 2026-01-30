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
  gold:    { name:"🥇 Vàng", min:-5,  max:8,  vol:1 },
  silver:  { name:"🥈 Bạc", min:-3,  max:5,  vol:1.5 },
  diamond: { name:"💎 Kim cương", min:-10, max:15, vol:3 }
};

const c = config[asset] || config.gold;

document.getElementById("assetTitle").textContent =
  `📈 Phân tích ${c.name}`;

document.getElementById("analysisText").innerHTML = `
  <li>📉 Rủi ro tối đa: ${c.min}%</li>
  <li>📈 Lợi nhuận kỳ vọng: ${c.max}%</li>
  <li>⏱ Chốt mỗi 60 giây (phiên chung)</li>
`;

// ================== SOCKET + ROUND ==================

const socket = io();


function renderHistory(list){
  if (!historyEl || !list?.length) return;

  historyEl.innerHTML = list.map(r => `
    <tr>
      <td>${new Date(r.ts).toLocaleTimeString()}</td>
      ${renderCell(r.result.gold)}
      ${renderCell(r.result.silver)}
      ${renderCell(r.result.diamond)}
    </tr>
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


function renderOrderList(){
  if (!orderListEl) return;

  if (!roundOrders.length) {
    orderListEl.innerHTML =
      `<li class="empty">Chưa có lệnh nào</li>`;
    return;
  }

  orderListEl.innerHTML = roundOrders.map(o => `
    <li class="order-item ${o.uid === me.uid ? "me" : ""}">
      <span>
        ${o.uid === me.uid ? "🧑 Bạn" : "👤 Người chơi"}
      </span>
      <b>
  ${o.direction === "up" ? "📈" : "📉"}
  ${o.coin} 💎
</b>
    </li>
  `).join("");
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
      renderOrderList();

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



fetch("/api/invest/chart")
  .then(r => r.json())
  .then(d => {
    if (!d.ok) return;

    const nowSec = Math.floor(
      (Date.now() - d.startAt) / 1000
    );

 chartData = d.chart[asset].slice(0, 60);


    drawChart(chartData);
  });





let roundEndAt = 0;
let timerInt = null;
let joinedRound = false;
let roundOrders = [];
let entryMarkers = []; // 📍 điểm vào lệnh

const orderListEl = document.getElementById("orderList");

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

// 🔥 LƯU ENTRY CHO PnL REALTIME
if (o.uid === me.uid && typeof o.entryPrice === "number") {
  myEntryPrice = o.entryPrice;
}


// 📍 lưu marker nếu có dữ liệu entry
if (typeof o.entrySec === "number" && typeof o.entryPrice === "number") {
  entryMarkers.push({
    sec: o.entrySec,
    price: o.entryPrice,
    mine: o.uid === me.uid
  });
}

renderOrderList();
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
  renderOrderList();
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

  showModal(
    percent >= 0 ? "🎉 KẾT QUẢ LỆNH" : "💥 KẾT QUẢ LỆNH",
    percent >= 0
      ? `Bạn lời <b>+${percent}%</b> từ điểm vào lệnh`
      : `Bạn lỗ <b>${percent}%</b> từ điểm vào lệnh`
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

  if (chartData[d.second] !== undefined) return;

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
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 220;
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
 if (trendText) {
  if (last > first) {
    trendText.textContent = "Xu hướng tăng";
    trendText.className = "trend-overlay up";
  } 
  else if (last < first) {
    trendText.textContent = "Xu hướng giảm";
    trendText.className = "trend-overlay down";
  } 
  else {
    trendText.textContent = "Sideway";
    trendText.className = "trend-overlay neutral";
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

function confirmInvest(direction){
  const amount =
    Number(document.getElementById("investAmount").value);

  if (!amount || amount <= 0) {
    showModal("⚠️ Lỗi", "Vui lòng nhập số coin hợp lệ");
    return;
  }

  showModal(
    "🚀 Xác nhận vào lệnh",
    `
      <div style="text-align:center">
        <p>Bạn chọn:</p>
        <h2 style="margin:8px 0">
          ${direction === "up" ? "📈 LÊN" : "📉 XUỐNG"}
        </h2>
        <p>Số coin: <b>${amount} 💎</b></p>

        <button class="app-modal-btn"
          onclick="submitInvest('${direction}', ${amount})">
          ✅ Xác nhận
        </button>
      </div>
    `
  );
}



function submitInvest(direction, amount){
  closeAppModal();

  fetch("/api/invest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({
      type: asset,
      coin: amount,
      direction // 🔥 UP / DOWN
    })
  })
    .then(r => r.json())
    .then(d => {
      if (!d.ok) {
        showModal("❌ Không thể vào lệnh", d.message || "Thao tác thất bại");
        return;
      }

      joinedRound = true;
      investBtn.disabled = true;
      investBtn.textContent = "⛔ ĐÃ VÀO LỆNH";
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

