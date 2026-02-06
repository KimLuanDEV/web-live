let spinning = false;
let currentRotation = 0;

// 🎯 Các hệ số trên bánh xe (theo thứ tự vòng quay)
const multipliers = [
  0,    // x0
  0.5,  // x0.5
  1,    // x1
  2,    // x2
  5,    // x5
  10    // x10
];

function spinWheel(){
  if(spinning) return;

  const betInput = document.getElementById("betAmount");
  const bet = parseFloat(betInput.value);

  if(!bet || bet <= 0){
    alert("Nhập số kim cương hợp lệ");
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

  setTimeout(()=>{
    if(multiplier === 0){
      result.textContent = `💥 Trượt! Bạn mất ${bet} 💎`;
    }else{
      const win = bet * multiplier;
      result.textContent =
        `🎉 Trúng x${multiplier} → +${win} 💎`;
    }
    spinning = false;
  }, 4200);
}
