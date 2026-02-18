const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const socket = io({
  auth:{ uid: me.uid }
});

let animals = [];
let pendingEgg = null;
let barnLevel = 1;
let barnConfig = {};
let confirmMode = null;
let pendingBarnUpgrade = null;
let currentCoin = 0;
let eggEndAt = 0;
let eggHasBet = false;





function render(){

  const grid = document.getElementById("farmGrid");
  if(!grid) return;

  grid.innerHTML = "";

  const now = Date.now();

  animals.forEach((a,i)=>{

    if(!a) return;

    const growTime = Number(a.growTime) || 60000;
    const created = Number(a.createdAt) || now;
    const age = now - created;

    let progress = Math.min(100, (age / growTime) * 100);
    progress = Math.max(0, progress);

    const secondsLeft = Math.max(
      0,
      Math.ceil((growTime - age) / 1000)
    );

    // =============================
    // 🏷 RARITY + EGG IMAGE
    // =============================

    let rarityClass = "common";
    let eggImg = "/assets/eggs/egg1.png";

    const eggMap = {
      normal:   { rarity:"common",    img:"egg1.png" },
      forest:   { rarity:"common",    img:"egg5.png" },
      gold:     { rarity:"rare",      img:"egg2.png" },
      thunder:  { rarity:"rare",      img:"egg6.png" },
      diamond:  { rarity:"epic",      img:"egg3.png" },
      shadow:   { rarity:"epic",      img:"egg7.png" },
      dragon:   { rarity:"legendary", img:"egg4.png" },
      phoenix:  { rarity:"legendary", img:"egg8.png" },
      celestial:{ rarity:"mythic",    img:"egg9.png" },
      voidlord: { rarity:"mythic",    img:"egg10.png" }
    };

    if(eggMap[a.type]){
      rarityClass = eggMap[a.type].rarity;
      eggImg = "/assets/eggs/" + eggMap[a.type].img;
    }

    // =============================
// 🐣 STAGE RENDER (SERVER CONTROLLED)
// =============================

let stageClass = "";
let stageHTML = "";

// 🔒 Chỉ nở khi server xác nhận
if(a.stage === 2){

  if(a.broken){

    stageHTML = `
      <div class="animal-stage hatched-animal">
        <img src="/assets/eggs/broken_egg.png"
             class="animal-img"
             style="animation:none;filter:drop-shadow(0 0 20px red);">
      </div>
    `;

  }else{

    let animalImg = "/assets/animals/chicken.png";

    const animalMap = {
      normal:"chicken.png",
      forest:"forest_chicken.png",
      gold:"golden_chicken.png",
      thunder:"thunder_bird.png",
      diamond:"ice_bird.png",
      shadow:"shadow_beast.png",
      dragon:"dragon.png",
      phoenix:"phoenix.png",
      celestial:"celestial_beast.png",
      voidlord:"void_lord.png"
    };

    if(animalMap[a.type]){
      animalImg = "/assets/animals/" + animalMap[a.type];
    }

    stageHTML = `
      <div class="animal-stage hatched-animal">
        <div class="hatch-glow"></div>
        <img src="${animalImg}" class="animal-img">
      </div>
    `;
  }

}else{

  // ===== Egg Stage =====

  let crackHTML = "";

  if(progress >= 90){

    stageClass = "almost-hatch";

    let crackImg = "/assets/effects/crack-white.png";
    let crackColor = "#00ff99";

    if(rarityClass === "rare") crackColor = "gold";
    if(rarityClass === "epic") crackColor = "#00ccff";
    if(rarityClass === "legendary") crackColor = "#ff5000";
    if(rarityClass === "mythic") crackColor = "#ff00ff";

    crackHTML = `
      <div class="crack-overlay"
           style="
             background-image:url('${crackImg}');
             filter: drop-shadow(0 0 8px ${crackColor})
                     drop-shadow(0 0 16px ${crackColor});
           ">
      </div>
    `;
  }

  stageHTML = `
    <div class="nest-wrapper">
      <img src="/assets/farm/nest.png"
           class="nest-img">

      <img src="${eggImg}"
           class="egg-on-nest">

      ${crackHTML}
    </div>
  `;
}



    // =============================
    // 🧱 CARD RENDER
    // =============================

    grid.innerHTML += `
<div class="animal-card 
     ${rarityClass} 
     ${progress>=100?'hatched':''}
     ${a.broken?'broken':''}" 
     id="animal-${i}">


 ${
  progress>=100
  ? (
      a.broken
      ? `<div class="ready-badge broken-badge">BROKEN</div>`
      : `<div class="ready-badge">READY</div>`
    )
  : ""
}


  <div class="animal-stage ${stageClass}">
    ${stageHTML}
  </div>


        <div class="grow-bar">
          <div class="grow-fill"
               style="width:${progress}%">
          </div>
        </div>

        <div class="progress-text">
          ${progress.toFixed(0)}%
        </div>

${
  progress >= 100
  ? (
      a.broken
      ? `<div style="color:#ff4444;font-weight:bold;margin-top:6px">
           🥚 Broken egg
         </div>
         <button class="sell-btn"
           style="background:#444;color:#fff"
           onclick="discardAnimal(${i})">
           Discard
         </button>`
      : `<button class="sell-btn"
           onclick="sellAnimal(${i})">
           Sell +${a.value} 💎
         </button>`
    )
  : `<div class="countdown">
       ⏳ ${secondsLeft}s
     </div>`
}


      </div>
    `;
  });

  // =============================
  // 🔥 HEADER GLOW (Legend + Mythic)
  // =============================

  const hasSpecial = animals.some(a=>{
    const growTime = Number(a.growTime) || 60000;
    const created = Number(a.createdAt) || 0;
    const ready = (now - created) >= growTime;
    return ready && (
      a.type === "dragon" ||
      a.type === "phoenix" ||
      a.type === "celestial" ||
      a.type === "voidlord"
    );
  });

  const header = document.querySelector(".farm-header");
  if(header){
    header.classList.toggle("legendary-glow", hasSpecial);
  }
}






function buyEgg(){
  socket.emit("animal-buy-egg");
}



function sellAnimal(index){

  const card = document.getElementById("animal-"+index);
  if(!card) return;

  const rect = card.getBoundingClientRect();
  const coinBox = document.querySelector(".coin-box");
  const coinRect = coinBox.getBoundingClientRect();

  const fly = document.createElement("div");
  fly.className = "flying-coin";
  fly.textContent = "+💎";

  fly.style.left = rect.left + rect.width/2 + "px";
  fly.style.top  = rect.top + rect.height/2 + "px";

  const dx = coinRect.left - rect.left;
  const dy = coinRect.top - rect.top;

  fly.style.setProperty("--dx", dx+"px");
  fly.style.setProperty("--dy", dy+"px");

  document.body.appendChild(fly);

  setTimeout(()=> fly.remove(),800);

  card.classList.add("selling");

  setTimeout(()=>{
    socket.emit("animal-sell", index);
  },300);
}




// ================== SHOP DATA ==================

const eggTypes = [

  // ===== COMMON =====
  {
    id:"normal",
    name:"Verdant Egg",
    price:100,
    rare:"Common",
    grow:60000
  },
  {
    id:"forest",
    name:"Forest Egg",
    price:180,
    rare:"Common",
    grow:55000
  },

  // ===== RARE =====
  {
    id:"gold",
    name:"Solar Egg",
    price:300,
    rare:"Rare",
    grow:50000
  },
  {
    id:"thunder",
    name:"Thunder Egg",
    price:450,
    rare:"Rare",
    grow:48000
  },

  // ===== EPIC =====
  {
    id:"diamond",
    name:"Frost Diamond Egg",
    price:800,
    rare:"Epic",
    grow:40000
  },
  {
    id:"shadow",
    name:"Shadow Void Egg",
    price:1200,
    rare:"Epic",
    grow:38000
  },

  // ===== LEGENDARY =====
  {
    id:"dragon",
    name:"Inferno Dragon Egg",
    price:2000,
    rare:"Legendary",
    grow:35000
  },
  {
    id:"phoenix",
    name:"Phoenix Egg",
    price:3500,
    rare:"Legendary",
    grow:30000
  },

  // ===== MYTHIC (NEW TIER) =====
  {
    id:"celestial",
    name:"Celestial Star Egg",
    price:6000,
    rare:"Mythic",
    grow:25000
  },
  {
    id:"voidlord",
    name:"Void Lord Egg",
    price:10000,
    rare:"Mythic",
    grow:20000
  }

];




function openShop(){

  const overlay = document.getElementById("shopOverlay");

  overlay.classList.remove("hidden");

  requestAnimationFrame(()=>{
    overlay.classList.add("show");
  });

  renderShop();
}



function closeShop(){

  const overlay = document.getElementById("shopOverlay");

  overlay.classList.remove("show");

  setTimeout(()=>{
    overlay.classList.add("hidden");
  },350);
}





function renderShop(){

  const box = document.getElementById("shopGrid");
  box.innerHTML = "";

  eggTypes.forEach(e=>{

let img = "/assets/eggs/egg1.png";

if(e.id === "forest") img = "/assets/eggs/egg5.png";

if(e.id === "gold") img = "/assets/eggs/egg2.png";
if(e.id === "thunder") img = "/assets/eggs/egg6.png";

if(e.id === "diamond") img = "/assets/eggs/egg3.png";
if(e.id === "shadow") img = "/assets/eggs/egg7.png";

if(e.id === "dragon") img = "/assets/eggs/egg4.png";
if(e.id === "phoenix") img = "/assets/eggs/egg8.png";

if(e.id === "celestial") img = "/assets/eggs/egg9.png";
if(e.id === "voidlord") img = "/assets/eggs/egg10.png";



    box.innerHTML += `
      <div class="shop-item"
           onclick="buyEggType('${e.id}')">

        <img src="${img}" class="shop-img">

        <div class="shop-name">
          ${e.name}
        </div>

        <div class="shop-price">
          💎 ${e.price}
        </div>

      </div>
    `;
  });
}



function buyEggType(id){

  const egg = eggTypes.find(e=>e.id===id);
  if(!egg) return;

  pendingEgg = egg;

  document.getElementById("confirmContent").innerHTML =
    `Buy <b>${egg.name}</b><br>
     Price: 💎 ${egg.price}<br>
     Rarity: ${egg.rare}`;

  document.getElementById("confirmOverlay")
    .classList.remove("hidden");
}



function closeConfirm(){
  document.getElementById("confirmOverlay")
    .classList.add("hidden");

  confirmMode = null;
  pendingEgg = null;
  pendingBarnUpgrade = null;
}


function confirmBuy(){

  if(confirmMode === "barn"){
    socket.emit("barn-upgrade");
    confirmMode = null;
    pendingBarnUpgrade = null;
    closeConfirm();
    return;
  }

  if(pendingEgg){
    socket.emit("animal-buy-egg", pendingEgg.id);
  }

  confirmMode = null;
  pendingEgg = null;

  closeConfirm();
  closeShop();
}


function upgradeBarn(){

  const next = barnLevel + 1;
  const cfg = barnConfig[next];

  if(!cfg){
    alert("Max Level");
    return;
  }

  confirmMode = "barn";

  document.getElementById("confirmContent").innerHTML =
    `Upgrade Barn to Lv ${next}?<br>
     Max Animals: ${cfg.max}<br>
     Cost: 💎 ${cfg.price}`;

  document.getElementById("confirmOverlay")
    .classList.remove("hidden");
}



function updateSlotDisplay(){

  const countEl = document.getElementById("slotCount");
  const maxEl = document.getElementById("slotMax");
  const box = document.querySelector(".slot-box");

  if(!countEl || !maxEl || !box) return;

  const count = animals.length;
  const max = Number(maxEl.textContent);

  countEl.textContent = count;

  box.classList.remove("full","warning");

const oldTip = box.querySelector(".slot-tooltip");
if(oldTip) oldTip.remove();

if(count >= max){
  box.classList.add("full");

  const tip = document.createElement("div");
  tip.className = "slot-tooltip";
  tip.textContent = "Upgrade barn";
  box.appendChild(tip);

} else if(count >= max - 1){
  box.classList.add("warning");
}

}



function placeEggBet(){

  if(eggHasBet) return;

  const input = document.getElementById("eggBetInput");
  const bet = Number(input.value);

  if(!bet || bet <= 0) return;

  socket.emit("egg-bet",{ bet });
}


function updateEggButton(){

  const btn = document.getElementById("eggBetBtn");
  if(!btn) return;

  const left = Math.max(
    0,
    Math.floor((eggEndAt - Date.now())/1000)
  );

  if(eggHasBet){
    btn.classList.add("locked");
    btn.textContent = "LOCKED";
    return;
  }

  if(left < 5){
    btn.classList.add("locked");
    btn.textContent = "CLOSED";
    return;
  }

  btn.classList.remove("locked");
  btn.textContent = "BUY";
}



document.getElementById("shopOverlay")
.addEventListener("click", e=>{
  if(e.target.id === "shopOverlay"){
    closeShop();
  }
});

document.getElementById("eggBetOverlay")
.addEventListener("click", e=>{
  if(e.target.id === "eggBetOverlay"){
   
  }
});



socket.on("egg-bet-ok", ()=>{

  eggHasBet = true;
  updateEggButton();

  const betEl = document.getElementById("eggCurrentBet");
  if(betEl && selectedEggBet){
    betEl.innerHTML = `
  <span>Current Bet</span>
  <strong>${selectedEggBet} 💎</strong>
`;

  }

});



socket.on("egg-round-result", data=>{

  const resultEl = document.getElementById("eggResult");
  const eggImg   = document.getElementById("multiEggImg");
  const area     = document.getElementById("eggHatchArea");
  const countdownEl = document.getElementById("eggCountdown");

  const animEndAt = data.animEndAt || (Date.now() + 10000);

  // 🔒 Dừng countdown betting
  eggEndAt = 0;

  // ===== HIỂN THỊ MULTIPLIER =====
  animateMultiplier(data.multiplier);


  // ===== SUCCESS =====
  if(data.multiplier > 0){

    resultEl.style.color = "#00ff99";

    area.classList.remove("egg-hatch-broken");
    area.classList.add("egg-hatch-success");

    const animalMap = {
  normal:   "chicken.png",
  forest:   "forest_chicken.png",
  gold:     "golden_chicken.png",
  thunder:  "thunder_bird.png",
  diamond:  "ice_bird.png",
  shadow:   "shadow_beast.png",
  dragon:   "dragon.png",
  phoenix:  "phoenix.png",
  celestial:"celestial_beast.png",
  voidlord: "void_lord.png"
};

if(data.multiplier > 0){

  const img = animalMap[data.eggType] || "chicken.png";
  eggImg.src = "/assets/animals/" + img;

}


    const glow = document.createElement("div");
    glow.className = "multi-glow";
    area.appendChild(glow);

  }
  // ===== BROKEN =====
  else{

    resultEl.style.color = "#ff4444";

    area.classList.remove("egg-hatch-success");
    area.classList.add("egg-hatch-broken");

    eggImg.src = "/assets/eggs/broken_egg.png";
  }

  // ====================================
  // 🔥 ĐẾM NGƯỢC 10s TẠI VỊ TRÍ COUNTDOWN
  // ====================================
  function updateAnimCountdown(){

    const now = Date.now();
    const seconds = Math.max(
      0,
      Math.ceil((animEndAt - now) / 1000)
    );

    if(countdownEl){
      countdownEl.textContent = seconds + "s";
      countdownEl.classList.add("danger");
    }

    if(seconds > 0){
      requestAnimationFrame(updateAnimCountdown);
    }else{

      // 🔄 RESET EFFECT KHI HẾT HOẠT CẢNH
      area.classList.remove("egg-hatch-success");
      area.classList.remove("egg-hatch-broken");

      const glowEl = area.querySelector(".multi-glow");
      if(glowEl) glowEl.remove();

      if(countdownEl){
        countdownEl.classList.remove("danger");
      }
    }
  }

  updateAnimCountdown();

});



function animateMultiplier(target){

  const resultEl = document.getElementById("eggResult");
  if(!resultEl) return;

  const duration = 800; // ms
  const start = performance.now();

  function easeOut(t){
    return 1 - Math.pow(1 - t, 3);
  }

  function update(now){

    const progress = Math.min(1, (now - start) / duration);
    const eased = easeOut(progress);

    const current = (target * eased).toFixed(2);

    resultEl.textContent = "x " + current;

    if(progress < 1){
      requestAnimationFrame(update);
    }else{
      resultEl.textContent = "x " + target.toFixed(2);

      // 💥 pop effect khi xong
      resultEl.classList.add("multi-pop");
      setTimeout(()=>{
        resultEl.classList.remove("multi-pop");
      },300);
    }
  }

  requestAnimationFrame(update);
}




socket.on("egg-round-state", data => {

  eggEndAt = data.endAt;
  eggHasBet = data.hasBet;

  // 🔒 Disable nút nếu đã cược
  const betBtn = document.getElementById("eggBetBtn");
  if (betBtn) {
    betBtn.disabled = eggHasBet;
  }

  // 💎 Hiển thị lại số bet khi reload
  const betBox = document.getElementById("eggCurrentBet");
  if (betBox) {
    const strong = betBox.querySelector("strong");
    if (strong) {
      strong.textContent = (data.bet || 0) + " 💎";
    }
  }

  // 🥚 Sync hình trứng
  const eggImg = document.getElementById("multiEggImg");
  if (data.displayEgg && eggImg) {
    eggImg.src = "/assets/eggs/" + data.displayEgg.img;
  }

  updateEggButton();
});




socket.on("egg-round-new", data=>{

  const eggImg = document.getElementById("multiEggImg");
  const area   = document.getElementById("eggHatchArea");
  const betEl = document.getElementById("eggCurrentBet");
if(betEl){
 betEl.innerHTML = `
  <span>Current Bet</span>
  <strong>0 💎</strong>
`;

}

  if(data.displayEgg && eggImg){
    eggImg.src = "/assets/eggs/" + data.displayEgg.img;
  }

  area.classList.remove("egg-hatch-success");
  area.classList.remove("egg-hatch-broken");

  eggEndAt = data.endAt;
  eggHasBet = false;

  document.getElementById("eggResult").textContent = "x ?";

  updateEggButton();
});





socket.on("animal-update", data=>{
  animals = data;
  render();
  updateSlotDisplay();
});




socket.on("coin-update", data=>{

  const el = document.getElementById("coinValue");
  if(!el) return;

  const newCoin = data.coins ?? 0;

  const diff = newCoin - currentCoin;
  const steps = 20;
  let step = 0;

  const interval = setInterval(()=>{
    step++;
    const value = currentCoin + (diff * (step/steps));
    el.textContent = Math.floor(value);

    if(step>=steps){
      clearInterval(interval);
      el.textContent = newCoin;
      currentCoin = newCoin;
    }
  },15);

  renderBetOptions();

});


function discardAnimal(index){
  socket.emit("animal-discard", index);
}






function confirmEggBet(){

  if(!selectedEggBet) return;

  socket.emit("egg-bet",{
    bet: selectedEggBet
  });


}



socket.on("barn-update", data => {

  barnLevel = data.level;
  barnConfig = data.config;

  const levelEl = document.getElementById("barnLevel");

  if (levelEl) {
    levelEl.textContent = barnLevel;

    const box = document.querySelector(".barn-info");
    if (box) {
      box.classList.add("flash");

      setTimeout(() => {
        box.classList.remove("flash");
      }, 600);
    }
  }

  // ===== UPDATE SLOT MAX =====
  const max = barnConfig[barnLevel]?.max || 4;

  const slotMaxEl = document.getElementById("slotMax");
  if (slotMaxEl) {
    slotMaxEl.textContent = max;
  }

  updateSlotDisplay();

  // ===== UPDATE HEADER LEVEL COLOR =====
  const header = document.querySelector(".farm-header");
  if (header) {
    header.classList.remove("level-1","level-2","level-3","level-4");
    header.classList.add("level-" + barnLevel);
  }

});




setInterval(()=>{
  render();
},1000);



setInterval(()=>{
  if(!eggEndAt) return;

  const left = Math.max(0,
    Math.floor((eggEndAt - Date.now())/1000)
  );

  const el = document.getElementById("eggCountdown");
  if(el) el.textContent = left + "s";


  const area = document.getElementById("eggHatchArea");

if(left <= 5 && left > 0){
  area.classList.add("almost-hatch");
}else{
  area.classList.remove("almost-hatch");
}

updateEggButton();


},1000);



window.addEventListener("load", ()=>{

  const header = document.querySelector(".farm-header");
  const panel  = document.querySelector(".egg-multiplier-box.pro");

  if(header && panel){
    const h = header.offsetHeight;
    panel.style.top = h + "px";

    document.querySelector(".farm-grid")
      .style.marginTop =
        (h + panel.offsetHeight) + "px";
  }

});



let selectedEggBet = null;

const EGG_BET_OPTIONS = [
  10, 50, 100,
  200, 500, 1000,
  2000, 5000, 10000
];







socket.on("egg-error", data=>{

  if(data.message === "NOT_ENOUGH_COIN"){
    alert("❌ Not enough coin");
  }

  if(data.message === "ROUND_CLOSED"){
    alert("⛔ Round closed");
  }

  if(data.message === "ALREADY_BET"){
    alert("⚠ You already bet");
  }

});


function updateLayoutHeights(){
  const header = document.querySelector(".farm-header");
  const eggBox = document.querySelector(".egg-multiplier-box.pro");

  if(header && eggBox){
    const headerH = header.offsetHeight;
    const eggH = eggBox.offsetHeight;

    eggBox.style.top = headerH + "px";

    const grid = document.querySelector(".farm-grid");
    grid.style.marginTop = (headerH + eggH + 20) + "px";
  }
}

window.addEventListener("load", updateLayoutHeights);
renderBetOptions();

window.addEventListener("resize", updateLayoutHeights);


function renderEggHistory(list){

  const bar = document.getElementById("eggHistoryBar");
  if(!bar) return;

  bar.innerHTML = "";

  list.forEach((h, index)=>{

    let cls = "lose";
    let label = "LOSE";

    if(h.multiplier > 0 && h.multiplier < 2){
      cls = "small";
      label = "WIN";
    }

    if(h.multiplier >= 2 && h.multiplier < 10){
      cls = "big";
      label = "BIG";
    }

    if(h.multiplier >= 10){
      cls = "jackpot";
      label = "JACKPOT";
    }

    bar.innerHTML += `
      <div class="egg-history-item ${cls} ${index===0?'latest':''}"
           data-label="${label}">
        x${h.multiplier}
      </div>
    `;
  });
}



socket.on("egg-history", list=>{
  renderEggHistory(list);
});

socket.on("egg-history-update", list=>{
  renderEggHistory(list);
});



function renderBetOptions(){

  const grid = document.getElementById("eggBetGrid");
  if(!grid) return;

  grid.innerHTML = "";
  selectedEggBet = null;

  EGG_BET_OPTIONS.forEach(amount=>{

    const div = document.createElement("div");
    div.className = "egg-bet-item";
    div.textContent = amount + " 💎";

    if(amount > currentCoin){
      div.classList.add("disabled");
    }else{
      div.onclick = ()=>{
        document.querySelectorAll(".egg-bet-item")
          .forEach(x=>x.classList.remove("active"));

        div.classList.add("active");
        selectedEggBet = amount;
      };
    }

    grid.appendChild(div);
  });

}
