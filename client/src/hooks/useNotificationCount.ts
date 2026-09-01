import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Hook to get real-time unread notification count
 * Uses aggressive polling (5 seconds) for near real-time updates
 * Can be upgraded to WebSocket in the future for true real-time
 */
export function useNotificationCount() {
  const utils = trpc.useUtils();
  const [unreadCount, setUnreadCount] = useState(0);

  // Query with polling interval (10 seconds — balanced between freshness and server load)
  const { data: notifData, isLoading } = trpc.notifications.list.useQuery(
    { unreadOnly: true },
    {
      refetchInterval: 10000, // Poll every 10 seconds
      refetchIntervalInBackground: false, // Stop polling when tab is not focused
      staleTime: 5000, // Data is considered fresh for 5 seconds
      retry: false, // Don't retry on failure — next poll will recover automatically
    }
  );

  // Update count whenever notification data changes
  useEffect(() => {
    if (notifData && Array.isArray(notifData)) {
      const count = notifData.length;
      setUnreadCount(count);
    }
  }, [notifData]);

  /**
   * Invalidate the notification cache to trigger immediate refresh
   * Call this after creating a new notification or marking one as read
   */
  const refreshNotifications = async () => {
    await utils.notifications.list.invalidate();
  };

  return {
    unreadCount,
    isLoading,
    refreshNotifications,
  };
}
