const params = new URLSearchParams(location.search);
const received = Number(params.get("received") || 0);

// 🔁 TỶ GIÁ (bạn chỉnh tùy ý)
const RATE = 100; // 1 kim cương = 100đ

const receivedVal = document.getElementById("receivedVal");
const moneyVal = document.getElementById("moneyVal");
const withdrawInput = document.getElementById("withdrawInput");
const btnSubmit = document.getElementById("btnSubmitWithdraw");

receivedVal.textContent = received.toLocaleString();

withdrawInput.max = received;
withdrawInput.value = received;

function updateMoney(){
  const val = Math.min(received, Number(withdrawInput.value || 0));
  moneyVal.textContent = (val * RATE).toLocaleString() + " ₫";
}

withdrawInput.oninput = updateMoney;
updateMoney();

btnSubmit.onclick = async () => {
  const amount = Number(withdrawInput.value || 0);
  const bank = document.getElementById("bankInput").value.trim();

  if (amount <= 0) {
    alert("❌ Số kim cương không hợp lệ");
    return;
  }
  if (!bank) {
    alert("❌ Vui lòng nhập thông tin thanh toán");
    return;
  }

  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");
  if (!me.uid) {
    alert("❌ Chưa đăng nhập");
    return;
  }

  // 👉 GỬI YÊU CẦU RÚT (admin duyệt)
  const res = await fetch("/api/withdraw-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({
      amount,
      bank,
      received
    })
  });

  const data = await res.json();
  if (data.ok) {
    alert("✅ Đã gửi yêu cầu rút tiền");
    history.back();
  } else {
    alert("❌ " + (data.error || "Có lỗi xảy ra"));
  }
};
