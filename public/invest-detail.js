// invest-detail.js – BẢN HOÀN CHỈNH

const params = new URLSearchParams(location.search);
const asset = params.get("asset") || "gold";

const me = JSON.parse(localStorage.getItem("user_profile") || "{}");
document.getElementById("myCoin").textContent = me.coins || 0;

// Cấu hình tài sản
const config = {
  gold:    { name:"🥇 Vàng", min:-5, max:8,  vol:1 },
  silver:  { name:"🥈 Bạc", min:-3, max:5,  vol:1.5 },
  diamond: { name:"💎 Kim cương", min:-10, max:15, vol:3 }
};

const c = config[asset] || config.gold;

// Tiêu đề + phân tích
document.getElementById("assetTitle").textContent =
  `📈 Phân tích ${c.name}`;

document.getElementById("analysisText").innerHTML = `
  <li>📉 Rủi ro tối đa: ${c.min}%</li>
  <li>📈 Lợi nhuận kỳ vọng: ${c.max}%</li>
  <li>⚠️ Biến động thị trường ngẫu nhiên</li>
`;

// ================== CHART ==================

let chartTimer = null;
let chartData = [];

// Xác định màu theo xu hướng
function getTrendColor(data){
  if (data.length < 2) return "#888";
  const first = data[0];
  const last  = data[data.length - 1];
  if (last > first + 0.5) return "#00ff99"; // tăng
  if (last < first - 0.5) return "#ff5c5c"; // giảm
  return "#aaa"; // sideway
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

// ================== ĐẦU TƯ ==================

function confirmInvest(){
  const coin = Number(document.getElementById("investAmount").value);
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
      alert(d.message || "Không thể đầu tư");
      return;
    }

    // Update coin
    document.getElementById("myCoin").textContent = d.coins;
    me.coins = d.coins;
    localStorage.setItem("user_profile", JSON.stringify(me));

    alert(
      (d.profit >= 0 ? "🎉 Lãi " : "💥 Lỗ ") +
      d.profit + " coin"
    );
  });
}

// Start chart khi vào trang
startFakeChart();
