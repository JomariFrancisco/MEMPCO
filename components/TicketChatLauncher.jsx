'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function TicketChatLauncher({ onClick, unreadCount = 0, className = '' }) {
  const launcherRef = useRef(null);

  useIsomorphicLayoutEffect(() => {
    if (!className.split(/\s+/).includes('ticket-modal-floating-launcher')) return undefined;

    const launcher = launcherRef.current;
    if (!launcher) return undefined;

    const placeBesideModal = () => {
      const modal = document.querySelector('.ticket-action-overlay .ticket-action-modal');
      if (!modal) return;

      const modalRect = modal.getBoundingClientRect();
      const launcherRect = launcher.getBoundingClientRect();
      const launcherWidth = launcherRect.width || launcher.offsetWidth || 48;
      const launcherHeight = launcherRect.height || launcher.offsetHeight || 48;
      const bodyScrollLocked = document.body.style.overflow === 'hidden'
        && document.documentElement.style.overflow === 'hidden';
      const scrollLockCompensation = bodyScrollLocked
        ? Number.parseFloat(document.body.style.paddingRight) || 0
        : 0;
      const scrollbarGap = Math.max(
        window.innerWidth - document.documentElement.clientWidth,
        scrollLockCompensation,
      );
      const viewportWidth = window.innerWidth - scrollbarGap;
      const viewportHeight = window.innerHeight;
      const horizontalGutter = 0;
      const verticalGutter = 12;
      const gap = 12;
      const rightSpace = Math.max(0, viewportWidth - modalRect.right - horizontalGutter);
      const leftSpace = Math.max(0, modalRect.left);

      let left;
      if (rightSpace >= launcherWidth) {
        left = modalRect.right + (rightSpace - launcherWidth) / 2;
      } else if (leftSpace >= launcherWidth) {
        left = (leftSpace - launcherWidth) / 2;
      } else {
        left = Math.max(horizontalGutter, viewportWidth - launcherWidth - horizontalGutter);
      }
      const top = Math.max(
        verticalGutter,
        Math.min(viewportHeight - launcherHeight - verticalGutter, modalRect.bottom - launcherHeight - gap),
      );

      launcher.style.setProperty('position', 'fixed', 'important');
      launcher.style.setProperty('inset', 'auto', 'important');
      launcher.style.setProperty('left', `${left}px`, 'important');
      launcher.style.setProperty('right', 'auto', 'important');
      launcher.style.setProperty('top', `${top}px`, 'important');
      launcher.style.setProperty('bottom', 'auto', 'important');
    };

    placeBesideModal();
    const animationFrame = window.requestAnimationFrame(placeBesideModal);
    window.addEventListener('resize', placeBesideModal);
    window.addEventListener('scroll', placeBesideModal, true);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(placeBesideModal)
      : null;
    const modal = document.querySelector('.ticket-action-overlay .ticket-action-modal');
    if (modal) resizeObserver?.observe(modal);
    resizeObserver?.observe(launcher);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', placeBesideModal);
      window.removeEventListener('scroll', placeBesideModal, true);
      resizeObserver?.disconnect();
    };
  }, [className]);

  return (
    <button
      ref={launcherRef}
      type="button"
      className={`ticket-chat-launcher ticket-chat-header-toggle ${className}`.trim()}
      onClick={onClick}
      aria-label={unreadCount > 0 ? `Open ticket conversation, ${unreadCount} unread messages` : 'Open ticket conversation'}
      title={unreadCount > 0 ? `Open conversation (${unreadCount} unread)` : 'Open conversation'}
    >
      <MessageCircle className="admin-mono-icon" aria-hidden="true" />
      <span className="ticket-chat-launcher-label">Conversation</span>
      {unreadCount > 0 && (
        <span className="ticket-chat-unread-count" aria-hidden="true">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
