self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "Thông báo", body: event.data.text() };
  }

  const title = data.title || "Livestream Pro";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url: data.url || "/messages.html"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
