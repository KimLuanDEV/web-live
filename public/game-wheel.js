/* ================= GLOBAL STATE ================= */

let spinning = false;
let currentRotation = 0;
let serverDiamond = 0; // 💎 CHỈ LẤY TỪ SERVER


/* ================= SOCKET CONNECT ================= */

const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const socket = io({
  auth: {
    uid: me.uid,
    deviceId: localStorage.getItem("device_id")
  }
});

// 💎 NHẬN COIN TỪ SERVER (NGUỒN DUY NHẤT)
socket.on("coin-update", (data) => {
  if (typeof data?.coins !== "number") return;

  serverDiamond = data.coins;
  updateDiamondUI();
});


/* ================= UI ================= */

function updateDiamondUI(){
  const el = document.getElementById("diamondValue");
  if(el){
    el.textContent = Number(serverDiamond).toLocaleString();
  }
}


/* ================= GAME CONFIG ================= */

const multipliers = [0, 0.5, 1, 2, 5, 10];


/* ================= GAME LOGIC ================= */

function spinWheel(){
  if (spinning) return;

  const betInput = document.getElementById("betAmount");
  const bet = Math.floor(Number(betInput.value));

  if (!bet || bet <= 0){
    alert("❌ Nhập số kim cương hợp lệ");
    return;
  }

  // ❗ KIỂM TRA BẰNG COIN SERVER
  if (bet > serverDiamond){
    alert("❌ Không đủ kim cương");
    return;
  }

  spinning = true;

  const wheel = document.getElementById("wheel");
  const result = document.getElementById("result");

  const sliceDeg = 360 / multipliers.length;
  const index = Math.floor(Math.random() * multipliers.length);
  const multiplier = multipliers[index];

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
      const win = bet * multiplier;
      result.textContent = `🎉 Trúng x${multiplier} → +${win} 💎`;
    }

    spinning = false;
  }, 4200);
}
