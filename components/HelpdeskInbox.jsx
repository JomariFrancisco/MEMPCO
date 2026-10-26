'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, Clock3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isClosed } from '@/lib/tickets/workflow.mjs';
import './HelpdeskInbox.css';

const formatTime = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

export default function HelpdeskInbox({ userId, tickets = [], onTicket }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const supabase = useMemo(() => createClient(), []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('user_notifications')
      .select('id,title,message,type,related_ticket_id,is_read,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('[Helpdesk inbox]', error.message);
      return;
    }
    setNotifications((data || []).map((item) => ({ ...item, ticketId: item.related_ticket_id || '' })));
  }, [supabase, userId]);

  useEffect(() => {
    if (!userId) return undefined;
    void refresh();
    const handleFocus = () => void refresh();
    window.addEventListener('focus',handleFocus);
    const channel = supabase
      .channel(`helpdesk-inbox-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}`,
      }, () => void refresh())
      .subscribe();
    return () => { window.removeEventListener('focus',handleFocus); void supabase.removeChannel(channel); };
  }, [refresh, supabase, userId]);

  const overdueItems = useMemo(() => {
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
  }, [tickets]);

  const unreadCount = notifications.filter((item) => !item.is_read).length + overdueItems.length;

  const markRead = async (item) => {
    if (item.due) return;
    const { error } = await supabase.from('user_notifications').update({ is_read: true }).eq('id', item.id).eq('user_id', userId);
    if (error) console.error('[Helpdesk inbox]', error.message);
    setNotifications((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true } : row));
  };

  const markAllRead = async () => {
    const { error } = await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    if (error) {
      console.error('[Helpdesk inbox]', error.message);
      return;
    }
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
  };

  const items = [...overdueItems, ...notifications];

  return (
    <div className="helpdesk-inbox">
      <button type="button" className="helpdesk-inbox-trigger" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && <span className="helpdesk-inbox-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && <section className="helpdesk-inbox-panel" aria-label="Helpdesk inbox">
        <header className="helpdesk-inbox-header">
          <h2>Helpdesk Inbox</h2>
          <button type="button" className="helpdesk-inbox-mark-read" onClick={markAllRead} disabled={!notifications.some((item) => !item.is_read)}>
            <Check size={15} aria-hidden="true" /> Mark all read
          </button>
        </header>
        <div className="helpdesk-inbox-list">
          {!items.length && <p className="helpdesk-inbox-empty">No new activity.</p>}
          {items.map((item) => (
            <button
              type="button"
              className={`helpdesk-inbox-item${item.due || item.type === 'helpdesk_sla_alert' ? ' is-due' : ''}${!item.is_read ? ' is-unread' : ''}`}
              key={item.id}
              onClick={() => { void markRead(item); if (item.ticketId) onTicket?.(item.ticketId); }}
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
      </section>}
    </div>
  );
}
