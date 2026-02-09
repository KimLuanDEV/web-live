   const socket = io({
  auth:{
    uid: JSON.parse(localStorage.getItem("user_profile"))?.uid
  }
});


const myCoinsEl = document.getElementById("myCoins");

// 💎 realtime wallet (profile.coins)
socket.on("coin-update", data=>{
  if(typeof data.coins === "number"){
    myCoinsEl.textContent = data.coins;

    // 🔒 HẾT COIN → KHÓA CƯỢC
    if(data.coins <= 0){
      playBtn.disabled = true;
      statusMsg.textContent = "💎 Bạn đã hết kim cương";

      betBtns.forEach(b=>b.disabled = true);
      betInput.disabled = true;
    }else{
      betBtns.forEach(b=>b.disabled = false);
      betInput.disabled = false;
    }
  }
});




// ================================
// ⏱️ RPS COUNTDOWN (SERVER SYNC)
// ================================
let rpsEndAt = 0;
let rpsTimerInterval = null;

const rpsTimerEl  = document.getElementById("rpsTimer");
const rpsRoundEl  = document.getElementById("rpsRoundId");

function startRpsCountdown(){
  if(rpsTimerInterval){
    clearInterval(rpsTimerInterval);
  }

  rpsTimerInterval = setInterval(()=>{
    const remain = Math.max(
      0,
      Math.ceil((rpsEndAt - Date.now()) / 1000)
    );

    rpsTimerEl.textContent = remain;

    rpsTimerEl.classList.remove(
      "rps-timer-warn",
      "rps-timer-danger"
    );

    if(remain <= 10){
      rpsTimerEl.classList.add("rps-timer-danger");
    }else if(remain <= 20){
      rpsTimerEl.classList.add("rps-timer-warn");
    }

    if(remain <= 0){
      clearInterval(rpsTimerInterval);
    }
  }, 300);
}


socket.on("rps-round-result", data=>{

document.getElementById("waitOverlay")
  .classList.add("hidden");


  const panel = document.getElementById("serverResult");
  const enemyEl = document.getElementById("srEnemy");
  const outcomeEl = document.getElementById("srOutcome");
  const coinEl = document.getElementById("srCoin");

  panel.classList.remove("hidden");

  document.getElementById("serverOverlay")
  .classList.remove("hidden");

  // map tay server
  const handMap = {
    rock: "✊ Búa",
    paper: "✋ Bao",
    scissors: "✌️ Kéo"
  };

  enemyEl.textContent = handMap[data.enemyHand] || "---";

  // ❌ user không vào lệnh
  if(!myHand){
    outcomeEl.textContent = "Không tham gia";
    outcomeEl.className = "sr-draw";
    coinEl.textContent = "0";
    statusMsg.textContent = "Round kết thúc";
    playBtn.disabled = true;
    return;
  }

  const result = calcResult(myHand, data.enemyHand);

  let coinChange = 0;
  let text = "";

  if(result === "win"){
    text = "THẮNG";
    coinChange = betCoin * 2;
    outcomeEl.className = "sr-win";
  }else if(result === "lose"){
    text = "THUA";
    coinChange = -betCoin;
    outcomeEl.className = "sr-lose";
  }else{
    text = "HOÀ";
    coinChange = betCoin;
    outcomeEl.className = "sr-draw";
  }

outcomeEl.textContent = text;
coinEl.textContent =
  (coinChange > 0 ? "+" : "") + coinChange + " 💎";

/* ===============================
   ⚡ UPDATE COIN REALTIME (FIX)
   =============================== */
const currentCoins = Number(myCoinsEl.textContent || 0);
const newCoins = currentCoins + coinChange;

// cập nhật ngay header
myCoinsEl.textContent = newCoins;

// (tuỳ chọn) lưu tạm để reload không bị nhảy
localStorage.setItem("last_rps_coins", newCoins);
/* =============================== */

playBtn.disabled = true;
statusMsg.textContent = "⏳ Đợi round mới";

});



socket.on("rps-round-new", data=>{


document.getElementById("waitOverlay")
  .classList.add("hidden");


  rpsEndAt = data.endAt;
  rpsRoundEl.textContent = data.roundId;
  startRpsCountdown();

  document.getElementById("serverOverlay")
  .classList.add("hidden");


  playBtn.disabled = false;
  myHand = null;
  betCoin = 0;
  betValue.textContent = "0";
  hands.forEach(h=>h.classList.remove("active"));
  statusMsg.textContent = "Round mới – chọn tay";

// mở lại cược nếu còn coin
const myCoins = Number(myCoinsEl.textContent || 0);
if(myCoins > 0){
  playBtn.disabled = false;
  betBtns.forEach(b=>b.disabled = false);
  betInput.disabled = false;
}



});


/* ================= RPS LOGIC (BASIC) ================= */

const hands = document.querySelectorAll(".rps-hand");
const playBtn = document.getElementById("playBtn");
const resultBox = document.getElementById("resultBox");
const statusMsg = document.getElementById("statusMsg");

let myHand = null;

hands.forEach(el=>{
  el.onclick = ()=>{
    hands.forEach(h=>h.classList.remove("active"));
    el.classList.add("active");
    myHand = el.dataset.hand;
    playBtn.disabled = false;
    statusMsg.textContent = "Sẵn sàng chiến!";
  };
});


playBtn.onclick = async ()=>{
  if(!myHand) return;

  const myCoins = Number(myCoinsEl.textContent || 0);

  if(!betCoin || betCoin <= 0){
    alert("Chọn số kim cương cược");
    return;
  }

  // ⛔ KHÔNG ĐỦ COIN → CHẶN NGAY TỪ CLIENT
  if(betCoin > myCoins){
    alert("💎 Không đủ kim cương để đặt cược");
    return;
  }

  playBtn.disabled = true;
  statusMsg.textContent = "⏳ Đã vào lệnh – chờ kết quả";

  document.getElementById("waitOverlay")
    .classList.remove("hidden");

  const res = await fetch("/api/rps/bet",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-uid": JSON.parse(localStorage.getItem("user_profile"))?.uid
    },
    body: JSON.stringify({
      bet: betCoin,
      hand: myHand
    })
  }).then(r=>r.json());

  // ⛔ SERVER TỪ CHỐI → MỞ LẠI UI
  if(!res.ok){
    alert(res.message || "Không thể đặt cược");
    playBtn.disabled = false;
    document.getElementById("waitOverlay")
      .classList.add("hidden");
  }
};


function calcResult(me, enemy){
  if(me === enemy) return "draw";
  if(
    (me==="rock" && enemy==="scissors") ||
    (me==="paper" && enemy==="rock") ||
    (me==="scissors" && enemy==="paper")
  ) return "win";
  return "lose";
}



let betCoin = 0;

const betBtns   = document.querySelectorAll(".bet-btn");
const betInput  = document.getElementById("betInput");
const betValue  = document.getElementById("betValue");

betBtns.forEach(btn=>{
  btn.onclick = ()=>{
    betBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    betCoin = Number(btn.dataset.bet);
    betInput.value = "";
    betValue.textContent = betCoin;
  };
});

betInput.oninput = ()=>{
  betBtns.forEach(b=>b.classList.remove("active"));
  betCoin = Math.max(0, Number(betInput.value || 0));
  betValue.textContent = betCoin;
};


function closeRpsResult(){
  document.getElementById("serverOverlay")
    .classList.add("hidden");
}


const betPctBtns = document.querySelectorAll(".bet-pct");
const betBalance = document.getElementById("betBalance");

/* sync balance */
function syncBetBalance(){
  const coins = Number(myCoinsEl.textContent || 0);
  betBalance.textContent = coins;
}
syncBetBalance();

socket.on("coin-update", ()=>syncBetBalance());

/* % BET */
betPctBtns.forEach(btn=>{
  btn.onclick = ()=>{
    betBtns.forEach(b=>b.classList.remove("active"));
    betPctBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    const pct = Number(btn.dataset.pct);
    const coins = Number(myCoinsEl.textContent || 0);

    betCoin =
      pct === 100
        ? coins
        : Math.floor(coins * pct / 100);

    betInput.value = "";
    betValue.textContent = betCoin;
  };
});

/* QUICK BET (giữ logic cũ) */
betBtns.forEach(btn=>{
  btn.onclick = ()=>{
    betBtns.forEach(b=>b.classList.remove("active"));
    betPctBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    betCoin = Number(btn.dataset.bet);
    betInput.value = "";
    betValue.textContent = betCoin;
  };
});

/* CUSTOM */
betInput.oninput = ()=>{
  betBtns.forEach(b=>b.classList.remove("active"));
  betPctBtns.forEach(b=>b.classList.remove("active"));

  betCoin = Math.max(0, Number(betInput.value || 0));
  betValue.textContent = betCoin;
};
