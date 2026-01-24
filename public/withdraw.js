const params = new URLSearchParams(location.search);
const received = Number(params.get("received") || 0);

// 🔁 TỶ GIÁ (bạn chỉnh tùy ý)
const RATE = 133; // 1 kim cương = 100đ / giá đô $
// ⛔ RÚT TỐI THIỂU
const MIN_WITHDRAW = 5000; // 💎 tối thiểu để được rút


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

const WITHDRAW_PAGE_SIZE = 5;
let withdrawPage = 1;
let withdrawCache = [];


receivedVal.textContent = received.toLocaleString();

document.getElementById("minWithdrawVal").textContent =
  MIN_WITHDRAW.toLocaleString();



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

  // UX: chưa đủ tối thiểu thì disable nút
  if (val < MIN_WITHDRAW) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = `⛔ Rút tối thiểu ${MIN_WITHDRAW} 💎`;
  } else {
    btnSubmit.disabled = false;
    btnSubmit.textContent = "📤 Gửi yêu cầu rút";
  }
}


withdrawInput.oninput = updateMoney;
updateMoney();


btnSubmit.onclick = () => {
  openSecurityModal();
};


async function submitWithdraw(securityCode){
  const amount = Number(withdrawInput.value || 0);

  const bankName = document.getElementById("bankName").value;
  const bankAccount = document.getElementById("bankAccount").value.trim();
  const bankOwner = document.getElementById("bankOwner").value.trim();

  if (!bankName || !bankAccount || !bankOwner) {
    showNotifyModal(
  "Vui lòng nhập đầy đủ thông tin ngân hàng",
  "error"
);
    return;
  }

  if (amount < MIN_WITHDRAW) {
    showNotifyModal(
  `Số kim cương rút tối thiểu là ${MIN_WITHDRAW.toLocaleString()} 💎`,
  "warn",
  "Không đủ điều kiện"
);

    return;
  }

  const bank = `${bankName} | STK: ${bankAccount} | ${bankOwner}`;

  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");
  if (!me.uid) {
    showNotifyModal(
  "Bạn chưa đăng nhập, vui lòng đăng nhập lại",
  "error"
);

    return;
  }

  const res = await fetch("/api/withdraw-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-uid": me.uid
    },
    body: JSON.stringify({
      amount,
      bank,
      securityCode
    })
  });

  const data = await res.json();
  if (data.ok) {
    openWithdrawModal();
  } else {
    showNotifyModal(
  data.error || "Có lỗi xảy ra, vui lòng thử lại",
  "error"
);

  }
}



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
async function loadWithdrawHistory(page = 1) {
  const me = JSON.parse(localStorage.getItem("user_profile") || "{}");
  if (!me.uid) return;

  withdrawPage = page;

  const res = await fetch("/api/withdraw-history", {
    headers: { "x-uid": me.uid }
  });

  const data = await res.json();
  if (!data.ok) return;

  withdrawCache = data.list || [];

  renderWithdrawPage();
}

function renderWithdrawPage(){
  const body = document.getElementById("withdrawHistoryBody");
  const empty = document.getElementById("withdrawEmpty");
  const pager = document.getElementById("withdrawPagination");

  body.innerHTML = "";
  pager.innerHTML = "";

  if (!withdrawCache.length) {
    empty.style.display = "block";
    toggleWithdrawForm(true);
    return;
  }

  empty.style.display = "none";

  // kiểm tra pending
  const hasPending = withdrawCache.some(w => w.status === "pending");
  toggleWithdrawForm(!hasPending);

  const totalPages = Math.ceil(withdrawCache.length / WITHDRAW_PAGE_SIZE);
  const start = (withdrawPage - 1) * WITHDRAW_PAGE_SIZE;
  const end = start + WITHDRAW_PAGE_SIZE;

  withdrawCache.slice(start, end).forEach(w => {
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

  // render pagination
if (totalPages > 1) {
  const prev = document.createElement("button");
  prev.className = "pg-btn";
  prev.textContent = "◀";
  prev.disabled = withdrawPage === 1;
  prev.onclick = () => {
    withdrawPage--;
    renderWithdrawPage();
  };

  const info = document.createElement("div");
  info.className = "pg-info";
  info.textContent = `Trang ${withdrawPage} / ${totalPages}`;

  const next = document.createElement("button");
  next.className = "pg-btn";
  next.textContent = "▶";
  next.disabled = withdrawPage === totalPages;
  next.onclick = () => {
    withdrawPage++;
    renderWithdrawPage();
  };

  pager.appendChild(prev);
  pager.appendChild(info);
  pager.appendChild(next);
}

}


function toggleWithdrawForm(enable){
  const warnId = "withdrawPendingWarn";
  let warn = document.getElementById(warnId);

  const bankNameEl = document.getElementById("bankName");
  const bankAccountEl = document.getElementById("bankAccount");
  const bankOwnerEl = document.getElementById("bankOwner");

  if (!enable) {
    // ⛔ khoá form rút
    withdrawInput.disabled = true;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "⏳ Đang chờ duyệt";

    // ⛔ khoá ngân hàng
    bankNameEl.disabled = true;
    bankAccountEl.disabled = true;
    bankOwnerEl.disabled = true;

    if (!warn) {
      warn = document.createElement("div");
      warn.id = warnId;
      warn.className = "withdraw-warn";
      warn.textContent = "⛔ Bạn đang có yêu cầu rút đang chờ phê duyệt";
      btnSubmit.parentNode.insertBefore(warn, btnSubmit);
    }
  } else {
    // 🔓 mở lại
    withdrawInput.disabled = false;
    btnSubmit.disabled = false;
    btnSubmit.textContent = "📤 Gửi yêu cầu rút";

    bankNameEl.disabled = false;
    bankAccountEl.disabled = false;
    bankOwnerEl.disabled = false;

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


function openWithdrawModal(){
  const modal = document.getElementById("withdrawSuccessModal");
  modal && modal.classList.remove("hidden");
}

function closeWithdrawModal(){
  const modal = document.getElementById("withdrawSuccessModal");
  modal && modal.classList.add("hidden");
}


function openSecurityModal(){
  const modal = document.getElementById("securityCodeModal");
  const input = document.getElementById("securityCodeModalInput");
  if (!modal || !input) return;

  input.value = "";
  modal.classList.remove("hidden");
  setTimeout(() => input.focus(), 100);
}

function closeSecurityModal(){
  const modal = document.getElementById("securityCodeModal");
  modal && modal.classList.add("hidden");
}


async function confirmWithdraw(){
  const securityCode =
    document.getElementById("securityCodeModalInput").value.trim();

  if (!securityCode) {
    showNotifyModal(
  "Vui lòng nhập mã bảo mật để xác nhận rút tiền",
  "warn",
  "Thiếu mã bảo mật"
);
    return;
  }

  closeSecurityModal();

  // 🔁 GỌI LẠI LOGIC RÚT CŨ
  await submitWithdraw(securityCode);
}



function showNotifyModal(message, type = "warn", title){
  const modal = document.getElementById("notifyModal");
  const msgEl = document.getElementById("notifyMessage");
  const iconEl = document.getElementById("notifyIcon");
  const titleEl = document.getElementById("notifyTitle");

  if (!modal) return;

  msgEl.textContent = message;

  if (type === "error") {
    iconEl.textContent = "❌";
    titleEl.textContent = title || "Lỗi";
  } else if (type === "success") {
    iconEl.textContent = "✅";
    titleEl.textContent = title || "Thành công";
  } else {
    iconEl.textContent = "⚠️";
    titleEl.textContent = title || "Thông báo";
  }

  modal.classList.remove("hidden");
}

function closeNotifyModal(){
  const modal = document.getElementById("notifyModal");
  modal && modal.classList.add("hidden");
}
