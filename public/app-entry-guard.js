
/* ==========================================
   LIVESTREAM PRO
   APP ENTRY GUARD - FIX REDIRECT
========================================== */

(function () {
  "use strict";

  const HOME = "/social.html";
  const LOGIN = "/login.html";

  const path = location.pathname.toLowerCase();

  // Các trang có thể truy cập trước đăng nhập.
  const PUBLIC_PAGES = new Set([
    "/",
    "/index.html",
    "/login.html",
    "/register.html"
  ]);

  // Đánh dấu ứng dụng đang hoạt động.
  sessionStorage.setItem("app_alive", "1");

  // Không ép trang hiện tại về Social.
  // Mỗi trang được điều hướng theo đúng chức năng.

  if (PUBLIC_PAGES.has(path)) {
    return;
  }

  // Kiểm tra dữ liệu đăng nhập hiện có.
  let auth = null;

  try {
    auth = JSON.parse(
      localStorage.getItem("user_profile") || "null"
    );
  } catch (error) {
    auth = null;
  }

  const isLoggedIn =
    auth &&
    typeof auth.uid === "string" &&
    auth.uid.trim() !== "" &&
    !auth.uid.toLowerCase().startsWith("guest");

  // Chưa đăng nhập: chuyển về trang Login.
  if (!isLoggedIn) {
    location.replace(LOGIN);
    return;
  }

  // Đã đăng nhập: giữ nguyên trang hiện tại.
  // Không tự động đưa về /social.html.

})();
