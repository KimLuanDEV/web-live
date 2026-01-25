(function () {
  const HOME = "/social.html";

  // nếu sessionStorage mất → app vừa được mở lại
  const isFreshLaunch = !sessionStorage.getItem("app_alive");

  // đánh dấu app đang chạy
  sessionStorage.setItem("app_alive", "1");

  // nếu không phải trang social → ép về social
  if (isFreshLaunch && !location.pathname.endsWith("social.html")) {
    location.replace(HOME);
  }
})();



