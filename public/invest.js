const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const socket = io();


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

