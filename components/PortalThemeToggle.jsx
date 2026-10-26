'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_STORAGE_KEY = 'mempco-portal-theme';

export default function PortalThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    let savedTheme = 'light';

    try {
      savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      savedTheme = 'light';
    }

    document.body.dataset.portalTheme = savedTheme;
    setTheme(savedTheme);

    return () => {
      delete document.body.dataset.portalTheme;
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.portalTheme = nextTheme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Keep the in-memory preference when storage is unavailable.
    }

    setTheme(nextTheme);
  };

  const Icon = theme === 'dark' ? Sun : Moon;
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      className="portal-theme-toggle"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={theme === 'dark'}
      title={label}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}
