'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import './Navbar.css'

export default function Navbar() {
  const CAREER_PATH = '/jobs'
  const MLC_PATH = '/services/mlc'

  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [membershipOpen, setMembershipOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [currentHash, setCurrentHash] = useState('')

  const [openServiceGroup, setOpenServiceGroup] = useState(null)
  const [openNestedServiceGroup, setOpenNestedServiceGroup] = useState(null)

  const pathname = usePathname()
  const navbarRef = useRef(null)

  const isActive = (path, exact = false) => {
    if (exact) return pathname === path
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const isGovernanceOverviewActive = pathname === '/governance'
  const isBoardActive = pathname === '/governance/board-of-directors'
  const isManagementActive = pathname === '/governance/management'

  const isGovernanceActive =
    isGovernanceOverviewActive ||
    isBoardActive ||
    isManagementActive

  const isAboutActive =
    isActive('/about') ||
    isActive('/data-privacy') ||
    isGovernanceActive

  const isRegularSavingsActive = pathname === '/services/savings/regular-savings'
  const isKktActive = pathname === '/services/savings/kkt'
  const isTimeDepositActive = pathname === '/services/savings/time-deposit'

  const isCareProgramActive = pathname === '/services/loans/care-program'
  const isBusinessLoanActive = pathname === '/services/loans/business-loan'
  const isProvidentialLoanActive = pathname === '/services/loans/providential-loan'

  const isServicesActive =
    isActive('/services') ||
    isActive('/services/savings') ||
    isActive('/services/loans') ||
    isActive('/services/insurance') ||
    isActive('/services/transportation') ||
    isActive('/services/funeral') ||
    isActive('/services/wellness') ||
    isActive(MLC_PATH) ||
    isCareProgramActive

  const isInsuranceActive = pathname === '/services/insurance'
  const isTransportationActive = pathname === '/services/transportation'
  const isFuneralActive = pathname === '/services/funeral'
  const isWellnessDiagnosticsActive = pathname === '/services/wellness'
  const isLaboratoryActive = isActive(MLC_PATH)

  const isSavingsActive =
    isRegularSavingsActive ||
    isKktActive ||
    isTimeDepositActive ||
    openNestedServiceGroup === 'savings'

  const isLoansActive =
    isBusinessLoanActive ||
    isProvidentialLoanActive ||
    isCareProgramActive ||
    openNestedServiceGroup === 'loans'

  const isSavingsCreditActive =
    isSavingsActive ||
    isLoansActive ||
    openServiceGroup === 'savings-credit'

  const isAlliedActive =
    isInsuranceActive ||
    isTransportationActive ||
    isFuneralActive ||
    isWellnessDiagnosticsActive ||
    openServiceGroup === 'allied'

  const isCareerActive = isActive(CAREER_PATH)
  const isMembershipActive = isActive('/membership') || membershipOpen
  const isWhatsNewActive =
    isActive('/news') ||
    isActive('/promos') ||
    isCareerActive ||
    whatsNewOpen
  const isContactActive =
    isActive('/branches') ||
    isActive('/contact-details') ||
    contactOpen

  const closeDropdowns = () => {
    setAboutOpen(false)
    setServicesOpen(false)
    setMembershipOpen(false)
    setWhatsNewOpen(false)
    setContactOpen(false)
    setOpenServiceGroup(null)
    setOpenNestedServiceGroup(null)
  }

  const closeAll = () => {
    setMenuOpen(false)
    closeDropdowns()
  }

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev)
    closeDropdowns()
  }

  const toggleAbout = () => {
    setAboutOpen((prev) => !prev)
    setServicesOpen(false)
    setMembershipOpen(false)
    setWhatsNewOpen(false)
    setContactOpen(false)
    setOpenServiceGroup(null)
    setOpenNestedServiceGroup(null)
  }

  const toggleServices = () => {
    setServicesOpen((prev) => !prev)
    setAboutOpen(false)
    setMembershipOpen(false)
    setWhatsNewOpen(false)
    setContactOpen(false)
  }

  const toggleMembership = () => {
    setMembershipOpen((prev) => !prev)
    setAboutOpen(false)
    setServicesOpen(false)
    setWhatsNewOpen(false)
    setContactOpen(false)
    setOpenServiceGroup(null)
    setOpenNestedServiceGroup(null)
  }

  const toggleWhatsNew = () => {
    setWhatsNewOpen((prev) => !prev)
    setAboutOpen(false)
    setServicesOpen(false)
    setMembershipOpen(false)
    setContactOpen(false)
    setOpenServiceGroup(null)
    setOpenNestedServiceGroup(null)
  }

  const toggleContact = () => {
    setContactOpen((prev) => !prev)
    setAboutOpen(false)
    setServicesOpen(false)
    setMembershipOpen(false)
    setWhatsNewOpen(false)
    setOpenServiceGroup(null)
    setOpenNestedServiceGroup(null)
  }

  const toggleServiceGroup = (group) => {
    const nextGroup = openServiceGroup === group ? null : group
    setOpenServiceGroup(nextGroup)

    if (nextGroup !== 'savings-credit') {
      setOpenNestedServiceGroup(null)
    }
  }

  const toggleNestedServiceGroup = (group) => {
    setOpenNestedServiceGroup((prev) => (prev === group ? null : group))
  }

  const handleNavigation = () => {
    closeAll()

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const handleMenuClose = () => {
    closeAll()
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const updateHash = () => {
      setCurrentHash(window.location.hash || '')
    }

    updateHash()
    window.addEventListener('hashchange', updateHash)

    return () => window.removeEventListener('hashchange', updateHash)
  }, [pathname])

  useEffect(() => {
    setMenuOpen(false)
    closeDropdowns()
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) {
      if (document.body.style.overflow === 'auto') {
        document.body.style.overflow = ''
      }

      if (document.documentElement.style.overflow === 'auto') {
        document.documentElement.style.overflow = ''
      }

      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = previousRootOverflow
    }
  }, [menuOpen])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        closeDropdowns()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {mounted &&
        createPortal(
          <div
            className={`nav-backdrop${menuOpen ? ' active' : ''}`}
            onClick={handleMenuClose}
            aria-hidden="true"
          />,
          document.body
        )}

      <nav ref={navbarRef} className={`navbar ${scrolled ? 'scrolled' : 'top'}`}>
        <div className="navbar-container">
          <Link href="/" onClick={handleNavigation} className="navbar-brand" aria-label="MEMPCO home">
            <img src="/Logos/L1.png" alt="MEMPCO" className="navbar-brand__logo" />
          </Link>

          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li className="nav-item nav-item--home">
              <Link
                href="/"
                onClick={handleNavigation}
                className={`nav-link ${isActive('/', true) ? 'active' : ''}`}
              >
                Home
              </Link>
            </li>

            <li className={`nav-item nav-item--about nav-dropdown ${aboutOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`nav-trigger ${isAboutActive ? 'active' : ''}`}
                onClick={toggleAbout}
                aria-expanded={aboutOpen}
              >
                <span>About</span>
                <span className="arrow"></span>
              </button>

              <ul className="nav-dropdown-menu about-dropdown-menu">
                <li className="about-mega__column">
                  <Link href="/about/history" onClick={handleNavigation} className="about-mega__heading">
                    History
                  </Link>
                  <ul className="about-mega__links">
                    <li><Link href="/about/history" onClick={handleNavigation}>Journey & Milestones</Link></li>
                  </ul>
                </li>
                <li className="about-mega__column">
                  <Link href="/about/vision-mission-core-values" onClick={handleNavigation} className="about-mega__heading">
                    Vision, Mission &amp; Core Values
                  </Link>
                  <ul className="about-mega__links">
                    <li><Link href="/about/vision-mission-core-values" onClick={handleNavigation}>Our Foundation</Link></li>
                  </ul>
                </li>
                <li className="about-mega__column">
                  <Link href="/governance" onClick={handleNavigation} className="about-mega__heading">
                    Governance
                  </Link>
                  <ul className="about-mega__links">
                    <li><Link href="/governance" onClick={handleNavigation}>Governance Overview</Link></li>
                    <li><Link href="/governance/board-of-directors" onClick={handleNavigation}>Board of Directors</Link></li>
                    <li><Link href="/governance/management" onClick={handleNavigation}>Management</Link></li>
                  </ul>
                </li>
                <li className="about-mega__column">
                  <Link href="/about/awards" onClick={handleNavigation} className="about-mega__heading">
                    Awards
                  </Link>
                  <ul className="about-mega__links">
                    <li><Link href="/about/awards" onClick={handleNavigation}>Awards & Recognition</Link></li>
                  </ul>
                </li>
                <li className="about-mega__column">
                  <Link href="/about/member-stories" onClick={handleNavigation} className="about-mega__heading">
                    Member Stories
                  </Link>
                  <ul className="about-mega__links">
                    <li><Link href="/about/member-stories" onClick={handleNavigation}>Member Experiences</Link></li>
                  </ul>
                </li>
              </ul>
            </li>

            <li className={`nav-item nav-item--news nav-dropdown ${whatsNewOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`nav-trigger ${isWhatsNewActive ? 'active' : ''}`}
                onClick={toggleWhatsNew}
                aria-expanded={whatsNewOpen}
              >
                <span>What&apos;s New</span>
                <span className="arrow"></span>
              </button>

              <ul className="nav-dropdown-menu whats-new-dropdown-menu">
                <li className="whats-new-mega__column">
                  <Link href="/news" onClick={handleNavigation} className="whats-new-mega__heading">
                    News &amp; Events
                  </Link>
                  <ul className="whats-new-mega__links">
                    <li><Link href="/news" onClick={handleNavigation}>Latest announcements</Link></li>
                  </ul>
                </li>

                <li className="whats-new-mega__column">
                  <Link href="/promos" onClick={handleNavigation} className="whats-new-mega__heading">
                    Promos
                  </Link>
                  <ul className="whats-new-mega__links">
                    <li><Link href="/promos" onClick={handleNavigation}>Current offers</Link></li>
                  </ul>
                </li>

                <li className="whats-new-mega__column">
                  <Link href={CAREER_PATH} onClick={handleNavigation} className="whats-new-mega__heading">
                    Career
                  </Link>
                  <ul className="whats-new-mega__links">
                    <li><Link href={CAREER_PATH} onClick={handleNavigation}>Open positions</Link></li>
                  </ul>
                </li>
              </ul>
            </li>

            <li className={`nav-item nav-item--services nav-dropdown ${servicesOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`nav-trigger ${isServicesActive ? 'active' : ''}`}
                onClick={toggleServices}
                aria-expanded={servicesOpen}
              >
                <span>Services</span>
                <span className="arrow"></span>
              </button>

              <ul className="nav-dropdown-menu services-dropdown-menu">
                <li className="services-mega__column">
                  <Link href="/services" onClick={handleNavigation} className="services-mega__heading">
                    Savings
                  </Link>
                  <ul className="services-mega__links">
                    <li><Link href="/services/savings/regular-savings" onClick={handleMenuClose}>Regular Savings</Link></li>
                    <li><Link href="/services/savings/kkt" onClick={handleMenuClose}>KKT Savings</Link></li>
                    <li><Link href="/services/savings/time-deposit" onClick={handleMenuClose}>Time Deposit</Link></li>
                    <li><Link href="/services/savings/aflatoun-savings" onClick={handleMenuClose}>Aflatoun Savings</Link></li>
                    <li><Link href="/services/savings/youth-savings" onClick={handleMenuClose}>Youth Savings</Link></li>
                  </ul>
                </li>

                <li className="services-mega__column">
                  <Link href="/services" onClick={handleNavigation} className="services-mega__heading">
                    Loans
                  </Link>
                  <ul className="services-mega__links">
                    <li><Link href="/services/loans/care-program" onClick={handleMenuClose}>CARE Program</Link></li>
                    <li><Link href="/services/loans/business-loan" onClick={handleMenuClose}>Business Loan</Link></li>
                    <li><Link href="/services/loans/providential-loan" onClick={handleMenuClose}>Providential Loan</Link></li>
                  </ul>
                </li>

                <li className="services-mega__column">
                  <Link href="/services" onClick={handleNavigation} className="services-mega__heading">
                    Allied Services
                  </Link>
                  <ul className="services-mega__links">
                    <li><Link href="/services/insurance" onClick={handleMenuClose}>Insurance</Link></li>
                    <li><Link href="/services/transportation" onClick={handleMenuClose}>Transportation</Link></li>
                    <li><Link href="/services/funeral" onClick={handleMenuClose}>Funeral Services</Link></li>
                    <li><Link href="/services/wellness" onClick={handleMenuClose}>Wellness &amp; Diagnostics</Link></li>
                  </ul>
                </li>

                <li className="services-mega__column">
                  <Link href={MLC_PATH} onClick={handleMenuClose} className="services-mega__heading">
                    Laboratory Cooperative
                  </Link>
                  <ul className="services-mega__links">
                    <li><Link href={MLC_PATH} onClick={handleMenuClose}>MEMPCO Laboratory Cooperative</Link></li>
                    <li><Link href="/services" onClick={handleNavigation}>View All Services</Link></li>
                  </ul>
                </li>
              </ul>
            </li>

            <li className={`nav-item nav-item--membership nav-dropdown ${membershipOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`nav-trigger ${isMembershipActive ? 'active' : ''}`}
                onClick={toggleMembership}
                aria-expanded={membershipOpen}
              >
                <span>Membership</span>
                <span className="arrow"></span>
              </button>

              <ul className="nav-dropdown-menu membership-dropdown-menu">
                <li className="membership-mega__column">
                  <Link href="/membership" onClick={handleNavigation} className="membership-mega__heading">
                    How to Apply?
                  </Link>
                  <ul className="membership-mega__links">
                    <li><Link href="/membership" onClick={handleNavigation}>Application guide</Link></li>
                  </ul>
                </li>

                <li className="membership-mega__column">
                  <Link href="/membership/pmes" onClick={handleNavigation} className="membership-mega__heading">
                    PMES
                  </Link>
                  <ul className="membership-mega__links">
                    <li><Link href="/membership/pmes" onClick={handleNavigation}>Pre-membership seminar</Link></li>
                  </ul>
                </li>

                <li className="membership-mega__column">
                  <Link href="/membership/package" onClick={handleNavigation} className="membership-mega__heading">
                    Membership Package
                  </Link>
                  <ul className="membership-mega__links">
                    <li><Link href="/membership/package" onClick={handleNavigation}>Fees and inclusions</Link></li>
                  </ul>
                </li>
              </ul>
            </li>

            <li className={`nav-item nav-item--contact nav-dropdown ${contactOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`nav-trigger ${isContactActive ? 'active' : ''}`}
                onClick={toggleContact}
                aria-expanded={contactOpen}
              >
                <span>Contact Us</span>
                <span className="arrow"></span>
              </button>

              <ul className="nav-dropdown-menu contact-dropdown-menu">
                <li className="contact-mega__column">
                  <Link href="/branches" onClick={handleNavigation} className="contact-mega__heading">
                    Visit MEMPCO
                  </Link>
                  <ul className="contact-mega__links">
                    <li><Link href="/branches" onClick={handleNavigation}>Branches and ATMs</Link></li>
                    <li><Link href="/contact-details" onClick={handleNavigation}>Contact Details</Link></li>
                  </ul>
                </li>

              </ul>
            </li>

          </ul>

          <button
            className={`hamburger ${menuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            type="button"
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
    </>
  )
}
