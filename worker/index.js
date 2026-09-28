self.addEventListener("push", (event) => {
  const data = event.data?.json?.() ?? { title: "Zola Referrals", body: "A referral requires your attention." };
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url ?? "/inbox" },
    vibrate: [120, 60, 120]
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? "/inbox"));
});
