let selectedClass=null;
let player=null;
let enemy=null;

/* ===== INIT ===== */
window.onload=function(){
  const saved=localStorage.getItem("hunter_char");
  if(saved){
    player=JSON.parse(saved);
    showHub();
  }
};

function selectClass(el,type){

  document.querySelectorAll(".class-card")
    .forEach(c=>c.classList.remove("selected"));

  el.classList.add("selected");
  selectedClass=type;

  const preview = document.getElementById("classPreview");
  preview.classList.remove("hidden");

  let hp=0, atk=0, def=0, name="";

  if(type==="warrior"){
    name="⚔ Chiến Binh";
    hp=800; atk=120; def=90;
  }

  if(type==="assassin"){
    name="🏹 Sát Thủ";
    hp=500; atk=200; def=40;
  }

  if(type==="mage"){
    name="🔮 Pháp Sư";
    hp=550; atk=170; def=60;
  }

  document.getElementById("previewName").innerText=name;

  document.getElementById("hpFill").style.width=(hp/1000*100)+"%";
  document.getElementById("atkFill").style.width=(atk/300*100)+"%";
  document.getElementById("defFill").style.width=(def/150*100)+"%";
}



function createCharacter(){

  const name=document.getElementById("charName").value.trim();
  if(!name || !selectedClass) return alert("Nhập tên và chọn phái!");

  if(selectedClass==="warrior"){
    player={name,level:1,maxHp:800,hp:800,atk:120,def:90,exp:0};
  }
  if(selectedClass==="assassin"){
    player={name,level:1,maxHp:500,hp:500,atk:200,def:40,exp:0};
  }
  if(selectedClass==="mage"){
    player={name,level:1,maxHp:550,hp:550,atk:170,def:60,exp:0};
  }

  localStorage.setItem("hunter_char",JSON.stringify(player));
  showHub();
}

function showHub(){
  switchScreen("hubScreen");

  document.getElementById("infoName").innerText =
    player.name;

  // Avatar theo class
  let avatarPath="";
  if(player.atk===120) avatarPath="/assets/classes/warrior.jpg";
  if(player.atk===200) avatarPath="/assets/classes/assassin.jpg";
  if(player.atk===170) avatarPath="/assets/classes/mage.jpg";

  document.getElementById("hubAvatar").src=avatarPath;

  // HP bar
  document.getElementById("hpBar").style.width =
    (player.hp/player.maxHp*100)+"%";

  // EXP bar
  document.getElementById("expBar").style.width =
    (player.exp/(player.level*200)*100)+"%";

  // Stats
  document.getElementById("atkStat").innerText=player.atk;
  document.getElementById("defStat").innerText=player.def;
  document.getElementById("lvStat").innerText=player.level;


// Nếu đang chết
if(player.deadUntil && Date.now() < player.deadUntil){

  const remaining = player.deadUntil - Date.now();
  startRespawnTimer(remaining);

}


}


function openCombat(){

  // Nếu đang chết
  if(player.deadUntil && Date.now() < player.deadUntil){
    alert("⏳ Nhân vật chưa hồi sinh!");
    return;
  }

  enemy={
    maxHp:600+player.level*150,
    hp:600+player.level*150,
    atk:100+player.level*20,
    def:50+player.level*10
  };

  switchScreen("combatScreen");
  renderCombat();
}




function renderCombat(){
  document.getElementById("playerCombatStats").innerText=
    player.name+" | HP "+player.hp+"/"+player.maxHp;
  document.getElementById("enemyStats").innerText=
    "Quái | HP "+enemy.hp+"/"+enemy.maxHp;
}

function attack(){

  let dmgToEnemy=Math.max(0,player.atk-enemy.def*0.5);
  dmgToEnemy=Math.floor(dmgToEnemy);
  enemy.hp-=dmgToEnemy;

  if(enemy.hp<=0){
    enemy.hp=0;
    player.exp+=100;
    levelUp();
    document.getElementById("battleLog").innerText=
      "🎉 Hạ quái! +100 EXP";
    localStorage.setItem("hunter_char",JSON.stringify(player));
    return;
  }

  let dmgToPlayer=Math.max(0,enemy.atk-player.def*0.4);
  dmgToPlayer=Math.floor(dmgToPlayer);
  player.hp-=dmgToPlayer;

if(player.hp<=0){
  player.hp=0;

  // Ghi thời gian chết
  player.deadUntil = Date.now() + (24*60*60*1000);

  localStorage.setItem("hunter_char",JSON.stringify(player));

  document.getElementById("battleLog").innerText=
    "💀 Bạn đã bị hạ! Hồi sinh sau 24 giờ.";

  setTimeout(()=>{
    backToHub();
  },1500);

  return;
}


  renderCombat();
}

function levelUp(){
  if(player.exp>=player.level*200){
    player.level++;
    player.exp=0;
    player.maxHp+=200;
    player.hp=player.maxHp;
    player.atk+=40;
    player.def+=25;
  }
}

function backToHub(){
  localStorage.setItem("hunter_char",JSON.stringify(player));
  showHub();
}

function resetCharacter(){
  localStorage.removeItem("hunter_char");
  location.reload();
}

function switchScreen(id){
  document.querySelectorAll(".screen")
    .forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}





let respawnInterval=null;

function startRespawnTimer(timeLeft){

  const btn = document.querySelector(".hub-btn.primary");
  btn.disabled = true;
  btn.innerText = "⏳ Đang hồi sinh...";

  if(respawnInterval) clearInterval(respawnInterval);

  respawnInterval = setInterval(()=>{

    const now = Date.now();
    const remaining = player.deadUntil - now;

    if(remaining <= 0){

      clearInterval(respawnInterval);

      // Hồi sinh
      player.deadUntil = null;
      player.hp = player.maxHp;

      localStorage.setItem("hunter_char",JSON.stringify(player));

      btn.disabled = false;
      btn.innerText = "⚔ Vào chiến đấu";

      showHub();
      return;
    }

    const hours = Math.floor(remaining / (1000*60*60));
    const minutes = Math.floor((remaining % (1000*60*60))/(1000*60));
    const seconds = Math.floor((remaining % (1000*60))/1000);

    btn.innerText =
      `⏳ ${hours}h ${minutes}m ${seconds}s`;

  },1000);
}
