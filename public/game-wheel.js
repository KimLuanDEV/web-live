/* ================= GLOBAL STATE ================= */

let spinning = false;
let currentRotation = 0;
let roundEndAt = 0;
let roundTimerInterval = null;
let hasBetThisRound = false; // 🔒 đã vào lệnh hay chưa
let lockedBet = 0; // 💰 bet đã chốt cho round

let serverDiamond = 0;   // 💎 coin từ server
let lastDiamond = 0;

// 🎯 BET STATE (GIỐNG INVEST)
let currentBet = 0;


/* ================= SOCKET CONNECT ================= */

const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const socket = io({
  auth: {
    uid: me.uid,
    deviceId: localStorage.getItem("device_id")
  }
});

// 💎 nhận coin realtime từ server
socket.on("coin-update", (data) => {
  if (typeof data?.coins !== "number") return;

  const newVal = data.coins;
  const diff = newVal - serverDiamond;

  // ✨ nếu coin tăng → bay 💎
  if (diff > 0){
    spawnFlyDiamond(diff);
  }

  lastDiamond = serverDiamond;
  serverDiamond = newVal;

  updateDiamondUI();

  // 🔥 nếu ALL IN đang bật → cập nhật lại bet
  if (currentBet > serverDiamond){
    currentBet = serverDiamond;
    updateBetUI();
  }
});



/* ================= ROUND STATE ON RELOAD ================= */

socket.on("wheel-round-state", data => {
  console.log("🔄 Sync round state:", data);

  roundEndAt = data.endAt;
  startRoundCountdown();

  if (data.hasBet){
    // 🔒 đã vào lệnh → khóa cứng
    hasBetThisRound = true;
    setBetUILocked(true);
    setActionText("ĐÃ VÀO LỆNH");
  } else {
    hasBetThisRound = false;
    setBetUILocked(false);
    setActionText("VÀO LỆNH");
  }
});



/* ================= UI ================= */

function updateDiamondUI(){
  const el = document.getElementById("diamondValue");
  if (el){
    el.textContent = Number(serverDiamond).toLocaleString();
  }
}

function updateBetUI(){
  const el = document.getElementById("betDisplay");
  if (el){
    el.textContent = Number(currentBet).toLocaleString();
  }
}


/* ================= BET CONTROLS (INVEST STYLE) ================= */

function setBetRatio(ratio){
  if (spinning) return;

  currentBet = Math.floor(serverDiamond * ratio);
  updateBetUI();
}

function addBet(amount){
  if (spinning) return;

  currentBet += amount;
  if (currentBet > serverDiamond){
    currentBet = serverDiamond;
  }
  updateBetUI();
}

function resetBet(){
  if (spinning) return;

  currentBet = 0;
  updateBetUI();
}


/* ================= GAME CONFIG ================= */

const multipliers = [0, 0.5, 1, 2, 5, 10];


/* ================= GAME ACTION ================= */

function spinWheel(){

if (hasBetThisRound) return;


  if (currentBet <= 0){
    alert("❌ Chưa nhập vốn cược");
    return;
  }

  if (currentBet > serverDiamond){
    alert("💎 Không đủ kim cương");
    return;
  }

socket.emit("wheel-bet", { bet: currentBet });

hasBetThisRound = true;
lockedBet = currentBet;
setBetUILocked(true);

const btn = document.getElementById("btnSpin");
if (btn) btn.disabled = true;

showBetConfirmModal(currentBet);
setActionText("ĐÃ VÀO LỆNH");

}

socket.on("wheel-round-new", data => {

  // ⚠️ CHỈ MỞ KHI CHƯA BET
  if (!hasBetThisRound){
    setBetUILocked(false);
    setActionText("VÀO LỆNH");
  }

  hasBetThisRound = false; // reset cho round MỚI
  lockedBet = 0;

  hideBetConfirmModal();
  hideRoundResultModal();

  currentBet = 0;
  updateBetUI();

  spinning = false;

  roundEndAt = data.endAt;
  startRoundCountdown();
});



/* ================= SERVER RESULT ================= */

socket.on("wheel-round-result", data => {
  hideBetConfirmModal();
  setActionText("ĐANG QUAY");

  const { index, multiplier } = data;
  spinning = true;

  const wheel = document.getElementById("wheel");

  const sliceDeg = 360 / multipliers.length;
  const rotateDeg =
    360 * 6 +
    index * sliceDeg +
    sliceDeg / 2;

  currentRotation += rotateDeg;
  wheel.style.transform = `rotate(${currentRotation}deg)`;

  setTimeout(() => {
    showRoundResult(multiplier);
    spinning = false;
  }, 4200);
});



/* ================= SERVER ERROR ================= */

socket.on("wheel-error", (err) => {
  hasBetThisRound = false;
  spinning = false;

  const btn = document.getElementById("btnSpin");
  if (btn) btn.disabled = false;

  const map = {
    NOT_LOGIN: "⚠️ Bạn chưa đăng nhập",
    NOT_ENOUGH_COIN: "💎 Không đủ kim cương",
    BET_INVALID: "❌ Mức cược không hợp lệ",
    SERVER_ERROR: "❌ Lỗi hệ thống"
  };

  alert(map[err?.message] || "❌ Có lỗi xảy ra");
});


/* ================= DIAMOND FLY EFFECT ================= */

function spawnFlyDiamond(amount){
  const from = document.getElementById("wheel");
  const to   = document.getElementById("diamondDisplay");
  if (!from || !to) return;

  const f = from.getBoundingClientRect();
  const t = to.getBoundingClientRect();

  const el = document.createElement("div");
  el.className = "fly-diamond";
  el.textContent = "💎 +" + amount;

  el.style.left = f.left + f.width / 2 + "px";
  el.style.top  = f.top  + f.height / 2 + "px";

  const dx = t.left - f.left;
  const dy = t.top  - f.top;

  el.style.setProperty("--dx", dx + "px");
  el.style.setProperty("--dy", dy + "px");

  document.body.appendChild(el);

  setTimeout(() => el.remove(), 1000);
}



  // Chặn zoom bằng gesture (iOS / Android)
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('gesturechange', e => e.preventDefault());
  document.addEventListener('gestureend', e => e.preventDefault());

  // Chặn Ctrl + scroll (desktop)
  window.addEventListener('wheel', e => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });



  function startRoundCountdown(){
  const el = document.getElementById("roundTimer");
  if (!el || !roundEndAt) return;

  if (roundTimerInterval){
    clearInterval(roundTimerInterval);
  }

  roundTimerInterval = setInterval(() => {
    const remain = Math.max(0, Math.ceil((roundEndAt - Date.now()) / 1000));

    el.textContent = `⏳ ${remain}s`;

if (remain <= 3){
  setBetUILocked(true);
  setActionText("ĐÃ KHÓA");
} else {
  el.classList.remove("danger");

  // 🔒 nếu đã bet → vẫn khóa
  if (hasBetThisRound){
    setBetUILocked(true);
    setActionText("ĐÃ VÀO LỆNH");
  }
}


    if (remain <= 0){
      clearInterval(roundTimerInterval);
    }
  }, 300);
}


function setActionText(text){
  const btn = document.getElementById("btnSpin");
  if (btn) btn.textContent = text;
}



function showBetConfirmModal(bet){
  const modal = document.getElementById("betConfirmModal");
  const val   = document.getElementById("betConfirmValue");
  if (!modal || !val) return;

  val.textContent = Number(bet).toLocaleString();
  modal.classList.remove("hidden");
}

function hideBetConfirmModal(){
  const modal = document.getElementById("betConfirmModal");
  if (modal) modal.classList.add("hidden");
}


document.addEventListener("keydown", e => {
  if (e.key === "Escape") hideBetConfirmModal();
});




function showRoundResult(multiplier){
  const modal = document.getElementById("roundResultModal");
  const icon  = document.getElementById("roundResultIcon");
  const title = document.getElementById("roundResultTitle");
  const desc  = document.getElementById("roundResultDesc");

  if (!modal) return;

  modal.classList.remove("hidden");

  // 💰 tính tiền trúng (dựa trên bet đã vào lệnh)
const winAmount =
  multiplier > 0
    ? Math.floor(lockedBet * (multiplier - 1))
    : -lockedBet; // ✅ ĐÚNG




  if (multiplier === 0){
    icon.textContent  = "💥";
    title.textContent = "Trượt rồi!";
    desc.innerHTML    = `
      Bạn không trúng phiên này 😢<br>
      <small>Chúc bạn may mắn ở phiên sau</small>
    `;
    desc.className    = "bet-modal-desc result-lose";
  } else {
    // 🎯 icon theo mức trúng
    if (multiplier >= 10) icon.textContent = "💎";
    else if (multiplier >= 5) icon.textContent = "🔥";
    else if (multiplier >= 2) icon.textContent = "✨";
    else icon.textContent = "🎉";

    title.textContent = "Chúc mừng!";
    desc.innerHTML    = `
      Bạn trúng <b>x${multiplier}</b><br>
      <span style="font-size:18px;font-weight:900">
        +${winAmount.toLocaleString()} 💎
      </span>
    `;
    desc.className    = "bet-modal-desc result-win";
  }

  // ⏱️ tự đóng sau 3.5s
  setTimeout(() => {
    hideRoundResultModal();
  }, 3500);
}


function hideRoundResultModal(){
  const modal = document.getElementById("roundResultModal");
  if (modal) modal.classList.add("hidden");
}



function setBetUILocked(locked){
  // khóa / mở nút vào lệnh
  const spinBtn = document.getElementById("btnSpin");
  if (spinBtn) spinBtn.disabled = locked;

  // khóa toàn bộ nút bet
  document.querySelectorAll(
    ".coin-ratio button, .coin-quick button, .coin-reset-only button"
  ).forEach(btn => {
    btn.disabled = locked;
    btn.style.opacity = locked ? "0.5" : "1";
    btn.style.pointerEvents = locked ? "none" : "auto";
  });
}
