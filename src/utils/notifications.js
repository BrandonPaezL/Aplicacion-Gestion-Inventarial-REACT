export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("Este navegador no soporta notificaciones");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const sendNotification = (title, options = {}) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: '/logo192.png', // Asegúrate de tener este archivo en public/
      ...options
    });
  }
};
