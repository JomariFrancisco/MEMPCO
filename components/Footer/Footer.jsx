'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import './Footer.css';

const NAV_LINKS = {
  About: [
    { label: 'About Us', href: '/about' },
    { label: 'Branches', href: '/branches' },
    { label: 'Governance', href: '/governance' },
    { label: 'News & Events', href: '/news' },
  ],
  Services: [
    { label: 'All Services', href: '/services' },
    { label: 'Regular Savings', href: '/services/savings/regular-savings' },
    { label: 'KKT Savings', href: '/services/savings/kkt' },
    { label: 'Business Loan', href: '/services/loans/business-loan' },
    { label: 'Aflatoun Savings', href: '/services/savings/aflatoun-savings' },
  ],
  Portals: [
    { label: 'Employee Portal', href: '/employee' },
    { label: 'Careers', href: '/jobs' },
  ],
};

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
    href: '#',
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
    href: 'https://www.tiktok.com/@mempco.official?_r=1&_d=secCgYIASAHKAESPgo8tPvx%2Bk%2Bluj%2FeTryqe9LYjzOP1uhDkQT5BJqBEEYcU1jm8DMaSSNQ92AKKm2h0ITg2GA46clQ5DVZJDuiGgA%3D&_svg=1&checksum=9544e60cb4f427d649fb87aa810a8bbab26eda1ad8064125b4485fd6904c412a&item_author_type=2&reflow_sign_scene=7&rgssign=8.1.q4Mtv6uzODteqMYUXBFNog&sec_uid=MS4wLjABAAAAUQU6L7zyATND89CB4gcR7HQWJviV6CI6sGGFn2PeNqkvV6SwBC8f26CWuP0Afwx3&sec_user_id=MS4wLjABAAAAWa-V2VIlwEZb_B2zbQNzA-57TN5o3IeI8gpZga-ZSoPr68Ebv0x7lyVXIAbzO6cK&share_app_id=1180&share_author_id=7462995897732727828&share_link_id=04EFD4AB-1A61-41C9-95D4-3DC768AB22BD&share_region=PH&share_scene=1&sharer_language=en&social_share_type=5&source=h5_t&timestamp=1776761699&tt_from=copy&u_code=46g6igj4cc2db&ug_btm=b6880%2Cb5836&user_id=94050454287826945',
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
        <div className="ft-top">
          <div className="ft-brand">
            <span className="ft-logo">MEMPCO</span>
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
                    <Link href={l.href} className="ft-col-link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="ft-col">
            <p className="ft-col-heading">Contact</p>
            <ul className="ft-col-list ft-contact-list">
              <li>
                <a href="mailto:inquiries@mempco.com" className="ft-col-link">
                  inquiries@mempco.com
                </a>
              </li>
              <li>
                <a href="tel:+639000000000" className="ft-col-link">
                  +639 000-0000-000
                </a>
              </li>
              <li className="ft-col-address">
                3D-3E HC Marketing Bldg,
                <br />
                Veterans Avenue,
                <br />
                Zamboanga City, Philippines
              </li>
            </ul>
          </div>
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