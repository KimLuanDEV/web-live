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
let eggResultData = null;
let eggAnimationStarted = false;


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
  stageHTML = `
    <div class="nest-wrapper">
      <img src="/assets/farm/nest.png"
           class="nest-img">
      <img src="${eggImg}"
           class="egg-on-nest">
    </div>
  `;

  // Crack effect chỉ dựa trên progress
  if(progress >= 90){

    stageClass = "almost-hatch";

    let crackImg = "/assets/effects/crack-white.png";
    let crackColor = "#00ff99";

    if(rarityClass === "rare") crackColor = "gold";
    if(rarityClass === "epic") crackColor = "#00ccff";
    if(rarityClass === "legendary") crackColor = "#ff5000";
    if(rarityClass === "mythic") crackColor = "#ff00ff";

    stageHTML += `
      <div class="crack-overlay"
           style="
             background-image:url('${crackImg}');
             filter: drop-shadow(0 0 8px ${crackColor})
                     drop-shadow(0 0 16px ${crackColor});
           ">
      </div>
    `;
  }
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
  btn.textContent = "BET";
}


function startEggAnimation(data){

  const resultEl = document.getElementById("eggResult");
  const eggImg = document.getElementById("multiEggImg");
  const area = document.getElementById("eggHatchArea");

  resultEl.textContent =
    "x " + data.multiplier;

  // ===== SUCCESS =====
  if(data.multiplier > 0){

    resultEl.style.color = "#00ff99";
    eggImg.src = "/assets/animals/chicken.png";

    area.classList.add("hatching");

    setTimeout(()=>{
      area.classList.remove("hatching");
    },10000);

  }
  // ===== BROKEN =====
  else{

    resultEl.style.color = "#ff4444";
    eggImg.src = "/assets/eggs/broken_egg.png";

    area.classList.add("egg-hatch-broken");

    setTimeout(()=>{
      area.classList.remove("egg-hatch-broken");
    },10000);
  }

}




document.getElementById("shopOverlay")
.addEventListener("click", e=>{
  if(e.target.id === "shopOverlay"){
    closeShop();
  }
});




socket.on("egg-bet-ok", ()=>{
  eggHasBet = true;
  updateEggButton();
});


socket.on("egg-round-result", data=>{
  eggResultData = data;
});





socket.on("egg-round-state", data=>{
  eggEndAt = data.endAt;
  eggHasBet = data.hasBet;
  updateEggButton();
});



socket.on("egg-round-new", data=>{

  // ⏱ Cập nhật thời gian round mới
  eggEndAt = data.endAt;
  eggHasBet = false;

  // 🔁 Reset animation flags
  eggResultData = null;
  eggAnimationStarted = false;

  // 🥚 Reset ảnh về trứng
  const eggImg = document.getElementById("multiEggImg");
  if(eggImg){
    eggImg.src = "/assets/eggs/egg1.png";
  }

  // 🎯 Reset text hệ số
  const resultEl = document.getElementById("eggResult");
  if(resultEl){
    resultEl.textContent =
      "x ?";
    resultEl.style.color = "#ffffff";
  }

  // 🧹 Xóa mọi class hoạt cảnh cũ
  const area = document.getElementById("eggHatchArea");
  if(area){
    area.classList.remove(
      "egg-hatch-broken",
      "hatching",
      "almost-hatch"
    );
  }

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
});


function discardAnimal(index){
  socket.emit("animal-discard", index);
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

  const left = Math.max(
    0,
    Math.floor((eggEndAt - Date.now())/1000)
  );

  const el = document.getElementById("eggCountdown");
  if(el) el.textContent = left + "s";

  updateEggButton();

  // 🎬 CHỈ BẮT ĐẦU HOẠT CẢNH KHI HẾT 60S
  if(left === 0 && eggResultData && !eggAnimationStarted){
    eggAnimationStarted = true;
    startEggAnimation(eggResultData);
  }

},1000);
