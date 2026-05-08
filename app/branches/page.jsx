'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar/Navbar';
import './branches.css';

const BranchMapClient = dynamic(() => import('./BranchMapClient'), {
  ssr: false,
  loading: () => (
    <div className="locator-map-placeholder">
      <span>Loading Map</span>
      <p>Preparing branch locations…</p>
    </div>
  ),
});

const branchesData = [
  {
    id: 1,
    name: 'Central Office',
    category: 'Central Office',
    area: 'Area 1',
    city: 'Zamboanga City',
    province: '',
    address: '3D3E HC Mktg. Bldg., Veterans Ave., Zamboanga City, 7000',
    phone: '(062) 991 7772',
    services: ['Savings & Credit', 'Allied Services', 'Member Support'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/2a6YiFNkWtnATA3F6',
    lat: 6.9159099,
    lng: 122.0792927,
  },
  {
    id: 2,
    name: 'Curuan Branch',
    category: 'Branch',
    area: 'Area 1',
    city: 'Zamboanga City',
    province: '',
    address: 'Riversite, Curuan, Zamboanga City, 7000',
    phone: '(062) 310-5075',
    services: ['Savings & Credit', 'Allied Services', 'Member Support'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/CNzXppAYyLbJGigHA',
    lat: 7.2070108,
    lng: 122.2287084,
  },
  {
    id: 3,
    name: 'Canelar Branch',
    category: 'Branch',
    area: 'Area 1',
    city: 'Zamboanga City',
    province: '',
    address: 'Unit A, B & C, Sia and Sons Bldg., Mayor Jaldon St., Canelar, Zamboanga City, 7000',
    phone: '(062) 308-5304 / (062) 993-9751',
    services: ['Savings & Credit', 'Allied Services', 'Member Support'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/RwzTAWGn8x4FAjLK9',
    lat: 6.9142906,
    lng: 122.072678,
  },
  {
    id: 4,
    name: 'Veterans Branch',
    category: 'Branch',
    area: 'Area 1',
    city: 'Zamboanga City',
    province: '',
    address: 'Door 2 & 3 Nationwide Appliance Bldg., Veterans Ave., Zamboanga City, 7000',
    phone: '(062) 993-9764 / 308-5215',
    services: ['Savings & Credit', 'Allied Services', 'Member Support'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/z7CdrodUtpjTx5u39',
    lat: 6.9158015,
    lng: 122.0796557,
  },
  {
    id: 5,
    name: 'Culianan Branch',
    category: 'Branch',
    area: 'Area 1',
    city: 'Zamboanga City',
    province: '',
    address: 'MEMPCO Bldg., MCLL Highway, Culianan, Zamboanga City, 7000',
    phone: '(062) 993-9756 / (062) 310-6575',
    services: ['Savings & Credit', 'Allied Services', 'Member Support'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/tQYv3cp76tHNhyDCA',
    lat: 6.967023,
    lng: 122.1427455,
  },
  {
    id: 6,
    name: 'Ipil Branch',
    category: 'Branch',
    area: 'Area 2',
    city: 'Ipil',
    province: 'Zamboanga Sibugay',
    address: 'EG-VRYE Bldg., Purok Dahlia, Lower Taway, Ipil, Zamboanga Sibugay, 7001',
    phone: '(062) 957-3519',
    services: ['Savings & Credit', 'Allied Services', 'Member Support'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/kbviTqbtoaLvSWFG8',
    lat: 7.7898336,
    lng: 122.5849586,
  },
  {
    id: 7,
    name: 'Dipolog Branch',
    category: 'Branch',
    area: 'Area 2',
    city: 'Dipolog City',
    province: 'Zamboanga del Norte',
    address: 'RC Bldg., ORMSU Highway, Tumo, Dipolog City, Zamboanga del Norte, 7100',
    phone: '(065) 908 1059',
    services: ['Savings & Credit', 'Allied Services', 'Member Support'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/idwFrC9GSdaiiQdn7',
    lat: 8.5828665,
    lng: 123.3515515,
  },
  {
    id: 8,
    name: 'Ayala Branch',
    category: 'Branch',
    area: 'Area 1',
    city: 'Zamboanga City',
    province: '',
    address: 'MEMPCO Bldg., Zone VI, Ayala, Zamboanga City, 7000',
    phone: '(062) 993-8665 / (062) 308-2691',
    services: ['Savings & Credit', 'Allied Services', 'Member Support'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/ip7jXeDEdF1ebngE9',
    lat: 6.9633096,
    lng: 121.9486132,
  },
  {
    id: 9,
    name: 'Pagadian Branch',
    category: 'Branch',
    area: 'Area 2',
    city: 'Pagadian City',
    province: 'Zamboanga del Sur',
    address: 'Pescador Bldg., FS Pajares Ave., San Jose District, Pagadian City, Zamboanga del Sur, 7016',
    phone: '(062) 947-0722',
    services: ['Savings & Credit', 'Allied Services', 'Member Support'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/HTjWphhDsH7CpyJs9',
    lat: 7.8295808,
    lng: 123.4366742,
  },
  {
    id: 10,
    name: 'Nunez Extension Branch',
    category: 'Extension Branch',
    area: 'Area 1',
    city: 'Zamboanga City',
    province: '',
    address: 'HC Marketing Bldg., Nunez Ext., Camino Nuevo, Zamboanga City, 7000',
    phone: '(062) 308-1243 / (062) 993-6235',
    services: ['Savings & Credit', 'Allied Services', 'Member Support'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/qpBX7rz9uJJ8pNsp7',
    lat: 6.9135942,
    lng: 122.076348,
  },
  {
    id: 11,
    name: 'Vitali Satellite Office',
    category: 'Satellite Office',
    area: 'Area 1',
    city: 'Zamboanga City',
    province: '',
    address: 'Unit 1 & 2, Solmayor Bldg., Mialim, Vitali, Zamboanga City, 7000',
    phone: 'N/A',
    services: ['Satellite Office Support', 'Member Assistance'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/RkV7JfSrwPFNsGyj9',
    lat: 7.3748165,
    lng: 122.2917259,
  },
  {
    id: 12,
    name: 'La Hermosa Funeraria de MEMPCO',
    category: 'Funeraria',
    area: 'Area 1',
    city: 'Zamboanga City',
    province: '',
    address: 'Zone 6, Boalan (fronting Golden Haven Memorial Park), Zamboanga City, 7000',
    phone: '(062) 982 0594 / 0966-661-6662',
    services: ['Funeral Service', 'Memorial Assistance'],
    image: '',
    mapLink: 'https://maps.app.goo.gl/EduRYvaUjHpeFnEd7',
    lat: 6.9559635,
    lng: 122.1274352,
  },
];

const AREA_FILTERS = ['All', 'Area 1', 'Area 2'];

function hasCoordinates(branch) {
  return Number.isFinite(branch.lat) && Number.isFinite(branch.lng);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getMapHref(branch) {
  if (!branch) return '#';
  if (branch.mapLink && branch.mapLink !== '#') return branch.mapLink;
  if (hasCoordinates(branch)) {
    return `https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`;
  }
  if (branch.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${branch.name} ${branch.address}`
    )}`;
  }
  return '#';
}

function formatLocation(branch) {
  return [branch.city, branch.province].filter(Boolean).join(', ');
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ResultCard({ branch, active, hovered, onClick, onMouseEnter, onMouseLeave, itemRef }) {
  return (
    <button
      ref={itemRef}
      type="button"
      className={`locator-result-card${active ? ' is-active' : ''}${hovered ? ' is-hovered' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onMouseEnter}
      onBlur={onMouseLeave}
    >
      <div className="locator-result-content">
        <h3>{branch.name}</h3>
        <p>{branch.address}</p>
        <div className="locator-result-meta">
          {branch.area} · {branch.category}
        </div>
      </div>
    </button>
  );
}

export default function BranchesPage() {
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('All');
  const [activeBranchId, setActiveBranchId] = useState(branchesData[0]?.id ?? null);
  const [hoveredBranchId, setHoveredBranchId] = useState(null);
  const [mapMode, setMapMode] = useState('overview');
  const [isLocating, setIsLocating] = useState(false);

  const resultRefs = useRef({});

  const allMapBranches = useMemo(
    () => branchesData.filter((b) => hasCoordinates(b)),
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const office = params.get('office');
    if (!office) return;
    const match = branchesData.find((b) => slugify(b.name) === office);
    if (match) {
      setActiveBranchId(match.id);
      setMapMode('focus');
    }
  }, []);

  const filteredBranches = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return branchesData.filter((branch) => {
      const matchesArea = areaFilter === 'All' || branch.area === areaFilter;
      const text = [
        branch.name, branch.category, branch.area,
        branch.city, branch.province, branch.address,
        branch.phone, ...branch.services,
      ].join(' ').toLowerCase();
      return matchesArea && (!keyword || text.includes(keyword));
    });
  }, [search, areaFilter]);

  useEffect(() => {
    if (!filteredBranches.length) { setActiveBranchId(null); return; }
    const still = filteredBranches.some((b) => b.id === activeBranchId);
    if (!still) setActiveBranchId(filteredBranches[0].id);
  }, [filteredBranches, activeBranchId]);

  const activeBranch =
    filteredBranches.find((b) => b.id === activeBranchId) || filteredBranches[0] || null;

  useEffect(() => {
    if (typeof window === 'undefined' || !activeBranch) return;
    const params = new URLSearchParams(window.location.search);
    params.set('office', slugify(activeBranch.name));
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [activeBranch]);

  useEffect(() => {
    if (!activeBranchId) return;
    resultRefs.current[activeBranchId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeBranchId]);

  const mapBranches = useMemo(
    () => filteredBranches.filter((b) => hasCoordinates(b)),
    [filteredBranches]
  );

  const handleSearchChange = (e) => { setSearch(e.target.value); setMapMode('overview'); };
  const handleFilterChange = (f) => { setAreaFilter(f); setMapMode('overview'); };
  const handleSelectBranch = (id) => { setActiveBranchId(id); setMapMode('focus'); };

  const handleNearestBranch = () => {
    if (!navigator.geolocation || isLocating || !allMapBranches.length) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        let nearest = null;
        let nearestDist = Infinity;
        allMapBranches.forEach((b) => {
          const d = getDistanceKm(latitude, longitude, b.lat, b.lng);
          if (d < nearestDist) { nearestDist = d; nearest = b; }
        });
        if (nearest) {
          setSearch('');
          setAreaFilter('All');
          setActiveBranchId(nearest.id);
          setMapMode('focus');
        }
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const activeMapBranch =
    (activeBranch && hasCoordinates(activeBranch) && activeBranch) ||
    mapBranches[0] || null;

  const activeMapHref = getMapHref(activeBranch);

  return (
    <>
      <Navbar />

      <main className="branches-page">
        <section className="locator-workspace">

          {/* ── Toolbar ── */}
          <div className="locator-toolbar">
            <div className="locator-toolbar-copy">
              <span className="locator-toolbar-kicker">MEMPCO Branch Locator</span>
              <h1>Find a branch</h1>
            </div>

            <div className="locator-toolbar-controls">
              <div className="locator-search-wrap">
                <span className="locator-search-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 21L16.65 16.65M18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  className="locator-search-input"
                  placeholder="Search branch, area, city, or service…"
                  value={search}
                  onChange={handleSearchChange}
                />
              </div>

              <div className="locator-toolbar-meta">
                <div className="locator-filter-pills">
                  {AREA_FILTERS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`locator-filter-pill${areaFilter === f ? ' is-active' : ''}`}
                      onClick={() => handleFilterChange(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <p className="locator-search-summary">
                  {filteredBranches.length}{' '}
                  {filteredBranches.length === 1 ? 'office' : 'offices'} found
                </p>
              </div>
            </div>
          </div>

          {/* ── Three-column layout ── */}
          <div className="locator-layout">

            {/* Sidebar – branch list */}
            <aside className="locator-sidebar">
              <div className="locator-panel-head locator-panel-head--split">
                <div>
                  <h2>Branch list</h2>
                </div>
                <div className="locator-head-actions">
                  <button
                    type="button"
                    className={`locator-head-action${mapMode === 'overview' ? ' is-active' : ''}`}
                    onClick={() => setMapMode('overview')}
                  >
                    Show all
                  </button>
            
                </div>
              </div>

              <div className="locator-results">
                {filteredBranches.length ? (
                  filteredBranches.map((branch) => (
                    <ResultCard
                      key={branch.id}
                      branch={branch}
                      active={activeBranch?.id === branch.id}
                      hovered={hoveredBranchId === branch.id}
                      onClick={() => handleSelectBranch(branch.id)}
                      onMouseEnter={() => setHoveredBranchId(branch.id)}
                      onMouseLeave={() => setHoveredBranchId(null)}
                      itemRef={(el) => { resultRefs.current[branch.id] = el; }}
                    />
                  ))
                ) : (
                  <div className="locator-empty">
                    <h3>No branches found</h3>
                    <p>Try another keyword or change the area filter.</p>
                  </div>
                )}
              </div>
            </aside>

            {/* Map */}
            <section className="locator-map-panel">
              <div className="locator-map-frame">
                <div className="locator-map-toolbar">
                  <span className="locator-map-toolbar-badge">
                    {mapBranches.length} {mapBranches.length === 1 ? 'pin' : 'pins'} visible
                  </span>
                </div>

                {mapBranches.length ? (
                  <BranchMapClient
                    branches={mapBranches}
                    activeBranch={activeMapBranch}
                    hoveredBranchId={hoveredBranchId}
                    mapMode={mapMode}
                    onSelectBranch={handleSelectBranch}
                  />
                ) : (
                  <div className="locator-map-placeholder">
                    <span>Map not available</span>
                    <p>No mappable branches match your current filter.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Detail panel */}
            <aside className="locator-detail-panel">
              {activeBranch ? (
                <>
                  <div className="locator-panel-head locator-panel-head--split">
                    <div>
                      <h2>Branch details</h2>
                    </div>
                    {activeMapHref !== '#' && (
                      <a
                        href={activeMapHref}
                        target="_blank"
                        rel="noreferrer"
                        className="locator-head-action locator-head-action--link"
                      >
                        Open in Maps
                      </a>
                    )}
                  </div>

                  <div className="locator-branch-card">
                    <div className="locator-branch-card-top">
                      <div className="locator-branch-media">
                        <img
                          src={activeBranch.image || '/LOGO%201.png'}
                          alt={activeBranch.image ? activeBranch.name : 'MEMPCO logo'}
                        />
                      </div>
                      <div className="locator-branch-copy">
                        <span className="locator-branch-badge">{activeBranch.area}</span>
                        <h3>{activeBranch.name}</h3>
                        <p className="locator-branch-location">{formatLocation(activeBranch)}</p>
                      </div>
                    </div>

                    <div className="locator-detail-stack">
                      <div className="locator-detail-card">
                        <span>Address</span>
                        <p>{activeBranch.address}</p>
                      </div>

                      <div className="locator-detail-card">
                        <span>Contact</span>
                        <p>{activeBranch.phone || 'N/A'}</p>
                      </div>

                      <div className="locator-detail-card">
                        <span>Office type</span>
                        <p>{activeBranch.category}</p>
                      </div>

                      <div className="locator-detail-card">
                        <span>Services</span>
                        <div className="locator-service-tags">
                          {activeBranch.services.map((s) => (
                            <span key={s} className="locator-service-tag">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="locator-empty locator-empty--full">
                  <h3>No branch selected</h3>
                  <p>Click a branch from the list to view its details.</p>
                </div>
              )}
            </aside>

          </div>
        </section>
      </main>
    </>
  );
}