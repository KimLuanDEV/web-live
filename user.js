window.USER_CTX = (function(){
  const raw = localStorage.getItem("ls_user");

  if (raw) {
    try {
      const u = JSON.parse(raw);
      return {
        mode: "AUTH",
        name: u.name,
        avatar: u.avatar,
        uid: u.uid || null
      };
    } catch {}
  }

  // GUEST MODE
  const guestId = "guest_" + Math.random().toString(36).slice(2, 8);

  return {
    mode: "ANON",
    name: "Khách",
    avatar: "/guest.png", // hoặc emoji
    uid: guestId
  };
})();
