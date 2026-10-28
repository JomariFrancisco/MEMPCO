'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Clock3, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isClosed } from '@/lib/tickets/workflow.mjs';
import { EMPLOYEE_NOTIFICATION_TYPES, employeeTicketNotification } from '@/lib/tickets/notifications.mjs';
import './HelpdeskInbox.css';

const formatTime = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

export default function HelpdeskInbox({ userId, tickets = [], onTicket, audience = 'admin' }) {
  const employee = audience === 'employee';
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [position, setPosition] = useState(null);
  const [seenReminders, setSeenReminders] = useState([]);
  const savingRef = useRef(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const requestId = useRef(0);
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const audioUnlockingRef = useRef(false);
  const knownNotificationsRef = useRef({ userId: null, ids: new Set() });
  const panelId = useId();
  const supabase = useMemo(() => createClient(), []);

  const playNotificationSound = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUnlockedRef.current) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Don't replay a notification sound later as a side effect of opening the inbox.
      audioUnlockedRef.current = false;
    });
  }, []);

  useEffect(() => {
    const audio = new Audio('/Notification/notifcation%20sound.wav');
    audio.preload = 'auto';
    audio.volume = 0.65;
    audioRef.current = audio;
    audioUnlockedRef.current = false;
    audioUnlockingRef.current = false;

    const unlockAudio = () => {
      if (audioRef.current !== audio || audioUnlockedRef.current || audioUnlockingRef.current) return;

      const originalVolume = audio.volume;
      audioUnlockingRef.current = true;
      audio.volume = 0;
      void audio.play().then(() => {
        if (audioRef.current !== audio) return;
        audio.pause();
        audio.currentTime = 0;
        audio.volume = originalVolume;
        audioUnlockedRef.current = true;
        audioUnlockingRef.current = false;
      }).catch(() => {
        if (audioRef.current === audio) {
          audio.volume = originalVolume;
          audioUnlockingRef.current = false;
        }
      });
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      audioRef.current = null;
      audioUnlockedRef.current = false;
      audioUnlockingRef.current = false;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [userId, playNotificationSound]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const current = ++requestId.current;
    try {
      let query = supabase.from('user_notifications')
        .select('id,title,message,type,related_ticket_id,is_read,created_at').eq('user_id', userId);
      if (employee) query = query.in('type', EMPLOYEE_NOTIFICATION_TYPES);
      const { data, error: queryError } = await query.order('created_at', { ascending: false }).limit(100);
      if (current !== requestId.current) return;
      if (queryError) throw queryError;
      const rows = employee ? (data || []).map(employeeTicketNotification).filter(Boolean)
        : (data || []).map((item) => ({ ...item, ticketId: item.related_ticket_id || '' }));
      const known = knownNotificationsRef.current;
      // Treat the first successful load as a baseline, so old unread items
      // do not play a sound on login or page reload.
      const hasNewUnread = known.userId === userId
        && rows.some((item) => !item.is_read && !known.ids.has(item.id));
      const ids = known.userId === userId ? known.ids : new Set();
      rows.forEach((item) => ids.add(item.id));
      knownNotificationsRef.current = { userId, ids };
      if (hasNewUnread) playNotificationSound();
      setNotifications(rows);
      setError('');
      return rows;
    } catch (failure) {
      if (current !== requestId.current) return;
      console.error('[Helpdesk inbox]', failure.message);
      setError('Notifications could not be loaded. Please try again.');
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [supabase, userId, employee, playNotificationSound]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(`helpdesk-seen-reminders-${userId}`) || '[]');
      setSeenReminders(Array.isArray(stored) ? stored : []);
    } catch { setSeenReminders([]); }
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    setNotifications([]);
    setLoading(true);
    void refresh();
    const handleFocus = () => void refresh();
    window.addEventListener('focus',handleFocus);
    const poll = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60000);
    const channel = supabase
      .channel(`helpdesk-inbox-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}`,
      }, () => void refresh())
      .subscribe((status) => { if (status === 'SUBSCRIBED') void refresh(); });
    return () => { requestId.current++; window.clearInterval(poll); window.removeEventListener('focus',handleFocus); void supabase.removeChannel(channel); };
  }, [refresh, supabase, userId]);

  useLayoutEffect(() => {
    if (!open) { setPosition(null); return undefined; }
    const placePanel = () => {
      const box = triggerRef.current.getBoundingClientRect();
      const width = Math.min(380, window.innerWidth - 24);
      const top = Math.max(12, Math.min(box.bottom + 8, window.innerHeight - 100));
      setPosition({ width, left: Math.max(12, Math.min(box.right - width, window.innerWidth - width - 12)), top,
        maxHeight: Math.min(540, window.innerHeight - top - 12) });
    };
    placePanel();
    const onScroll = (event) => { if (!panelRef.current?.contains(event.target)) placePanel(); };
    window.addEventListener('resize', placePanel);
    window.addEventListener('scroll', onScroll, true);
    return () => { window.removeEventListener('resize', placePanel); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  const panelVisible = Boolean(position);
  useEffect(() => {
    if (!open || !panelVisible) return undefined;
    panelRef.current?.focus();
    const outside = (event) => {
      if (!panelRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open, panelVisible]);

  const overdueItems = useMemo(() => {
    if (employee) return [];
    const now = Date.now();
    return tickets.flatMap((ticket) => {
      if (isClosed(ticket.status)) return [];
      const items = [];
      const burnoutStart = new Date(ticket.burnoutStartedAt || '').getTime();
      if (ticket.supportCategory?.toLowerCase() === 'burnout' && ticket.status?.toLowerCase() === 'under burnout' && Number.isFinite(burnoutStart)) {
        const elapsedDays = (now-burnoutStart)/86400000;
        if (elapsedDays >= 5) items.push({ id: `${ticket.id}-burnout-target`, ticketId: ticket.id, title: 'Burnout reached 5-day target', message: `${ticket.ticketCode || ticket.id} is ready for its Burnout evaluation.`, createdAt: ticket.burnoutStartedAt, due: true });
        else if (elapsedDays >= 3) items.push({ id: `${ticket.id}-burnout-minimum`, ticketId: ticket.id, title: 'Burnout reached 3-day minimum', message: `${ticket.ticketCode || ticket.id} can be evaluated against the recorded test checklist.`, createdAt: ticket.burnoutStartedAt, due: true });
      }
      return items;
    });
  }, [tickets, employee]);

  const reminderKey = (item) => `${item.id}:${item.createdAt || ''}`;
  const reminders = overdueItems.map((item) => ({ ...item, is_read: seenReminders.includes(reminderKey(item)) }));
  const unreadCount = notifications.filter((item) => !item.is_read).length + reminders.filter((item) => !item.is_read).length;

  const markRemindersRead = (items) => {
    setSeenReminders((current) => {
      const next = [...new Set([...current, ...items.map(reminderKey)])];
      try { window.localStorage.setItem(`helpdesk-seen-reminders-${userId}`, JSON.stringify(next)); } catch { /* Keep session read state when storage is unavailable. */ }
      return next;
    });
  };

  const markRead = async (item) => {
    if (item.is_read) return;
    if (item.due) { markRemindersRead([item]); return; }
    const { error } = await supabase.from('user_notifications').update({ is_read: true }).eq('id', item.id).eq('user_id', userId);
    if (error) { console.error('[Helpdesk inbox]', error.message); setError('This notification could not be marked as read. Please try again.'); return; }
    setNotifications((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true } : row));
  };

  const markAllRead = async (rows = notifications) => {
    markRemindersRead(overdueItems);
    const unreadIds = rows.filter((item) => !item.is_read).map((item) => item.id);
    if (!unreadIds.length || savingRef.current || !userId) return;
    savingRef.current = true;
    setNotifications((current) => current.map((item) => unreadIds.includes(item.id) ? { ...item, is_read: true } : item));
    try {
      const { error: updateError } = await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', userId).in('id', unreadIds);
      if (updateError) throw updateError;
      setError('');
    } catch (failure) {
      setNotifications((current) => current.map((item) => unreadIds.includes(item.id) ? { ...item, is_read: false } : item));
      console.error('[Helpdesk inbox]', failure.message);
      setError('Notifications could not be marked as read. Please try again.');
    } finally {
      savingRef.current = false;
    }
  };

  const openInbox = async () => {
    setOpen(true);
    await markAllRead();
    const rows = await refresh();
    if (rows) await markAllRead(rows);
  };

  const items = [...reminders, ...notifications];

  return (
    <div className="helpdesk-inbox">
      <button ref={triggerRef} type="button" className="helpdesk-inbox-trigger" title="Notifications"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined} aria-expanded={open}
        onClick={() => { if (open) setOpen(false); else void openInbox(); }}>
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && <span className="helpdesk-inbox-count" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && position && createPortal(<section ref={panelRef} id={panelId} style={position} className="helpdesk-inbox-panel" role="dialog"
        tabIndex={-1} aria-label={employee ? 'Your ticket notifications' : 'Helpdesk inbox'}>
        <header className="helpdesk-inbox-header">
          <h2>{employee ? 'Notifications' : 'Helpdesk Inbox'}</h2>
        </header>
        {error && <div className="helpdesk-inbox-error app-error-alert" role="alert"><span>{error}</span>
          <button type="button" onClick={refresh} aria-label="Retry notifications" title="Retry notifications"><RefreshCw size={16} aria-hidden="true" /></button>
        </div>}
        <div className="helpdesk-inbox-list" aria-busy={loading}>
          {loading && !items.length ? <p className="helpdesk-inbox-empty" role="status">Loading notifications...</p>
            : !items.length && !error && <p className="helpdesk-inbox-empty">{employee ? 'No ticket updates yet.' : 'No new activity.'}</p>}
          {items.map((item) => (
            <button
              type="button"
              className={`helpdesk-inbox-item${item.due || item.type === 'helpdesk_sla_alert' ? ' is-due' : ''}${!item.is_read ? ' is-unread' : ''}`}
              key={item.id}
              onClick={() => { void markRead(item); setOpen(false); if (item.ticketId) onTicket?.(item.ticketId, item); }}
            >
              {item.due || item.type === 'helpdesk_sla_alert' ? <Clock3 size={17} aria-hidden="true" /> : <Bell size={17} aria-hidden="true" />}
              <span className="helpdesk-inbox-item-copy">
                <strong>{item.title}</strong>
                <span>{item.message}</span>
                <time dateTime={item.created_at || item.createdAt}>{formatTime(item.created_at || item.createdAt)}</time>
              </span>
            </button>
          ))}
        </div>
      </section>, document.body)}
    </div>
  );
}
