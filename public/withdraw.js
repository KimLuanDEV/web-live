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


// ===== 📜 LỊCH SỬ RÚT TIỀN =====
async function loadWithdrawHistory() {
  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");
  if (!me.uid) return;

  const res = await fetch("/api/withdraw-history", {
    headers: { "x-uid": me.uid }
  });

  const data = await res.json();
  if (!data.ok) return;

  const body = document.getElementById("withdrawHistoryBody");
  const empty = document.getElementById("withdrawEmpty");

  body.innerHTML = "";

  let hasPending = false;

  if (!data.list.length) {
    empty.style.display = "block";
  } else {
    empty.style.display = "none";

    data.list.forEach(w => {
      if (w.status === "pending") hasPending = true;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(w.createdAt).toLocaleString("vi-VN")}</td>
        <td>${w.amount.toLocaleString()}</td>
        <td>${w.bank}</td>
        <td class="st-${w.status}">
          ${statusText(w.status)}
        </td>
        <td>${w.note || "-"}</td>
      `;
      body.appendChild(tr);
    });
  }

  // ⛔ DISABLE FORM NẾU CÒN PENDING
  toggleWithdrawForm(!hasPending);
}



function toggleWithdrawForm(enable){
  const warnId = "withdrawPendingWarn";
  let warn = document.getElementById(warnId);

  if (!enable) {
    withdrawInput.disabled = true;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "⏳ Đang chờ duyệt";

    if (!warn) {
      warn = document.createElement("div");
      warn.id = warnId;
      warn.className = "withdraw-warn";
      warn.textContent = "⛔ Bạn đang có yêu cầu rút đang chờ phê duyệt";
      btnSubmit.parentNode.insertBefore(warn, btnSubmit);
    }
  } else {
    withdrawInput.disabled = false;
    btnSubmit.disabled = false;
    btnSubmit.textContent = "📤 Gửi yêu cầu rút";
    warn && warn.remove();
  }
}




function statusText(s){
  if (s === "pending") return "⏳ Đang chờ";
  if (s === "approved") return "✅ Đã duyệt";
  if (s === "rejected") return "❌ Từ chối";
  return s;
}

// load lần đầu
loadWithdrawHistory();


// 🔔 REALTIME UPDATE
if (typeof io === "function") {
  const socket = io();

socket.on("withdraw-update", () => {
  loadWithdrawHistory();
});

}


function goBack(){
  if (history.length > 1) {
    history.back();
  } else {
    location.href = "/profile.html";
  }
}
