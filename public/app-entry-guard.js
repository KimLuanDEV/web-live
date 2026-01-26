(function () {
  const HOME  = "/social.html";
  const LOGIN = "/login.html";

  // app bị kill → sessionStorage mất
  const isFreshLaunch = !sessionStorage.getItem("app_alive");

  // đánh dấu app đang chạy
  sessionStorage.setItem("app_alive", "1");

  if (!isFreshLaunch) return;

  // 🔐 kiểm tra đăng nhập
  const auth = JSON.parse(localStorage.getItem("user_profile") || "null");
  const isLoggedIn = auth && auth.uid && !String(auth.uid).startsWith("guest");

  // 👻 guest / chưa login → về login
  if (!isLoggedIn) {
    if (!location.pathname.endsWith("login.html")) {
      location.replace(LOGIN);
    }
    return;
  }

  // 👤 đã login → về social
  if (!location.pathname.endsWith("social.html")) {
    location.replace(HOME);
  }
})();
