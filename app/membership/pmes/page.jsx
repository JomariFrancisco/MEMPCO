'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Check, CircleAlert } from 'lucide-react';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import '../membership.css';
import './pmes.css';

const LEARNING_OUTCOMES = [
  'Explain what a cooperative is and why it exists.',
  'Recognize cooperative ideals, values, and principles.',
  'Understand the Philippine cooperative framework.',
  "Describe MEMPCO's history, vision, and mission.",
  'Identify how governance and management work.',
  'Know member rights, responsibilities, and obligations.',
  'Understand available services and membership requirements.',
];

const LESSONS = [
  {
    title: 'Understanding a Cooperative',
    summary: 'A cooperative is formed by people who voluntarily work together to meet shared economic, social, and cultural needs.',
    points: [
      'Members own and democratically control the cooperative.',
      'Members contribute, use services, take part in cooperative affairs, and share in its benefits under applicable rules.',
      'The module traces the modern cooperative movement to the Rochdale Pioneers in England in 1844.',
    ],
    takeaway: 'As a MEMPCO member, you are more than a customer: you are part of a member-owned organization.',
  },
  {
    title: 'Cooperative Ideals and Six Values',
    summary: 'Cooperation is grounded in shared responsibility, fairness, and democratic participation.',
    points: [
      "Self-help: pool resources and effort to improve members' well-being.",
      'Self-responsibility: make informed decisions and fulfill obligations.',
      "Democracy: participate in decisions through the cooperative's rules.",
      'Equality and equity: uphold equal opportunity and fair treatment.',
      'Solidarity: support one another and work toward common goals.',
    ],
    takeaway: 'These values shape how members work together and contribute to collective progress.',
  },
  {
    title: 'The Seven Cooperative Principles',
    summary: 'Seven internationally recognized principles guide how cooperatives operate and serve their members.',
    points: [
      'Open and voluntary membership',
      'Democratic member control',
      "Members' economic participation",
      'Autonomy and independence',
      'Education, training, and information',
      'Cooperation among cooperatives',
      'Concern for community',
    ],
    takeaway: 'The principles connect member participation with responsible, community-minded cooperative practice.',
  },
  {
    title: 'Legal Framework of Cooperatives',
    summary: 'The PMES module introduces the laws and organizations that form part of the cooperative environment in the Philippines.',
    points: [
      'Republic Act No. 9520, the Philippine Cooperative Code of 2008.',
      'The Cooperative Development Authority (CDA), which has a government role in cooperative registration, regulation, and supervision.',
      'NATCCO, the National Confederation of Cooperatives, which supports the cooperative movement and its member organizations.',
    ],
    takeaway: 'Understanding this framework helps members value compliance, accountability, and responsible governance.',
  },
  {
    title: 'Cooperative Structure and Governance',
    summary: "Governance and management have distinct roles in carrying out the cooperative's purpose and approved policies.",
    points: [
      "General Assembly: the cooperative's highest policy-making body, within the powers set by law and bylaws.",
      'Board of Directors: provides strategic direction, approves policies and budgets, and exercises oversight.',
      'Management Team: handles daily operations and implements approved policies.',
      'Committees: carry out assigned functions that support accountability and transparency.',
    ],
    takeaway: "Good governance helps protect members' interests and supports the cooperative's long-term sustainability.",
  },
  {
    title: 'Get to Know MEMPCO',
    summary: 'MEMPCO is the Micro-Entrepreneurs Multi-Purpose Cooperative, established on February 15, 2002.',
    points: [
      'The module says MEMPCO began with 10 employees and 503 women members, initially focusing on microfinance for small businesses.',
      'In 2005, it expanded to savings services with support from CUES Philippines.',
      'Vision: a strong and sustainable cooperative of highly empowered members in Mindanao.',
      "Mission: uplift members' social and economic condition through excellent financial products and services.",
      'Core values: Passion, Integrity, Teamwork, and Innovation.',
    ],
    takeaway: "MEMPCO's stated purpose is to support members through cooperative financial services.",
  },
  {
    title: 'MEMPCO Products and Services',
    summary: "The cooperative's offerings support members' saving, borrowing, and other economic needs.",
    points: [
      'Savings services help members save and manage money under applicable account terms and policies.',
      'Loan services may support business, agricultural, educational, and emergency needs, subject to eligibility and approval.',
      'Allied services include areas such as transportation, healthcare, mortuary services, and mutual assurance.',
    ],
    takeaway: 'Products, eligibility, fees, rates, and terms can vary. Confirm current details with an authorized MEMPCO branch.',
  },
  {
    title: 'Share Capital and Member Ownership',
    summary: 'Share capital represents an ownership investment in the cooperative; it is different from an ordinary savings deposit.',
    points: [
      "Share capital contributes to the cooperative's capital base and supports its operations.",
      'It is governed by cooperative law, bylaws, and applicable policies, and should not be assumed to be withdrawable on demand.',
      'Dividends or patronage refunds, when declared, follow applicable laws and cooperative policies.',
      'Ask authorized personnel about the current terms and any withdrawal, transfer, or termination procedures.',
    ],
    takeaway: 'Understand the terms of any member investment and ask questions before making a financial commitment.',
  },
  {
    title: 'Membership Rights and Responsibilities',
    summary: "Member rights and privileges depend on membership category, applicable law, and MEMPCO's bylaws.",
    points: [
      'Eligible members may use cooperative services, participate in meetings, access information, and receive declared benefits under applicable rules.',
      'Members are responsible for following bylaws and policies, meeting loan obligations and dues, and participating responsibly.',
      'The module distinguishes Regular and Associate membership; voting rights and other privileges differ by category.',
      'Confirm current category qualifications and privileges before selecting a membership package.',
    ],
    takeaway: 'Know both the rights you may exercise and the obligations that come with your membership category.',
  },
  {
    title: 'How to Become a MEMPCO Member',
    summary: 'PMES is the first step: learn how the cooperative works before deciding whether and how to apply.',
    points: [
      'Attend and complete the Pre-Membership Education Seminar.',
      'Complete the application requirements provided by MEMPCO.',
      'Review the available membership packages and choose the category appropriate to your eligibility and needs.',
      'Follow branch instructions for payment, document submission, and membership confirmation.',
    ],
    takeaway: 'Document requirements and package details can change. Use the application guide and confirm current requirements with a branch.',
  },
  {
    title: 'Partners, Affiliations, and Recognition',
    summary: 'Cooperative partnerships can strengthen education, services, and the wider cooperative movement.',
    points: [
      'The PMES module introduces partnerships and affiliations as examples of cooperation among cooperatives.',
      'It also describes recognition as a reflection of institutional development and commitment to members.',
      'Specific partner names, affiliations, and awards should be confirmed by MEMPCO before they are published.',
    ],
    takeaway: 'This lesson highlights cooperation and development without assuming unverified partner or award details.',
  },
];

const SEMINAR_STEPS = [
  ['01', 'Attend PMES', 'Learn about the cooperative, its services, and your responsibilities.'],
  ['02', 'Prepare requirements', 'Use the current document checklist provided by MEMPCO.'],
  ['03', 'Choose a membership type', 'Review the available categories and confirm eligibility and package details.'],
  ['04', 'Complete the process', 'Follow branch instructions for payment, document submission, and confirmation.'],
];

export default function PMESPage() {
  const [activeLesson, setActiveLesson] = useState(0);
  const lesson = LESSONS[activeLesson];

  return (
    <>
      <Navbar />

      <main className="membership-page pmes-page">
        <section className="pmes-hero">
          <div className="pmes-shell pmes-hero__layout">
            <div className="pmes-hero__copy">
              <p className="membership-label">Pre-Membership Education Seminar</p>
              <h1>Your MEMPCO journey starts with understanding.</h1>
              <p className="pmes-hero__intro">
                Learn about MEMPCO. Understand your responsibilities. Become an empowered member.
              </p>
              <div className="pmes-actions">
                <a className="membership-button membership-button--primary" href="#pmes-lessons">
                  Explore the lessons <ArrowDown size={16} aria-hidden="true" />
                </a>
                <Link className="membership-button membership-button--quiet" href="/membership">
                  Membership application guide <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <aside className="pmes-hero__brief" aria-label="Seminar overview">
              <p className="pmes-overline">A guide for prospective members</p>
              <h2>Know what membership means before you apply.</h2>
              <p>Explore cooperative principles, MEMPCO, member responsibilities, and the steps to join.</p>
              <div className="pmes-hero__stats">
                <div><strong>11</strong><span>lessons</span></div>
                <div><strong>7</strong><span>learning outcomes</span></div>
                <div><strong>2002</strong><span>MEMPCO established</span></div>
              </div>
            </aside>
          </div>
        </section>

        <section className="pmes-section pmes-intro" aria-labelledby="pmes-about-title">
          <div className="pmes-shell pmes-intro__grid">
            <header className="pmes-section-heading">
              <p className="membership-label">Start with the essentials</p>
              <h2 id="pmes-about-title">Membership is shared ownership.</h2>
            </header>
            <div className="pmes-intro__body">
              <p>
                The Pre-Membership Education Seminar introduces cooperative values, principles, governance, and operations. It helps prospective members understand how MEMPCO works and what being a member-owner involves.
              </p>
              <p>
                Use this guide to learn at your own pace, ask questions, and make an informed decision about membership.
              </p>
              <div className="pmes-principles" aria-label="PMES focus areas">
                <span><Check size={15} aria-hidden="true" /> Shared ownership</span>
                <span><Check size={15} aria-hidden="true" /> Democratic participation</span>
                <span><Check size={15} aria-hidden="true" /> Informed decisions</span>
              </div>
            </div>
          </div>
        </section>

        <section className="pmes-section pmes-outcomes" aria-labelledby="pmes-outcomes-title">
          <div className="pmes-shell">
            <header className="pmes-section-heading pmes-section-heading--wide">
              <p className="membership-label">What you will learn</p>
              <h2 id="pmes-outcomes-title">A clearer picture of cooperative membership.</h2>
            </header>
            <ol className="pmes-outcomes__list">
              {LEARNING_OUTCOMES.map((outcome, index) => (
                <li key={outcome}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{outcome}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="pmes-section pmes-curriculum" id="pmes-lessons" aria-labelledby="pmes-lessons-title">
          <div className="pmes-shell">
            <header className="pmes-section-heading pmes-section-heading--wide">
              <p className="membership-label">The PMES curriculum</p>
              <h2 id="pmes-lessons-title">Explore the 11 lessons.</h2>
              <p>Select a lesson to read its key ideas.</p>
            </header>

            <div className="pmes-lesson-explorer">
              <label className="pmes-lesson-select">
                Jump to a lesson
                <select value={activeLesson} onChange={(event) => setActiveLesson(Number(event.target.value))}>
                  {LESSONS.map((item, index) => (
                    <option value={index} key={item.title}>
                      {String(index + 1).padStart(2, '0')} - {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <nav className="pmes-lesson-nav" aria-label="PMES lessons">
                {LESSONS.map((item, index) => (
                  <button
                    type="button"
                    className={`pmes-lesson-nav__item${activeLesson === index ? ' is-active' : ''}`}
                    key={item.title}
                    aria-pressed={activeLesson === index}
                    onClick={() => setActiveLesson(index)}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span>{item.title}</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                ))}
              </nav>

              <article className="pmes-lesson-detail" aria-live="polite" key={activeLesson}>
                <p className="pmes-overline">Lesson {String(activeLesson + 1).padStart(2, '0')}</p>
                <h3>{lesson.title}</h3>
                <p className="pmes-lesson-detail__summary">{lesson.summary}</p>
                <ul>
                  {lesson.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
                <aside className="pmes-lesson-detail__takeaway">
                  <span>Key takeaway</span>
                  <p>{lesson.takeaway}</p>
                </aside>
                <div className="pmes-lesson-detail__controls">
                  <button type="button" onClick={() => setActiveLesson((activeLesson + LESSONS.length - 1) % LESSONS.length)}>
                    Previous lesson
                  </button>
                  <span>{String(activeLesson + 1).padStart(2, '0')} / {String(LESSONS.length).padStart(2, '0')}</span>
                  <button type="button" onClick={() => setActiveLesson((activeLesson + 1) % LESSONS.length)}>
                    Next lesson <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="pmes-section pmes-joining" aria-labelledby="pmes-joining-title">
          <div className="pmes-shell">
            <header className="pmes-section-heading pmes-section-heading--wide">
              <p className="membership-label">Your next steps</p>
              <h2 id="pmes-joining-title">From seminar to membership.</h2>
            </header>
            <ol className="pmes-steps">
              {SEMINAR_STEPS.map(([number, title, text]) => (
                <li key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
            <p className="pmes-joining__note">
              Requirements, eligibility, fees, and package components may change. Confirm the current details with an authorized MEMPCO branch before applying or making a payment.
            </p>
            <div className="pmes-actions pmes-joining__actions">
              <Link className="membership-button membership-button--primary" href="/membership">
                View application guide <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="membership-button membership-button--quiet" href="/membership/package">
                View membership packages
              </Link>
            </div>
          </div>
        </section>

        <section className="pmes-safety" aria-labelledby="pmes-safety-title">
          <div className="pmes-shell pmes-safety__layout">
            <div className="pmes-safety__heading">
              <p className="membership-label">Protect your transactions</p>
              <h2 id="pmes-safety-title">Keep every payment official.</h2>
            </div>
            <ul>
              <li>Ask for and keep your official passbook and receipt for every applicable cash transaction.</li>
              <li>Pay only through authorized MEMPCO personnel and official transaction channels.</li>
              <li>Ask questions about fees, share capital, loan terms, and requirements before paying.</li>
            </ul>
            <p className="pmes-safety__note"><CircleAlert size={16} aria-hidden="true" /> Confirm current instructions with an authorized MEMPCO branch.</p>
          </div>
        </section>

        <section className="pmes-closing">
          <div className="pmes-shell pmes-closing__inner">
            <div>
              <p className="membership-label">An informed member is an empowered member.</p>
              <h2>Ready to take the next step?</h2>
            </div>
            <Link className="membership-button membership-button--primary" href="/membership">
              Continue to the application guide <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
