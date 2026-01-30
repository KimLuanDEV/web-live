// invest-detail.js – REALTIME ROUND 60s

const params = new URLSearchParams(location.search);
const asset = params.get("asset") || "gold";
const historyEl = document.getElementById("roundHistory");

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
      <b>${o.coin} 💎</b>
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
    if (d.ok && d.endAt) {
      startRoundTimer(d.endAt);
    }
  });




let roundEndAt = 0;
let timerInt = null;
let joinedRound = false;
let roundOrders = [];

const orderListEl = document.getElementById("orderList");
const timerEl = document.getElementById("roundTimer");
const investBtn = document.querySelector(".detail-invest button");




function startRoundTimer(endAt){
  roundEndAt = endAt;
  clearInterval(timerInt);

  timerInt = setInterval(() => {
    const left = Math.max(
      0,
      Math.floor((roundEndAt - Date.now()) / 1000)
    );

    if (left > 5) {
      // ✅ còn đủ thời gian → cho vào lệnh
      timerEl.textContent = `⏳ Chốt sau ${left}s`;
      investBtn.disabled = false;
      investBtn.textContent = "🚀 VÀO LỆNH";
    }
    else if (left > 0) {
      // 🔒 còn <5s → khóa
      timerEl.textContent = `🔒 Sắp chốt (${left}s)`;
      investBtn.disabled = true;
      investBtn.textContent = "⛔ ĐÃ KHÓA";
    }
    else {
      // 🔐 đang chốt
      timerEl.textContent = "🔐 Đang chốt phiên...";
      investBtn.disabled = true;
      investBtn.textContent = "⛔ ĐÃ KHÓA";
    }
  }, 500);
}


socket.on("invest-order-new", o => {
  if (o.asset !== asset) return;

  roundOrders.push(o);
  renderOrderList();
});


// nhận phiên mới
socket.on("invest-round-new", d => {
  joinedRound = false;
  roundOrders = [];
  renderOrderList();
  startRoundTimer(d.endAt);
});


// nhận kết quả phiên
socket.on("invest-round-result", d => {

  // 1️⃣ LUÔN UPDATE BẢNG LỊCH SỬ (AI CŨNG THẤY)
  fetch("/api/invest/history")
    .then(r => r.json())
    .then(h => {
      if (h.ok) renderHistory(h.list);
    });

  // 2️⃣ NẾU CÓ VÀO LỆNH → MỚI SHOW MODAL + UPDATE COIN
  if (!joinedRound) return;

  const p = d.result?.[asset];
  if (p === undefined) return;

  showModal(
    p >= 0 ? "🎉 KẾT QUẢ PHIÊN" : "💥 KẾT QUẢ PHIÊN",
    p >= 0
      ? `Bạn lời <b>+${p}%</b> trong phiên này`
      : `Bạn lỗ <b>${p}%</b> trong phiên này`
  );

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


// ================== CHART (FAKE REALTIME) ==================

let chartTimer = null;
let chartData = [];

function getTrendColor(data){
  if (data.length < 2) return "#888";
  const first = data[0];
  const last  = data[data.length - 1];
  if (last > first + 0.5) return "#00ff99";
  if (last < first - 0.5) return "#ff5c5c";
  return "#aaa";
}





function startFakeChart(){
  stopFakeChart();

  const canvas = document.getElementById("priceChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  chartData = [];
  let price = 100;

  function draw(){
    ctx.clearRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,.05)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * H / 5);
      ctx.lineTo(W, i * H / 5);
      ctx.stroke();
    }

    const trendColor = getTrendColor(chartData);
    const trendText = document.getElementById("trendText");

    if (trendColor === "#00ff99") {
      trendText.textContent = "📈 Xu hướng tăng";
      trendText.className = "trend up";
    } else if (trendColor === "#ff5c5c") {
      trendText.textContent = "📉 Xu hướng giảm";
      trendText.className = "trend down";
    } else {
      trendText.textContent = "➖ Sideway";
      trendText.className = "trend neutral";
    }

    ctx.beginPath();
    ctx.strokeStyle = trendColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = trendColor;
    ctx.shadowBlur = 10;

    chartData.forEach((p, i) => {
      const x = i * (W / 30);
      const y = H - (p - 80) * (H / 40);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  chartTimer = setInterval(() => {
    price += (Math.random() - 0.5) * c.vol;
    price = Math.max(80, Math.min(120, price));
    chartData.push(price);
    if (chartData.length > 30) chartData.shift();
    draw();
  }, 1200);
}

function stopFakeChart(){
  if (chartTimer) {
    clearInterval(chartTimer);
    chartTimer = null;
  }
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
    body: JSON.stringify({ type: asset, coin })
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



  joinedRound = true;
    showModal(
  "✅ Thành công",
  "Đã vào lệnh, vui lòng chờ chốt phiên."
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



startFakeChart();
