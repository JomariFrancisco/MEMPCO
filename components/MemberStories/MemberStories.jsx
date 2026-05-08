'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './MemberStories.css';

const STORIES = [
  {
    text: "Once an OFW, I invested my savings into building a small bakery. With business training and MEMPCO's support, I was able to expand my bakery, support my family, and help my children finish school.",
    name: 'Amylita Villarosa',
    role: 'Bakery Shop Owner',
    location: 'San Roque, Zamboanga City',
    image: '/MemberStories/Amylita.png',
    emoji: '',
    fullStory: [
      "Meet Amelita Villarosa, a proud entrepreneur from San Roque and the dedicated owner of her own Bakery Shop. Once an OFW, Amelita made the brave decision to invest her hard-earned savings into building a small bakery upon returning to the Philippines. Instead of spending it elsewhere, she chose to take business training and workshops—equipping herself with the knowledge and confidence to properly manage her venture.",
      "Through her perseverance and determination, she not only supported her family's needs and helped her children finish school, but also expanded her bakery with the help and support of MEMPCO. Truly, Amelita's journey is a testament that courage, learning, and faith can turn even the smallest beginnings into something remarkable.",
      "Her inspiring success story reminds us that no dream is too big when paired with hard work and the right support system. MEMPCO is proud to be part of Amelita's journey toward growth and stability—a shining example of empowerment through cooperation and perseverance.",
    ],
    tags: ['#MEMPCOStories', '#CooperativePride', '#WomenInBusiness', '#OFWtoEntrepreneur', '#InspiringJourney', '#MEMPCOSupportsSuccess'],
    videoUrl: 'https://youtu.be/QwMlGNOP2gY?si=Vuc8E9pATomR654n',
  },
  {
    text: 'I started with a humble ukay-ukay and used my MEMPCO loan to venture into a junk shop business. Today, my business employs more than 10 workers and has expanded to multiple locations.',
    name: 'Edna Mallorca',
    role: 'Junk Shop Owner',
    location: 'Zamboanga City',
    image: '/MemberStories/Edna.png',
    emoji: '',
    fullStory: [
      "Meet Edna Gonzalez Mallorca, a driven entrepreneur and the proud owner of a Junk Shop and Demolition Contracting Business. Her journey began with a humble ukay-ukay venture, where she not only earned a living but also empowered others by teaching her fellow MEMPCO members basic sewing and tailoring skills. With a heart for growth and community, Edna laid the foundation of her entrepreneurial path through hard work and shared knowledge.",
      "In 2011, she bravely ventured into the junk shop business using her MEMPCO loan—even without having a formal space. Starting from her own home, she used her open area to store collected scrap materials while learning the ins and outs of the business. Through perseverance and determination, her efforts paid off, and by 2019, her business began to flourish. She then combined her savings with MEMPCO support to purchase a lot in Zone 8, Ayala—marking a major milestone in expanding her junk shop operations.",
      "Today, Edna's business continues to thrive, employing more than 10 workers and expanding into multiple locations, including areas in La Paz Arc and Pamucutan. From a small, risk-filled beginning to a booming and sustainable enterprise, she is now able to support her family, sustain her employees, and even enjoy the fruits of her hard work through travel and a stable lifestyle.",
    ],
    tags: ['#MEMPCOStories', '#CooperativePride', '#WomenInBusiness', '#FromHumbleBeginnings', '#MEMPCOSuccess'],
    videoUrl: 'https://youtu.be/qTQaPQVCyHY?si=GyBn-USDbqnJFC8P',
  },
  {
    text: "With MEMPCO's support, I strengthened my sari-sari store and rubber buying business, and even acquired a truck and a car to help sustain and grow my livelihood for my family.",
    name: 'Girlee Del Rosario',
    role: 'Rubber Buyer & Sari-Sari Store Owner',
    location: 'Ipil, Zamboanga Sibugay',
    image: '/MemberStories/Girlee.png',
    emoji: '',
    fullStory: [
      "Meet Girlee Del Rosario, a passionate entrepreneur from Ipil, Zamboanga Sibugay, proudly managing her business as a Rubber Buyer and Sari-Sari Store Owner. Through her perseverance and dedication, Girlee was able to provide for her family and steadily grow her livelihood.",
      "With the support of MEMPCO, she expanded her opportunities—strengthening her sari-sari store and even acquiring a truck and a car, both essential in sustaining and growing her business. Truly, her story shows how determination and the right support can turn dreams into reality.",
      "As a proud MEMPCO member, Girlee continues to inspire with her resilience and vision for a brighter future. Her journey proves that when hard work meets cooperative strength, success knows no limits. Let's celebrate Girlee's achievements and may her story spark motivation for more aspiring entrepreneurs to dream big and never give up!",
    ],
    tags: ['#MEMPCOStories', '#Entrepreneurship', '#CooperativeSuccess', '#WomenInBusiness', '#InspiringJourneys'],
    videoUrl: 'https://youtu.be/ublDz2mWQP0?si=vUfEwHut8r9eqw6W',
  },
];

/* ── Icons ── */
function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" aria-hidden="true">
      <path d="M6.5 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6.5 8.1l-2.78 1.46.53-3.1L2 4.25l3.1-.45z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5.5 1C3.57 1 2 2.57 2 4.5c0 2.65 3.5 6 3.5 6S9 7.15 9 4.5C9 2.57 7.43 1 5.5 1z" />
      <circle cx="5.5" cy="4.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ReadMoreIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M2 6.5h9M8 3l3.5 3.5L8 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06z" />
    </svg>
  );
}

function Stars({ count = 5 }) {
  return (
    <div className="ms-stars" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <StarIcon key={i} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════════ */
function StoryModal({ story, onClose }) {
  const overlayRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => {
    if (closeTimerRef.current) return;

    setIsOpen(false);

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, 260);
  }, [onClose]);

  useEffect(() => {
    setMounted(true);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('ms-modal-lock');

    const openTimer = window.setTimeout(() => {
      setIsOpen(true);
    }, 20);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(openTimer);
      window.removeEventListener('keydown', onKey);

      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.classList.remove('ms-modal-lock');
    };
  }, [mounted, handleClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`ms-modal-overlay ${isOpen ? 'ms-modal--open' : ''}`}
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`${story.name}'s full story`}
    >
      <div className="ms-modal">
        <div className="ms-modal__left">
          <img src={story.image} alt={story.name} className="ms-modal__photo" />
          <div className="ms-modal__photo-scrim" aria-hidden="true" />

          <div className="ms-modal__identity">
            <Stars />
            <h2 className="ms-modal__name">{story.name}</h2>
            <p className="ms-modal__role">{story.role}</p>
            <span className="ms-modal__loc">
              <LocationIcon />
              {story.location}
            </span>
          </div>
        </div>

        <div className="ms-modal__right">
          <button
            type="button"
            className="ms-modal__close"
            onClick={handleClose}
            aria-label="Close story modal"
          >
            ×
          </button>

          <div className="ms-modal__scroll">
            <p className="ms-modal__label">Member Story</p>

            <div className="ms-modal__story">
              {story.fullStory.map((para, i) => (
                <p key={i} className="ms-modal__para">
                  {para}
                </p>
              ))}
            </div>

            <div className="ms-modal__tags">
              {story.tags.map((tag) => (
                <span key={tag} className="ms-modal__tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="ms-modal__actions">
            <a
              href={story.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ms-modal__btn ms-modal__btn--primary"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5.5 4.8l4 2.2-4 2.2V4.8z" fill="currentColor" />
              </svg>
              Watch Story
            </a>

            <button
              type="button"
              className="ms-modal__btn ms-modal__btn--ghost"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ══════════════════════════════════════════════════════
   STORY CARD
══════════════════════════════════════════════════════ */
function StoryCard({ story, onOpenModal, className = 'ms-card' }) {
  return (
    <article className={className}>
      <div className="ms-card__media">
        <img src={story.image} alt={story.name} className="ms-card__photo" loading="lazy" />
        <span className="ms-card__role-tag">{story.role}</span>
      </div>

      <div className="ms-card__body">
        <div className="ms-card__quote-mark" aria-hidden="true">
          "
        </div>
        <p className="ms-card__text">{story.text}</p>
      </div>

      <div className="ms-card__footer">
        <Stars />

        <div className="ms-card__info">
          <strong>{story.name}</strong>
          <small>
            <LocationIcon />
            {story.location}
          </small>
        </div>

        <button
          type="button"
          className="ms-card__read-more"
          onClick={() => onOpenModal(story)}
          aria-label={`Read ${story.name}'s full story`}
        >
          <span>Read Full Story</span>
          <ReadMoreIcon />
        </button>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════════════
   MOBILE CAROUSEL
══════════════════════════════════════════════════════ */
function MobileCarousel({ stories, onOpenModal }) {
  return (
    <div className="ms-carousel" aria-label="Member stories carousel">
      <div className="ms-carousel__track">
        {stories.map((story) => (
          <StoryCard
            key={story.name}
            story={story}
            onOpenModal={onOpenModal}
            className="ms-carousel__card"
          />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN SECTION
══════════════════════════════════════════════════════ */
export default function MemberStories() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeStory, setActiveStory] = useState(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const items = section.querySelectorAll('[data-reveal]');

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );

    items.forEach((el, i) => {
      el.style.setProperty('--rd', `${i * 90}ms`);
      io.observe(el);
    });

    const sio = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          sio.unobserve(entry.target);
        }
      },
      { threshold: 0.12 }
    );

    sio.observe(section);

    return () => {
      io.disconnect();
      sio.disconnect();
    };
  }, []);

  const openModal = useCallback((story) => setActiveStory(story), []);
  const closeModal = useCallback(() => setActiveStory(null), []);

  return (
    <>
      <section
        ref={sectionRef}
        className={`ms ${isVisible ? 'is-visible' : ''}`}
        id="member-stories"
      >
        <div className="ms-glow ms-glow--a" aria-hidden="true" />
        <div className="ms-glow ms-glow--b" aria-hidden="true" />

        <div className="ms-shell">
          <header className="ms-header ms-reveal ms-reveal--up" data-reveal>
            <span className="ms-eyebrow">Our Members</span>
            <h2 className="ms-title">
              Real stories. <em>Real people.</em>
            </h2>
            <p className="ms-subtitle">
              Meet the individuals behind MEMPCO's growing community—members whose
              journeys reflect resilience, progress, and meaningful cooperative support.
            </p>
          </header>

          <div className="ms-cards">
            {STORIES.map((story) => (
              <div className="ms-reveal ms-reveal--up" data-reveal key={story.name}>
                <StoryCard story={story} onOpenModal={openModal} />
              </div>
            ))}
          </div>

          <MobileCarousel stories={STORIES} onOpenModal={openModal} />
        </div>

        <a
          href="https://www.facebook.com/groups/mempcopreneurs"
          target="_blank"
          rel="noopener noreferrer"
          className="ms-fb-cta"
          aria-label="Visit MEMPCOpreneurs on Facebook"
        >
          <FacebookIcon />
          <span>Visit MEMPCOpreneurs</span>
          <ReadMoreIcon />
        </a>
      </section>

      {activeStory && <StoryModal story={activeStory} onClose={closeModal} />}
    </>
  );
}