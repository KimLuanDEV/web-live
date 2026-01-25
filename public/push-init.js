// push-init.js
(async function initPushGlobal() {
  try {
    if (!("serviceWorker" in navigator)) return;

    const auth = JSON.parse(localStorage.getItem("user_profile") || "{}");
    if (!auth?.uid) return;

    const reg = await navigator.serviceWorker.getRegistration()
      || await navigator.serviceWorker.register("/sw.js");

    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;

      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BPG9kTxtU0Fso5VZqUFhqn_ZZLvTeKM32km3pLDnH2UCdKce-owuTMZ5PLzrKyrw_patHMVavHdDM4axJ7L9N7E"
      });
    }

    // 🔥 UPSERT LÊN SERVER MỖI LẦN LOAD
    await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: auth.uid, sub })
    });

    console.log("🔔 Push ready for", auth.uid);
  } catch (e) {
    console.warn("Push init skipped:", e);
  }
})();
