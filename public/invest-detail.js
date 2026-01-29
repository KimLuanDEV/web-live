// invest-detail.js – REALTIME ROUND 60s

const params = new URLSearchParams(location.search);
const asset = params.get("asset") || "gold";

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

let roundEndAt = 0;
let timerInt = null;
let joinedRound = false;

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

    if (left > 0) {
      timerEl.textContent = `⏳ Chốt sau ${left}s`;
      investBtn.disabled = false;
      investBtn.textContent = "🚀 VÀO LỆNH";
    } else {
      timerEl.textContent = "🔒 Đang chốt phiên...";
      investBtn.disabled = true;
    }
  }, 500);
}

// nhận phiên mới
socket.on("invest-round-new", d => {
  joinedRound = false;
  startRoundTimer(d.endAt);
});

// nhận kết quả phiên
socket.on("invest-round-result", d => {
  const p = d.result?.[asset];
  if (p === undefined) return;

  alert(
    p >= 0
      ? `🎉 Phiên chốt: +${p}%`
      : `💥 Phiên chốt: ${p}%`
  );

  // sync coin lại từ server
  fetch("/api/me/coin", {
    headers: { "x-uid": me.uid }
  })
  .then(r => r.json())
  .then(d => {
    if (d.ok) {
      me.coins = d.coins;
      myCoinEl.textContent = d.coins;
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
  if (joinedRound) {
    alert("⛔ Bạn đã vào lệnh phiên này");
    return;
  }

  const coin = Number(
    document.getElementById("investAmount").value
  );

  if (!coin || coin <= 0) {
    alert("Nhập số coin hợp lệ");
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
      alert(d.message || "Không thể vào lệnh");
      return;
    }

    joinedRound = true;
    alert("✅ Đã vào lệnh, chờ chốt phiên");
  });
}

// ================== START ==================

startFakeChart();
