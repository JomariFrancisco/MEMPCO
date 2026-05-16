'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import './ServicesSection.css';

const SERVICES = [
  {
    number: '01',
    title: 'Savings & Credit',
    description:
      'Core financial services designed to help members build savings, access reliable credit, and support long-term financial stability.',
    groups: [
      { label: 'Savings', items: ['Regular Savings', 'KKT', 'Time Deposit'] },
      { label: 'Loan', items: ['Business Loan', 'Providential Loan'] },
    ],
    logos: [
      {
        src: '/Savings/RegularSavingsPassbook.png',
        alt: 'Regular Savings Passbook',
      },
      {
        src: '/Savings/KKTPassbook.png',
        alt: 'KKT Passbook',
      },
      {
        src: '/Savings/TimeDeposit.png',
        alt: 'Time Deposit Passbook',
      },
    ],
  },
  {
    number: '02',
    title: 'Allied Services',
    description:
      'Support services that provide added convenience, protection, and practical assistance for members beyond financial offerings.',
    groups: [
      {
        label: 'Services',
        items: ['Insurance', 'Transportation', 'Funeral', 'Wellness & Diagnostics'],
      },
    ],
    logos: [
      {
        src: '/Services/COOPAssurance.png',
        alt: 'COOP Assurance',
      },
      {
        src: '/Services/LHFDM%20LOGO.png',
        alt: 'LHFDM Logo',
      },
    ],
  },
  {
    number: '03',
    title: 'MEMPCO Laboratory Cooperative',
    titleClass: 'service-card__title--locked',
    description:
      'Programs that encourage youth participation, savings discipline, and cooperative learning for future-ready members and communities.',
    groups: [
      { label: 'Programs', items: ['Aflatoun Savings', 'Youth Savings'] },
    ],
    logos: [
      {
        src: '/MLC/MLC.png',
        alt: 'MEMPCO Laboratory Cooperative',
      },
    ],
  },
];

const STATS = [
  { value: '3', label: 'Service Pillars' },
  { value: '11', label: 'Services' },
  { value: '12', label: 'Branch Offices' },
];

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7h9M7.5 3.5 11 7l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ServicesSection() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="services"
      className={`services-section ${isVisible ? 'visible' : ''}`}
    >
      <div className="services-section__grid" aria-hidden="true" />
      <div className="services-section__glow" aria-hidden="true" />

      <div className="services-shell">
        <div className="services-header">
          <p className="services-eyebrow">MEMPCO Services</p>

          <h2 className="section-title">
            <span className="section-title-main">Our</span> <em>Services</em>
          </h2>

          <p className="services-subtitle">
            MEMPCO provides dependable and member-centered services that support
            financial growth, daily essentials, and cooperative development
            through a cleaner and more unified service structure.
          </p>

          <div className="services-header-actions">
            <Link href="/services" className="services-header-cta services-header-cta--solid">
              <span>Explore Services</span>
              <span className="services-cta-icon" aria-hidden="true">
                <ArrowIcon />
              </span>
            </Link>

            <Link href="/services" className="services-header-cta services-header-cta--ghost">
              View All
            </Link>
          </div>
        </div>

        <div className="services-stats">
          {STATS.map((s) => (
            <div className="services-stat" key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="services-grid">
          {SERVICES.map((service, index) => (
            <article
              key={service.title}
              className="service-card"
              style={{ transitionDelay: `${0.1 + index * 0.11}s` }}
            >
              <div className="service-card__top">
                <div className="service-card__meta">
                  <span className="service-card__number">{service.number}</span>
                  <span className="service-card__chip">Service Pillar</span>
                </div>

                <div
                  className={`service-card__visual ${
                    service.logos?.length > 1 ? 'service-card__visual--multiple' : ''
                  }`}
                >
                  {service.logos.map((logo) => (
                    <img
                      key={logo.src}
                      className="service-card__logo-img"
                      src={logo.src}
                      alt={logo.alt}
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>

              <div className="service-card__body">
                <h3 className={service.titleClass || ''}>{service.title}</h3>
                <p>{service.description}</p>
              </div>

              <div
                className={`service-card__groups ${
                  service.groups.length > 1 ? 'service-card__groups--split' : ''
                }`}
              >
                {service.groups.map((group) => (
                  <div key={group.label} className="service-card__group">
                    <h4 className="service-card__group-title">{group.label}</h4>

                    <ul className="service-card__list">
                      {group.items.map((item) => (
                        <li key={item}>
                          <span className="service-card__list-dot" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="service-card__footer">
                <Link href="/services" className="service-card__link">
                  View Services <ArrowIcon />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
