self.addEventListener("push", event => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Thông báo", body: event.data.text() };
  }

  const title = data.title || "📩 Tin nhắn mới";

  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: data.data || {},
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


self.addEventListener("notificationclick", event => {
  event.notification.close();

  const uid = event.notification.data?.uid;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes("/messages.html")) {
            client.focus();
            return;
          }
        }
        return clients.openWindow("/messages.html");
      })
  );
});
