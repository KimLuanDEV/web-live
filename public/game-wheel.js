/* ================= SOCKET COIN SYNC ================= */

const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const socket = io({
  auth: {
    uid: me.uid,
    deviceId: localStorage.getItem("device_id")
  }
});

// nhận realtime từ server
socket.on("coin-update", (data) => {
  if (typeof data?.coins !== "number") return;

  setDiamond(data.coins);
  refreshDiamond();
});





let spinning = false;
let currentRotation = 0;

// 🎯 Các hệ số trên bánh xe
const multipliers = [
  0,    // x0
  0.5,  // x0.5
  1,    // x1
  2,    // x2
  5,    // x5
  10    // x10
];

/* ================= DIAMOND (LOCAL CACHE) ================= */

function getDiamond(){
  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");
  return Number(me.diamond || me.diamonds || 0);
}

function setDiamond(val){
  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");
  me.diamond = Math.max(0, Math.floor(val));
  localStorage.setItem("user_profile", JSON.stringify(me));
}

function refreshDiamond(){
  const el = document.getElementById("diamondValue");
  if(el){
    el.textContent = getDiamond().toLocaleString();
  }
}

// load khi mở trang
refreshDiamond();

/* ================= GAME LOGIC ================= */

function spinWheel(){
  if(spinning) return;

  const betInput = document.getElementById("betAmount");
  const bet = Math.floor(Number(betInput.value));

  if(!bet || bet <= 0){
    alert("❌ Nhập số kim cương hợp lệ");
    return;
  }

  const myDiamond = getDiamond();
  if(bet > myDiamond){
    alert("❌ Không đủ kim cương");
    return;
  }

  // 🔻 TRỪ KIM CƯƠNG NGAY KHI BẮT ĐẦU QUAY
  setDiamond(myDiamond - bet);
  refreshDiamond();

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

    if(multiplier === 0){
      result.textContent = `💥 Trượt! Bạn mất ${bet} 💎`;
    }else{
      const win = bet * multiplier;

      // 🔺 CỘNG KIM CƯƠNG KHI TRÚNG
      setDiamond(getDiamond() + win);
      refreshDiamond();

      result.textContent = `🎉 Trúng x${multiplier} → +${win} 💎`;
    }

    spinning = false;
  }, 4200);
}
