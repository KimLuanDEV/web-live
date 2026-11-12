
/* ==========================================
   LIVESTREAM PRO
   GLOBAL PAGE TRANSITION
========================================== */

(() => {
  "use strict";

  if (window.LSPTransition) return;

  const KEY = "lsp-transition-target-v3";

  // Thời gian chuyển trang
  const EXIT_MS = 380;
  const ENTRY_MS = 480;

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

  style.textContent = `

    html.lsppt-arriving::before {
      content: "";
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: #080d16;
      pointer-events: auto;
    }

    #lsppt-layer,
    #lsppt-layer * {
      box-sizing: border-box;
    }

    #lsppt-layer {
      position: fixed;
      inset: 0;
      z-index: 2147483647;

      display: flex;
      align-items: center;
      justify-content: center;

      padding: 20px;

      background: radial-gradient(
        ellipse at 50% 35%,
        #273249,
        #101724 55%,
        #080d16
      );

      opacity: 0;
      visibility: hidden;
      pointer-events: none;

      transition:
        opacity ${EXIT_MS}ms ease,
        visibility 0s linear ${EXIT_MS}ms;
    }

    #lsppt-layer.lsppt-open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transition: opacity ${EXIT_MS}ms ease;
    }

    #lsppt-layer.lsppt-close {
      opacity: 0;
      visibility: visible;
      pointer-events: none;

      transition:
        opacity ${ENTRY_MS}ms ease,
        visibility 0s linear ${ENTRY_MS}ms;
    }

    #lsppt-layer .lsppt-card {
      width: min(100%, 330px);
      padding: 34px 26px 30px;

      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      background: linear-gradient(
        145deg,
        #252e3c,
        #101620
      );

      border: 1px solid rgba(231,195,129,.28);
      border-radius: 24px;

      box-shadow:
        0 26px 75px rgba(0,0,0,.45);

      font: 14px/1.5 system-ui,
        -apple-system, Segoe UI, sans-serif;

      color: #f3e0b9;
    }

    #lsppt-layer .lsppt-logo {
      position: relative;

      width: 64px;
      height: 64px;
      margin: 0 0 25px;

      display: grid;
      place-items: center;

      border: 1px solid rgba(235,205,150,.45);
      border-radius: 50%;

      background: #242e40;

      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    #lsppt-layer .lsppt-logo::before {
      content: "";

      position: absolute;
      inset: -8px;

      border-radius: 50%;
      border: 2px solid transparent;

      border-top-color: #f2d49b;
      border-right-color: rgba(242,212,155,.32);

      animation: lsppt-spin 1.6s linear infinite;
    }

    #lsppt-layer .lsppt-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 1.8px;
    }

    #lsppt-layer .lsppt-sub {
      margin-top: 10px;

      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.6px;

      color: #bbc2cf;
    }

    #lsppt-layer .lsppt-track {
      width: 100%;
      height: 4px;
      margin-top: 27px;

      border-radius: 20px;
      overflow: hidden;

      background: rgba(255,255,255,.12);
    }

    #lsppt-layer .lsppt-bar {
      width: 35%;
      height: 100%;

      border-radius: 20px;

      background: linear-gradient(
        90deg,
        #a67d46,
        #f4d89f,
        #ab7e47
      );

      box-shadow:
        0 0 13px rgba(242,211,147,.45);

      animation:
        lsppt-slide 1.2s ease-in-out infinite;
    }

    #lsppt-layer .lsppt-text {
      margin-top: 16px;
      font-size: 12px;
      color: #aeb7c6;
    }

    @keyframes lsppt-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes lsppt-slide {
      from {
        transform: translateX(-110%);
      }

      to {
        transform: translateX(300%);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #lsppt-layer,
      #lsppt-layer *,
      #lsppt-layer *::before {
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
      "Đang chuyển trang"
    );

    layer.innerHTML = `
      <div class="lsppt-card">

        <div class="lsppt-logo">
          LP
        </div>

        <div class="lsppt-title">
          LIVESTREAM PRO
        </div>

        <div class="lsppt-sub">
          ĐANG CHUYỂN TRANG
        </div>

        <div class="lsppt-track">
          <div class="lsppt-bar"></div>
        </div>

        <div class="lsppt-text">
          Đang mở trang mới...
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
      options.label || "Đang mở trang mới...";

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
