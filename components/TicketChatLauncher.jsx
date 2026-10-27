'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function TicketChatLauncher({ onClick, unreadCount = 0 }) {
  const buttonRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const modal = document.querySelector('.ticket-action-overlay .ticket-action-modal');
    const footer = modal?.querySelector('.modal-footer');
    if (!button || !footer) return undefined;

    const updateClearance = () => {
      const footerBox = footer.getBoundingClientRect();
      const buttonBox = button.getBoundingClientRect();
      const modalBox = modal.getBoundingClientRect();
      const viewportWidth = document.documentElement.getBoundingClientRect().width || window.innerWidth;
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
      const outsideSpace = viewportWidth - modalBox.right;
      const edgePadding = 2;
      const modalGap = 2;
      const canClearModal = outsideSpace >= buttonBox.width + modalGap + edgePadding;
      button.style.setProperty('visibility', canClearModal ? 'visible' : 'hidden', 'important');
      const targetLeft = canClearModal
        ? modalBox.right + modalGap
        : viewportWidth - buttonBox.width - edgePadding;
      const left = targetLeft;
      const top = viewportHeight - 16 - buttonBox.height;
      const overlapsFooter = left < footerBox.right && left + buttonBox.width > footerBox.left
        && top < footerBox.bottom && top + buttonBox.height > footerBox.top;
      const bottom = overlapsFooter ? viewportHeight - footerBox.top + 12 : 16;
      button.style.setProperty('--ticket-chat-right', `${Math.max(edgePadding, viewportWidth - targetLeft - buttonBox.width)}px`);
      button.style.setProperty('--ticket-chat-bottom', `${Math.max(16, bottom)}px`);
    };
    const observer = new ResizeObserver(updateClearance);
    observer.observe(footer);
    observer.observe(modal);
    window.addEventListener('resize', updateClearance);
    updateClearance();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateClearance);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal((
    <button ref={buttonRef} type="button" className="ticket-chat-launcher ticket-chat-launcher-standalone" onClick={onClick}
      aria-label="Open ticket conversation" title="Open ticket conversation">
      <MessageCircle className="admin-mono-icon" aria-hidden="true" />
      {unreadCount > 0 && <span>{unreadCount}</span>}
    </button>
  ), document.body);
}
