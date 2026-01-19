self.addEventListener("push", (e) => {
  if (!e.data) return;

  const data = e.data.json();

  e.waitUntil(
    self.registration.showNotification(data.title || "Thông báo", {
      body: data.body || "",
      icon: data.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/messages.html" }
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  const url = e.notification.data?.url || "/messages.html";

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
