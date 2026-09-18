'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, ShieldAlert, Sparkles, FileText, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPROVAL_REQUIRED':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case 'JOB_DISCOVERED':
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'RESUME_READY':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'APPLICATION_SUBMITTED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-indigo-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-96 glass-panel rounded-2xl shadow-2xl z-50 p-4 border border-slate-700/60 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-sm text-white">Live Activity Feed</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {unreadCount} unread
              </span>
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 my-2 pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No notifications right now.</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`py-3 px-2 rounded-xl transition-colors ${
                      n.isRead ? 'opacity-70 hover:opacity-100 hover:bg-slate-800/30' : 'bg-slate-800/40 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 shrink-0">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white leading-snug">{n.title}</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                        <div className="flex items-center justify-between mt-2 pt-1">
                          {n.actionUrl && (
                            <Link
                              href={n.actionUrl}
                              onClick={() => {
                                markRead(n.id);
                                setIsOpen(false);
                              }}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                            >
                              Review & Action →
                            </Link>
                          )}
                          {!n.isRead && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 ml-auto"
                            >
                              <Check className="w-3 h-3" /> Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
