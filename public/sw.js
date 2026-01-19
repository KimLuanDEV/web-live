self.addEventListener("push", e => {
  if (!e.data) return;

  const data = e.data.json();

  self.registration.showNotification(data.title || "Tin nhắn mới", {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: data.data || {}
  });
});

self.addEventListener("notificationclick", e => {
  e.notification.close();

  const uid = e.notification.data?.uid;

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(list => {
        for (const c of list) {
          if (c.url.includes("/messages.html")) {
            c.focus();
            return;
          }
        }
        return clients.openWindow("/messages.html");
      })
  );
});
