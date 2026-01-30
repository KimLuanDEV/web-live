


// invest.js (TRANG TỔNG – RẤT GỌN)

const me = JSON.parse(localStorage.getItem("user_profile") || "{}");


function goInvest(asset){
  location.href = `/invest-detail.html?asset=${asset}`;
}
