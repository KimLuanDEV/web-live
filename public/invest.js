const me = JSON.parse(localStorage.getItem("user_profile")||"{}");
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
