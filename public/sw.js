self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "Livestream Pro", body: event.data.text() };
  }

  const title = data.title || "Livestream Pro";

  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",

    // 🔥 GIỮ TOÀN BỘ DATA PUSH
    data: {
      url: data.url || "/messages.html",
      type: data.data?.type || null,
      fromUid: data.data?.fromUid || null
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


// 👉 CLICK PUSH → MỞ ĐÚNG CHAT
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const { url, type, fromUid } = event.notification.data || {};

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {

        // 1️⃣ NẾU WEB ĐÃ MỞ → FOCUS + POST MESSAGE
        for (const client of clientList) {
          if (client.url.includes("/messages")) {
            client.focus();

            if (type === "chat" && fromUid) {
              client.postMessage({
                type: "open-chat",
                fromUid
              });
            }

            return;
          }
        }

        // 2️⃣ CHƯA MỞ → OPEN MỚI
        if (type === "chat" && fromUid) {
          return clients.openWindow(
            `/messages.html?openChat=${fromUid}`
          );
        }

        // fallback
        return clients.openWindow(url || "/messages.html");
      })
  );
});
