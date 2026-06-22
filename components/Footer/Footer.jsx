'use client';

import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './Footer.css';

const NAV_LINKS = {
  Cooperative: [
    { label: 'About Us', href: '/about' },
    { label: 'Branches', href: '/branches' },
    { label: 'Governance', href: '/governance' },
    { label: 'News & Events', href: '/news' },
  ],
  Services: [
    { label: 'All Services', href: '/services' },
    { label: 'Regular Savings', href: '/services/savings/regular-savings' },
    { label: 'Insurance', href: '/services/insurance' },
    { label: 'Funeral', href: '/services/funeral' },
  ],
  Access: [
    { label: 'Careers', href: '/jobs' },
  ],
};

const CONTACT_INFO = [
  {
    label: 'Call Us',
    value: '(062) 991-7772',
    href: 'tel:+63629917772',
    Icon: Phone,
  },
  {
    label: 'Email Us',
    value: 'inquiries@mempco.coop',
    href: 'mailto:inquiries@mempco.coop',
    Icon: Mail,
  },
  {
    label: 'Our Location',
    value: '3D-3E HC Marketing Bldg. Veterans Avenue, Zamboanga City 7000',
    href: '/branches',
    Icon: MapPin,
  },
  {
    label: 'Working Hours',
    value: 'Mon - Fri 08:00am - 05:00pm',
    Icon: Clock,
  },
];

const SOCIAL = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/mempco.ph',
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5 21v-7h2.3l.4-3h-2.7V9.2c0-.9.3-1.6 1.6-1.6H16V5.1c-.3 0-.9-.1-1.8-.1-2.7 0-4.4 1.6-4.4 4.6V11H7v3h2.8v7h3.7Z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/mempco.ph/',
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.95 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@mempcoph3541',
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.58 7.19a2.99 2.99 0 0 0-2.1-2.12C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.48.47A2.99 2.99 0 0 0 2.42 7.2C1.95 9 1.95 12 1.95 12s0 3 .47 4.81a2.99 2.99 0 0 0 2.1 2.12c1.78.47 7.48.47 7.48.47s5.7 0 7.48-.47a2.99 2.99 0 0 0 2.1-2.12c.47-1.81.47-4.81.47-4.81s0-3-.47-4.8ZM10.1 15.03V8.97L15.5 12l-5.4 3.03Z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@mempco.official',
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M14.5 2h2.45c.2 1.67 1.18 3.23 2.72 4.07.9.49 1.88.73 2.83.76v2.54a8.05 8.05 0 0 1-4.55-1.39v6.22c0 3.45-2.8 6.25-6.25 6.25s-6.25-2.8-6.25-6.25 2.8-6.25 6.25-6.25c.36 0 .71.03 1.05.09v2.59a3.7 3.7 0 0 0-1.05-.15 3.72 3.72 0 1 0 0 7.44 3.72 3.72 0 0 0 3.72-3.72V2Z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = footerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className={`ft${isVisible ? ' ft--visible' : ''}`}
    >
      <div className="ft-grid" aria-hidden="true" />
      <div className="ft-glow" aria-hidden="true" />

      <div className="ft-inner">
        <div className="ft-contact-strip" aria-label="MEMPCO contact details">
          {CONTACT_INFO.map(({ label, value, href, Icon }) => {
            const content = (
              <>
                <span className="ft-contact-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <span className="ft-contact-copy">
                  <span className="ft-contact-label">{label}</span>
                  <span className="ft-contact-value">{value}</span>
                </span>
              </>
            );

            if (!href) {
              return (
                <div key={label} className="ft-contact-item">
                  {content}
                </div>
              );
            }

            return href.startsWith('/') ? (
              <Link key={label} href={href} className="ft-contact-item">
                {content}
              </Link>
            ) : (
              <a key={label} href={href} className="ft-contact-item">
                {content}
              </a>
            );
          })}
        </div>

        <div className="ft-top">
          <div className="ft-brand">
            <img src="/Logos/L1.png" alt="MEMPCO" className="ft-logo-image" />
            <p className="ft-tagline">
              Empowering members through trusted cooperative services and
              sustainable community growth.
            </p>

            <div className="ft-social" role="list" aria-label="Social media">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="ft-social-btn"
                  aria-label={s.label}
                  role="listitem"
                  {...(s.external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(NAV_LINKS).map(([heading, links]) => (
            <nav key={heading} className="ft-col" aria-label={heading}>
              <p className="ft-col-heading">{heading}</p>
              <ul className="ft-col-list">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="ft-col-link"
                      {...(l.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

        </div>

        <div className="ft-bottom">
          <p className="ft-copy">
            &copy; {currentYear} MEMPCO. All rights reserved.
          </p>
          <div className="ft-legal">
            <Link href="#" className="ft-legal-link">Privacy Policy</Link>
            <span className="ft-legal-sep" aria-hidden="true" />
            <Link href="#" className="ft-legal-link">Terms of Use</Link>
            <span className="ft-legal-sep" aria-hidden="true" />
            <Link href="#" className="ft-legal-link">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
