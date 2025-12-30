// ===== GIFT EFFECTS CORE =====
function spawnGift(type, donor, gift){
  const layer = document.getElementById("giftLayer");
  if (!layer) return;

  const el = document.createElement("div");
  el.className = "reaction-float is-local";
  el.textContent = gift.emoji || "🎁";

  el.style.setProperty("--x", Math.random()*0.8 + 0.1);
  el.style.setProperty("--y", 0.75);
  el.style.setProperty("--dx", (Math.random()*120-60)+"px");
  el.style.setProperty("--rot",(Math.random()*40-20)+"deg");
  el.style.setProperty("--sc", type==="supernova" ? 2 : 1);

  layer.appendChild(el);
  setTimeout(()=>el.remove(),1600);

  // gift lớn
  if (gift.coins >= 500){
    spawnBigGift(type, donor, gift);
  }
}

function spawnBigGift(type, donor, gift){
  const layer = document.getElementById("giftLayer");
  if (!layer) return;

  const big = document.createElement("div");
  big.className = "vip-fireworks";
  big.textContent = gift.emoji || "🎆";
  layer.appendChild(big);
  setTimeout(()=>big.remove(),1200);
}
