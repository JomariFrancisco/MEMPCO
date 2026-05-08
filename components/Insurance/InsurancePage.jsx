'use client';

import { useState } from 'react';
import './InsurancePage.css';

const familyColumns = [
  'Principal 18–69 y.o / No Age Limit (Accidental 18–65 y.o)',
  'Principal 70–80 y.o (Accidental 18–65 y.o)',
  'Spouse/Parent (Live-in Partner) 18–69 y.o (Accidental 18–65 y.o)',
  'Spouse/Parent (Live-in Partner) 70–80 y.o',
  'Children/Siblings (Max of 3)',
];

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06z" />
  </svg>
);

const categories = [
  {
    id: 'life-insurance',
    kicker: 'Life insurance products',
    title: 'Life protection for members, deposits, and bundled coverage.',
    text: 'A broader insurance catalog covering yearly renewable term protection, accident-focused plans, and bundled cooperative member protection.',
    products: [
      {
        id: 'gadddi',
        abbr: 'GADDDI',
        name: 'Group Accident, Death, Disablement & Dismemberment Insurance',
        summary: 'Accident-centered protection with options based on age bracket and benefit level.',
        tone: '#D18B00',
        toneSoft: 'rgba(209, 139, 0, 0.10)',
        premiumLabel: 'Premium',
        premium: '₱600 / ₱1,800',
        period: 'catalog options',
        columns: ['Option 1', 'Option 4 (18–69 y.o)', 'Option 4 (70–80 y.o)'],
        rows: [
          { label: 'Natural Death', values: ['25,000.00', '75,000.00', '37,500.00'] },
          { label: 'Accidental Death', values: ['100,000.00', '300,000.00', '-'] },
          { label: 'Murder & Unprovoked Assault', values: ['50,000.00', '150,000.00', '-'] },
          { label: 'Cash Burial due to Accidental Death', values: ['15,000.00', '45,000.00', '-'] },
          { label: 'HIB Due to Accident (max of 30 days)', values: ['100/day', '300/day', '-'] },
          { label: 'Annual Premium — Option 1', values: ['600.00', '', ''], highlight: true },
          { label: 'Annual Premium — Option 4', values: ['', '1,800.00', '1,800.00'], highlight: true },
        ],
      },
      {
        id: 'glafi',
        abbr: 'GLAFI',
        name: 'Group Life and Accident with Fire Insurance',
        summary: 'Affordable bundled protection with accident, natural death, burial, and fire insurance benefits.',
        tone: '#4F6BED',
        toneSoft: 'rgba(79, 107, 237, 0.10)',
        premiumLabel: 'Annual Premium',
        premium: '₱250',
        period: 'per year',
        columns: ['Principal'],
        rows: [
          { label: 'Accidental Death, Disablement & Dismemberment', values: ['50,000.00'] },
          { label: 'Murder & Unprovoked Assault', values: ['25,000.00'] },
          { label: 'Cash Burial Benefit due to Accidental Death', values: ['15,000.00'] },
          { label: 'Death due to Natural Causes', values: ['15,000.00'] },
          { label: 'Fire Insurance for Furniture & Fixtures', values: ['20,000.00'] },
          { label: 'Annual Premium', values: ['250.00'], highlight: true },
        ],
      },
      {
        id: 'egyrt',
        abbr: 'EGYRT',
        name: 'Enhanced Group Yearly Renewable Term',
        summary: 'Yearly renewable term coverage with death, assault, medical reimbursement, burial, and hospital income benefits.',
        tone: '#E7C547',
        toneSoft: 'rgba(231, 197, 71, 0.12)',
        premiumLabel: 'Annual Premium',
        premium: '₱1,890',
        period: 'per year',
        columns: ['Coverage'],
        rows: [
          { label: 'Natural Death', values: ['200,000.00'] },
          { label: 'Accidental Death Benefit', values: ['300,000.00'] },
          { label: 'Unprovoked Murder or Assault', values: ['50,000.00'] },
          { label: 'Accident Medical Reimbursement', values: ['10,000.00'] },
          { label: 'Daily Hospital Income Benefits', values: ['300/day'] },
          { label: 'Burial', values: ['2,000.00'] },
          { label: 'Annual Premium', values: ['1,890.00'], highlight: true },
        ],
      },
      {
        id: 'time-deposit-life',
        abbr: 'GTLI',
        name: 'Group Term Life Insurance (Time Deposit)',
        summary: 'Deposit-linked life insurance with premium and coverage scaling by the amount of savings.',
        tone: '#6BCB4B',
        toneSoft: 'rgba(107, 203, 75, 0.12)',
        premiumLabel: 'Annual Premium',
        premium: '₱95.04 – ₱475.20',
        period: 'based on savings amount',
        columns: ['₱5,000–29,999', '₱30,000–49,999', '₱50,000–99,999', '₱100,000–499,999', '₱500,000 & above'],
        rows: [
          { label: 'Natural Death', values: ['10,000', '20,000', '30,000', '40,000', '50,000'] },
          { label: 'Accidental Death Benefit', values: ['20,000', '40,000', '60,000', '80,000', '100,000'] },
          { label: 'Amount of Savings', values: ['5,000–29,999', '30,000–49,999', '50,000–99,999', '100,000–499,999', '500,000 & above'] },
          { label: 'Annual Premium', values: ['95.04', '190.08', '285.12', '380.16', '475.20'], highlight: true },
        ],
      },
      {
        id: 'mempco-protect-2',
        abbr: 'MP2',
        name: 'MEMPCO Protect 2',
        summary: 'Bundled member protection combining accident, natural death, burial, and hospital income benefits for principal and family members.',
        tone: '#2F35B7',
        toneSoft: 'rgba(47, 53, 183, 0.11)',
        premiumLabel: 'Annual Premium',
        premium: '₱1,500',
        period: 'per year',
        columns: ['Principal (Accidental 18–65 y.o)', 'Spouse/Parents (Accidental 18–65 y.o)', 'Children/Siblings (Accidental 18–65 y.o)'],
        rows: [
          { label: 'Natural Death 1–5 years', values: ['65,000.00', '10,000.00', '10,000.00'] },
          { label: 'Accidental Death 1–5 years', values: ['220,000.00', '30,000.00', '30,000.00'] },
          { label: 'Natural Death 6–10 years', values: ['85,000.00', '20,000.00', '20,000.00'] },
          { label: 'Accidental Death 6–10 years', values: ['260,000.00', '50,000.00', '50,000.00'] },
          { label: 'Natural Death 11 years and above', values: ['105,000.00', '40,000.00', '40,000.00'] },
          { label: 'Accidental Death 11 years and above', values: ['300,000.00', '90,000.00', '90,000.00'] },
          { label: 'Murder & Unprovoked Assault', values: ['50,000.00', 'N/A', 'N/A'] },
          { label: 'Cash Burial due to Accidental Death', values: ['15,000.00', 'N/A', 'N/A'] },
          { label: 'HIB due to Accident (max of 30 days)', values: ['100.00', 'N/A', 'N/A'] },
          { label: 'Annual Premium', values: ['1,500.00', '', ''], highlight: true },
        ],
      },
      {
        id: 'mempco-protect-3',
        abbr: 'MP3',
        name: 'MEMPCO Protect 3',
        summary: 'Higher-value member protection package with co-insured natural and accidental death benefits.',
        tone: '#DC2626',
        toneSoft: 'rgba(220, 38, 38, 0.10)',
        premiumLabel: 'Annual Premium',
        premium: '₱2,790',
        period: 'per year',
        columns: ['1–5 years', '6–10 years', '11 years above'],
        rows: [
          { label: 'Member — Natural Death', values: ['240,000.00', '260,000.00', '280,000.00'] },
          { label: 'Member — Accidental Death Benefit', values: ['380,000.00', '400,000.00', '420,000.00'] },
          { label: 'Member — Unprovoked Murder or Assault', values: ['50,000.00', '50,000.00', '50,000.00'] },
          { label: 'Member — Accident Medical Reimbursement', values: ['10,000.00', '10,000.00', '10,000.00'] },
          { label: 'Member — Daily Hospital Income Benefits', values: ['300/day', '300/day', '300/day'] },
          { label: 'Member — Burial', values: ['2,000.00', '2,000.00', '2,000.00'] },
          { label: 'Co-Insured — Natural Death', values: ['10,000.00', '20,000.00', '40,000.00'] },
          { label: 'Co-Insured — Accidental Death Benefit', values: ['20,000.00', '30,000.00', '50,000.00'] },
          { label: 'Annual Premium', values: ['2,790.00', '', ''], highlight: true },
        ],
      },
    ],
  },
  {
    id: 'care-members',
    kicker: 'C.A.R.E. members',
    title: 'Family-oriented protection designed for member households.',
    text: 'These catalog entries extend coverage to principals, spouses, parents, live-in partners, children, and siblings, depending on the plan.',
    products: [
      {
        id: 'fip',
        abbr: 'FIP',
        name: 'Family Insurance Plan',
        summary: 'Protection plan for principal members and qualified family members with life, accident, hospital income, and burial-related benefits.',
        tone: '#5E77F0',
        toneSoft: 'rgba(94, 119, 240, 0.10)',
        premiumLabel: 'Premium',
        premium: '₱750 – ₱1,800',
        period: 'semi-annual / annual',
        columns: familyColumns,
        rows: [
          { label: 'Life Insurance', values: ['50,000.00', '50,000.00', '30,000.00', '30,000.00', '10,000.00'] },
          { label: 'Accidental Death & Dismemberment', values: ['100,000.00', 'NONE', '60,000.00', 'NONE', '20,000.00'] },
          { label: 'Disablement & Dismemberment', values: ['PER SCHED', 'NONE', 'PER SCHED', 'NONE', 'NONE'] },
          { label: 'MRA', values: ['5,000.00', '', '5,000.00', '', '1,000.00'] },
          { label: 'Hospital Income Benefit', values: ['200/day (max of 30 days)', '', '200/day (max of 30 days)', '', 'NONE'] },
          { label: 'CBB', values: ['10,000.00', '', '2,500.00', '', '1,000.00'] },
          { label: 'Annual Premium', values: ['1,500.00', '', '', '', ''], highlight: true },
          { label: 'Semi-Annual Premium', values: ['750.00', '', '', '', ''], highlight: true },
          { label: 'Annual Premium (70–80 y.o)', values: ['1,800.00', '', '', '', ''], highlight: true },
          { label: 'Semi-Annual Premium (70–80 y.o)', values: ['900.00', '', '', '', ''], highlight: true },
        ],
      },
      {
        id: 'mempco-protect-1',
        abbr: 'MP1',
        name: 'MEMPCO Protect 1',
        summary: 'Enhanced family and yearly renewable term package with stepped benefits based on membership duration.',
        tone: '#36A52E',
        toneSoft: 'rgba(54, 165, 46, 0.12)',
        premiumLabel: 'Premium',
        premium: '₱1,200 – ₱2,700',
        period: 'semi-annual / annual',
        columns: familyColumns,
        rows: [
          { label: 'Life Insurance 1–5 years', values: ['90,000.00', '90,000.00', '40,000.00', '40,000.00', '20,000.00'] },
          { label: 'Accidental Death & Dismemberment 1–5 years', values: ['220,000.00', 'NONE', '90,000.00', 'NONE', '50,000.00'] },
          { label: 'Life Insurance 6–10 years', values: ['110,000.00', '110,000.00', '50,000.00', '50,000.00', '30,000.00'] },
          { label: 'Accidental Death & Dismemberment 6–10 years', values: ['260,000.00', 'NONE', '110,000.00', 'NONE', '70,000.00'] },
          { label: 'Life Insurance 11 years above', values: ['130,000.00', '130,000.00', '70,000.00', '70,000.00', '50,000.00'] },
          { label: 'Accidental Death & Dismemberment 11 years above', values: ['300,000.00', 'NONE', '150,000.00', 'NONE', '110,000.00'] },
          { label: 'Disablement & Dismemberment', values: ['PER SCHED', 'NONE', 'PER SCHED', 'NONE', 'NONE'] },
          { label: 'MRA', values: ['5,000.00', '', '5,000.00', '', '1,000.00'] },
          { label: 'Hospital Income Benefit', values: ['200/day (max of 30 days)', '', '200/day (max of 30 days)', '', 'NONE'] },
          { label: 'CBB', values: ['10,000.00', '', '2,500.00', '', '1,000.00'] },
          { label: 'Annual Premium', values: ['2,400.00', '', '', '', ''], highlight: true },
          { label: 'Semi-Annual Premium', values: ['1,200.00', '', '', '', ''], highlight: true },
          { label: 'Annual Premium (70–80 y.o)', values: ['2,700.00', '', '', '', ''], highlight: true },
          { label: 'Semi-Annual Premium (70–80 y.o)', values: ['1,350.00', '', '', '', ''], highlight: true },
        ],
      },
    ],
  },
  {
    id: 'loan-protection',
    kicker: 'Loan protection',
    title: 'Insurance tied to loan amount, borrower age, and term of loan.',
    text: 'These entries are structured more like rate schedules, so the table below keeps the catalog format visible and easier to compare.',
    products: [
      {
        id: 'clpp',
        abbr: 'CLPP',
        name: 'Coop Loan Protection Plan',
        summary: 'Loan-linked protection for natural death and accidental death, with age-based premium rates.',
        tone: '#E39A18',
        toneSoft: 'rgba(227, 154, 24, 0.12)',
        premiumLabel: 'Rate',
        premium: '₱1.35 – ₱3.00',
        period: 'per ₱1,000 / month',
        columns: ['Coverage', 'Age', 'Premium'],
        rows: [
          { label: 'Natural Death', values: ['3,000 to 200,000', '18–69', '1.35php/1,000 per month'] },
          { label: 'Natural Death', values: ['3,000 to 200,000', '70–80', '3php/1,000 per month'] },
          { label: 'Accidental Death', values: ['Double Indemnity', '18–65', '1.35php/1,000 per month'] },
        ],
      },
      {
        id: 'lppi-natural-death',
        abbr: 'LPPI-ND',
        name: 'Loan Payment Protection Insurance — Natural Death',
        summary: 'Natural death schedule with premium rates that vary by age bracket and coverage amount.',
        tone: '#B32020',
        toneSoft: 'rgba(179, 32, 32, 0.10)',
        premiumLabel: 'Rate',
        premium: '₱0.90 – ₱8.75',
        period: 'per ₱1,000 / month',
        columns: ['Coverage', 'Age', 'Premium'],
        rows: [
          { label: 'Natural Death', values: ['3,000 to 350,000', '18–65', '0.90php/1,000 per month'] },
          { label: 'Natural Death', values: ['3,000 to 350,000', '66–70', '3php/1,000 per month'] },
          { label: 'Natural Death', values: ['350,000 to 2,000,000', '66–70', '4php/1,000 per month'] },
          { label: 'Natural Death', values: ['3,000 to 350,000', '71–75', '4php/1,000 per month'] },
          { label: 'Natural Death', values: ['350,000 to 2,000,000', '71–75', '5php/1,000 per month'] },
          { label: 'Natural Death', values: ['3,000 to 350,000', '76–80', '5php/1,000 per month'] },
          { label: 'Natural Death', values: ['350,000 to 1,000,000', '76–80', '8.75php/1,000 per month'] },
        ],
      },
      {
        id: 'lppi-accidental-death',
        abbr: 'LPPI-AD',
        name: 'Loan Payment Protection Insurance — Accidental Death',
        summary: 'Accidental death coverage with premiums scheduled according to the term of the loan.',
        tone: '#2E9E36',
        toneSoft: 'rgba(46, 158, 54, 0.11)',
        premiumLabel: 'Coverage',
        premium: '₱3,000 – ₱2,000,000',
        period: 'age 18–65',
        columns: ['Coverage', 'Age', 'Premium / Term of Loan'],
        rows: [
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '0.65php — 1 month'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '1.25php — 2 months'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '1.90php — 3 months'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '2.50php — 4 months'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '3.10php — 5 months'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '3.75php — 6 months'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '4.35php — 7 months'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '5.00php — 8 months'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '5.60php — 9 months'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '6.25php — 10 months'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '6.60php — 11 months'] },
          { label: 'Accidental Death', values: ['3,000 to 2,000,000', '18–65', '6.65php — 12 months'] },
        ],
      },
    ],
  },
  {
    id: 'non-life',
    kicker: 'Non-life insurance',
    title: 'Property, vehicle, and calamity coverage.',
    text: 'This section groups the non-life catalog entries exactly as insurance products rather than loan or family protection plans.',
    products: [
      {
        id: 'weather-protect',
        abbr: 'WP',
        name: 'Weather Protect',
        summary: 'Natural calamity coverage listed in the catalog under non-life insurance.',
        tone: '#2D4CB0',
        toneSoft: 'rgba(45, 76, 176, 0.10)',
        premiumLabel: 'Premium',
        premium: '₱177,000',
        period: 'catalog entry',
        columns: ['Coverage', 'Premium'],
        rows: [
          { label: 'Natural Calamities', values: ['1,500,000.00', '177,000.00'] },
        ],
      },
      {
        id: 'comprehensive-car',
        abbr: 'CCI',
        name: 'Comprehensive Car Insurance',
        summary: 'Vehicle coverage catalog entry showing own damage, theft, injury, damage, accident, and act of nature coverage.',
        tone: '#2E9E36',
        toneSoft: 'rgba(46, 158, 54, 0.12)',
        premiumLabel: 'Total Amount',
        premium: '₱15,394.23',
        period: 'as shown in catalog',
        columns: ['Coverage', 'Premium'],
        rows: [
          { label: 'Own Damage', values: ['600,000.00', '9,000.00'] },
          { label: 'Theft', values: ['600,000.00', '—'] },
          { label: 'Bodily Injury', values: ['250,000.00', '510.00'] },
          { label: 'Property Damage', values: ['250,000.00', '1,320.00'] },
          { label: 'Motor Vehicle Driver/Passenger Accident', values: ['100,000.00', '—'] },
          { label: 'Act of Nature', values: ['600,000.00', '3,000.00'] },
          { label: 'Total Amount', values: ['', '15,394.23'], highlight: true },
        ],
      },
      {
        id: 'ctpl',
        abbr: 'CTPL',
        name: 'Motor & Car Compulsory Third Party Liability',
        summary: 'Compulsory liability coverage for motorcycle and car entries shown in the catalog.',
        tone: '#D72626',
        toneSoft: 'rgba(215, 38, 38, 0.10)',
        premiumLabel: 'Premium',
        premium: '₱303 – ₱589',
        period: 'by vehicle type',
        columns: ['Coverage', 'Premium'],
        rows: [
          { label: 'Motorcycle', values: ['200,000.00', '303.00'] },
          { label: 'Car', values: ['200,000.00', '589.00'] },
        ],
      },
      {
        id: 'fire-insurance',
        abbr: 'FIRE',
        name: 'Fire Insurance',
        summary: 'Property package for building and household contents.',
        tone: '#F28C28',
        toneSoft: 'rgba(242, 140, 40, 0.12)',
        premiumLabel: 'Package Premium',
        premium: '₱2,350',
        period: 'catalog entry',
        columns: ['Coverage', 'Premium'],
        rows: [
          { label: 'Building Only', values: ['800,000.00', '—'] },
          { label: 'Furnitures, Fixture & Household Appliances', values: ['200,000.00', '2,350.00'] },
        ],
      },
    ],
  },
];

const stats = [
  { value: '15', label: 'Insurance products catalogued' },
  { value: '4', label: 'Coverage groups' },
  { value: '₱250', label: 'Lowest annual premium shown' },
  { value: '₱1.5M', label: 'Highest coverage shown' },
];

const quickGuide = [
  {
    title: 'Life Insurance Products',
    text: 'Yearly renewable term, accident coverage, bundled protection, and deposit-linked insurance.',
  },
  {
    title: 'C.A.R.E Member Plans',
    text: 'Family-oriented products for principals, spouses, parents, children, and siblings.',
  },
  {
    title: 'Loan Protection',
    text: 'Rate-based plans tied to loan amount, borrower age, and term.',
  },
  {
    title: 'Non-Life Insurance',
    text: 'Coverage for vehicles, calamities, and property protection.',
  },
];

function InsuranceTable({ product }) {
  return (
    <article
      id={product.id}
      className="ins-product-card"
      style={{
        '--accent': product.tone,
        '--accent-soft': product.toneSoft,
      }}
    >
      <div className="ins-product-topbar" />

      <div className="ins-product-header">
        <div className="ins-product-copy">
          <div className="ins-product-meta">
            <span className="ins-product-abbr">{product.abbr}</span>
            <span className="ins-product-pill">{product.summary}</span>
          </div>
          <h3 className="ins-product-name">{product.name}</h3>
        </div>

        <div className="ins-product-premium">
          <span className="ins-product-premium-label">{product.premiumLabel}</span>
          <span className="ins-product-premium-value">{product.premium}</span>
          <span className="ins-product-premium-period">{product.period}</span>
        </div>
      </div>

      <div className="ins-product-table-wrap">
        <table className="ins-product-table">
          <thead>
            <tr>
              <th>Benefits</th>
              {product.columns.map((col, ci) => (
                <th key={`${product.id}-col-${ci}`}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {product.rows.map((row, ri) => (
              <tr
                key={`${product.id}-row-${ri}`}
                className={row.highlight ? 'is-highlight' : undefined}
              >
                <td>{row.label}</td>
                {row.values.map((val, vi) => (
                  <td key={`${product.id}-cell-${ri}-${vi}`}>{val || '\u00A0'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function AccordionItem({ product, isOpen, onToggle }) {
  return (
    <div
      className={`ins-acc-item ${isOpen ? 'is-open' : ''}`}
      style={{ '--accent': product.tone, '--accent-soft': product.toneSoft }}
    >
      <button
        className="ins-acc-header"
        type="button"
        aria-expanded={isOpen}
        aria-controls={`acc-body-${product.id}`}
        onClick={onToggle}
      >
        <span className="ins-acc-bar" aria-hidden="true" />

        <span
          className="ins-acc-dot"
          style={{ background: product.tone }}
          aria-hidden="true"
        />

        <span className="ins-acc-abbr" style={{ background: product.tone }}>
          {product.abbr}
        </span>

        <span className="ins-acc-name">{product.name}</span>

        <span className="ins-acc-premium" style={{ color: product.tone }}>
          {product.premium}
        </span>

        <span className="ins-acc-chevron" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 5l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <div
        id={`acc-body-${product.id}`}
        className="ins-acc-body"
        role="region"
        aria-labelledby={`acc-header-${product.id}`}
      >
        <div className="ins-acc-body-inner">
          <InsuranceTable product={product} />
        </div>
      </div>
    </div>
  );
}

function CategoryShowcase({ category }) {
  const [openId, setOpenId] = useState(category.products[0]?.id ?? null);

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <section
      id={category.id}
      className="ins-section ins-category"
      aria-labelledby={`${category.id}-heading`}
    >
      <div className="ins-inner">
        <div className="ins-category-header">
          <div>
            <p className="ins-section-kicker">{category.kicker}</p>
            <h2 className="ins-section-title" id={`${category.id}-heading`}>
              {category.title}
            </h2>
            <p className="ins-section-text">{category.text}</p>
          </div>
        </div>

        <div className="ins-acc-list">
          {category.products.map((product) => (
            <AccordionItem
              key={product.id}
              product={product}
              isOpen={openId === product.id}
              onToggle={() => toggle(product.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function InsurancePage() {
  return (
    <div className="ins">
      <section className="ins-section ins-hero" aria-labelledby="ins-heading">
        <div className="ins-inner ins-hero-inner">
          <div className="ins-hero-copy">
            <nav className="ins-breadcrumb" aria-label="Breadcrumb">
              <span>Services</span>
              <span className="ins-breadcrumb-sep">/</span>
              <span>Allied Services</span>
              <span className="ins-breadcrumb-sep">/</span>
              <span className="ins-breadcrumb-active">Insurance</span>
            </nav>

            <span className="ins-eyebrow">MEMPCO Allied Services</span>

            <h1 className="ins-hero-title" id="ins-heading">
              <span className="ins-section-title-line1">Insurance Catalog.</span>
              <span className="ins-section-title-line2 accent">For Members</span>
            </h1>

            <p className="ins-hero-tagline">
              A complete catalog of MEMPCO insurance products covering life insurance, family plans, loan protection, and non-life coverage.
            </p>

            <div className="ins-hero-chips">
              {categories.map((category) => (
                <a href={`#${category.id}`} className="ins-hero-chip" key={category.id}>
                  <span className="ins-hero-chip-kicker">{category.kicker}</span>
                  <span className="ins-hero-chip-title">{category.title}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="ins-hero-visual" aria-label="COOPAssurance logo">
            <div className="ins-logo-stage">
              <img
                src="/Services/COOPAssurance.png"
                alt="MEMPCO COOPAssurance logo"
                className="ins-logo-image"
              />

              <a
                href="https://www.facebook.com/profile.php?id=61568883475888"
                className="ins-logo-facebook-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit MEMPCO Insurance Facebook page"
              >
                <span className="ins-logo-facebook-icon">
                  <FacebookIcon />
                </span>
                <span>Visit Facebook Page</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="ins-section ins-stats" aria-label="Key figures">
        <div className="ins-inner">
          <div className="ins-stats-grid">
            {stats.map((item, i) => (
              <div className="ins-stat" key={item.label} style={{ '--stat-index': i }}>
                <span className="ins-stat-value">{item.value}</span>
                <span className="ins-stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ins-section ins-overview" aria-labelledby="ins-overview-heading">
        <div className="ins-inner">
          <div className="ins-section-head">
            <div>
              <p className="ins-section-kicker">Coverage overview</p>
              <h2 className="ins-section-title" id="ins-overview-heading">
                Structured by insurance type.
              </h2>
              <p className="ins-section-text">
                This layout turns the page into a full product catalog so every insurance
                entry is easier to browse, compare, and update later.
              </p>
            </div>
          </div>

          <div className="ins-overview-grid">
            {quickGuide.map((item, i) => (
              <div className="ins-overview-card" key={item.title} style={{ '--card-index': i }}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {categories.map((category) => (
        <CategoryShowcase key={category.id} category={category} />
      ))}

      <section className="ins-section ins-note" aria-labelledby="ins-note-heading">
        <div className="ins-inner">
          <div className="ins-note-inner">
            <p className="ins-note-kicker">Get covered</p>
            <h2 className="ins-note-title" id="ins-note-heading">
              For enrollment, claims, and full terms,
              <br />
              coordinate with MEMPCO.
            </h2>
            <p className="ins-note-text">
              For final enrollment requirements, updated pricing, and claims
              processing, members should still confirm directly with MEMPCO.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}