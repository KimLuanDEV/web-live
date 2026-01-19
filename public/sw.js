self.addEventListener("push", e => {
  const data = e.data?.json() || {};

  self.registration.showNotification(
    data.title || "Tin nhắn mới",
    {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: data.url || "/messages.html"
    }
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.openWindow(e.notification.data)
  );
});
