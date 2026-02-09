/* ================= SOCKET INIT ================= */

const socket = io({
  auth:{
    uid: JSON.parse(localStorage.getItem("user_profile"))?.uid
  }
});

const myCoinsEl = document.getElementById("myCoins");
const statusMsg = document.getElementById("statusMsg");
const playBtn   = document.getElementById("playBtn");

/* ================= GLOBAL STATE ================= */

let myHand  = null;
let betCoin = 0;

/* ================= WALLET REALTIME ================= */

socket.on("coin-update", data=>{
  if(typeof data.coins !== "number") return;

  myCoinsEl.textContent = data.coins;

  if(data.coins <= 0){
    playBtn.disabled = true;
    statusMsg.textContent = "💎 Bạn đã hết kim cương";

    betBtns.forEach(b=>b.disabled = true);
    betPctBtns.forEach(b=>b.disabled = true);
}else{
  // CHỈ mở bet nếu đã chọn hand
  if(myHand){
    unlockBet();
  }else{
    lockBet();
  }
}

});

/* ================= COUNTDOWN ================= */

let rpsEndAt = 0;
let rpsTimerInterval = null;

const rpsTimerEl = document.getElementById("rpsTimer");
const rpsRoundEl = document.getElementById("rpsRoundId");

function startRpsCountdown(){
  clearInterval(rpsTimerInterval);

  rpsTimerInterval = setInterval(()=>{
    const remain = Math.max(
      0,
      Math.ceil((rpsEndAt - Date.now()) / 1000)
    );

updateTimerRing(remain);


    rpsTimerEl.textContent = remain;
    rpsTimerEl.classList.remove("rps-timer-warn","rps-timer-danger");

    if(remain <= 10){
      rpsTimerEl.classList.add("rps-timer-danger");
    }else if(remain <= 20){
      rpsTimerEl.classList.add("rps-timer-warn");
    }

  // 🔒 KHÓA BET KHI CÒN 5 GIÂY
if(remain <= 5){
  lockBet();        // 🔒 khóa bet
  lockHand();       // 🔒 khóa hand
  playBtn.disabled = true;
  statusMsg.textContent = "⛔ Đã khóa cược";
}



// ⏹ HẾT GIỜ
if(remain <= 0){
  clearInterval(rpsTimerInterval);
}



  },300);
}

/* ================= ROUND RESULT ================= */

socket.on("rps-round-result", data=>{

    totalRoundTime = Math.ceil(
  (data.endAt - Date.now()) / 1000
);


  document.getElementById("waitOverlay")?.classList.add("hidden");

  const enemyEl   = document.getElementById("srEnemy");
  const outcomeEl = document.getElementById("srOutcome");
  const coinEl    = document.getElementById("srCoin");

  document.getElementById("serverOverlay")
    .classList.remove("hidden");

  const handMap = {
    rock: "✊ Búa",
    paper: "✋ Bao",
    scissors: "✌️ Kéo"
  };

  enemyEl.textContent = handMap[data.enemyHand] || "---";

  if(!myHand){
    outcomeEl.textContent = "Không tham gia";
    outcomeEl.className  = "sr-draw";
    coinEl.textContent   = "0";
    playBtn.disabled = true;
    statusMsg.textContent = "Round kết thúc";
    return;
  }

  const result = calcResult(myHand, data.enemyHand);

  let coinChange = 0;

  if(result === "win"){
    outcomeEl.textContent = "THẮNG";
    outcomeEl.className  = "sr-win";
    coinChange = betCoin * 2;
  }else if(result === "lose"){
    outcomeEl.textContent = "THUA";
    outcomeEl.className  = "sr-lose";
    coinChange = -betCoin;
  }else{
    outcomeEl.textContent = "HOÀ";
    outcomeEl.className  = "sr-draw";
    coinChange = betCoin;
  }

  coinEl.textContent =
    (coinChange > 0 ? "+" : "") + coinChange + " 💎";



  playBtn.disabled = true;
  statusMsg.textContent = "⏳ Đợi round mới";
});

/* ================= ROUND NEW ================= */

socket.on("rps-round-new", data=>{

  document.getElementById("waitOverlay")?.classList.add("hidden");

  rpsEndAt = data.endAt;
  rpsRoundEl.textContent = data.roundId;
  startRpsCountdown();

  document.getElementById("serverOverlay")
    .classList.add("hidden");

// reset state
myHand  = null;
betCoin = 0;
betValue.textContent = "0";

playBtn.disabled = true;

hands.forEach(h=>h.classList.remove("active"));
betBtns.forEach(b=>b.classList.remove("active"));
betPctBtns.forEach(b=>b.classList.remove("active"));

unlockHand();   // 🔓 mở chọn tay
lockBet(); // 🔒 KHÓA BET
statusMsg.textContent = "Round mới – chọn tay";

});

/* ================= HAND SELECT ================= */

const hands = document.querySelectorAll(".rps-hand");

hands.forEach(el=>{
  el.onclick = ()=>{
    hands.forEach(h=>h.classList.remove("active"));
    el.classList.add("active");

    myHand = el.dataset.hand;

    unlockBet(); // 🔓 MỞ BET

    playBtn.disabled = true;
    statusMsg.textContent = "Chọn vốn đầu tư";
  };
});


/* ================= BET SELECT ================= */

const betBtns    = document.querySelectorAll(".bet-btn");
const betPctBtns = document.querySelectorAll(".bet-pct");
const betValue   = document.getElementById("betValue");

function selectBet(value){
  const myCoins = Number(myCoinsEl.textContent || 0);

  betCoin += value; // ✅ CỘNG DỒN

  // ⛔ Không cho vượt quá số coin đang có
  if(betCoin > myCoins){
    betCoin = myCoins;
  }

  betValue.textContent = betCoin;

  if(myHand && betCoin > 0){
    playBtn.disabled = false;
    statusMsg.textContent = "Sẵn sàng chốt lệnh";
  }
}


betBtns.forEach(btn=>{
  btn.onclick = ()=>{
    clearBetHighlight();       // 🔥 TẮT Ô CŨ
    btn.classList.add("active");

    selectBet(Number(btn.dataset.bet));
  };
});



betPctBtns.forEach(btn=>{
  btn.onclick = ()=>{
    clearBetHighlight();       // 🔥 TẮT Ô CŨ
    btn.classList.add("active");

    const pct   = Number(btn.dataset.pct);
    const coins = Number(myCoinsEl.textContent || 0);

    betCoin =
      pct === 100
        ? coins
        : Math.floor(coins * pct / 100);

    betValue.textContent = betCoin;

    if(myHand && betCoin > 0){
      playBtn.disabled = false;
      statusMsg.textContent = "Sẵn sàng chốt lệnh";
    }
  };
});



/* ================= PLAY ================= */

playBtn.onclick = async ()=>{
  if(!myHand || betCoin <= 0) return;

  const myCoins = Number(myCoinsEl.textContent || 0);
  if(betCoin > myCoins){
    alert("💎 Không đủ kim cương");
    return;
  }

  playBtn.disabled = true;
  lockBet();
  statusMsg.textContent = "⏳ Đã vào lệnh – chờ kết quả";

  document.getElementById("waitOverlay")
    ?.classList.remove("hidden");

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

if(!res.ok){
  alert(res.message || "Không thể đặt cược");

  // 🔄 QUAY LẠI TRẠNG THÁI CHƯA ĐẶT
  playBtn.disabled = true;
  unlockBet();

  statusMsg.textContent = "⛔ Chưa chốt lệnh";

  document.getElementById("waitOverlay")
    ?.classList.add("hidden");
}


};

/* ================= UTIL ================= */

function calcResult(me, enemy){
  if(me === enemy) return "draw";
  if(
    (me==="rock" && enemy==="scissors") ||
    (me==="paper" && enemy==="rock") ||
    (me==="scissors" && enemy==="paper")
  ) return "win";
  return "lose";
}

function closeRpsResult(){
  document.getElementById("serverOverlay")
    .classList.add("hidden");
}


function lockHand(){
  hands.forEach(h=>{
    h.classList.add("bet-locked");
    h.style.pointerEvents = "none";
  });
}

function unlockHand(){
  hands.forEach(h=>{
    h.classList.remove("bet-locked");
    h.style.pointerEvents = "auto";
  });
}



function lockBet(){
  betBtns.forEach(b=>{
    b.disabled = true;
    b.classList.add("bet-locked");
  });
  betPctBtns.forEach(b=>{
    b.disabled = true;
    b.classList.add("bet-locked");
  });
}

function unlockBet(){
  betBtns.forEach(b=>{
    b.disabled = false;
    b.classList.remove("bet-locked");
  });
  betPctBtns.forEach(b=>{
    b.disabled = false;
    b.classList.remove("bet-locked");
  });
}

lockBet();


function clearBetHighlight(){
  betBtns.forEach(b=>b.classList.remove("active"));
  betPctBtns.forEach(b=>b.classList.remove("active"));
}


const resetBetBtn = document.getElementById("resetBet");

if(resetBetBtn){
  resetBetBtn.onclick = ()=>{
    betCoin = 0;
    betValue.textContent = "0";

    clearBetHighlight();

    playBtn.disabled = true;
    statusMsg.textContent = myHand
      ? "Chọn lại vốn đầu tư"
      : "Chọn tay trước";
  };
}




/* ❌ Chặn pinch zoom (iOS) */
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend', e => e.preventDefault());

/* ❌ Chặn double tap zoom */
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);



const RING_LENGTH = 113;
let totalRoundTime = 60; // set khi round bắt đầu

function updateTimerRing(remain){
  const ring = document.querySelector(".ring-progress");
  const timerBox = document.querySelector(".bet-timer");

  if(!ring || !timerBox) return;

  const progress = remain / totalRoundTime;
  ring.style.strokeDashoffset =
    RING_LENGTH * (1 - progress);

  timerBox.classList.remove("warn","danger");

  if(remain <= 10){
    timerBox.classList.add("danger");
  }else if(remain <= 20){
    timerBox.classList.add("warn");
  }
}
