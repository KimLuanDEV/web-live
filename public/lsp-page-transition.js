
/* ==========================================
   LIVESTREAM PRO
   GLOBAL PAGE TRANSITION
========================================== */

(() => {
  "use strict";

  if (window.LSPTransition) return;

  const KEY = "lsp-transition-target-v3";

  // Thời gian chuyển trang
  // Thời gian màn chuyển cảnh đi vào và rời đi
const EXIT_MS = 560;
const ENTRY_MS = 600;

  const reduceMotion = !!window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let layer = null;
  let navigating = false;

  /* ======================================
     KIỂM TRA TRANG VỪA CHUYỂN ĐẾN
  ====================================== */

  let arriving = false;

  try {
    const saved = JSON.parse(
      sessionStorage.getItem(KEY) || "null"
    );

    sessionStorage.removeItem(KEY);

    arriving = !!saved &&
      saved.path ===
        location.pathname + location.search &&
      Date.now() - saved.time >= 0 &&
      Date.now() - saved.time < 90000;

  } catch (_) {}

  if (arriving) {
    document.documentElement.classList.add(
      "lsppt-arriving"
    );
  }

  /* ======================================
     CSS GIAO DIỆN CHUYỂN TRANG
  ====================================== */

  const style = document.createElement("style");


/* ==========================================
   LIVESTREAM PRO
   CINEMATIC LUXURY PAGE TRANSITION
========================================== */

style.textContent = `

/* LỚP CHE TRANG MỚI */
html.lsppt-arriving::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: #090b10;
  pointer-events: auto;
}

#lsppt-layer,
#lsppt-layer * {
  box-sizing: border-box;
}

/* MÀN CHUYỂN CẢNH TOÀN MÀN HÌNH */
#lsppt-layer {
  position: fixed;
  inset: 0;
  z-index: 2147483647;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 24px;
  overflow: hidden;
  isolation: isolate;

  background:
    radial-gradient(
      ellipse at 50% 40%,
      rgba(204,161,95,.15),
      transparent 38%
    ),
    radial-gradient(
      ellipse at 50% 100%,
      rgba(144,102,48,.11),
      transparent 60%
    ),
    linear-gradient(
      145deg,
      #17191e,
      #090b10 52%,
      #151317
    );

  visibility: hidden;
  pointer-events: none;

  transform: translate3d(0,105%,0);

  transition:
    transform ${EXIT_MS}ms cubic-bezier(.76,0,.24,1),
    visibility 0s linear \${EXIT_MS}ms;
}

/* ĐƯỜNG VIỀN TRANG TRÍ */
#lsppt-layer::before {
  content: "";
  position: absolute;
  inset: 16px;

  border: 1px solid rgba(230,195,131,.09);

  pointer-events: none;
}

/* VỆT SÁNG Ở RÌA MÀN CHUYỂN CẢNH */
#lsppt-layer::after {
  content: "";
  position: absolute;

  left: 0;
  right: 0;
  bottom: 0;

  height: 2px;

  background: linear-gradient(
    90deg,
    transparent,
    rgba(228,191,129,.4),
    #f2d8a8,
    rgba(228,191,129,.4),
    transparent
  );

  box-shadow: 0 0 24px rgba(228,187,115,.4);
  pointer-events: none;
}

/* HIỆU ỨNG ĐI VÀO */
#lsppt-layer.lsppt-open {
  visibility: visible;
  pointer-events: auto;

  transform: translate3d(0,0,0);

  transition:
    transform ${EXIT_MS}ms cubic-bezier(.76,0,.24,1);
}

/* HIỆU ỨNG RỜI KHỎI */
#lsppt-layer.lsppt-close {
  visibility: visible;
  pointer-events: none;

  transform: translate3d(0,-105%,0);

  transition:
    transform \${ENTRY_MS}ms cubic-bezier(.76,0,.24,1);
}

/* KHI VỪA ĐẾN TRANG MỚI */
html.lsppt-arriving #lsppt-layer {
  visibility: visible;
  pointer-events: auto;

  transform: translate3d(0,0,0);
  transition: none;
}

/* NỘI DUNG GIỮA MÀN HÌNH */
#lsppt-layer .lsppt-card {
  position: relative;
  z-index: 1;

  width: min(100%,380px);
  padding: 15px 0;

  display: flex;
  flex-direction: column;
  align-items: center;

  text-align: center;

  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;

  color: #f0dbb5;

  font-family:
    system-ui,
    -apple-system,
    "Segoe UI",
    sans-serif;

  opacity: 0;
  transform: translateY(15px);

  transition:
    opacity .35s ease,
    transform .4s ease;
}

#lsppt-layer.lsppt-open .lsppt-card,
html.lsppt-arriving #lsppt-layer .lsppt-card {
  opacity: 1;
  transform: translateY(0);
}

#lsppt-layer.lsppt-close .lsppt-card {
  opacity: 0;
  transform: translateY(-15px);
}


/* ==========================================
   LIVESTREAM PRO
   IMAGE LOGO - LUXURY TRANSITION
========================================== */

#lsppt-layer .lsppt-logo {
  position: relative;

  width: 125px;
  height: 125px;

  margin: 0 0 26px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

/* HÌNH ẢNH LOGO */
#lsppt-layer .lsppt-logo-img {
  display: block;

  width: 100%;
  height: 100%;

  object-fit: contain;
  object-position: center;

  border: none;
  background: transparent;

  filter:
    drop-shadow(0 0 18px rgba(219,174,101,.22));

  animation: lsppt-logo-float 3s ease-in-out infinite;

  user-select: none;
  -webkit-user-drag: none;
}

/* CHUYỂN ĐỘNG NHẸ */
@keyframes lsppt-logo-float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-5px) scale(1.035);
  }
}

/* MOBILE */
@media (max-width: 480px) {
  #lsppt-layer .lsppt-logo {
    width: 105px;
    height: 105px;
    margin-bottom: 23px;
  }
}

/* GIẢM CHUYỂN ĐỘNG */
@media (prefers-reduced-motion: reduce) {
  #lsppt-layer .lsppt-logo-img {
    animation: none !important;
  }
}


/* TÊN THƯƠNG HIỆU */
#lsppt-layer .lsppt-title {
  color: #f5e1bc;

  font-size: clamp(17px,4.5vw,21px);
  font-weight: 750;
  letter-spacing: 2.7px;

  line-height: 1.4;
  white-space: nowrap;
}

/* DÒNG CHUYỂN TRANG */
#lsppt-layer .lsppt-sub {
  margin-top: 13px;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  color: #ada295;

  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
}

/* HAI ĐƯỜNG KẺ TRANG TRÍ */
#lsppt-layer .lsppt-sub::before,
#lsppt-layer .lsppt-sub::after {
  content: "";

  width: 22px;
  height: 1px;

  background: rgba(224,186,121,.4);
}

/* THANH ÁNH SÁNG */
#lsppt-layer .lsppt-track {
  width: min(220px,70vw);
  height: 2px;

  margin-top: 32px;

  overflow: hidden;
  border-radius: 50px;

  background: rgba(226,193,143,.15);
}

#lsppt-layer .lsppt-bar {
  width: 36%;
  height: 100%;

  border-radius: inherit;

  background: linear-gradient(
    90deg,
    transparent,
    #d6ad71,
    #fff0cf,
    #bb9257
  );

  box-shadow: 0 0 14px rgba(242,214,167,.55);

  animation: lsppt-flow 1.3s ease-in-out infinite;
}

/* TRẠNG THÁI */
#lsppt-layer .lsppt-text {
  margin-top: 16px;

  font-size: 12px;
  color: #b9b0a5;
  letter-spacing: .3px;
  line-height: 1.5;
}

/* CHUYỂN ĐỘNG LOGO */
@keyframes lsppt-diamond {
  0%, 100% {
    opacity: .55;
    transform: rotate(45deg) scale(.96);
  }

  50% {
    opacity: 1;
    transform: rotate(45deg) scale(1.04);
  }
}

/* CHUYỂN ĐỘNG THANH SÁNG */
@keyframes lsppt-flow {
  from {
    transform: translateX(-110%);
  }

  to {
    transform: translateX(290%);
  }
}

/* MOBILE */
@media (max-width: 480px) {
  #lsppt-layer .lsppt-logo {
    width: 88px;
    height: 88px;
    margin-bottom: 26px;
  }

  #lsppt-layer .lsppt-logo::before {
    inset: 12px;
  }

  #lsppt-layer .lsppt-title {
    letter-spacing: 2px;
  }

  #lsppt-layer .lsppt-sub {
    font-size: 9px;
    letter-spacing: 1.5px;
  }
}

/* GIẢM CHUYỂN ĐỘNG */
@media (prefers-reduced-motion: reduce) {
  #lsppt-layer,
  #lsppt-layer *,
  #lsppt-layer *::before,
  #lsppt-layer *::after {
    animation: none !important;
    transition: none !important;
  }
}

`;


  document.head.appendChild(style);

  /* ======================================
     TẠO HOẠT CẢNH
  ====================================== */

  function getLayer() {

    if (layer) return layer;

    if (!document.body) return null;

    layer = document.createElement("div");

    layer.id = "lsppt-layer";

    layer.setAttribute(
      "role",
      "status"
    );

    layer.setAttribute(
      "aria-label",
      "Loading"
    );

    layer.innerHTML = `
      <div class="lsppt-card">

<div class="lsppt-logo">
  <img
    src="/assets/icon-192.png"
    alt="Livestream Pro"
    class="lsppt-logo-img"
    draggable="false"
  >
</div>

        <div class="lsppt-title">
          LIVESTREAM PRO
        </div>

        <div class="lsppt-sub">
          LOADING
        </div>

        <div class="lsppt-track">
          <div class="lsppt-bar"></div>
        </div>

        <div class="lsppt-text">
          Loading...
        </div>

      </div>
    `;

    document.body.appendChild(layer);

    return layer;
  }

  /* ======================================
     KIỂM TRA ĐƯỜNG DẪN NỘI BỘ
  ====================================== */

  function isInternalPage(url) {

    if (!/^https?:$/.test(url.protocol)) {
      return false;
    }

    if (url.origin !== location.origin) {
      return false;
    }

    if (url.pathname.startsWith("/api/")) {
      return false;
    }

    const ext = url.pathname.match(
      /\.([a-z0-9]{1,8})$/i
    )?.[1];

    return !ext || /^(html?|php)$/i.test(ext);
  }

  /* ======================================
     HÀM CHUYỂN TRANG CHÍNH
  ====================================== */

  function go(address, options = {}) {

    let url;

    try {
      url = new URL(address, location.href);
    } catch (_) {
      return false;
    }

    if (!/^https?:$/.test(url.protocol)) {
      return false;
    }

    // Đường dẫn ngoài ứng dụng
    if (!isInternalPage(url)) {

      if (options.replace) {
        location.replace(url.href);
      } else {
        location.assign(url.href);
      }

      return true;
    }

    // Link cùng trang
    if (
      url.pathname + url.search ===
      location.pathname + location.search
    ) {

      if (url.href !== location.href) {
        location.assign(url.href);
      }

      return false;
    }

    // Ngăn bấm nhiều lần
    if (navigating) return false;

    navigating = true;

    const el = getLayer();

    if (!el) {

      navigating = false;
      location.assign(url.href);

      return true;
    }

    // Nội dung trạng thái
    el.querySelector(
      ".lsppt-text"
    ).textContent =
      options.label || "Loading...";

    el.classList.remove("lsppt-close");
    el.classList.add("lsppt-open");

    // Chờ hoạt cảnh phủ trang cũ
    setTimeout(() => {

      try {

        sessionStorage.setItem(
          KEY,
          JSON.stringify({
            path: url.pathname + url.search,
            time: Date.now()
          })
        );

      } catch (_) {}

      if (options.replace) {
        location.replace(url.href);
      } else {
        location.assign(url.href);
      }

    }, reduceMotion ? 0 : EXIT_MS);

    return true;
  }

  /* ======================================
     NHẬN DIỆN ONCLICK ĐIỀU HƯỚNG
  ====================================== */

  function inlineNav(code) {

    if (!code) return null;

    let match = code.match(
      /^\s*(?:window\.)?location(?:\.href)?\s*=\s*(['"])([^'"\r\n]+)\1\s*;?\s*$/
    );

    if (match) {
      return {
        href: match[2]
      };
    }

    match = code.match(
      /^\s*(?:window\.)?location\.(assign|replace)\(\s*(['"])([^'"\r\n]+)\2\s*\)\s*;?\s*$/
    );

    if (match) {
      return {
        href: match[3],
        replace: match[1] === "replace"
      };
    }

    return null;
  }

  /* ======================================
     BẮT CLICK CHUYỂN TRANG TỰ ĐỘNG
  ====================================== */

  window.addEventListener(
    "click",
    event => {

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const target =
        event.target instanceof Element
          ? event.target
          : null;

      if (
        !target ||
        target.closest(
          "[data-lsp-no-transition]"
        )
      ) return;

      const el = target.closest(
        "[data-lsp-href],a[href],[onclick]"
      );

      if (!el) return;

      let nav = null;

      // Nút có data-lsp-href
      if (el.hasAttribute("data-lsp-href")) {

        nav = {
          href: el.getAttribute(
            "data-lsp-href"
          ),
          replace: el.hasAttribute(
            "data-lsp-replace"
          ),
          label: el.getAttribute(
            "data-lsp-label"
          )
        };

      }

      // Thẻ liên kết
      else if (el.matches("a[href]")) {

        if (
          el.hasAttribute("download") ||
          (el.target && el.target !== "_self") ||
          el.relList?.contains("external")
        ) return;

        const onclick =
          el.getAttribute("onclick");

        nav = onclick
          ? inlineNav(onclick)
          : {
              href: el.getAttribute("href")
            };

      }

      // Nút onclick chuyển trang trực tiếp
      else {

        nav = inlineNav(
          el.getAttribute("onclick")
        );

      }

      if (!nav?.href) return;

      let url;

      try {
        url = new URL(
          nav.href,
          location.href
        );
      } catch (_) {
        return;
      }

      if (!isInternalPage(url)) return;

      if (
        url.pathname + url.search ===
        location.pathname + location.search
      ) return;

      // Chặn chuyển tức thì
      event.preventDefault();
      event.stopImmediatePropagation();

      // Chạy hoạt cảnh
      go(url.href, nav);

    },
    true
  );

  /* ======================================
     HỖ TRỢ PHÍM ENTER
  ====================================== */

  window.addEventListener(
    "keydown",
    event => {

      if (
        event.key !== "Enter" &&
        event.key !== " "
      ) return;

      const target =
        event.target instanceof Element
          ? event.target
          : null;

      const el = target?.closest(
        "[data-lsp-href]"
      );

      if (
        !el ||
        el.matches("button,a,input") ||
        el.hasAttribute(
          "data-lsp-no-transition"
        )
      ) return;

      if (
        event.key === " " &&
        el.getAttribute("role") !== "link"
      ) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      go(el.getAttribute("data-lsp-href"), {
        label: el.getAttribute(
          "data-lsp-label"
        ),
        replace: el.hasAttribute(
          "data-lsp-replace"
        )
      });

    },
    true
  );

  /* ======================================
     TRANG MỚI HIỆN LÊN MƯỢT
  ====================================== */

  function onPageReady() {

    const el = getLayer();

    if (!arriving || !el) return;

    el.classList.add("lsppt-open");

    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        document.documentElement.classList.remove(
          "lsppt-arriving"
        );

        el.classList.add("lsppt-close");
        el.classList.remove("lsppt-open");

        setTimeout(() => {

          el.classList.remove("lsppt-close");

        }, ENTRY_MS + 40);

      });

    });
  }

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      onPageReady,
      { once: true }
    );

  } else {

    onPageReady();

  }

  /* ======================================
     KHÔI PHỤC KHI BACK / FORWARD
  ====================================== */

  window.addEventListener(
    "pageshow",
    event => {

      if (!event.persisted) return;

      navigating = false;

      document.documentElement.classList.remove(
        "lsppt-arriving"
      );

      layer?.classList.remove(
        "lsppt-open",
        "lsppt-close"
      );

    }
  );

  /* ======================================
     HÀM DÙNG CHUNG TOÀN ỨNG DỤNG
  ====================================== */

  window.LSPTransition = Object.freeze({
    go
  });

})();
