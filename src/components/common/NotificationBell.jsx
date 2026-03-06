import { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, BookOpen, ClipboardCheck, FileText } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function NotificationBell({ userId, isDark = true }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    let channel = null;

    const setup = async () => {
      await fetchNotifications();
      await fetchUnreadCount();

      if (!isMounted) return;

      // Subscribe to new notifications
      channel = supabase
        .channel(`notifications-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          if (isMounted) {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        })
        .subscribe();
    };

    setup();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }
  };

  const fetchUnreadCount = async () => {
    const { data, error } = await supabase
      .rpc('get_unread_notification_count');

    if (!error && data !== null) {
      setUnreadCount(data);
    }
  };

  const markAsRead = async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    const { error } = await supabase.rpc('mark_all_notifications_read');

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
    setLoading(false);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'assignment_new':
        return FileText;
      case 'test_completed':
        return ClipboardCheck;
      case 'material_completed':
        return BookOpen;
      default:
        return Bell;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-colors ${
          isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'
        }`}
      >
        <Bell size={20} className={isDark ? 'text-white/70' : 'text-gray-600'} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-pink-vibrant rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-xl z-50 overflow-hidden ${
            isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${
              isDark ? 'border-white/10' : 'border-gray-100'
            }`}>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isDark
                        ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'
                  }`}
                >
                  <X size={16} className={isDark ? 'text-white/50' : 'text-gray-400'} />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className={`py-12 text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(notification => {
                  const Icon = getIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`flex gap-3 px-4 py-3 border-b last:border-b-0 transition-colors ${
                        isDark ? 'border-white/5' : 'border-gray-50'
                      } ${
                        !notification.is_read
                          ? isDark
                            ? 'bg-pink-vibrant/5'
                            : 'bg-indigo-50/50'
                          : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        notification.type === 'assignment_new'
                          ? 'bg-blue-500/20 text-blue-400'
                          : notification.type === 'test_completed'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        <Icon size={18} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {notification.title}
                        </p>
                        <p className={`text-sm mt-0.5 line-clamp-2 ${
                          isDark ? 'text-white/60' : 'text-gray-600'
                        }`}>
                          {notification.message}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                          {formatTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Mark as read */}
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                            isDark
                              ? 'text-white/40 hover:text-white hover:bg-white/[0.05]'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
