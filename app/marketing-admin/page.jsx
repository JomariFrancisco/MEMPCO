'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Newspaper,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UsersRound,
  X,
} from 'lucide-react';
import {
  getCurrentPortalUser,
  isInactivePortalUser,
  isMarketingAdminRole,
  signOutPortal,
} from '@/lib/auth/portalAuth';
import {
  MARKETING_PLACEMENTS,
  MARKETING_PLACEMENT_LABELS,
  deleteMarketingPost,
  listMarketingPosts,
  saveMarketingPost,
  sortMarketingPosts,
} from '@/lib/marketing/marketingPosts';
import '../admin-dashboard/admin-dashboard.css';
import './marketing-admin.css';

const EDITOR_CATEGORIES = ['News', 'Events', 'Announcement', 'Member Stories'];
const HRMAX_ROUTE = '/HRMax';
const POSTS_PER_PAGE = 2;
const SORT_OPTIONS = [
  { value: 'website_order', label: 'Website Order' },
  { value: 'updated_desc', label: 'Recently Updated' },
  { value: 'published_desc', label: 'Newest Published' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'category_asc', label: 'Category A-Z' },
  { value: 'status_asc', label: 'Status A-Z' },
];
const POSITION_OPTIONS = [
  { value: 0, label: 'Top of section' },
  { value: 1, label: 'Second' },
  { value: 2, label: 'Third' },
  { value: 3, label: 'Later' },
];
const CONTENT_NAV_ITEMS = [
  { label: 'News', category: 'News', icon: Newspaper },
  { label: 'Events', category: 'Events', icon: CalendarDays },
  { label: 'Announcements', category: 'Announcement', icon: Megaphone },
  { label: 'Stories', category: 'Member Stories', icon: UsersRound },
];
const CATEGORY_TO_TYPE = {
  News: 'news',
  Events: 'event',
  Announcement: 'announcement',
  'Member Stories': 'member_story',
};
const TYPE_TO_CATEGORY = Object.entries(CATEGORY_TO_TYPE).reduce(
  (categories, [category, type]) => ({ ...categories, [type]: category }),
  {}
);

const blankPost = {
  id: '',
  slug: '',
  title: '',
  category: 'News',
  type: 'news',
  excerpt: '',
  bodyText: '',
  externalUrl: '',
  storyRole: '',
  storyLocation: '',
  tagsText: '',
  image: '',
  status: 'draft',
  featured: false,
  placement: 'more',
  displayOrder: 0,
  publishedAt: '',
  republishedAt: '',
  editedAt: '',
  createdBy: '',
};

const statusLabels = {
  all: 'All Posts',
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

const toBodyText = (post) => (post.fullArticle || post.body || []).join('\n\n');

const toEditablePost = (post) => ({
  ...blankPost,
  ...post,
  bodyText: toBodyText(post),
  tagsText: (post.tags || []).join(', '),
});

const toSavePayload = (post, status = post.status, options = {}) => {
  const activityTimestamp = options.republish ? options.activityDate || new Date().toISOString() : '';
  const editedTimestamp = options.markEdited ? options.activityDate || new Date().toISOString() : '';

  return {
    ...post,
    status,
    featured: post.placement === 'featured',
    tags: post.tagsText
      .split(/[,\n]+/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    fullArticle: post.bodyText
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    publishedAt:
      status === 'published'
        ? activityTimestamp || post.publishedAt || new Date().toISOString()
        : post.publishedAt || null,
    republishedAt: activityTimestamp || post.republishedAt || '',
    editedAt: editedTimestamp || post.editedAt || '',
  };
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });

const compressImageFile = async (file) => {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }

  const source = await fileToDataUrl(file);

  if (file.type === 'image/svg+xml') {
    return source;
  }

  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const maxWidth = 1600;
      const scale = Math.min(1, maxWidth / image.width);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        resolve(source);
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };

    image.onerror = () => resolve(source);
    image.src = source;
  });
};

const formatFileSize = (bytes = 0) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatUpdatedAt = (value) => {
  const date = new Date(value || '');

  if (Number.isNaN(date.getTime())) return 'Not saved';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const getPostActivity = (post) => {
  const editedTime = getTime(post.editedAt);
  const publishedTime = getTime(post.publishedAt);
  const republishedTime = getTime(post.republishedAt);

  if (republishedTime && republishedTime >= editedTime) {
    return {
      className: 'republished',
      label: 'Republished',
      date: formatUpdatedAt(post.republishedAt),
      meta: editedTime ? `Edited ${formatUpdatedAt(post.editedAt)}` : '',
    };
  }

  if (editedTime) {
    return {
      className: 'edited',
      label: 'Edited',
      date: formatUpdatedAt(post.editedAt),
      meta: republishedTime
        ? `Republished ${formatUpdatedAt(post.republishedAt)}`
        : publishedTime
          ? `Published ${formatUpdatedAt(post.publishedAt)}`
          : '',
    };
  }

  if (publishedTime && post.status === 'published') {
    return {
      className: 'published',
      label: 'Published',
      date: formatUpdatedAt(post.publishedAt),
      meta: '',
    };
  }

  return {
    className: 'created',
    label: 'Created',
    date: formatUpdatedAt(post.createdAt),
    meta: '',
  };
};

function ActivityIndicator({ post }) {
  const activity = getPostActivity(post);

  return (
    <div className="marketing-activity">
      <span className={`activity-badge ${activity.className}`}>{activity.label}</span>
      <strong>{activity.date}</strong>
      {activity.meta && <small>{activity.meta}</small>}
    </div>
  );
}

const getTypeLabel = (type) => {
  if (type === 'event') return 'Event';
  if (type === 'announcement') return 'Announcement';
  if (type === 'member_story') return 'Member Story';
  return 'News';
};

const getPlacementHint = (placement) => {
  if (placement === 'featured') return 'Shows in the large Featured Story / Spotlight area. Only one post should use this.';
  if (placement === 'latest') return 'Shows in the Latest Stories card grid below the featured area.';
  return 'Shows in the More Stories / Quick Updates list.';
};

const getPositionLabel = (value) => {
  const order = Number(value || 0);
  const option = POSITION_OPTIONS.find((item) => item.value === order);
  return option?.label || `Position ${order + 1}`;
};

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7h9M8 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const getPostSearchText = (post) =>
  [
    post.title,
    post.category,
    post.type,
    post.status,
    post.placement,
    post.externalUrl,
    post.storyRole,
    post.storyLocation,
    post.tagsText,
    post.publishedAt,
    post.republishedAt,
    post.editedAt,
    post.updatedAt,
    ...(post.tags || []),
    post.excerpt,
  ]
    .join(' ')
    .toLowerCase();

const toStatusClass = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-');

const getTime = (value) => {
  const time = new Date(value || '').getTime();
  return Number.isNaN(time) ? 0 : time;
};

const compareText = (a = '', b = '') => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });

const sortConsolePosts = (posts = [], sortMode = 'website_order') => {
  if (sortMode === 'website_order') return sortMarketingPosts(posts);

  return [...posts].sort((a, b) => {
    if (sortMode === 'updated_desc') {
      return getTime(b.updatedAt || b.createdAt) - getTime(a.updatedAt || a.createdAt);
    }

    if (sortMode === 'published_desc') {
      return getTime(b.publishedAt || b.updatedAt) - getTime(a.publishedAt || a.updatedAt);
    }

    if (sortMode === 'title_asc') {
      return compareText(a.title, b.title);
    }

    if (sortMode === 'category_asc') {
      return compareText(a.category, b.category) || compareText(a.title, b.title);
    }

    if (sortMode === 'status_asc') {
      return compareText(a.status, b.status) || compareText(a.title, b.title);
    }

    return 0;
  });
};

const getLibraryTitle = (statusFilter, activeCategory) => {
  if (activeCategory !== 'All') return activeCategory;
  if (statusFilter === 'published') return 'Published Posts';
  if (statusFilter === 'draft') return 'Draft Posts';
  if (statusFilter === 'archived') return 'Archived Posts';
  return 'Website Publishing';
};

const getSaveSuccessMessage = ({ nextStatus, wasExisting, shouldRepublish }) => {
  if (shouldRepublish) return 'Post republished.';
  if (nextStatus === 'published') return 'Post published.';
  if (nextStatus === 'archived') return 'Post archived.';
  if (wasExisting) return 'Post edited.';
  return 'Saved as draft.';
};

function StatCard({ icon: IconComponent, label, value, meta }) {
  return (
    <article className="stat-card glass">
      <div className="stat-icon">
        <IconComponent className="admin-mono-icon" aria-hidden="true" />
      </div>
      <span className="stat-label">{label}</span>
      <p className="stat-value">{value}</p>
      <span className="stat-meta">{meta}</span>
    </article>
  );
}

export default function MarketingAdminPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [posts, setPosts] = useState([]);
  const [activePost, setActivePost] = useState(blankPost);
  const [imageFileLabel, setImageFileLabel] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeCategory, setActiveCategory] = useState('All');
  const [placementFilter, setPlacementFilter] = useState('all');
  const [sortMode, setSortMode] = useState('website_order');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lastSynced, setLastSynced] = useState('');
  const isContentView = activeCategory !== 'All';
  const libraryTitle = getLibraryTitle(statusFilter, activeCategory);

  const statusFilteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesPlacement = placementFilter === 'all' || post.placement === placementFilter;
      const matchesSearch = !query || getPostSearchText(post).includes(query);

      return matchesStatus && matchesPlacement && matchesSearch;
    });
  }, [posts, placementFilter, search, statusFilter]);

  const visiblePosts = useMemo(() => {
    const categoryPosts =
      activeCategory === 'All'
        ? statusFilteredPosts
        : statusFilteredPosts.filter((post) => post.category === activeCategory);

    return sortConsolePosts(categoryPosts, sortMode);
  }, [activeCategory, sortMode, statusFilteredPosts]);

  const totalPages = Math.max(1, Math.ceil(visiblePosts.length / POSTS_PER_PAGE));
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return visiblePosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [currentPage, visiblePosts]);

  const counts = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((post) => post.status === 'published').length,
      draft: posts.filter((post) => post.status === 'draft').length,
      archived: posts.filter((post) => post.status === 'archived').length,
      featured: posts.filter((post) => post.placement === 'featured').length,
      latest: posts.filter((post) => post.placement === 'latest').length,
      more: posts.filter((post) => post.placement === 'more').length,
    }),
    [posts]
  );

  const loadPosts = async () => {
    setIsLoading(true);

    try {
      const nextPosts = await listMarketingPosts();
      setPosts(nextPosts);
      setLastSynced(new Date().toLocaleTimeString());
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to load posts.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const activeUser = await getCurrentPortalUser().catch(() => null);

      if (cancelled) return;

      if (!activeUser || isInactivePortalUser(activeUser) || !isMarketingAdminRole(activeUser.role)) {
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

  useEffect(() => {
    if (checked && user) {
      void loadPosts();
    }
  }, [checked, user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, placementFilter, search, sortMode, statusFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const updatePost = (field, value) => {
    setMessage({ type: '', text: '' });
    setActivePost((current) => {
      const nextPost = { ...current, [field]: value };
      const nextType = field === 'category' ? CATEGORY_TO_TYPE[value] : field === 'type' ? value : nextPost.type;
      const nextCategory = field === 'type' ? TYPE_TO_CATEGORY[value] : field === 'category' ? value : nextPost.category;

      if (field === 'category' && CATEGORY_TO_TYPE[value]) {
        nextPost.type = CATEGORY_TO_TYPE[value];
      }

      if (field === 'type' && TYPE_TO_CATEGORY[value]) {
        nextPost.category = TYPE_TO_CATEGORY[value];
      }

      if (field === 'placement' && value === 'featured') {
        nextPost.displayOrder = 0;
      }

      if (nextType === 'member_story' || nextCategory === 'Member Stories') {
        nextPost.placement = 'more';
      }

      return nextPost;
    });
  };

  const startNewPost = () => {
    setActivePost(blankPost);
    setImageFileLabel('');
    setMessage({ type: '', text: '' });
    setEditorOpen(true);
  };

  const editPost = (post) => {
    setActivePost(toEditablePost(post));
    setImageFileLabel('');
    setMessage({ type: '', text: '' });
    setEditorOpen(true);
  };

  const handleImageFile = async (file) => {
    if (!file) return;

    setIsUploadingImage(true);

    try {
      const imageData = await compressImageFile(file);
      setActivePost((current) => ({ ...current, image: imageData }));
      setImageFileLabel(`${file.name} (${formatFileSize(file.size)})`);
      setMessage({ type: 'success', text: 'Image added to the post.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to add image.' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageInputChange = (event) => {
    const [file] = event.target.files || [];
    void handleImageFile(file);
    event.target.value = '';
  };

  const handleImageDrop = (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files || [];
    void handleImageFile(file);
  };

  const clearImage = () => {
    setActivePost((current) => ({ ...current, image: '' }));
    setImageFileLabel('');
    setMessage({ type: '', text: '' });
  };

  const handleSave = async (nextStatus = activePost.status, overrides = {}) => {
    const postToSave = { ...activePost, ...overrides };

    if (!postToSave.title.trim()) {
      setMessage({ type: 'error', text: 'Title is required.' });
      return;
    }

    if (!postToSave.excerpt.trim()) {
      setMessage({ type: 'error', text: 'Excerpt is required.' });
      return;
    }

    setIsSaving(true);

    try {
      const wasExisting = Boolean(postToSave.id);
      const shouldRepublish = nextStatus === 'published' && Boolean(postToSave.id && postToSave.publishedAt);
      const shouldMarkEdited = wasExisting && !shouldRepublish && nextStatus !== 'archived';
      const savedPost = await saveMarketingPost(
        toSavePayload(postToSave, nextStatus, {
          markEdited: shouldMarkEdited,
          republish: shouldRepublish,
        }),
        user
      );
      setPosts((current) => {
        const exists = current.some((post) => post.id === savedPost.id);
        let nextPosts = exists
          ? current.map((post) => (post.id === savedPost.id ? savedPost : post))
          : [savedPost, ...current];

        if (savedPost.placement === 'featured' && savedPost.type !== 'member_story') {
          nextPosts = nextPosts.map((post) =>
            post.id !== savedPost.id && post.type !== 'member_story' && post.placement === 'featured'
              ? { ...post, featured: false, placement: 'more' }
              : post
          );
        }

        return sortMarketingPosts(nextPosts);
      });
      setActivePost(toEditablePost(savedPost));
      setImageFileLabel('');
      setMessage({
        type: 'success',
        text: getSaveSuccessMessage({ nextStatus: savedPost.status, wasExisting, shouldRepublish }),
      });
      setEditorOpen(false);
      setLastSynced(new Date().toLocaleTimeString());
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to save post.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (post) => {
    const confirmed = window.confirm(`Delete "${post.title}"?`);

    if (!confirmed) return;

    try {
      await deleteMarketingPost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));

      if (activePost.id === post.id) {
        setActivePost(blankPost);
      }

      setMessage({ type: 'success', text: 'Post deleted.' });
      setEditorOpen(false);
      setLastSynced(new Date().toLocaleTimeString());
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to delete post.' });
    }
  };

  const changeStatusFilter = (nextFilter) => {
    setActiveCategory('All');
    setStatusFilter(nextFilter);
  };

  const changeCategoryFilter = (nextCategory) => {
    setActiveCategory((currentCategory) => (currentCategory === nextCategory ? 'All' : nextCategory));
    setStatusFilter('all');
    setPlacementFilter('all');
  };

  const handleLogout = async () => {
    await signOutPortal().catch(() => {});
    router.replace('/LogIn');
  };

  const isEditingMemberStory = activePost.type === 'member_story' || activePost.category === 'Member Stories';
  const canFeatureActivePost = !isEditingMemberStory && activePost.placement !== 'featured';

  if (!checked || !user) {
    return (
      <>
        <main className="portal-main portal-app-main" />
      </>
    );
  }

  return (
    <>
      <main className="portal-main portal-app-main marketing-admin-main">
        <div className="portal-shell">
          <header className="portal-topbar glass">
            <div className="portal-topbar-copy">
              <span className="portal-eyebrow">Marketing Admin</span>
              <h1>Marketing Content Console</h1>
              <p>Publish news, events, announcements, and member stories across the public website.</p>
            </div>

            <div className="portal-topbar-actions">
              <span className="portal-status-pill">
                <span className="dot" />
                {counts.published} Published
              </span>
              <span className="portal-status-pill alert">
                <span className="dot" />
                {counts.draft} Drafts
              </span>
              <span className="portal-status-pill">
                <span className="dot" />
                {lastSynced ? `Synced ${lastSynced}` : 'Loading'}
              </span>
              <div className="profile-chip">
                <span className="profile-chip-avatar">{user.initials || user.name?.slice(0, 2) || 'MA'}</span>
                <div className="profile-chip-copy">
                  <strong>{user.name}</strong>
                  <span>Marketing</span>
                </div>
              </div>
            </div>
          </header>

          <div className="portal-layout">
            <aside className="portal-sidebar">
              <div className="sidebar-brand">
                <span className="sidebar-eyebrow">Console</span>
                <div className="sidebar-title">Publishing Desk</div>
              </div>

              <nav className="sidebar-nav marketing-sidebar-nav" aria-label="Marketing admin status filters">
                <button type="button" className={`sidebar-nav-btn ${!isContentView && statusFilter === 'all' ? 'active' : ''}`} onClick={() => changeStatusFilter('all')}>
                  <LayoutDashboard className="sidebar-nav-icon" aria-hidden="true" />
                  Overview
                </button>
                <button type="button" className={`sidebar-nav-btn ${!isContentView && statusFilter === 'published' ? 'active' : ''}`} onClick={() => changeStatusFilter('published')}>
                  <Send className="sidebar-nav-icon" aria-hidden="true" />
                  Published
                </button>
                <button type="button" className={`sidebar-nav-btn ${!isContentView && statusFilter === 'draft' ? 'active' : ''}`} onClick={() => changeStatusFilter('draft')}>
                  <FileText className="sidebar-nav-icon" aria-hidden="true" />
                  Drafts
                </button>
                <button type="button" className={`sidebar-nav-btn ${!isContentView && statusFilter === 'archived' ? 'active' : ''}`} onClick={() => changeStatusFilter('archived')}>
                  <Archive className="sidebar-nav-icon" aria-hidden="true" />
                  Archived
                </button>
              </nav>

              <div className="marketing-sidebar-group">
                <span className="marketing-sidebar-label">Content</span>
                <nav className="sidebar-nav marketing-sidebar-nav" aria-label="Marketing admin content filters">
                  {CONTENT_NAV_ITEMS.map(({ label, category, icon: IconComponent }) => (
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${activeCategory === category ? 'active' : ''}`}
                      onClick={() => changeCategoryFilter(category)}
                      key={category}
                    >
                      <IconComponent className="sidebar-nav-icon" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="sidebar-logout">
                <a className="sidebar-nav-btn sidebar-external-link" href={HRMAX_ROUTE}>
                  <BriefcaseBusiness className="sidebar-nav-icon" aria-hidden="true" />
                  HRMax
                  <ExternalLink className="sidebar-trailing-icon" aria-hidden="true" />
                </a>

                <button type="button" className="sidebar-nav-btn" onClick={handleLogout}>
                  <LogOut className="sidebar-nav-icon" aria-hidden="true" />
                  Logout
                </button>
              </div>
            </aside>

            <section className="portal-view marketing-admin-view">
              <section className="panel-card glass marketing-publisher-hero">
                <img src="/Logos/Logo.png" alt="" className="admin-hero-logo" aria-hidden="true" />
                <div className="hero-copy">
                  <span className="section-kicker">Publishing Center</span>
                  <h2>Public website backend for marketing content.</h2>
                  <p>Choose News & Events placement or publish Member Stories with YouTube links for the public story section.</p>
                </div>

                <span className="marketing-sync-badge">{visiblePosts.length} Showing</span>
              </section>

              {message.text && (
                <div className={`admin-alert ${message.type}`} role="status">
                  {message.text}
                </div>
              )}

              <section className="stats-grid" aria-label="Marketing post statistics">
                <StatCard icon={Newspaper} label="Total Posts" value={counts.total} meta="All marketing entries" />
                <StatCard icon={Send} label="Published" value={counts.published} meta="Visible on public pages" />
                <StatCard icon={Clock3} label="Drafts" value={counts.draft} meta="Needs review or copy" />
                <StatCard icon={ShieldCheck} label="Featured" value={counts.featured} meta="Homepage and page spotlight" />
              </section>

              <section className="panel-card glass marketing-post-panel">
                <div className="section-head">
                  <div>
                    <span className="section-kicker">Content Library</span>
                    <h3>{libraryTitle}</h3>
                  </div>
                  <button type="button" className="quick-action-btn primary marketing-new-btn" onClick={startNewPost}>
                    <Plus aria-hidden="true" />
                    New Post
                  </button>
                </div>

                <div className="marketing-library-tools">
                  <label className="marketing-search">
                    <Search className="admin-mono-icon" aria-hidden="true" />
                    <span className="sr-only">Search post</span>
                    <input
                      id="marketing-search"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search posts..."
                    />
                  </label>

                  <div className="marketing-filter-pills" aria-label="Filter posts">
                    {!isContentView && (
                      <select value={placementFilter} onChange={(event) => setPlacementFilter(event.target.value)} aria-label="Placement">
                        <option value="all">All Placements</option>
                        {MARKETING_PLACEMENTS.map((placement) => (
                          <option value={placement.value} key={placement.value}>
                            {placement.label}
                          </option>
                        ))}
                      </select>
                    )}

                    <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} aria-label="Sort posts">
                      {SORT_OPTIONS.map((option) => (
                        <option value={option.value} key={option.value}>
                          Sort: {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-ticket-table marketing-post-table">
                    <thead>
                      <tr>
                        <th>Story</th>
                        <th>Visibility</th>
                        <th>Activity</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="admin-table-main">
                              <strong>Loading posts...</strong>
                              <span>Please wait while the publishing library syncs.</span>
                            </div>
                          </td>
                        </tr>
                      ) : visiblePosts.length ? (
                        paginatedPosts.map((post) => (
                          <tr key={post.id}>
                            <td>
                              <div className="admin-table-main marketing-story-cell">
                                {post.image && <img src={post.image} alt="" className="marketing-story-thumb" />}
                                <div>
                                  <strong>{post.title}</strong>
                                  <span>
                                    {post.category} / {post.type === 'member_story'
                                      ? post.storyRole || 'Member Story'
                                      : `${MARKETING_PLACEMENT_LABELS[post.placement] || 'More Updates List'} · ${getPositionLabel(post.displayOrder)}`}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`status ${toStatusClass(post.status)}`}>{statusLabels[post.status] || 'Draft'}</span>
                            </td>
                            <td>
                              <ActivityIndicator post={post} />
                            </td>
                            <td>
                              <div className="user-action-group">
                                <button type="button" className="user-action-btn" onClick={() => editPost(post)}>
                                  Edit
                                </button>
                                <button type="button" className="user-action-btn danger" onClick={() => handleDelete(post)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4}>
                            <div className="admin-table-main">
                              <strong>No posts found.</strong>
                              <span>Use New Post to create the first marketing story.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!isLoading && visiblePosts.length > 0 && (
                  <div className="marketing-pagination" aria-label="Content library pagination">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      &lt;
                    </button>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </section>
            </section>
          </div>
        </div>

        {editorOpen && (
          <div className="ma-editor-overlay" role="dialog" aria-modal="true" aria-label="Marketing post editor">
            <button type="button" className="ma-editor-backdrop" onClick={() => setEditorOpen(false)} aria-label="Close editor" />
            <aside className="ma-editor-drawer">
              <div className="ma-profile-head">
                <span className="profile-chip-avatar">{user.initials || user.name?.slice(0, 2) || 'MA'}</span>
                <div>
                  <span className="section-kicker">{activePost.id ? 'Edit Post' : 'New Post'}</span>
                  <h2>{activePost.title || 'Untitled story'}</h2>
                  <p>{MARKETING_PLACEMENT_LABELS[activePost.placement]} / {statusLabels[activePost.status]}</p>
                </div>
                <button type="button" className="ma-drawer-close" onClick={() => setEditorOpen(false)} aria-label="Close editor">
                  <X aria-hidden="true" />
                </button>
              </div>

              <form className="ma-editor" onSubmit={(event) => {
                event.preventDefault();
                void handleSave('draft');
              }}>
                <label className="ma-field full">
                  <span>Title</span>
                  <input value={activePost.title} onChange={(event) => updatePost('title', event.target.value)} placeholder="Story title" />
                </label>

                <label className="ma-field full">
                  <span>Category</span>
                  <select value={activePost.category} onChange={(event) => updatePost('category', event.target.value)}>
                    {EDITOR_CATEGORIES.map((category) => (
                      <option value={category} key={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <small>This controls how the post is grouped and displayed on the website.</small>
                </label>

                <div className="ma-field-grid">
                  <label className="ma-field">
                    <span>Website Placement</span>
                    <select value={activePost.placement} onChange={(event) => updatePost('placement', event.target.value)}>
                      {MARKETING_PLACEMENTS.map((placement) => (
                        <option value={placement.value} key={placement.value}>
                          {placement.label}
                        </option>
                      ))}
                    </select>
                    <small>{getPlacementHint(activePost.placement)}</small>
                  </label>

                  <label className="ma-field">
                    <span>Position in Section</span>
                    <select
                      value={Number(activePost.displayOrder || 0)}
                      onChange={(event) => updatePost('displayOrder', Number(event.target.value))}
                      disabled={activePost.placement === 'featured'}
                    >
                      {POSITION_OPTIONS.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <small>
                      {activePost.placement === 'featured'
                        ? 'Featured posts always stay in the spotlight area.'
                        : 'Lower positions appear first inside the selected section.'}
                    </small>
                  </label>
                </div>

                <div className="ma-field full">
                  <span>Post Image</span>
                  <input ref={fileInputRef} className="ma-file-input" type="file" accept="image/*" onChange={handleImageInputChange} />
                  <div className="ma-upload-box" onDragOver={(event) => event.preventDefault()} onDrop={handleImageDrop}>
                    <UploadCloud aria-hidden="true" />
                    <div>
                      <strong>{isUploadingImage ? 'Adding image...' : 'Upload from computer'}</strong>
                      <span>{imageFileLabel || 'JPG, PNG, WEBP, GIF, or SVG'}</span>
                    </div>
                    <button type="button" className="ma-mini-btn" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}>
                      <ImagePlus aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <label className="ma-field full">
                  <span>Image Link</span>
                  <input
                    value={activePost.image}
                    onChange={(event) => {
                      setImageFileLabel('');
                      updatePost('image', event.target.value);
                    }}
                    placeholder="/About/MEMPCO Hour.png"
                  />
                </label>

                {isEditingMemberStory && (
                  <>
                    <div className="ma-field-grid">
                      <label className="ma-field">
                        <span>Member Role</span>
                        <input
                          value={activePost.storyRole}
                          onChange={(event) => updatePost('storyRole', event.target.value)}
                          placeholder="Bakery Shop Owner"
                        />
                      </label>

                      <label className="ma-field">
                        <span>Location</span>
                        <input
                          value={activePost.storyLocation}
                          onChange={(event) => updatePost('storyLocation', event.target.value)}
                          placeholder="Zamboanga City"
                        />
                      </label>
                    </div>

                    <label className="ma-field full">
                      <span>YouTube / Button Link</span>
                      <input
                        value={activePost.externalUrl}
                        onChange={(event) => updatePost('externalUrl', event.target.value)}
                        placeholder="https://www.youtube.com/@mempcoph3541"
                      />
                    </label>

                    <label className="ma-field full">
                      <span>Tags</span>
                      <input
                        value={activePost.tagsText}
                        onChange={(event) => updatePost('tagsText', event.target.value)}
                        placeholder="#MEMPCOStories, #CooperativePride"
                      />
                    </label>
                  </>
                )}

                {activePost.image && (
                  <div className="ma-image-preview">
                    <img src={activePost.image} alt="" />
                    <button type="button" onClick={clearImage} aria-label="Remove image">
                      <X aria-hidden="true" />
                    </button>
                  </div>
                )}

                <label className="ma-field full">
                  <span>Excerpt</span>
                  <textarea value={activePost.excerpt} onChange={(event) => updatePost('excerpt', event.target.value)} placeholder="Short summary for cards and spotlight sections" rows={3} />
                </label>

                <label className="ma-field full">
                  <span>Article Body</span>
                  <textarea value={activePost.bodyText} onChange={(event) => updatePost('bodyText', event.target.value)} placeholder="Write article paragraphs. Separate paragraphs with a blank line." rows={7} />
                </label>

                <div className="ma-editor-actions">
                  <button type="submit" className="ma-command save" disabled={isSaving}>
                    <Save aria-hidden="true" />
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button type="button" className="ma-command publish" onClick={() => handleSave('published')} disabled={isSaving}>
                    <Send aria-hidden="true" />
                    Publish
                  </button>
                  {canFeatureActivePost && (
                    <button
                      type="button"
                      className="ma-command feature"
                      onClick={() => handleSave('published', { placement: 'featured', featured: true, displayOrder: 0 })}
                      disabled={isSaving}
                    >
                      <ShieldCheck aria-hidden="true" />
                      Feature &amp; Publish
                    </button>
                  )}
                  {activePost.id && (
                    <>
                      <button type="button" className="ma-command archive" onClick={() => handleSave('archived')} disabled={isSaving}>
                        <Archive aria-hidden="true" />
                        Archive
                      </button>
                      <button type="button" className="ma-command delete" onClick={() => handleDelete(activePost)}>
                        <Trash2 aria-hidden="true" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </form>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
