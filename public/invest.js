const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

// 🔒 tạo deviceId cố định cho thiết bị
let deviceId = localStorage.getItem("device_id");
if (!deviceId) {
  deviceId = "dev_" + Math.random().toString(36).slice(2);
  localStorage.setItem("device_id", deviceId);
}

// 🔥 CONNECT SOCKET CÓ AUTH
const socket = io({
  auth: {
    uid: me.uid,
    deviceId
  }
});


function goInvest(asset){
  location.href = `/invest-detail.html?asset=${asset}`;
}





function showForceLogoutModal(message){
  let modal = document.getElementById("forceLogoutModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "forceLogoutModal";
    modal.innerHTML = `
      <div class="fl-backdrop"></div>
      <div class="fl-box">
        <div class="fl-icon">🚫</div>
        <div class="fl-title">Phiên đăng nhập kết thúc</div>
        <div class="fl-msg"></div>
        <div class="fl-sub">Bạn sẽ được chuyển về trang đăng nhập…</div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.querySelector(".fl-msg").textContent = message;
  modal.classList.add("show");
}


socket.on("force-logout", (data) => {
  const msg = data?.message || "Tài khoản của bạn đã bị đăng xuất";

  showForceLogoutModal(msg);

  // clear auth
  localStorage.removeItem("user_profile");
  localStorage.removeItem("login_uid");
  localStorage.removeItem("isGuest");

  // redirect sau 2s
  setTimeout(()=>{
    location.href = "/login.html";
  }, 3000);
});


// === PORTFOLIO SHEET ===
function openPortfolio(){
  const sheet = document.getElementById("portfolioSheet");
  if(sheet){
    sheet.classList.remove("hidden");
  }else{
    console.warn("❌ Không tìm thấy #portfolioSheet");
  }
}

function closePortfolio(){
  const sheet = document.getElementById("portfolioSheet");
  if(sheet){
    sheet.classList.add("hidden");
  }
}


function openGameHub(){
  document.getElementById("gameHubSheet")?.classList.remove("hidden");
}

function closeGameHub(){
  document.getElementById("gameHubSheet")?.classList.add("hidden");
}


function openWheelGame(){
  location.href = "/game-wheel.html";
}


function openPortfolio(){
  document.getElementById("portfolioSheet").classList.remove("hidden");
  document.body.classList.add("sheet-open");
}

function closePortfolio(){
  document.getElementById("portfolioSheet").classList.add("hidden");
  document.body.classList.remove("sheet-open");
}


function openRPSGame(){
  location.href = "/game-rps.html"; // trang game sau này
}

function openDiamondHunter(){

  location.href = "/game-diamond-hunter.html";
}



function openTimeRaceGame(){
  location.href = "/game-time-race.html";
}
