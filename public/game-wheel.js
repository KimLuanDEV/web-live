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

// 💎 nhận coin realtime từ server (nguồn duy nhất)
socket.on("coin-update", (data) => {
  if (typeof data?.coins !== "number") return;
  serverDiamond = data.coins;
  updateDiamondUI();
});


/* ================= UI ================= */

function updateDiamondUI(){
  const el = document.getElementById("diamondValue");
  if (el){
    el.textContent = Number(serverDiamond).toLocaleString();
  }
}


/* ================= GAME CONFIG ================= */

const multipliers = [0, 0.5, 1, 2, 5, 10];


/* ================= GAME ACTION ================= */

function spinWheel(){
  if (spinning) return;

  const betInput = document.getElementById("betAmount");
  const bet = Math.floor(Number(betInput.value));

  if (!bet || bet <= 0){
    alert("❌ Nhập số kim cương hợp lệ");
    return;
  }

  // ❗ kiểm tra theo coin server đang có
  if (bet > serverDiamond){
    alert("💎 Không đủ kim cương");
    return;
  }

  spinning = true;

  // ⬆️ gửi yêu cầu quay lên server
  socket.emit("wheel-spin", { bet });
}


/* ================= SERVER RESULT ================= */

// 🔔 server trả kết quả quay
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
    spinning = false;
  }, 4200);
});


/* ================= SERVER ERROR ================= */

socket.on("wheel-error", (err) => {
  spinning = false;

  const map = {
    NOT_LOGIN: "⚠️ Bạn chưa đăng nhập",
    NOT_ENOUGH_COIN: "💎 Không đủ kim cương",
    BET_INVALID: "❌ Mức cược không hợp lệ",
    SERVER_ERROR: "❌ Lỗi hệ thống"
  };

  alert(map[err?.message] || "❌ Có lỗi xảy ra");
});
