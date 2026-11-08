
/* ======================================
   LIVESTREAM PRO - PREMIUM SVG ICONS
   Không phụ thuộc thư viện bên ngoài
   ====================================== */

const WD_ICONS = {
  back: '<path d="m15 18-6-6 6-6"/>',

  gem: `
    <path d="M6 3h12l4 6-10 12L2 9l4-6Z"/>
    <path d="M2 9h20M12 21 8 9l2-6m2 18 4-12-2-6"/>
  `,

  crown: `
    <path d="m2 8 5 4 5-8 5 8 5-4-2 11H4L2 8Z"/>
    <path d="M4 22h16"/>
  `,

  wallet: `
    <rect x="3" y="5" width="18" height="15" rx="2"/>
    <path d="M3 9h18"/>
    <path d="M16 14h2"/>
  `,

  bank: `
    <path d="m3 10 9-7 9 7"/>
    <path d="M4 10h16M5 10v9m5-9v9m4-9v9m5-9v9M3 21h18"/>
  `,

  shield: `
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
    <path d="m9 12 2 2 4-4"/>
  `,

  lock: `
    <rect x="5" y="10" width="14" height="11" rx="2"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
    <path d="M12 15v2"/>
  `,

  send: `
    <path d="M7 17 17 7M7 7h10v10"/>
    <path d="M20 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"/>
  `,

  history: `
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
    <path d="M3 3v5h5"/>
    <path d="M12 7v5l3 2"/>
  `,

  clock: `
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 2"/>
  `,

  check: `
    <circle cx="12" cy="12" r="9"/>
    <path d="m8 12 3 3 5-6"/>
  `,

  error: `
    <circle cx="12" cy="12" r="9"/>
    <path d="m9 9 6 6m0-6-6 6"/>
  `,

  warning: `
    <path d="m10.3 3.7-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.7-2.3l-8-14a2 2 0 0 0-3.4 0Z"/>
    <path d="M12 9v4m0 4h.01"/>
  `,

  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',

  sparkle: `
    <path d="m12 2 1.8 8.2L22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8L12 2Z"/>
  `
};

/* Tạo icon SVG từ danh sách cố định */

function wdIcon(name, size = "") {
  const paths = WD_ICONS[name] || WD_ICONS.wallet;

  const allowedSizes = ["sm", "lg", "xl"];
  const sizeClass = allowedSizes.includes(size) ? size : "";

  return `
    <span class="wd-icon ${sizeClass}" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="1.7"
           stroke-linecap="round"
           stroke-linejoin="round">
        ${paths}
      </svg>
    </span>
  `;
}

/* Đổ SVG vào các vị trí chỉ định trong HTML */

function wdRenderIcons(root = document) {
  root.querySelectorAll("[data-wd-icon]").forEach(el => {
    const name = el.dataset.wdIcon;
    const size = el.dataset.wdSize || "";

    el.innerHTML = wdIcon(name, size);
    el.removeAttribute("data-wd-icon");
  });
}

wdRenderIcons();



let socket = null;

const params = new URLSearchParams(location.search);
const received = Number(params.get("received") || 0);

// 🔁 TỶ GIÁ (bạn chỉnh tùy ý)
const RATE = 300; // 1 kim cương = 100đ / giá đô $
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




function updateMoney() {
  const val = Math.min(
    received,
    Number(withdrawInput.value || 0)
  );

  moneyVal.textContent =
    (val * RATE).toLocaleString("vi-VN") + " ₫";

  if (withdrawInput.disabled) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML =
      wdIcon("clock") + "<span>ĐANG CHỜ DUYỆT</span>";
    return;
  }

  if (val < MIN_WITHDRAW) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML =
      wdIcon("warning") +
      `<span>RÚT TỐI THIỂU ${MIN_WITHDRAW.toLocaleString("vi-VN")}</span>`;
  } else {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML =
      wdIcon("send") +
      "<span>GỬI YÊU CẦU RÚT TIỀN</span>";
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
  prev.innerHTML = wdIcon("left");
prev.setAttribute("aria-label", "Trang trước");
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
  next.innerHTML = wdIcon("right");
next.setAttribute("aria-label", "Trang sau");
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



function toggleWithdrawForm(enable) {
  const warnId = "withdrawPendingWarn";
  let warn = document.getElementById(warnId);

  const bankNameEl = document.getElementById("bankName");
  const bankAccountEl = document.getElementById("bankAccount");
  const bankOwnerEl = document.getElementById("bankOwner");

  withdrawInput.disabled = !enable;
  bankNameEl.disabled = !enable;
  bankAccountEl.disabled = !enable;
  bankOwnerEl.disabled = !enable;

  if (!enable) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML =
      wdIcon("clock") +
      "<span>ĐANG CHỜ PHÊ DUYỆT</span>";

    if (!warn) {
      warn = document.createElement("div");
      warn.id = warnId;
      warn.className = "withdraw-warn";

      warn.innerHTML =
        wdIcon("warning") +
        "<span>Bạn đang có yêu cầu rút tiền chờ phê duyệt</span>";

      btnSubmit.parentNode.insertBefore(warn, btnSubmit);
    }
  } else {
    if (warn) warn.remove();

    updateMoney();
  }
}




function statusText(s) {
  if (s === "pending") {
    return `<span class="wd-status">
      ${wdIcon("clock")}
      Đang chờ
    </span>`;
  }

  if (s === "approved") {
    return `<span class="wd-status">
      ${wdIcon("check")}
      Đã duyệt
    </span>`;
  }

  if (s === "rejected") {
    return `<span class="wd-status">
      ${wdIcon("error")}
      Từ chối
    </span>`;
  }

  return "Không xác định";
}


// load lần đầu
loadWithdrawHistory();
loadBankDefault();





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




function showNotifyModal(message, type = "warn", title) {
  const modal = document.getElementById("notifyModal");
  const msgEl = document.getElementById("notifyMessage");
  const iconEl = document.getElementById("notifyIcon");
  const titleEl = document.getElementById("notifyTitle");

  if (!modal) return;

  msgEl.textContent = message;

  iconEl.className = "lp-modal-icon";

  if (type === "error") {
    iconEl.classList.add("is-error");
    iconEl.innerHTML = wdIcon("error", "xl");
    titleEl.textContent = title || "Giao dịch không thành công";

  } else if (type === "success") {
    iconEl.classList.add("is-success");
    iconEl.innerHTML = wdIcon("check", "xl");
    titleEl.textContent = title || "Thành công";

  } else {
    iconEl.classList.add("is-warn");
    iconEl.innerHTML = wdIcon("warning", "xl");
    titleEl.textContent = title || "Thông báo";
  }

  modal.classList.remove("hidden");
}


function closeNotifyModal(){
  const modal = document.getElementById("notifyModal");
  modal && modal.classList.add("hidden");
}


function showForceLogoutModal(message){
  let modal = document.getElementById("forceLogoutModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "forceLogoutModal";
    modal.innerHTML = `
      <div class="fl-backdrop"></div>
      <div class="fl-box">
        <div class="fl-icon">${wdIcon("error", "xl")}</div>
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


// 🔔 SOCKET AUTH + FORCE LOGOUT (BẮT BUỘC)
const me = JSON.parse(localStorage.getItem("user_profile") || "{}");

if (typeof io === "function" && me?.uid) {
  socket = io();

  socket.emit("auth", {
    uid: me.uid,
    deviceId: localStorage.getItem("device_id") || null
  });

  socket.on("withdraw-update", () => {
    loadWithdrawHistory();
  });

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


}






