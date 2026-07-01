'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import './FuneralPage.css';

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06z" />
  </svg>
);

const heroLinks = [
  {
    id: 'funeral-packages',
    kicker: 'Packages',
    title: 'Browse memorial packages from Rosal to Orquidea.',
  },
  {
    id: 'chapel-services',
    kicker: 'Chapels',
    title: 'View daily chapel rates and chapel inclusions.',
  },
  {
    id: 'urn-viewing',
    kicker: 'Urn viewing',
    title: 'See the recommended setup and service provisions.',
  },
  {
    id: 'additional-services',
    kicker: 'Add-ons',
    title: 'Check additional products and supporting services.',
  },
];

const heroShowcase = [
  {
    name: 'Rosal Package',
    price: 'from ₱29,900',
    text: 'Entry-level package with practical viewing and interment support.',
  },
  {
    name: 'Jasmin Package',
    price: '₱210,000',
    text: 'Premium memorial package with enhanced chapel inclusions.',
  },
  {
    name: 'Orquidea Package',
    price: '₱1,000,000',
    text: 'Top-tier imported casket package with premium service support.',
  },
];

const stats = [
  { value: '7', label: 'Funeral packages' },
  { value: '5', label: 'Chapel rate tiers' },
  { value: '₱6,000', label: 'Necrological service' },
  { value: '24/7', label: 'On-call coordination' },
];

const quickGuide = [
  {
    title: 'Funeral Packages',
    text: 'Structured offerings from standard memorial support to premium full-service packages.',
  },
  {
    title: 'Chapel Services',
    text: 'Daily chapel options with different comfort levels, amenities, and inclusions.',
  },
  {
    title: 'Urn Viewing',
    text: 'A respectful setup for families preferring urn-centered memorial arrangements.',
  },
  {
    title: 'Additional Services',
    text: 'Upgrade options and supporting arrangements for memorial needs.',
  },
];

const packages = [
  {
    id: 'rosal-1',
    tone: '#8A4B1A',
    toneSoft: 'rgba(138, 75, 26, 0.10)',
    abbr: 'ROSAL 1',
    name: 'Rosal 1 Package',
    description:
      'Plain white, wood casket, single top cover, curve cover, and with handle.',
    priceOptions: [
      { id: 'standard', label: 'Standard', value: '₱29,900.00' },
      { id: 'member', label: 'Member-Borrower', value: '₱25,500.00' },
      { id: 'senior', label: 'Senior Citizen & PWD', value: '₱23,920.00' },
      {
        id: 'depositor',
        label: 'Depositor / Dependents / Spot Cash / Insti',
        value: '₱26,910.00',
      },
    ],
    inclusions: [
      'On call 24/7',
      'Dispatch of appropriate transportation of facilities',
      'Wooden casket',
      'Embalming, dressing, and preparation of the deceased for viewing',
      'Standard professional make-up and cosmetics',
      'Home viewing of maximum of 9 days',
      'Transportation of the casket up to 25 km and free transportation to interment site',
      'Hearse',
      'No upgrading of casket',
    ],
    addOns: ['Tarpaulin', 'Casket lettering', 'Guest book', '2 pcs candle'],
  },
  {
    id: 'rosal-2',
    tone: '#A5602B',
    toneSoft: 'rgba(165, 96, 43, 0.10)',
    abbr: 'ROSAL 2',
    name: 'Rosal 2 Package',
    description:
      'Plain white, wood casket, single top and elegant interiors, with silver or gold corners and handle.',
    priceOptions: [
      { id: 'standard', label: 'Standard', value: '₱49,900.00' },
      { id: 'member', label: 'Member-Borrower', value: '₱44,900.00' },
      { id: 'senior', label: 'Senior Citizen & PWD', value: '₱39,920.00' },
      {
        id: 'depositor',
        label: 'Depositor / Dependents / Spot Cash / Insti',
        value: '₱44,910.00',
      },
    ],
    inclusions: [
      'On call 24/7',
      'Dispatch of appropriate transportation of facilities',
      'Wooden casket',
      'Embalming, dressing, and preparation for viewing',
      'Standard professional make-up and cosmetics',
      'Home viewing of maximum of 9 days',
      'Chapel viewing of 4 days',
      'Transportation of the casket to interment site',
      '25 km free transportation to interment site',
      'Hearse',
      'No upgrading of casket',
    ],
    addOns: [
      'Tarpaulin',
      'Casket lettering',
      'Guest book',
      '2 pcs candle',
      '1 casket top flowers',
    ],
  },
  {
    id: 'rosal-3',
    tone: '#B87535',
    toneSoft: 'rgba(184, 117, 53, 0.11)',
    abbr: 'ROSAL 3',
    name: 'Rosal 3 Package',
    description:
      'Plain white, metal casket, single top, full glass with elegant interiors, with silver or gold corners and handle.',
    priceOptions: [
      { id: 'standard', label: 'Standard', value: '₱98,000.00' },
      { id: 'member', label: 'Member-Borrower', value: '₱69,900.00' },
      { id: 'senior', label: 'Senior Citizen & PWD', value: '₱78,400.00' },
      {
        id: 'depositor',
        label: 'Depositor / Dependents / Spot Cash / Insti',
        value: '₱88,200.00',
      },
    ],
    inclusions: [
      'On call 24/7',
      'Dispatch of appropriate transportation of facilities',
      'Metal casket',
      'Embalming, dressing, and preparation of the deceased for viewing',
      'Application of standard professional make-up and cosmetics',
      'Chapel viewing of maximum of 4 days',
      'Home viewing of maximum of 9 days',
      'Transportation of the casket to interment site',
      '25 km free transportation to interment site',
      'No upgrading of casket',
      'Van hearse',
    ],
    addOns: [
      'Tarpaulin',
      'Casket lettering',
      'Guest book',
      '2 pcs candle',
      '1 standee flowers',
      '1 casket top flowers',
    ],
  },
  {
    id: 'dama-de-noche',
    tone: '#7C5137',
    toneSoft: 'rgba(124, 81, 55, 0.10)',
    abbr: 'DAMA',
    name: 'Dama de Noche Package',
    description:
      'Plain white, metal casket, full/half glass, with elegant interiors and silver or gold corners and handle.',
    priceOptions: [
      { id: 'standard', label: 'Standard', value: '₱149,900.00' },
      { id: 'member', label: 'Member-Borrower', value: '₱128,000.00' },
      { id: 'senior', label: 'Senior Citizen & PWD', value: '₱119,920.00' },
      {
        id: 'depositor',
        label: 'Depositor / Dependents / Spot Cash / Insti',
        value: '₱134,910.00',
      },
    ],
    inclusions: [
      'On call 24/7',
      'Dispatch of appropriate transportation of facilities',
      'Embalming, dressing, and preparation of the deceased for viewing',
      'Application of standard professional make-up and cosmetics',
      'Chapel viewing of maximum of 4 days (air conditioned chapel)',
      'Home viewing of maximum of 9 days',
      'Transportation of the casket to interment site',
      '25 km free transportation to interment site',
      'Pick up hearse',
    ],
    addOns: [
      'Flower arrangement',
      'Necrological service',
      'Tarpaulin',
      'Casket lettering',
      'Guest book',
      '4 pcs candle',
    ],
  },
  {
    id: 'jasmin',
    tone: '#9C6A44',
    toneSoft: 'rgba(156, 106, 68, 0.11)',
    abbr: 'JASMIN',
    name: 'Jasmin Package',
    description:
      'Plain white or brown metal casket, double top split lid cover, full glass, elegant interiors, silver or gold corners and handle.',
    priceOptions: [
      { id: 'standard', label: 'Standard', value: '₱210,000.00' },
      { id: 'member', label: 'Member-Borrower', value: '₱160,000.00' },
      { id: 'senior', label: 'Senior Citizen & PWD', value: '₱168,000.00' },
      {
        id: 'depositor',
        label: 'Depositor / Dependents / Spot Cash / Insti',
        value: '₱189,000.00',
      },
    ],
    inclusions: [
      'On call 24/7',
      'Dispatch of appropriate transportation of facilities',
      'Metal casket',
      'Embalming, dressing, and preparation of the deceased for viewing',
      'Application of standard professional make-up and cosmetics',
      'Chapel viewing of maximum of 4 days (air conditioned chapel)',
      'Home viewing of maximum of 9 days',
      'Transportation of the casket to interment site',
      '25 km free transportation to interment site',
      'Pick up hearse',
    ],
    addOns: [
      'Flower arrangement',
      'Necrological service',
      'Tarpaulin',
      'Casket lettering',
      'Guest book',
      '4 pcs candle',
    ],
  },
  {
    id: 'clavel',
    tone: '#B88C54',
    toneSoft: 'rgba(184, 140, 84, 0.12)',
    abbr: 'CLAVEL',
    name: 'Clavel Package',
    description:
      'High quality metal casket, jango class, with color options (blue, golden, brown), double top slit lid cover, full-glass and elegant interiors, silver or gold corners and handles.',
    priceOptions: [
      { id: 'standard', label: 'Standard', value: '₱500,000.00' },
      { id: 'member', label: 'Member-Borrower', value: '₱450,000.00' },
      { id: 'senior', label: 'Senior Citizen & PWD', value: '₱400,000.00' },
      {
        id: 'depositor',
        label: 'Depositor / Dependents / Spot Cash / Insti',
        value: '₱450,000.00',
      },
    ],
    inclusions: [
      'On call 24/7',
      'Dispatch of appropriate transportation of facilities',
      'Special metal casket',
      'Embalming, dressing, and preparation of the deceased for viewing',
      'Standard professional make-up and cosmetics',
      'Chapel viewing maximum of 9 days',
      'Home viewing maximum of 9 days',
      'Transportation of the casket to interment site',
      '25 km free transportation to interment site',
      'Cadillac hearse',
    ],
    addOns: [
      'Floral arrangement',
      'Tarpaulin',
      'Guest book',
      'Picture frame',
      '6 pcs candle',
      'Professional make-up',
      'Prayer leader for 9 days',
      'Singer for the last day of the wake',
    ],
  },
  {
    id: 'orquidea',
    tone: '#D09B45',
    toneSoft: 'rgba(208, 155, 69, 0.13)',
    abbr: 'ORQ',
    name: 'Orquidea Package',
    description:
      'Imported High Quality Metal Casket, Double Top Split Lid Cover, Full Glass Elegant Interior, Silver or Gold corner and handle, with key.',
    priceOptions: [
      { id: 'standard', label: 'Standard', value: '₱1,000,000.00' },
      { id: 'member', label: 'Member-Borrower', value: '₱900,000.00' },
      { id: 'senior', label: 'Senior Citizen & PWD', value: '₱800,000.00' },
      {
        id: 'depositor',
        label: 'Depositor / Dependents / Spot Cash / Insti',
        value: '₱900,000.00',
      },
    ],
    inclusions: [
      'On call 24/7',
      'Dispatch of appropriate transportation of facilities',
      'Imported metal casket',
      'Embalming, dressing, and preparation of the deceased for viewing',
      'Professional make-up and cosmetics',
      'Chapel viewing maximum of 9 days',
      'Home viewing maximum of 9 days',
      'Transportation of the casket to interment site',
      '25 km free transportation to interment site',
      'Cadillac hearse',
    ],
    addOns: [
      'Floral arrangement',
      'Assist in the process of death certificate',
      'Assist in the process of interment',
      '1 tarpaulin',
      '12 pcs candle',
      'Picture frame',
      'Singer for the last night',
      'Prayer leader for 9 days',
      '50 pax of snacks for 8 days',
      '100 pax catering on the last day',
      'High-end hearse',
      'Family car',
      'Guest book',
      'Necrological service',
      'Photography and videography',
    ],
  },
];

const chapelRates = [
  { name: 'Orquidea', rate: '₱20,000 / day' },
  { name: 'Clavel', rate: '₱15,000 / day' },
  { name: 'Jasmin', rate: '₱12,500 / day' },
  { name: 'Dama de Noche', rate: '₱10,000 / day' },
  { name: 'Rosal', rate: '₱1,000 / day' },
];

const chapelSpaces = [
  {
    title: 'Orquidea Chapel',
    rate: '₱20,000 per day',
    features: [
      'Fully airconditioned chapel',
      'Family room with bathroom inside',
      'Pantry',
      'Water dispenser',
      'Refrigerator',
      'Exclusive area',
      'Tables and extra chairs',
    ],
  },
  {
    title: 'Dama de Noche Chapel',
    rate: '₱10,000 per day',
    features: [
      'Fully airconditioned chapel',
      'Pantry',
      'Refrigerator',
      'Water dispenser',
      'Tables and extra chairs',
    ],
  },
  {
    title: 'Rosal Chapels',
    rate: '₱1,000 per day',
    features: [
      'Natural air',
      'Additional chairs if needed',
      'Water dispenser',
      'Electric fan',
    ],
  },
];

const urnViewingSections = [
  {
    title: '1. Altar or Pedestal for the Urn',
    tone: '#8A4B1A',
    toneSoft: 'rgba(138, 75, 26, 0.10)',
    items: [
      'A dedicated altar, pedestal, or table to hold the urn, ideally covered with a decorative cloth or a velvet cushion.',
      'A framed photo of the deceased placed beside or behind the urn.',
      'A flower arrangement around the urn to enhance the solemnity.',
    ],
  },
  {
    title: '2. Seating Arrangement',
    tone: '#A5602B',
    toneSoft: 'rgba(165, 96, 43, 0.10)',
    items: [
      'Comfortable chairs or pews for family and guests, arranged in a semi-circle or rows facing the urn.',
      'Space for immediate family to be seated in front or near the urn.',
    ],
  },
  {
    title: '3. Lighting & Ambiance',
    tone: '#B87535',
    toneSoft: 'rgba(184, 117, 53, 0.11)',
    items: [
      'Soft, warm lighting to create a peaceful environment.',
      'LED candles or real candles placed on either side of the urn.',
      'Option for adjustable lighting to suit different preferences.',
    ],
  },
  {
    title: '4. Religious & Cultural Elements (If Applicable)',
    tone: '#7C5137',
    toneSoft: 'rgba(124, 81, 55, 0.10)',
    items: [
      "A cross, religious icon, or symbolic structure based on the family's beliefs.",
      'Incense burners or essential oil diffusers to create a calm atmosphere.',
      'Scriptures, hymn books, or sacred texts for readings.',
    ],
  },
  {
    title: '5. Digital & Sound Features',
    tone: '#9C6A44',
    toneSoft: 'rgba(156, 106, 68, 0.11)',
    items: [
      'A sound system for background music, prayers, or eulogies.',
      'A microphone or podium for speeches or reflections.',
      'A screen or projector for slideshow presentations or tribute videos.',
    ],
  },
  {
    title: '6. Comfort & Accessibility',
    tone: '#B88C54',
    toneSoft: 'rgba(184, 140, 84, 0.12)',
    items: [
      'Air-conditioning or proper ventilation for guest comfort.',
      'Refreshment area with water, coffee, or tea for guests.',
      'Wheelchair accessibility and ramps for elderly guests.',
    ],
  },
  {
    title: '7. Memorial & Tribute Area',
    tone: '#D09B45',
    toneSoft: 'rgba(208, 155, 69, 0.13)',
    items: [
      'Condolence book or digital message station for visitors to write messages.',
      'Memorial table for guests to place personal notes, letters, or tribute gifts.',
      'Option for personalized decorations such as candles, custom name banners, or draped fabric.',
    ],
  },
  {
    title: '8. Privacy & Security',
    tone: '#6B3410',
    toneSoft: 'rgba(107, 52, 16, 0.10)',
    items: [
      'Partitions or curtains for added privacy if the family prefers an intimate setting.',
      'Security personnel or attendants to assist guests and maintain decorum.',
      'Signage and direction markers to guide guests smoothly through the chapel.',
    ],
  },
];

const additionalServices = [
  'Casket Upgrade',
  'Chapel Upgrade',
  'Hearse Upgrade',
  'Extension of Chapel Use',
  'Equipment Use (only if available)',
  'Floral Arrangement',
  'Food Catering Services',
  'Additional Formalin',
  'Transportation',
  'Others',
];

function parsePeso(value) {
  return Number(String(value).replace(/[^\d.]/g, '')) || 0;
}

function formatPeso(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function AnimatedPrice({ value, startValue, animationKey }) {
  const targetValue = useMemo(() => parsePeso(value), [value]);
  const [displayValue, setDisplayValue] = useState(targetValue);

  useEffect(() => {
    if (animationKey === 0) {
      setDisplayValue(targetValue);
      return undefined;
    }

    let frameId = 0;
    let startTime = 0;
    const duration = 1050;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const nextValue = startValue + (targetValue - startValue) * eased;

      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [animationKey, startValue, targetValue]);

  return (
    <span className="fun-package-price" aria-live="polite">
      {formatPeso(displayValue)}
    </span>
  );
}

function FuneralPackageCard({ item, index }) {
  const [activePriceId, setActivePriceId] = useState('standard');
  const [animationKey, setAnimationKey] = useState(0);
  const [animationStart, setAnimationStart] = useState(parsePeso(item.priceOptions[0].value));

  const activeOption =
    item.priceOptions.find((option) => option.id === activePriceId) ?? item.priceOptions[0];

  const handleSelectPrice = (option) => {
    const currentValue = parsePeso(activeOption.value);
    const nextValue = parsePeso(option.value);

    setAnimationStart(activePriceId === option.id ? 0 : currentValue);
    setActivePriceId(option.id);
    setAnimationKey((prev) => prev + 1);

    if (activePriceId === option.id && currentValue === nextValue) {
      setAnimationStart(0);
    }
  };

  return (
    <article
      className="fun-package-card"
      style={{
        '--accent': item.tone,
        '--accent-soft': item.toneSoft,
        '--card-index': String(index),
      }}
    >
      <div className="fun-package-topbar" />

      <div className="fun-package-header">
        <div className="fun-package-copy">
          <div className="fun-package-meta">
            <span className="fun-package-abbr">{item.abbr}</span>

            <div
              className="fun-package-note-group"
              role="group"
              aria-label={`${item.name} price options`}
            >
              {item.priceOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`fun-package-note-button ${
                    activePriceId === option.id ? 'is-active' : ''
                  }`}
                  onClick={() => handleSelectPrice(option)}
                  aria-pressed={activePriceId === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <h3 className="fun-package-name">{item.name}</h3>
          <p className="fun-package-desc">{item.description}</p>
        </div>

        <div className="fun-package-pricebox">
          <span className="fun-package-price-label">Package price</span>
          <AnimatedPrice
            value={activeOption.value}
            startValue={animationStart}
            animationKey={animationKey}
          />
        </div>
      </div>

    </article>
  );
}

export default function FuneralPage() {
  return (
    <div className="fun">
      <section className="fun-section fun-hero" aria-labelledby="fun-heading">
        <div className="fun-inner fun-hero-grid">
          <div className="fun-hero-copy">
            <nav className="fun-breadcrumb" aria-label="Breadcrumb">
              <span>Services</span>
              <span className="fun-breadcrumb-sep">/</span>
              <span>Allied Services</span>
              <span className="fun-breadcrumb-sep">/</span>
              <span className="fun-breadcrumb-active">Funeral</span>
            </nav>

            <span className="fun-eyebrow">MEMPCO Allied Services</span>

            <h1 className="fun-hero-title" id="fun-heading">
              Funeral & Memorial
              <br />
              <span className="accent">Service Packages.</span>
            </h1>

            <div className="fun-hero-links">
              {heroLinks.map((item) => (
                <a href={`#${item.id}`} className="fun-hero-link" key={item.id}>
                  <span className="fun-hero-link-kicker">{item.kicker}</span>
                  <span className="fun-hero-link-title">{item.title}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="fun-hero-visual" aria-label="Funeral service preview">
            <div className="fun-logo-hero">
              <Image
                src="/Services/LHFDM LOGO.png"
                alt="La Hermosa Funeral Home and Memorial logo"
                width={480}
                height={260}
                className="fun-logo-image"
                priority
              />
            </div>

            <div className="fun-showcase-grid">
              {heroShowcase.map((item) => (
                <article className="fun-showcase-card" key={item.name}>
                  <span className="fun-showcase-price">{item.price}</span>
                  <h3>{item.name}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>

            <div className="fun-hero-social-action">
              <a
                href="https://www.facebook.com/profile.php?id=61565918086637"
                className="fun-logo-facebook-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit La Hermosa Funeraria De MEMPCO Facebook page"
              >
                <span className="fun-logo-facebook-icon">
                  <FacebookIcon />
                </span>
                <span>Visit Facebook Page</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="fun-section fun-stats" aria-label="Funeral service figures">
        <div className="fun-inner">
          <div className="fun-stats-grid">
            {stats.map((item, i) => (
              <div className="fun-stat" key={item.label} style={{ '--stat-index': String(i) }}>
                <span className="fun-stat-value">{item.value}</span>
                <span className="fun-stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fun-section fun-overview" aria-labelledby="fun-overview-heading">
        <div className="fun-inner">
          <div className="fun-section-head">
            <div>
              <p className="fun-section-kicker">Service overview</p>
              <h2 className="fun-section-title" id="fun-overview-heading">
                Structured for easier browsing and future updates.
              </h2>
              <p className="fun-section-text">
                This page adapts the same organized product-page structure from your
                reference and applies it to funeral services, so package details,
                chapel rates, memorial support, and add-ons are easier to present.
              </p>
            </div>
          </div>

          <div className="fun-overview-grid">
            {quickGuide.map((item, i) => (
              <article
                className="fun-overview-card"
                key={item.title}
                style={{ '--card-index': String(i) }}
              >
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="funeral-packages"
        className="fun-section fun-packages"
        aria-labelledby="fun-packages-heading"
      >
        <div className="fun-inner">
          <div className="fun-section-head">
            <div>
              <p className="fun-section-kicker">Memorial packages</p>
              <h2 className="fun-section-title" id="fun-packages-heading">
                Funeral service packages from essential to premium.
              </h2>
              <p className="fun-section-text">
                Packages are arranged in order, from Rosal options to higher-tier
                memorial packages. Member pricing and special rates can still be
                finalized directly with the service desk.
              </p>
            </div>
          </div>

          <div className="fun-package-stack">
            {packages.map((item, i) => (
              <FuneralPackageCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section
        id="chapel-services"
        className="fun-section fun-chapel-rates"
        aria-labelledby="fun-chapel-heading"
      >
        <div className="fun-inner">
          <div className="fun-section-head">
            <div>
              <p className="fun-section-kicker">Chapel services</p>
              <h2 className="fun-section-title" id="fun-chapel-heading">
                Daily chapel rates and room-based support.
              </h2>
              <p className="fun-section-text">
                Chapel rates and key amenities are grouped here for faster comparison.
              </p>
            </div>
          </div>

          <div className="fun-rate-grid">
            {chapelRates.map((item, i) => (
              <article
                className="fun-rate-card"
                key={item.name}
                style={{ '--card-index': String(i) }}
              >
                <h3>{item.name}</h3>
                <p>{item.rate}</p>
              </article>
            ))}
          </div>

          <div className="fun-chapel-grid">
            {chapelSpaces.map((item, i) => (
              <article
                className="fun-chapel-card"
                key={item.title}
                style={{ '--card-index': String(i) }}
              >
                <div className="fun-chapel-card-top">
                  <h3>{item.title}</h3>
                  <span>{item.rate}</span>
                </div>
                <ul>
                  {item.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fun-section fun-necro" aria-labelledby="fun-necro-heading">
        <div className="fun-inner">
          <div className="fun-necro-card">
            <p className="fun-section-kicker">Necrological service</p>
            <h2 className="fun-necro-title" id="fun-necro-heading">
              ₱6,000
            </h2>
            <ul className="fun-necro-list">
              <li>1 Singer (4 songs)</li>
              <li>Tribute Video</li>
            </ul>
          </div>
        </div>
      </section>

      <section
        id="urn-viewing"
        className="fun-section fun-urn"
        aria-labelledby="fun-urn-heading"
      >
        <div className="fun-inner">
          <div className="fun-section-head">
            <div>
              <p className="fun-section-kicker">Urn viewing services</p>
              <h2 className="fun-section-title" id="fun-urn-heading">
                A more solemn and well-supported urn viewing setup.
              </h2>
              <p className="fun-section-text">
                These viewing elements organize the essential needs for an urn-based
                memorial setup, from seating and lighting to security and tribute
                areas.
              </p>
            </div>
          </div>

          <div className="fun-urn-grid">
            {urnViewingSections.map((section, i) => (
              <article
                className="fun-urn-card"
                key={section.title}
                style={{
                  '--accent': section.tone,
                  '--accent-soft': section.toneSoft,
                  '--card-index': String(i),
                }}
              >
                <div className="fun-urn-card-topbar" />
                <div className="fun-urn-card-body">
                  <h3>{section.title}</h3>
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="additional-services"
        className="fun-section fun-additional"
        aria-labelledby="fun-additional-heading"
      >
        <div className="fun-inner">
          <div className="fun-section-head">
            <div>
              <p className="fun-section-kicker">Additional products and services</p>
              <h2 className="fun-section-title" id="fun-additional-heading">
                Upgrades and add-on support services.
              </h2>
              <p className="fun-section-text">
                These options can be shown as separate add-ons, subject to availability
                and final coordination.
              </p>
            </div>
          </div>

          <div className="fun-additional-grid">
            {additionalServices.map((item, i) => (
              <div
                className="fun-additional-pill"
                key={item}
                style={{ '--pill-index': String(i) }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fun-section fun-note" aria-labelledby="fun-note-heading">
        <div className="fun-inner">
          <div className="fun-note-inner">
            <p className="fun-note-kicker">Customized arrangements</p>
            <h2 className="fun-note-title" id="fun-note-heading">
              Customized funeral service packages
              <br />
              for partner institutions.
            </h2>
            <p className="fun-note-text">
              For final package configuration, special institutional pricing, and
              updated service arrangements, coordinate directly with the funeral
              service team.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
