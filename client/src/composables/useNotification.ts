import { ref } from 'vue';

const isSupported = ref(false);
const permission = ref<NotificationPermission>('default');

/** Composable for managing desktop push notifications */
export function useNotification() {
  function init() {
    isSupported.value = 'Notification' in window;
    if (isSupported.value) {
      permission.value = Notification.permission;
    }
  }

  async function requestPermission(): Promise<boolean> {
    if (!isSupported.value) return false;

    const result = await Notification.requestPermission();
    permission.value = result;
    return result === 'granted';
  }

  function showNotification(title: string, options?: NotificationOptions) {
    if (!isSupported.value || permission.value !== 'granted') return;

    /* Only show notification if the tab is not focused */
    if (document.hasFocus()) return;

    const notification = new Notification(title, {
      icon: '/vite.svg',
      badge: '/vite.svg',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }

  /** Show a notification for a new message */
  function notifyNewMessage(senderName: string, content: string, channelName: string) {
    showNotification(`${senderName} in #${channelName}`, {
      body: content.length > 100 ? content.slice(0, 100) + '...' : content,
      tag: `message-${channelName}`,
    });
  }

  return {
    isSupported,
    permission,
    init,
    requestPermission,
    showNotification,
    notifyNewMessage,
  };
}
