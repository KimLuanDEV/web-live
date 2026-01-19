self.addEventListener("push", e => {
  if (!e.data) return;

  const data = e.data.json();

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: data.data   // 👈 QUAN TRỌNG
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url || "/messages.html";
  e.waitUntil(clients.openWindow(url));
});
