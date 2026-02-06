/* ================= GLOBAL STATE ================= */

let spinning = false;
let currentRotation = 0;
let roundEndAt = 0;
let roundTimerInterval = null;
let hasBetThisRound = false; // 🔒 đã vào lệnh hay chưa
let lockedBet = 0; // 💰 bet đã chốt cho round
let waitingNextRound = false; // ⏳ phải đợi phiên mới

let serverDiamond = 0;   // 💎 coin từ server
let lastDiamond = 0;

// 🎯 BET STATE (GIỐNG INVEST)
let currentBet = 0;




(function setupOrbSlots(){
  const slots = document.querySelectorAll(".orb-slot");
  if (!slots.length) return;

  const radius = 110;
  const cx = 140;
  const cy = 140;

  slots.forEach((el, i) => {
    const angle = (360 / slots.length) * i - 90;
    const rad = angle * Math.PI / 180;

    const x = cx + Math.cos(rad) * radius - 32;
    const y = cy + Math.sin(rad) * radius - 32;

    el.style.left = x + "px";
    el.style.top  = y + "px";
  });
})();


// 🔧 SETUP NAN NGAY KHI LOAD TRANG
window.addEventListener("load", () => {
  requestAnimationFrame(() => {
    setupOrbSpokes();
  });
});


function setupOrbSpokes(){
  const wheel  = document.querySelector(".orb-wheel");
  const core   = document.querySelector(".orb-core");
  const slots  = document.querySelectorAll(".orb-slot");
  const spokes = document.querySelectorAll(".orb-spoke");

  if (!wheel || !core || !slots.length || !spokes.length) return;

  const wheelRect = wheel.getBoundingClientRect();
  const coreRect  = core.getBoundingClientRect();

  // 🎯 TÂM TRỤC (local to wheel)
  const cx = coreRect.left + coreRect.width / 2 - wheelRect.left;
  const cy = coreRect.top  + coreRect.height / 2 - wheelRect.top;

  slots.forEach((slot, i) => {
    const spoke = spokes[i];
    if (!spoke) return;

    const slotRect = slot.getBoundingClientRect();

    // 🎯 TÂM SLOT (local)
    const sx = slotRect.left + slotRect.width / 2 - wheelRect.left;
    const sy = slotRect.top  + slotRect.height / 2 - wheelRect.top;

    // Vector trục → slot
    const dx = sx - cx;
    const dy = sy - cy;

    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // 🎯 CẮT NAN TỚI MÉP SLOT THỰC
    // Lấy nửa chiều nhỏ hơn (vì slot tròn)
    const slotRadius = Math.min(slotRect.width, slotRect.height) / 2;

    const fullLen = Math.sqrt(dx*dx + dy*dy);
const visualInset = 2; // 👈 đâm vào ô 2px (để che khe shadow)
const finalLen = Math.max(0, fullLen - slotRadius + visualInset);


    // SET
    spoke.style.width = finalLen + "px";
    spoke.style.transform = `rotate(${angle}deg)`;
  });
}





/**
 * ✨ Chạy sáng từng ô như roulette rồi chốt
 * @param {number} winIndex - index ô trúng
 * @param {Function} done - callback sau khi dừng
 */
function runOrbRoulette(winIndex, done){
const slots  = Array.from(document.querySelectorAll(".orb-slot"));
const spokes = Array.from(document.querySelectorAll(".orb-spoke"));

  if (!slots.length) return;

  let current = 0;
  let loops = 0;
  const totalLoops = 3;      // số vòng chạy đầy
  let speed = 80;            // ms (ban đầu nhanh)
  const slowDownAt = 2;      // bắt đầu chậm dần ở vòng cuối

  function step(){
    // clear
    slots.forEach(s => s.classList.remove("running","active"));
    spokes.forEach(s => s.classList.remove("running","active"));


    // bật ô hiện tại
    slots[current].classList.add("running");
    spokes[current]?.classList.add("running");


    // sang ô tiếp
    current = (current + 1) % slots.length;

    // hoàn thành 1 vòng
    if (current === 0) loops++;

    // giảm tốc ở vòng cuối
    if (loops >= slowDownAt){
      speed += 25; // chậm dần
    }

    // điều kiện dừng: đã đủ vòng & đúng ô trúng
    if (loops >= totalLoops && current === winIndex){
      slots.forEach(s => s.classList.remove("running"));
      slots[winIndex].classList.add("active");

// 🔥 cập nhật nan theo kích thước mới của slot
requestAnimationFrame(() => {
  setupOrbSpokes();
});

      spokes[winIndex]?.classList.add("active");

      if (done) done();
      return;
    }

    setTimeout(step, speed);
  }

  step();
}



// 🔁 KHÔI PHỤC SAU RELOAD → CHỈ ĐÁNH DẤU, KHÔNG CHO VÀO GAME
(function restoreWheelLock(){
  if (localStorage.getItem("wheel_locked") === "1") {
    hasBetThisRound = true;
    waitingNextRound = true; // 🔒 PHẢI ĐỢI ROUND MỚI
    lockedBet = Number(localStorage.getItem("wheel_locked_bet") || 0);

    requestAnimationFrame(() => {
      setBetUILocked(true);
      setActionText("CHỜ PHIÊN MỚI");

      const btn = document.getElementById("btnSpin");
      if (btn) btn.disabled = true;

      // ❌ KHÔNG show overlay
      // ❌ KHÔNG cho thao tác gì
    });
  }
})();


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


// 🔒 SERVER BÁO: USER PHẢI ĐỢI PHIÊN MỚI
socket.on("wheel-locked", data => {
  waitingNextRound = true;
  hasBetThisRound = true;

  setBetUILocked(true);
  setActionText("CHỜ PHIÊN MỚI");

  // đảm bảo không lộ UI chơi
  hideBetConfirmModal();
  hideRoundResultModal();
});


// ✅ SERVER BÁO: ĐƯỢC VÀO GAME
socket.on("wheel-open", data => {
  waitingNextRound = false;
  hasBetThisRound = false;

  setBetUILocked(false);
  setActionText("VÀO LỆNH");

  roundEndAt = data.endAt;
  startRoundCountdown();
});



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
  if (spinning || waitingNextRound) return;

  currentBet = Math.floor(serverDiamond * ratio);
  updateBetUI();
}

function addBet(amount){
  if (spinning || waitingNextRound) return;

  currentBet += amount;
  if (currentBet > serverDiamond){
    currentBet = serverDiamond;
  }
  updateBetUI();
}

function resetBet(){
  if (spinning || waitingNextRound) return;

  currentBet = 0;
  updateBetUI();
}


/* ================= GAME CONFIG ================= */

const multipliers = [0, 0.5, 1, 2, 5, 10];




/* ================= WHEEL LABEL SETUP ================= */

// GẮN TEXT VÀO ĐÚNG Ô + XOAY THEO BÁNH XE
(function setupWheelLabels(){
  const wheel = document.getElementById("wheel");
  if (!wheel) return;

  const labels = wheel.querySelectorAll(".wheel-label span");
  if (!labels.length) return;

  const sliceDeg = 360 / labels.length;

  labels.forEach((el, i) => {
    // góc trung tâm của mỗi ô
    const angle = i * sliceDeg + sliceDeg / 2;

    // text:
    // 1. xoay vào đúng ô
    // 2. đẩy ra gần mép bánh
    // 3. xoay ngược để chữ đứng thẳng
    el.style.transform =
      `rotate(${angle}deg) translate(0, -112px) rotate(90deg)`;
  });
})();



/* ================= GAME ACTION ================= */

function spinWheel(){
  if (hasBetThisRound || waitingNextRound) return;


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

// 🔒 LƯU TRẠNG THÁI LOCK
localStorage.setItem("wheel_locked", "1");
localStorage.setItem("wheel_locked_bet", lockedBet);

setBetUILocked(true);

const btn = document.getElementById("btnSpin");
if (btn) btn.disabled = true;

showBetConfirmModal(currentBet);
setActionText("ĐÃ VÀO LỆNH");

}

socket.on("wheel-round-new", data => {

  waitingNextRound = false;
  hasBetThisRound = false;

  // ❌ KHÔNG mở bet bar ở đây nữa
  setActionText("CHỜ KẾT QUẢ");

  hideRoundLockOverlay();
  hideBetConfirmModal();
  hideRoundResultModal();

  currentBet = 0;
  updateBetUI();

  spinning = false;

  roundEndAt = data.endAt;
  startRoundCountdown();
});






socket.on("wheel-round-result", data => {
  hideBetConfirmModal();
  setActionText("ĐANG QUAY");

  const { index, multiplier } = data;
  spinning = true;

 runOrbRoulette(index, () => {

  showRoundResult(multiplier);

  // 🔓 CHỈ LÚC NÀY MỚI MỞ BET BAR
  waitingNextRound = false;
  hasBetThisRound = false;

  setBetUILocked(false);
  setActionText("VÀO LỆNH");

  spinning = false;
});

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
  el.classList.add("danger");
  setBetUILocked(true);
  setActionText("ĐÃ KHÓA");
}
else {
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

  // 🚫 TRƯỜNG HỢP KHÔNG ĐẶT CƯỢC
  if (!lockedBet || lockedBet <= 0){
    icon.textContent  = "👀";
    title.textContent = "Bạn không tham gia phiên này";
    desc.innerHTML    = `
      <span style="font-size:14px; opacity:.8">
        Hãy vào lệnh ở phiên tiếp theo để có cơ hội trúng thưởng 💎
      </span>
    `;
    desc.className = "bet-modal-desc result-neutral";

    setTimeout(() => {
      hideRoundResultModal();
    }, 2500);

    return; // ⛔ DỪNG TẠI ĐÂY
  }

  // ✅ payout = tổng coin được cộng lại từ server
  const payout = Math.floor(lockedBet * multiplier);

  if (multiplier === 0){
    icon.textContent  = "💥";
    title.textContent = "Trượt rồi!";
    desc.innerHTML    = `
      Bạn không trúng phiên này 😢<br>
      <span style="font-size:18px;font-weight:900;color:#ff5252">
        -${lockedBet.toLocaleString()} 💎
      </span>
    `;
    desc.className    = "bet-modal-desc result-lose";
  } else {
    if (multiplier >= 10) icon.textContent = "💎";
    else if (multiplier >= 5) icon.textContent = "🔥";
    else if (multiplier >= 2) icon.textContent = "✨";
    else icon.textContent = "🎉";

    title.textContent = multiplier === 1 ? "Hòa vốn!" : "Chúc mừng!";
    desc.innerHTML    = `
      Bạn trúng <b>x${multiplier}</b><br>
      <span style="font-size:18px;font-weight:900">
        +${payout.toLocaleString()} 💎
      </span>
      <div style="margin-top:6px; font-size:12px; opacity:.65">
        (Lãi ròng: ${(payout - lockedBet).toLocaleString()} 💎)
      </div>
    `;
    desc.className    = "bet-modal-desc result-win";
  }

  setTimeout(() => {
    hideRoundResultModal();
    lockedBet = 0; // reset sau khi show xong
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


function handleBack() {
  // 🔒 ĐÃ VÀO LỆNH → CẤM QUAY LẠI
  if (hasBetThisRound) {
    showLockedBackModal();
    return;
  }

  // ✅ CHƯA VÀO LỆNH → CHO QUAY
  history.back();
}


function showLockedBackModal(){
  const m = document.getElementById("backLockModal");
  if (!m) return;
  m.classList.remove("hidden");

  // ⏱️ tự đóng sau 2s
  setTimeout(() => {
    m.classList.add("hidden");
  }, 2000);
}


window.addEventListener("beforeunload", (e) => {
  if (!hasBetThisRound) return;

  // 🔥 đánh dấu đây là reload thật
  reloadAttempted = true;

  // hiện overlay NGAY LẬP TỨC
  showRoundLockOverlay();

  e.preventDefault();
  e.returnValue = "";
});



// 🧠 nếu user huỷ reload → ẩn overlay sau 1s
window.addEventListener("focus", () => {
  if (reloadAttempted && hasBetThisRound) {
    setTimeout(() => {
      hideRoundLockOverlay();
      reloadAttempted = false;
    }, 800);
  }
});


// 🔒 FLAG: user đang cố reload
let reloadAttempted = false;

// 🔒 CHẶN F5 / CTRL+R / CMD+R
window.addEventListener("keydown", (e) => {
  if (!hasBetThisRound) return;

  // F5
  if (e.key === "F5") {
    e.preventDefault();
    reloadAttempted = true;
    showRoundLockOverlay();
    return;
  }

  // Ctrl + R / Cmd + R
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
    e.preventDefault();
    reloadAttempted = true;
    showRoundLockOverlay();
  }
});



function showRoundLockOverlay(){
  const el = document.getElementById("roundLockOverlay");
  if (el) el.classList.remove("hidden");
}

function hideRoundLockOverlay(){
  const el = document.getElementById("roundLockOverlay");
  if (el) el.classList.add("hidden");
}
