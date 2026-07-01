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
  'Social Media': [
    { label: 'Facebook', href: 'https://www.facebook.com/mempco.ph', external: true },
    { label: 'Instagram', href: 'https://www.instagram.com/mempco.ph/', external: true },
    { label: 'YouTube', href: 'https://www.youtube.com/@mempcoph3541', external: true },
    { label: 'TikTok', href: 'https://www.tiktok.com/@mempco.official', external: true },
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
          </div>

          {Object.entries(NAV_LINKS).map(([heading, links]) => (
            <nav key={heading} className="ft-col" aria-label={heading}>
              <p className="ft-col-heading">{heading}</p>
              <ul className="ft-col-list">
                {links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a
                        href={l.href}
                        className="ft-col-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="ft-col-link">
                        {l.label}
                      </Link>
                    )}
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
