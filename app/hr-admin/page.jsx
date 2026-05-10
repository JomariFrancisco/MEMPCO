'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCurrentPortalUser,
  isHrAdminRole,
  isInactivePortalUser,
  signOutPortal,
} from '@/lib/auth/portalAuth';
import './hr-admin.css';

const HRMAX_ROUTE = '/HRMax';

export default function HrAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const activeUser = await getCurrentPortalUser().catch(() => null);

      if (cancelled) return;

      if (!activeUser || isInactivePortalUser(activeUser) || !isHrAdminRole(activeUser.role)) {
        await signOutPortal().catch(() => {});
        router.replace('/LogIn');
        return;
      }

      setUser(activeUser);
      setChecked(true);
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked || !user) {
    return (
      <>
        <main className="portal-main hr-admin-main" />
      </>
    );
  }

  return (
    <>
      <main className="portal-main hr-admin-main">
        <section className="hr-admin-shell">
          <div className="hr-admin-head">
            <span className="hr-admin-kicker">HR Admin</span>
            <a className="hrmax-btn" href={HRMAX_ROUTE}>
              HRMax
            </a>
          </div>
          <h1>Careers and Applications Backend</h1>
          <p>
            Supabase is ready for HR content management. The next UI layer can
            manage job openings and review submitted applications from this route.
          </p>
          <div className="hr-admin-user">
            <strong>{user.name}</strong>
            <span>{user.designation || user.department || 'HR Admin'}</span>
          </div>
        </section>
      </main>
    </>
  );
}
