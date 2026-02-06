let spinning = false;
let currentRotation = 0;

const rewards = [
  "10 Coin",
  "20 Coin",
  "50 Coin",
  "X2 Coin",
  "Chúc bạn may mắn lần sau",
  "100 Coin",
  "Kim cương",
  "Jackpot"
];

function spinWheel(){
  if(spinning) return;
  spinning = true;

  const wheel = document.getElementById("wheel");
  const result = document.getElementById("result");

  const randomIndex = Math.floor(Math.random() * rewards.length);
  const sliceDeg = 360 / rewards.length;

  const rotateDeg =
    360 * 5 +
    (randomIndex * sliceDeg) +
    sliceDeg / 2;

  currentRotation += rotateDeg;
  wheel.style.transform = `rotate(${currentRotation}deg)`;

  result.textContent = "⏳ Đang quay...";

  setTimeout(()=>{
    result.textContent = `🎁 Bạn nhận được: ${rewards[randomIndex]}`;
    spinning = false;
  }, 4200);
}
