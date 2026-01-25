const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
const myCoinEl = document.getElementById("myCoin");
const qrBox = document.getElementById("qrBox");
const bankInfo = document.getElementById("bankInfo");

if (!auth.uid) {
  location.href = "/login.html";
}

// hiển thị coin hiện tại
myCoinEl.textContent = `💰 Coin hiện tại: ${auth.coins || 0}`;

// click gói coin
document.querySelectorAll(".coin-pack").forEach(pack => {
  pack.onclick = () => {
    const coin = pack.dataset.coin;
    const money = pack.dataset.money;

    const content = `NAP ${auth.uid} ${coin}`;

    bankInfo.innerHTML = `
      <b>Ngân hàng:</b> Techcombank<br>
      <b>STK:</b> 9919891995<br>
      <b>Chủ TK:</b> Đại lý nạp LivestreamPro<br>
      <b>Số tiền:</b> ${Number(money).toLocaleString()}đ<br>
      <b>Nội dung:</b> <code id="transferText">${content}</code>
    `;

    qrBox.classList.remove("hidden");
  };
});

function copyTransfer() {
  const text = document.getElementById("transferText")?.textContent;
  if (!text) return;

  navigator.clipboard.writeText(text);
  showToast("📋 Đã copy nội dung chuyển khoản");
}
