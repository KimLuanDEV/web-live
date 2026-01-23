const params = new URLSearchParams(location.search);
const received = Number(params.get("received") || 0);

// 🔁 TỶ GIÁ (bạn chỉnh tùy ý)
const RATE = 100; // 1 kim cương = 100đ

const receivedVal = document.getElementById("receivedVal");
const moneyVal = document.getElementById("moneyVal");
const withdrawInput = document.getElementById("withdrawInput");
const btnSubmit = document.getElementById("btnSubmitWithdraw");


const BANK_LOGOS = {
  "Vietcombank": "/img/banks/vietcombank.png",
  "Techcombank": "/img/banks/techcombank.png",
  "BIDV": "/img/banks/bidv.png",
  "VietinBank": "/img/banks/vietinbank.png",
  "MB Bank": "/img/banks/mbbank.png",
  "ACB": "/img/banks/acb.png"
};



receivedVal.textContent = received.toLocaleString();

withdrawInput.max = received;
withdrawInput.value = received;


function updateBankLogo(bankName){
  const img = document.getElementById("bankLogo");
  if (!img) return;

  const src = BANK_LOGOS[bankName];
  if (src) {
    img.src = src;
    img.classList.remove("hidden");
  } else {
    img.classList.add("hidden");
  }
}



function updateMoney(){
  const val = Math.min(received, Number(withdrawInput.value || 0));
  moneyVal.textContent = (val * RATE).toLocaleString() + " ₫";
}

withdrawInput.oninput = updateMoney;
updateMoney();

btnSubmit.onclick = async () => {
  const amount = Number(withdrawInput.value || 0);
  
  const bankName = document.getElementById("bankName").value;
const bankAccount = document.getElementById("bankAccount").value.trim();
const bankOwner = document.getElementById("bankOwner").value.trim();

if (!bankName || !bankAccount || !bankOwner) {
  alert("❌ Vui lòng nhập đầy đủ thông tin ngân hàng");
  return;
}

// 🔗 GỘP THÀNH 1 LIÊN KẾT DUY NHẤT
const bank = `${bankName} | STK: ${bankAccount} | ${bankOwner}`;


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

    // 🔐 LƯU NGÂN HÀNG MẶC ĐỊNH (SAU KHI RÚT OK)
  fetch("/api/profile/bank-default", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({
      name: bankName,
      account: bankAccount,
      owner: bankOwner
    })
  });

    alert("✅ Đã gửi yêu cầu rút tiền");
    history.back();
  } else {
    alert("❌ " + (data.error || "Có lỗi xảy ra"));
  }
};


async function loadBankDefault(){
  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");
  if (!me.uid) return;

  const res = await fetch("/api/profile/bank-default", {
    headers: { "x-uid": me.uid }
  });

  const data = await res.json();
  if (!data.ok || !data.bank) return;

  document.getElementById("bankName").value = data.bank.name || "";
  document.getElementById("bankAccount").value = data.bank.account || "";
  document.getElementById("bankOwner").value = data.bank.owner || "";
  updateBankLogo(data.bank.name); // 🔥 THÊM DÒNG NÀY
}



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
        <td>
        <img
        src="${BANK_LOGOS[w.bank.split(" | ")[0]] || ""}"
        style="height:18px;vertical-align:middle;margin-right:6px"
        >
        ${w.bank}
        </td>

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
loadBankDefault();


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


document.getElementById("bankName").addEventListener("change", e => {
  updateBankLogo(e.target.value);
});
