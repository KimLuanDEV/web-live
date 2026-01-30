


// invest.js (TRANG TỔNG – RẤT GỌN)

const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

const coinEl = document.getElementById("myCoin");
if (coinEl) coinEl.textContent = me.coins || 0;

function goInvest(asset){
  location.href = `/invest-detail.html?asset=${asset}`;
}
