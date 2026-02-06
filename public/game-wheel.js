/* ================= GLOBAL STATE ================= */

let spinning = false;
let currentRotation = 0;

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
  if (spinning) return;

  if (!currentBet || currentBet <= 0){
    alert("❌ Chưa nhập vốn cược");
    return;
  }

  if (currentBet > serverDiamond){
    alert("💎 Không đủ kim cương");
    return;
  }

  spinning = true;

  // 🔒 khoá nút quay
  const btn = document.getElementById("btnSpin");
  if (btn) btn.disabled = true;

  // ⬆️ gửi cược lên server
  socket.emit("wheel-spin", {
    bet: currentBet
  });
}


/* ================= SERVER RESULT ================= */

socket.on("wheel-result", (data) => {
  const { bet, multiplier, win, index } = data;

  const wheel  = document.getElementById("wheel");
  const result = document.getElementById("result");

  const sliceDeg = 360 / multipliers.length;

  const rotateDeg =
    360 * 6 +
    index * sliceDeg +
    sliceDeg / 2;

  currentRotation += rotateDeg;
  wheel.style.transform = `rotate(${currentRotation}deg)`;

  result.textContent = "⏳ Đang quay...";

  setTimeout(() => {
    if (multiplier === 0){
      result.textContent = `💥 Trượt! Bạn mất ${bet} 💎`;
    } else {
      result.textContent =
        `🎉 Trúng x${multiplier} → +${win} 💎`;
    }

    // 🔁 reset bet sau khi quay xong
    currentBet = 0;
    updateBetUI();

    spinning = false;

    const btn = document.getElementById("btnSpin");
    if (btn) btn.disabled = false;

  }, 4200);
});


/* ================= SERVER ERROR ================= */

socket.on("wheel-error", (err) => {
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

