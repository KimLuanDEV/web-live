const socket = io({
  auth: {
    uid: me.uid
  }
});



// invest.js (TRANG TỔNG – RẤT GỌN)

const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const coinEl = document.getElementById("myCoin");
if (coinEl) coinEl.textContent = me.coins || 0;

function goInvest(asset){
  location.href = `/invest-detail.html?asset=${asset}`;
}



// 🔐 FORCE LOGOUT KHI ĐĂNG NHẬP NƠI KHÁC
socket.on("force-logout", (data) => {
  showModal(
    "🔐 Đăng xuất",
    data?.message ||
      "Tài khoản đã được đăng nhập ở thiết bị khác."
  );

  localStorage.removeItem("user_profile");

  setTimeout(() => {
    location.href = "/login.html";
  }, 1500);
});
