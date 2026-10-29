'use client';

import { ChevronRight } from 'lucide-react';
import './PortalProfileLayout.css';

export default function PortalProfileLayout({
  photoControl,
  name,
  subtitle,
  meta = [],
  headerDetails = [],
  showProfilePanels = true,
  stats = [],
  facts = [],
  scopeEyebrow,
  scopeTitle,
  scopeItems = [],
  activityEyebrow,
  activityTitle,
  activityActionLabel,
  onActivityAction,
  activity = [],
  emptyActivityTitle,
  emptyActivityText,
}) {
  return (
    <div className="portal-profile-layout">
      <section className="portal-profile-header">
        <div className="portal-profile-identity">
          <div className="portal-profile-photo">{photoControl}</div>
          <div className="portal-profile-heading">
            <span className="portal-profile-eyebrow">Profile</span>
            <h2>{name}</h2>
            <p>{subtitle}</p>
            <div className="portal-profile-meta">
              {meta.map((item) => (
                <span key={`${item.label}-${item.value}`}>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
        {headerDetails.length > 0 && (
          <div className="portal-profile-header-details">
            {headerDetails.map((item) => (
              <div key={item.label}>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="portal-profile-stats" aria-label="Profile summary">
        {stats.map((item) => (
          <article key={item.label} className="portal-profile-stat">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.meta}</p>
          </article>
        ))}
      </section>

      {showProfilePanels && <div className="portal-profile-main-grid">
        <section className="portal-profile-panel">
          <div className="portal-profile-panel-heading">
            <div>
              <span className="portal-profile-eyebrow">Account Record</span>
              <h3>Identity &amp; Work Details</h3>
            </div>
          </div>
          <div className="portal-profile-facts">
            {facts.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="portal-profile-fact">
                  <span className="portal-profile-fact-icon"><Icon aria-hidden="true" /></span>
                  <div>
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="portal-profile-panel">
          <div className="portal-profile-panel-heading">
            <div>
              <span className="portal-profile-eyebrow">{scopeEyebrow}</span>
              <h3>{scopeTitle}</h3>
            </div>
          </div>
          <div className="portal-profile-scope-list">
            {scopeItems.map((item) => (
              <div key={item}>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>}

      <section className="portal-profile-panel portal-profile-activity-panel">
        <div className="portal-profile-panel-heading">
          <div>
            <span className="portal-profile-eyebrow">{activityEyebrow}</span>
            <h3>{activityTitle}</h3>
          </div>
          {activityActionLabel && onActivityAction && (
            <button type="button" className="portal-profile-action" onClick={onActivityAction}>
              {activityActionLabel}
            </button>
          )}
        </div>

        {activity.length ? (
          <div className="portal-profile-activity-list">
            {activity.map((item) => (
              <button
                key={item.id}
                type="button"
                className="portal-profile-activity"
                onClick={item.onClick}
              >
                <span className={`portal-profile-activity-status is-${String(item.status || 'open').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                  {item.status}
                </span>
                <span className="portal-profile-activity-copy">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <span className="portal-profile-activity-date">{item.date}</span>
                <ChevronRight className="portal-profile-activity-arrow" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <div className="portal-profile-empty">
            <strong>{emptyActivityTitle}</strong>
            <p>{emptyActivityText}</p>
          </div>
        )}
      </section>
    </div>
  );
}
