(() => {
  const raw = localStorage.getItem("user_profile");
  const profile = raw ? JSON.parse(raw) : null;

  const path = location.pathname;

  // cho phép login page
  const isLoginPage = path.includes("login");

  // nếu chưa có uid → chỉ được ở login
  if (!profile || !profile.uid) {
    if (!isLoginPage) {
      location.replace("/login.html");
    }
    return;
  }

  // nếu đã login mà còn ở login page → về lobby
  if (isLoginPage) {
    location.replace("/social.html");
    return;
  }

  // keep socket alive
  if (window.socket) {
    socket.emit("auth-ping", { uid: profile.uid });
    setInterval(() => {
      socket.emit("auth-ping", { uid: profile.uid });
    }, 15000);
  }
})();
