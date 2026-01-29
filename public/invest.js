const me = JSON.parse(localStorage.getItem("user_profile")||"{}");

let currentAsset = null;

document.getElementById("myCoin").textContent = me.coins || 0;

function investUI(type,inputId){
  const coin = Number(
    document.getElementById(inputId).value
  );
  if(!coin) return;

  fetch("/api/invest",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid":me.uid
    },
    body:JSON.stringify({type,coin})
  })
  .then(r=>r.json())
  .then(d=>{
    if(!d.ok){
      alert(d.message||"Lỗi đầu tư");
      return;
    }

    showResult(d.percent,d.profit,d.coins);
  });
}



function showResult(percent, profit, coins) {
  const box = document.getElementById("investResult");

  // ✅ UPDATE UI NGAY
  const coinEl = document.getElementById("myCoin");
  if (coinEl) coinEl.textContent = coins;

  // ✅ SYNC LOCALSTORAGE (QUAN TRỌNG)
  try {
    const p = JSON.parse(localStorage.getItem("user_profile") || "{}");
    p.coins = coins;
    localStorage.setItem("user_profile", JSON.stringify(p));
  } catch (e) {}

  if (!box) {
    alert(
      `${profit >= 0 ? "🎉 LỢI NHUẬN" : "💥 THUA LỖ"}\n` +
      `Biến động: ${percent}%\n` +
      `Coin: ${profit}\n` +
      `Số dư mới: ${coins}`
    );
    return;
  }

  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="box">
      <h2>${profit >= 0 ? "🎉 LỢI NHUẬN" : "💥 THUA LỖ"}</h2>
      <p>Biến động: <b>${percent}%</b></p>
      <p>Coin: 
        <b style="color:${profit >= 0 ? "#00ffcc" : "#ff6b6b"}">
          ${profit > 0 ? "+" : ""}${profit}
        </b>
      </p>
      <p>Số dư mới: <b>${coins}</b></p>
      <button onclick="closeResult()">OK</button>
    </div>
  `;
}


function closeResult(){
  document.getElementById("investResult")
    .classList.add("hidden");
  location.reload();
}


function openAnalysis(type) {
  currentAsset = type;

  const ranges = {
    gold:    { min:-5, max:8,  name:"🥇 Vàng" },
    silver:  { min:-3, max:5,  name:"🥈 Bạc" },
    diamond: { min:-10,max:15, name:"💎 Kim cương" }
  };

  const r = ranges[type];

  document.getElementById("analysisTitle").textContent =
    `📊 Phân tích ${r.name}`;

document.getElementById("analysisText").innerHTML = `
  <ul>
    <li>📉 Rủi ro tối đa: <b>${r.min}%</b></li>
    <li>📈 Lợi nhuận kỳ vọng: <b>${r.max}%</b></li>
    <li>⚠️ Biến động ngẫu nhiên theo thị trường</li>
    <li>🧠 Phù hợp: ${
      type === "diamond"
        ? "Nhà đầu tư mạo hiểm"
        : "Đầu tư ổn định"
    }</li>
  </ul>
`;


  document.getElementById("analysisCoin").textContent =
    me.coins || 0;

  document.getElementById("analysisAmount").value = "";

  document.getElementById("analysisModal")
    .classList.remove("hidden");
    startFakeChart(type);
}

function closeAnalysis(){
  stopFakeChart();
  document.getElementById("analysisModal")
    .classList.add("hidden");
}



function confirmInvest(){
  const coin = Number(
    document.getElementById("analysisAmount").value
  );

  if(!coin || coin <= 0){
    alert("Nhập số coin hợp lệ");
    return;
  }

  fetch("/api/invest",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({
      type: currentAsset,
      coin
    })
  })
  .then(r=>r.json())
  .then(d=>{
    if(!d.ok){
      alert(d.message || "Không thể đầu tư");
      return;
    }

    closeAnalysis();
    showResult(d.percent, d.profit, d.coins);
  });
}


let chartTimer = null;
let chartData = [];


function startFakeChart(type){
  stopFakeChart();

  const canvas = document.getElementById("priceChart");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  chartData = [];
  let price = 100;

  const volatility = {
    gold: 1,
    silver: 1.5,
    diamond: 3
  }[type] || 1;

  function draw(){
    ctx.clearRect(0,0,W,H);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,.05)";
    for(let i=0;i<5;i++){
      ctx.beginPath();
      ctx.moveTo(0, i*H/5);
      ctx.lineTo(W, i*H/5);
      ctx.stroke();
    }

    // line
    ctx.beginPath();
    ctx.strokeStyle = "#00ffd5";
    ctx.lineWidth = 2;

    chartData.forEach((p,i)=>{
      const x = i * (W / 30);
      const y = H - (p - 80) * (H / 40);
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });

    ctx.stroke();
  }

  chartTimer = setInterval(()=>{
    price += (Math.random() - 0.5) * volatility;
    price = Math.max(80, Math.min(120, price));

    chartData.push(price);
    if(chartData.length > 30) chartData.shift();

    draw();
  }, 1200);
}


function stopFakeChart(){
  if(chartTimer){
    clearInterval(chartTimer);
    chartTimer = null;
  }
}
