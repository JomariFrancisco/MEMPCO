'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import './Navbar.css'

export default function Navbar() {
  const CAREER_PATH = '/jobs'
  const MLC_PATH = '/services/mlc'
  const LOGIN_PATH = '/LogIn'

  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [governanceOpen, setGovernanceOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [currentHash, setCurrentHash] = useState('')

  const [openServiceGroup, setOpenServiceGroup] = useState(null)
  const [openNestedServiceGroup, setOpenNestedServiceGroup] = useState(null)

  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  })

  const pathname = usePathname()
  const navMenuRef = useRef(null)
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
    isManagementActive ||
    governanceOpen

  const isAboutActive =
    isActive('/about') ||
    isActive('/branches') ||
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
  const isLoginActive = isActive(LOGIN_PATH, true)

  const moveIndicatorToElement = (element) => {
    if (!element || !navMenuRef.current || window.innerWidth <= 900) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }))
      return
    }

    const menuRect = navMenuRef.current.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()

    setIndicatorStyle({
      left: elementRect.left - menuRect.left,
      width: elementRect.width,
      opacity: 1,
    })
  }

  const resetIndicator = () => {
    if (!navMenuRef.current || window.innerWidth <= 900) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }))
      return
    }

    const activeElement = navMenuRef.current.querySelector(
      '.nav-link.active, .nav-trigger.active'
    )

    if (activeElement) {
      moveIndicatorToElement(activeElement)
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }))
    }
  }

  const closeDropdowns = () => {
    setAboutOpen(false)
    setServicesOpen(false)
    setGovernanceOpen(false)
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
    setGovernanceOpen(false)
    setOpenServiceGroup(null)
    setOpenNestedServiceGroup(null)
  }

  const toggleServices = () => {
    setServicesOpen((prev) => !prev)
    setAboutOpen(false)
    setGovernanceOpen(false)
  }

  const toggleGovernance = () => {
    setGovernanceOpen((prev) => !prev)
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
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
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
    const updateIndicator = () => {
      requestAnimationFrame(() => {
        resetIndicator()
      })
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)

    return () => window.removeEventListener('resize', updateIndicator)
  }, [
    pathname,
    currentHash,
    aboutOpen,
    servicesOpen,
    governanceOpen,
    openServiceGroup,
    openNestedServiceGroup,
  ])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        closeDropdowns()
        resetIndicator()
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
          <ul
            ref={navMenuRef}
            className={`nav-menu ${menuOpen ? 'active' : ''}`}
            onMouseLeave={resetIndicator}
          >
            <li className="nav-item">
              <Link
                href="/"
                onClick={handleNavigation}
                onMouseEnter={(e) => moveIndicatorToElement(e.currentTarget)}
                className={`nav-link ${isActive('/', true) ? 'active' : ''}`}
              >
                Home
              </Link>
            </li>

            <li className={`nav-item nav-dropdown ${aboutOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`nav-trigger ${isAboutActive ? 'active' : ''}`}
                onClick={toggleAbout}
                onMouseEnter={(e) => moveIndicatorToElement(e.currentTarget)}
                aria-expanded={aboutOpen}
              >
                <span>About</span>
                <span className="arrow"></span>
              </button>

              <ul className="nav-dropdown-menu about-dropdown-menu">
                <li>
                  <Link
                    href="/about"
                    onClick={handleNavigation}
                    className={`dropdown-link ${pathname === '/about' ? 'active' : ''}`}
                  >
                    Overview
                  </Link>
                </li>

                <li>
                  <Link
                    href="/branches"
                    onClick={handleNavigation}
                    className={`dropdown-link ${isActive('/branches') ? 'active' : ''}`}
                  >
                    Offices
                  </Link>
                </li>

                <li className={`dropdown-accordion ${governanceOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className={`dropdown-group-toggle ${isGovernanceActive ? 'active' : ''}`}
                    onClick={toggleGovernance}
                  >
                    <span>Governance</span>
                    <span className="dropdown-mini-arrow"></span>
                  </button>

                  <ul className="dropdown-submenu">
                    <li>
                      <Link
                        href="/governance/board-of-directors"
                        onClick={handleNavigation}
                        className={`dropdown-sublink ${isBoardActive ? 'active' : ''}`}
                      >
                        Board of Directors
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/governance/management"
                        onClick={handleNavigation}
                        className={`dropdown-sublink ${isManagementActive ? 'active' : ''}`}
                      >
                        Management
                      </Link>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>

            <li className="nav-item">
              <Link
                href="/news"
                onClick={handleNavigation}
                onMouseEnter={(e) => moveIndicatorToElement(e.currentTarget)}
                className={`nav-link ${isActive('/news') ? 'active' : ''}`}
              >
                News &amp; Events
              </Link>
            </li>

            <li className={`nav-item nav-dropdown ${servicesOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`nav-trigger ${isServicesActive ? 'active' : ''}`}
                onClick={toggleServices}
                onMouseEnter={(e) => moveIndicatorToElement(e.currentTarget)}
                aria-expanded={servicesOpen}
              >
                <span>Services</span>
                <span className="arrow"></span>
              </button>

              <ul className="nav-dropdown-menu services-dropdown-menu">
                <li>
                  <Link
                    href="/services"
                    onClick={handleNavigation}
                    className={`dropdown-link ${
                      pathname === '/services' && !currentHash ? 'active' : ''
                    }`}
                  >
                    All Services
                  </Link>
                </li>

                <li
                  className={`dropdown-accordion ${
                    openServiceGroup === 'savings-credit' ? 'open' : ''
                  }`}
                >
                  <button
                    type="button"
                    className={`dropdown-group-toggle ${
                      isSavingsCreditActive ? 'active' : ''
                    }`}
                    onClick={() => toggleServiceGroup('savings-credit')}
                  >
                    <span>Savings &amp; Credit</span>
                    <span className="dropdown-mini-arrow"></span>
                  </button>

                  <ul className="dropdown-submenu">
                    <li
                      className={`dropdown-nested ${
                        openNestedServiceGroup === 'savings' ? 'open' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className={`dropdown-nested-toggle ${
                          isSavingsActive ? 'active' : ''
                        }`}
                        onClick={() => toggleNestedServiceGroup('savings')}
                      >
                        <span>Savings</span>
                        <span className="dropdown-mini-arrow"></span>
                      </button>

                      <ul className="dropdown-nested-menu">
                        <li>
                          <Link
                            href="/services/savings/regular-savings"
                            onClick={handleMenuClose}
                            className={`dropdown-sublink ${
                              isRegularSavingsActive ? 'active' : ''
                            }`}
                          >
                            Regular Savings
                          </Link>
                        </li>

                        <li>
                          <Link
                            href="/services/savings/kkt"
                            onClick={handleMenuClose}
                            className={`dropdown-sublink ${isKktActive ? 'active' : ''}`}
                          >
                            KKT (Kinabukasan Ko&apos;To)
                          </Link>
                        </li>

                        <li>
                          <Link
                            href="/services/savings/time-deposit"
                            onClick={handleMenuClose}
                            className={`dropdown-sublink ${
                              isTimeDepositActive ? 'active' : ''
                            }`}
                          >
                            Time Deposit
                          </Link>
                        </li>
                      </ul>
                    </li>

                    <li
                      className={`dropdown-nested ${
                        openNestedServiceGroup === 'loans' ? 'open' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className={`dropdown-nested-toggle ${
                          isLoansActive ? 'active' : ''
                        }`}
                        onClick={() => toggleNestedServiceGroup('loans')}
                      >
                        <span>Loan</span>
                        <span className="dropdown-mini-arrow"></span>
                      </button>

                      <ul className="dropdown-nested-menu">
                        <li>
                          <Link
                            href="/services/loans/care-program"
                            onClick={handleMenuClose}
                            className={`dropdown-sublink ${
                              isCareProgramActive ? 'active' : ''
                            }`}
                          >
                            CARE Program
                          </Link>
                        </li>

                        <li>
                          <Link
                            href="/services/loans/business-loan"
                            onClick={handleMenuClose}
                            className={`dropdown-sublink ${
                              isBusinessLoanActive ? 'active' : ''
                            }`}
                          >
                            Business Loan
                          </Link>
                        </li>

                        <li>
                          <Link
                            href="/services/loans/providential-loan"
                            onClick={handleMenuClose}
                            className={`dropdown-sublink ${
                              isProvidentialLoanActive ? 'active' : ''
                            }`}
                          >
                            Providential Loan
                          </Link>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>

                <li
                  className={`dropdown-accordion ${
                    openServiceGroup === 'allied' ? 'open' : ''
                  }`}
                >
                  <button
                    type="button"
                    className={`dropdown-group-toggle ${isAlliedActive ? 'active' : ''}`}
                    onClick={() => toggleServiceGroup('allied')}
                  >
                    <span>Allied Services</span>
                    <span className="dropdown-mini-arrow"></span>
                  </button>

                  <ul className="dropdown-submenu">
                    <li>
                      <Link
                        href="/services/insurance"
                        onClick={handleMenuClose}
                        className={`dropdown-sublink ${isInsuranceActive ? 'active' : ''}`}
                      >
                        Insurance
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/services/transportation"
                        onClick={handleMenuClose}
                        className={`dropdown-sublink ${
                          isTransportationActive ? 'active' : ''
                        }`}
                      >
                        Transportation
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/services/funeral"
                        onClick={handleMenuClose}
                        className={`dropdown-sublink ${isFuneralActive ? 'active' : ''}`}
                      >
                        Funeral
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/services/wellness"
                        onClick={handleMenuClose}
                        className={`dropdown-sublink ${
                          isWellnessDiagnosticsActive ? 'active' : ''
                        }`}
                      >
                        Wellness &amp; Diagnostics
                      </Link>
                    </li>
                  </ul>
                </li>

                <li>
                  <Link
                    href={MLC_PATH}
                    onClick={handleMenuClose}
                    className={`dropdown-link ${isLaboratoryActive ? 'active' : ''}`}
                  >
                    MEMPCO Laboratory Cooperative
                  </Link>
                </li>
              </ul>
            </li>

            <li className="nav-item">
              <Link
                href={CAREER_PATH}
                onClick={handleNavigation}
                onMouseEnter={(e) => moveIndicatorToElement(e.currentTarget)}
                className={`nav-link ${isCareerActive ? 'active' : ''}`}
              >
                Career
              </Link>
            </li>

            <li className="nav-item nav-item-login">
              <Link
                href={LOGIN_PATH}
                onClick={handleNavigation}
                onMouseEnter={(e) => moveIndicatorToElement(e.currentTarget)}
                className={`nav-link nav-login ${isLoginActive ? 'active' : ''}`}
              >
                Log In
              </Link>
            </li>

            <span
              className="nav-indicator"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity,
              }}
            ></span>
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