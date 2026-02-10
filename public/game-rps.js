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
const MAX_RPS_HISTORY = 10;
let rpsHistory = [];
let myHand  = null;
let betCoin = 0;
let hasBetThisRound = false; // 🔒 đã vào lệnh hay chưa
let isShowingResult = false;
let pendingRoundNew = null;
let autoCloseResultTimer = null;
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

socket.on("rps-round-result", data => {


// 🃏 LẬT HAND ĐỐI THỦ
const enemyHandEl = document.getElementById("enemyHand");
const enemyImgEl  = document.getElementById("enemyHandImg");

const imgMap = {
  rock: "/assets/rps/rock.png",
  paper: "/assets/rps/paper.png",
  scissors: "/assets/rps/scissors.png"
};

// hiệu ứng lật
enemyHandEl.classList.add("flip");

setTimeout(()=>{
  enemyImgEl.src = imgMap[data.enemyHand] || "/assets/rps/unknown.png";
}, 300);



  const enemyEl   = document.getElementById("srEnemy");
  const outcomeEl = document.getElementById("srOutcome");
  const coinEl    = document.getElementById("srCoin");

  document.getElementById("serverOverlay")
    .classList.remove("hidden");

// ⏱ AUTO CLOSE RESULT SAU 3s
clearTimeout(autoCloseResultTimer);

autoCloseResultTimer = setTimeout(() => {
  closeRpsResult();
}, 5000);


const handImgMap = {
  rock: "/assets/rps/rock.png",
  paper: "/assets/rps/paper.png",
  scissors: "/assets/rps/scissors.png"
};


if (handImgMap[data.enemyHand]) {
  enemyEl.innerHTML = `
    <img
      src="${handImgMap[data.enemyHand]}"
      alt="${data.enemyHand}"
      style="
        width:42px;
        height:42px;
        object-fit:contain;
        filter:
          drop-shadow(0 0 10px rgba(0,255,180,.8))
          drop-shadow(0 0 24px rgba(0,255,180,.6));
      "
    />
  `;
} else {
  enemyEl.textContent = "---";
}


  // ❌ KHÔNG THAM GIA ROUND
if (!hasBetThisRound) {

    outcomeEl.textContent = "Không tham gia";
    outcomeEl.className  = "sr-draw";
    coinEl.textContent   = "0 💎";

    playBtn.disabled = true;
    statusMsg.textContent = "Round kết thúc";
    return;
  }

  // ✅ CÓ THAM GIA
  const result = calcResult(myHand, data.enemyHand);
  let coinChange = 0;

  if (result === "win") {
    outcomeEl.textContent = "WIN x3";
    outcomeEl.className  = "sr-win";
    coinChange = betCoin * 3;
  } else if (result === "lose") {
    outcomeEl.textContent = "LOSE";
    outcomeEl.className  = "sr-lose";
    coinChange = -betCoin;
  } else {
    outcomeEl.textContent = "DRAW";
    outcomeEl.className  = "sr-draw";
    coinChange = betCoin;
  }

  // ❗ CHỈ HIỂN THỊ – KHÔNG CỘNG/TRỪ COIN Ở CLIENT
  coinEl.textContent =
    (coinChange > 0 ? "+" : "") + coinChange + " 💎";



  playBtn.disabled = true;
  statusMsg.textContent = "⏳ Đợi round mới";


// ⏸ đang hiển thị kết quả
isShowingResult = true;

// cho user xem lật bài + kết quả trong 2.5s
setTimeout(() => {
  isShowingResult = false;

  // nếu có round mới tới sớm → xử lý bây giờ
  if (pendingRoundNew) {
    handleRoundNew(pendingRoundNew);
    pendingRoundNew = null;
  }
}, 10000);


});



// ===============================
// 📜 RPS GLOBAL HISTORY (SERVER)
// ===============================
socket.on("rps-history", list => {
  if (!Array.isArray(list)) return;
  rpsHistory = list.slice(0, MAX_RPS_HISTORY);
  renderRpsHistory();
});

socket.on("rps-history-update", list => {
  if (!Array.isArray(list)) return;
  rpsHistory = list.slice(0, MAX_RPS_HISTORY);
  renderRpsHistory();
});



function handleRoundNew(data){


  // 🔻 nếu sheet còn mở thì đóng
  document.getElementById("serverOverlay")
    ?.classList.add("hidden");

  hasBetThisRound = false;

  rpsEndAt = data.endAt;
  rpsRoundEl.textContent = data.roundId;

  totalRoundTime = Math.max(
    1,
    Math.ceil((data.endAt - Date.now()) / 1000)
  );

  resetTimerRing();
  startRpsCountdown();

  // reset user
  myHand  = null;
  betCoin = 0;
  betValue.textContent = "0";
  playBtn.disabled = true;

  // reset hands
  const handsWrap = document.querySelector(".rps-hands");
  handsWrap?.classList.remove("confirmed-state");

  hands.forEach(h => {
    h.classList.remove(
      "active",
      "confirmed",
      "hide-hand",
      "bet-locked",
      "to-target",
      "win",
      "lose"
    );
    h.style.position = "";
    h.style.left = "";
    h.style.top = "";
    h.style.width = "";
    h.style.height = "";
    h.style.pointerEvents = "auto";
  });

  // reset enemy hand
  const enemyHandEl = document.getElementById("enemyHand");
  const enemyImgEl  = document.getElementById("enemyHandImg");
  if (enemyHandEl){
    enemyHandEl.classList.add("hidden");
    enemyHandEl.classList.remove("show","flip");
    enemyImgEl.src = "/assets/rps/unknown.png";
  }

  // reset bet
  betBtns.forEach(b => b.classList.remove("active"));
  betPctBtns.forEach(b => b.classList.remove("active"));

  unlockHand();
  lockBet();

  statusMsg.textContent = "Round mới – chọn tay";
}


/* ================= ROUND NEW ================= */
socket.on("rps-round-new", data => {

  // ⛔ nếu đang xem kết quả → delay
  if (isShowingResult){
    pendingRoundNew = data;
    return;
  }

  handleRoundNew(data);
});


/* ================= HAND SELECT ================= */

const hands = document.querySelectorAll(".rps-hand");

hands.forEach(el=>{
  el.onclick = ()=>{
    if(hasBetThisRound) return; // ⛔ chặn

    hands.forEach(h=>h.classList.remove("active"));
    el.classList.add("active");

    myHand = el.dataset.hand;

    unlockBet();
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
    if(hasBetThisRound) return; // ⛔ chặn

    clearBetHighlight();
    btn.classList.add("active");
    selectBet(Number(btn.dataset.bet));
  };
});




betPctBtns.forEach(btn=>{
  btn.onclick = ()=>{
    if(hasBetThisRound) return; // ⛔ chặn
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

// 🔒 KHÓA TOÀN BỘ
lockBet();
lockHand();

hasBetThisRound = true;

// 🌟 HIGHLIGHT HAND ĐÃ CHỐT
const handsWrap = document.querySelector(".rps-hands");
handsWrap.classList.add("confirmed-state");

const target = document.getElementById("rpsHandTarget");

hands.forEach(h=>{
  if(h.dataset.hand === myHand){

    const rect = h.getBoundingClientRect();
    const t    = target.getBoundingClientRect();

    // giữ vị trí ban đầu
    h.style.position = "fixed";
    h.style.left   = rect.left + "px";
    h.style.top    = rect.top  + "px";
    h.style.width  = rect.width + "px";
    h.style.height = rect.height + "px";

    h.classList.add("confirmed","to-target");
    h.classList.remove("active");

    requestAnimationFrame(()=>{
      h.style.left = t.left + "px";
      h.style.top  = t.top  + "px";
    });

  }else{
    h.classList.add("hide-hand");
  }
});




statusMsg.textContent = "⏳ Đã vào lệnh – chờ kết quả";



// 👤 HIỆN HAND ĐỐI THỦ DẠNG ?
const enemyHandEl = document.getElementById("enemyHand");
const enemyImgEl  = document.getElementById("enemyHandImg");

enemyImgEl.src = "/assets/rps/unknown.png";
enemyHandEl.classList.remove("hidden");
enemyHandEl.classList.add("show");



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

  // ❌ hủy auto close nếu user bấm tay
  clearTimeout(autoCloseResultTimer);

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
  if(hasBetThisRound) return;
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


function resetTimerRing(){
  const ring = document.querySelector(".ring-progress");
  const timerBox = document.querySelector(".bet-timer");

  if(!ring || !timerBox) return;

  // FULL vòng
  ring.style.strokeDashoffset = 0;

  timerBox.classList.remove("warn","danger");
}



function renderRpsHistory(){
  const box = document.getElementById("rpsHistoryList");
  if(!box) return;

  box.innerHTML = "";

  if(!rpsHistory.length){
    box.innerHTML = `<span class="rh-empty">Chưa có dữ liệu</span>`;
    return;
  }

  const imgMap = {
    rock: "/assets/rps/rock.png",
    paper: "/assets/rps/paper.png",
    scissors: "/assets/rps/scissors.png"
  };

  rpsHistory.forEach(h=>{
    const el = document.createElement("div");
    el.className = `rh-item rh-${h.result}`;

    const img = document.createElement("img");
    img.src = imgMap[h.enemy];
    img.alt = h.enemy;

    el.appendChild(img);
    box.appendChild(el);
  });
}
