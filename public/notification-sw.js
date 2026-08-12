self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      if (windows.length) return windows[0].navigate(targetUrl).then((client) => client?.focus());
      return self.clients.openWindow(targetUrl);
    }),
  );
});
