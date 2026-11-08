
/* =========================================
   LIVESTREAM PRO - LUXURY TOPUP
   ========================================= */

const auth = JSON.parse(
  localStorage.getItem("user_profile") || "{}"
);

if (!auth.uid) {
  location.href = "/login.html";
}

const socket = io();

const $ = id => document.getElementById(id);

const myCoinEl = $("myCoin");
const agentList = $("agentList");
const sheetOverlay = $("sheetOverlay");
const qrSheet = $("qrSheet");
const sheetQr = $("sheetQr");
const qrUnavailable = $("qrUnavailable");
const sheetBankInfo = $("sheetBankInfo");
const btnTransferred = $("btnTransferred");
const transferStatus = $("transferStatus");

let currentAgent = null;
let agentsCache = [];

/* ===== SVG ICON ===== */

function tpIcon(name) {
  return `
    <svg class="icon" aria-hidden="true">
      <use href="#tp-${name}"></use>
    </svg>
  `;
}

/* ===== SỐ DƯ ===== */

function updateCoinBalance(coins) {
  const value = Number(coins);

  myCoinEl.textContent =
    (Number.isFinite(value) ? Math.max(0, value) : 0)
      .toLocaleString("vi-VN");
}

updateCoinBalance(auth.coins || 0);

/* ===== SOCKET LOGIN ===== */

socket.on("connect", () => {
  if (auth.uid) {
    socket.emit("socket-login", {
      uid: auth.uid
    });
  }
});

/* Cập nhật số dư khi server gửi dữ liệu mới */

socket.on("coin-update", data => {
  if (data && data.coins !== undefined) {
    updateCoinBalance(data.coins);
  }
});

/* ===== URL HÌNH ẢNH ===== */

function safeImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  if (/^data:image\/(png|jpeg|webp);base64,/i.test(value)) {
    return value;
  }

  try {
    const url = new URL(value, location.origin);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (e) {}

  return "";
}

/* ===== LOAD ĐẠI LÝ ===== */

async function loadAgents() {
  try {
    const response = await fetch("/api/topup-agents");

    if (!response.ok) {
      throw new Error("Không tải được danh sách đại lý");
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error("Không tải được danh sách đại lý");
    }

    agentsCache = Array.isArray(data.agents)
      ? data.agents
      : [];

    renderAgents(agentsCache);

  } catch (error) {
    console.error("Topup agents:", error);

    agentList.innerHTML = `
      <div class="empty-agent">
        Không thể tải danh sách đại lý.
      </div>
    `;

    showToast(error.message, "error");
  }
}

/* ===== RENDER DANH SÁCH ===== */

function renderAgents(list) {
  agentList.replaceChildren();

  if (!list.length) {
    agentList.innerHTML = `
      <div class="empty-agent">
        Hiện chưa có đại lý nạp kim cương.
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach(agent => {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "agent-card";
    card.dataset.uid = String(agent.uid || "");

    card.innerHTML = `
      <div class="agent-avatar-placeholder">
        ${tpIcon("user")}
      </div>

      <div class="agent-info">
        <div class="agent-name"></div>
        <div class="agent-bank"></div>
        <div class="agent-status"></div>
      </div>

      <div class="agent-chevron">
        ${tpIcon("right")}
      </div>
    `;

    const name = String(agent.name || "Đại lý");

    card.querySelector(".agent-name").textContent = name;

    card.querySelector(".agent-bank").textContent =
      [agent.bank, agent.account]
        .filter(Boolean)
        .join(" · ") || "Chưa cập nhật ngân hàng";

    setAgentStatus(card, Boolean(agent.online));

    /* Avatar */
    const avatarSrc = safeImageUrl(agent.avatar);

    if (avatarSrc) {
      const img = new Image();

      img.className = "agent-avatar";
      img.alt = "Ảnh đại diện " + name;
      img.loading = "lazy";

      img.onload = () => {
        card.querySelector(".agent-avatar-placeholder")
          ?.replaceWith(img);
      };

      img.src = avatarSrc;
    }

    card.onclick = () => openAgent(agent);

    fragment.appendChild(card);
  });

  agentList.appendChild(fragment);
}

/* ===== TRẠNG THÁI ONLINE ===== */

function setAgentStatus(card, online) {
  const status = card.querySelector(".agent-status");

  if (!status) return;

  status.textContent = online
    ? "Đang trực tuyến"
    : "Ngoại tuyến";

  status.classList.toggle("offline", !online);
}

socket.on("agent-status", ({ uid, online }) => {
  const agent = agentsCache.find(
    a => String(a.uid) === String(uid)
  );

  if (agent) agent.online = Boolean(online);

  agentList.querySelectorAll(".agent-card").forEach(card => {
    if (card.dataset.uid === String(uid)) {
      setAgentStatus(card, Boolean(online));
    }
  });
});

/* ===== BẬT / TẮT PHƯƠNG THỨC ===== */

["agentOption", "cardOption"].forEach(id => {
  const option = $(id);
  if (!option) return;

  const header = option.querySelector(".option-header");
  const content = option.querySelector(".option-content");

  header.addEventListener("click", () => {
    const open = !option.classList.contains("open");

    option.classList.toggle("open", open);
    content.classList.toggle("hidden", !open);
    header.setAttribute("aria-expanded", String(open));
  });
});

/* ===== TẠO THÔNG TIN NGÂN HÀNG ===== */

function createBankRow(label, value, isCode = false) {
  const row = document.createElement("div");
  row.className = "bank-row";

  const title = document.createElement("span");
  title.className = "bank-label";
  title.textContent = label;

  const val = document.createElement(
    isCode ? "code" : "span"
  );

  val.className = "bank-value";
  val.textContent = String(value ?? "");

  if (isCode) {
    val.id = "transferText";
  }

  row.append(title, val);
  return row;
}

/* ===== MỞ QR ĐẠI LÝ ===== */

function openAgent(agent) {
  currentAgent = agent;

  const content = `NAP ${auth.uid}`;

  /* Mã QR thật từ đại lý */
  const qr = safeImageUrl(agent.qr);

  sheetQr.onload = () => {
    sheetQr.hidden = false;
    qrUnavailable.hidden = true;
  };

  sheetQr.onerror = () => {
    sheetQr.hidden = true;
    qrUnavailable.hidden = false;
  };

  sheetQr.hidden = true;
  qrUnavailable.hidden = !qr;

  if (qr) {
    sheetQr.src = qr;
  } else {
    sheetQr.removeAttribute("src");
  }

  /* Thông tin nhận tiền */
  sheetBankInfo.replaceChildren(
    createBankRow("Đại lý", agent.name || "—"),
    createBankRow("Ngân hàng", agent.bank || "—"),
    createBankRow("Số tài khoản", agent.account || "—"),
    createBankRow("Chủ tài khoản", agent.owner || "—"),
    createBankRow("Nội dung", content, true)
  );

  /* Reset trạng thái xác nhận */
  const hasBankInfo = Boolean(
    agent.bank && agent.account
  );

  btnTransferred.disabled = !hasBankInfo;

  btnTransferred.innerHTML =
    tpIcon("check") +
    "<span>TÔI ĐÃ CHUYỂN KHOẢN</span>";

  transferStatus.classList.add("hidden");

  /* Mở sheet */
  sheetOverlay.classList.remove("hidden");
  qrSheet.classList.add("show");

  document.body.classList.add("sheet-open");
}

/* ===== ĐÓNG QR SHEET ===== */

function closeTopupSheet() {
  qrSheet.classList.remove("show");
  sheetOverlay.classList.add("hidden");

  document.body.classList.remove("sheet-open");
}

sheetOverlay.addEventListener("click", closeTopupSheet);

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && qrSheet.classList.contains("show")) {
    closeTopupSheet();
  }
});

/* ===== COPY NỘI DUNG CHUYỂN KHOẢN ===== */

async function copyTransfer() {
  const text = $("transferText")?.textContent;

  if (!text) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const input = document.createElement("textarea");

      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";

      document.body.appendChild(input);
      input.select();

      const copied = document.execCommand("copy");
      input.remove();

      if (!copied) throw new Error("Copy failed");
    }

    showToast("Đã sao chép nội dung chuyển khoản", "success");

  } catch (error) {
    showToast("Không thể sao chép, vui lòng thử lại", "error");
  }
}

/* ===== XÁC NHẬN ĐÃ CHUYỂN KHOẢN ===== */

btnTransferred.addEventListener("click", () => {
  if (!currentAgent) {
    showToast("Vui lòng chọn đại lý trước", "error");
    return;
  }

  if (!currentAgent.bank || !currentAgent.account) {
    showToast("Thông tin ngân hàng chưa đầy đủ", "error");
    return;
  }

  if (!socket.connected) {
    showToast("Mất kết nối máy chủ, vui lòng thử lại", "error");
    return;
  }

  socket.emit("topup-transferred", {
    fromUid: auth.uid,
    agentUid: currentAgent.uid,
    time: Date.now()
  });

  btnTransferred.disabled = true;

  btnTransferred.innerHTML =
    tpIcon("clock") +
    "<span>ĐÃ GỬI THÔNG BÁO</span>";

  transferStatus.classList.remove("hidden");

  showToast(
    "Đã gửi thông báo chuyển khoản tới đại lý",
    "success"
  );
});

/* ===== NÚT QUAY LẠI ===== */

function goTopupBack() {
  if (history.length > 1) {
    history.back();
  } else {
    location.href = "/profile.html";
  }
}

/* ===== TOAST ===== */

function showToast(message, type = "info", duration = 3000) {
  const toast = document.createElement("div");

  toast.className = "toast toast-" +
    (["info", "success", "error"].includes(type)
      ? type
      : "info");

  toast.textContent = String(message || "Thông báo");

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/* ===== ĐĂNG XUẤT BẮT BUỘC ===== */

function showForceLogoutModal(message) {
  let modal = $("forceLogoutModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "forceLogoutModal";

    modal.innerHTML = `
      <div class="fl-backdrop"></div>
      <div class="fl-box">
        <div class="fl-icon">
          <svg class="icon"
               style="width:36px;height:36px">
            <use href="#tp-ban"></use>
          </svg>
        </div>
        <div class="fl-title">
          Phiên đăng nhập kết thúc
        </div>
        <div class="fl-msg"></div>
        <div class="fl-sub">
          Bạn sẽ được chuyển về trang đăng nhập…
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  modal.querySelector(".fl-msg").textContent =
    String(message || "Phiên đăng nhập đã kết thúc");

  modal.classList.add("show");
}

socket.on("force-logout", data => {
  const message = data?.message ||
    "Tài khoản của bạn đã bị đăng xuất";

  showForceLogoutModal(message);

  localStorage.removeItem("user_profile");
  localStorage.removeItem("login_uid");
  localStorage.removeItem("isGuest");

  setTimeout(() => {
    location.href = "/login.html";
  }, 3000);
});

/* ===== KHỞI TẠO ===== */

loadAgents();
