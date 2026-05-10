'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Clock3,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar/Navbar';
import {
  getCurrentPortalUser,
  isInactivePortalUser,
  isMarketingAdminRole,
  signOutPortal,
} from '@/lib/auth/portalAuth';
import {
  deleteMarketingPost,
  listMarketingPosts,
  saveMarketingPost,
} from '@/lib/marketing/marketingPosts';
import '../admin-dashboard/admin-dashboard.css';
import './marketing-admin.css';

const CATEGORIES = ['All', 'News', 'Events', 'Announcement'];

const blankPost = {
  id: '',
  slug: '',
  title: '',
  category: 'News',
  type: 'news',
  excerpt: '',
  bodyText: '',
  image: '',
  status: 'draft',
  featured: false,
  publishedAt: '',
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
});

const toSavePayload = (post, status = post.status) => ({
  ...post,
  status,
  fullArticle: post.bodyText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean),
  publishedAt: status === 'published' ? post.publishedAt || new Date().toISOString() : post.publishedAt || null,
});

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

const getTypeLabel = (type) => {
  if (type === 'event') return 'Event';
  if (type === 'announcement') return 'Announcement';
  return 'News';
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
    post.excerpt,
  ]
    .join(' ')
    .toLowerCase();

const toStatusClass = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-');

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
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lastSynced, setLastSynced] = useState('');

  const statusFilteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesSearch = !query || getPostSearchText(post).includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [posts, search, statusFilter]);

  const visiblePosts = useMemo(() => {
    if (activeCategory === 'All') return statusFilteredPosts;
    return statusFilteredPosts.filter((post) => post.category === activeCategory);
  }, [activeCategory, statusFilteredPosts]);

  const counts = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((post) => post.status === 'published').length,
      draft: posts.filter((post) => post.status === 'draft').length,
      archived: posts.filter((post) => post.status === 'archived').length,
    }),
    [posts]
  );

  const getCategoryCount = (category) =>
    category === 'All'
      ? statusFilteredPosts.length
      : statusFilteredPosts.filter((post) => post.category === category).length;

  const featuredCount = posts.filter((post) => post.featured).length;

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

  const updatePost = (field, value) => {
    setMessage({ type: '', text: '' });
    setActivePost((current) => ({ ...current, [field]: value }));
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

  const handleSave = async (nextStatus = activePost.status) => {
    if (!activePost.title.trim()) {
      setMessage({ type: 'error', text: 'Title is required.' });
      return;
    }

    if (!activePost.excerpt.trim()) {
      setMessage({ type: 'error', text: 'Excerpt is required.' });
      return;
    }

    setIsSaving(true);

    try {
      const savedPost = await saveMarketingPost(toSavePayload(activePost, nextStatus), user);
      setPosts((current) => {
        const exists = current.some((post) => post.id === savedPost.id);
        const nextPosts = exists
          ? current.map((post) => (post.id === savedPost.id ? savedPost : post))
          : [savedPost, ...current];

        return nextPosts.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      });
      setActivePost(toEditablePost(savedPost));
      setImageFileLabel('');
      setMessage({ type: 'success', text: `${statusLabels[savedPost.status] || 'Post'} saved.` });
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
      setLastSynced(new Date().toLocaleTimeString());
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to delete post.' });
    }
  };

  const changeStatusFilter = (nextFilter) => {
    setStatusFilter(nextFilter);
  };

  const handleLogout = async () => {
    await signOutPortal().catch(() => {});
    router.replace('/LogIn');
  };

  if (!checked || !user) {
    return (
      <>
        <Navbar />
        <main className="portal-main portal-app-main" />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="portal-main portal-app-main marketing-admin-main">
        <div className="portal-shell">
          <header className="portal-topbar glass">
            <div className="portal-topbar-copy">
              <span className="portal-eyebrow">Marketing Admin</span>
              <h1>News & Events Console</h1>
              <p>Manage public stories, announcements, event posts, featured content, and publishing status.</p>
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
                <div className="sidebar-title">Marketing Desk</div>
              </div>

              <nav className="sidebar-nav" aria-label="Marketing admin filters">
                <button type="button" className={`sidebar-nav-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => changeStatusFilter('all')}>
                  <LayoutDashboard className="sidebar-nav-icon" aria-hidden="true" />
                  Overview
                </button>
                <button type="button" className={`sidebar-nav-btn ${statusFilter === 'published' ? 'active' : ''}`} onClick={() => changeStatusFilter('published')}>
                  <Send className="sidebar-nav-icon" aria-hidden="true" />
                  Published
                </button>
                <button type="button" className={`sidebar-nav-btn ${statusFilter === 'draft' ? 'active' : ''}`} onClick={() => changeStatusFilter('draft')}>
                  <FileText className="sidebar-nav-icon" aria-hidden="true" />
                  Drafts
                </button>
                <button type="button" className={`sidebar-nav-btn ${statusFilter === 'archived' ? 'active' : ''}`} onClick={() => changeStatusFilter('archived')}>
                  <Archive className="sidebar-nav-icon" aria-hidden="true" />
                  Archived
                </button>
              </nav>

              <div className="sidebar-logout">
                <button type="button" className="sidebar-nav-btn" onClick={handleLogout}>
                  <LogOut className="sidebar-nav-icon" aria-hidden="true" />
                  Logout
                </button>
              </div>
            </aside>

            <section className="portal-view marketing-admin-view">
              <section className="panel-card glass helpdesk-banner admin-hero-panel marketing-hero-panel">
                <img src="/Logos/Logo.png" alt="" className="admin-hero-logo" aria-hidden="true" />
                <div className="helpdesk-banner-copy hero-copy">
                  <span className="section-kicker">Publishing Center</span>
                  <h2>Admin queue for MEMPCO news, events, and announcements.</h2>
                  <p>Create posts, upload images from computer files, choose featured stories, and publish updates to the public site.</p>
                </div>

                <div className="helpdesk-banner-actions">
                  <button type="button" className="quick-action-btn primary" onClick={startNewPost}>
                    New Post
                  </button>
                  <span className="helpdesk-badge">{visiblePosts.length} Showing</span>
                </div>
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
                <StatCard icon={ShieldCheck} label="Featured" value={featuredCount} meta="Spotlight candidates" />
              </section>

              <section className="panel-card glass marketing-post-panel">
                <div className="section-head">
                  <div>
                    <span className="section-kicker">Post Queue</span>
                    <h3>Marketing Content</h3>
                  </div>
                  <button type="button" className="quick-action-btn primary marketing-new-btn" onClick={startNewPost}>
                    <Plus aria-hidden="true" />
                    New Post
                  </button>
                </div>

                <div className="admin-filter-grid marketing-filter-grid">
                  <div className="ticket-form-group full search-field-group">
                    <label htmlFor="marketing-search">Search Post</label>
                    <span className="field-leading-icon" aria-hidden="true">
                      <Search className="admin-mono-icon" aria-hidden="true" />
                    </span>
                    <input
                      id="marketing-search"
                      className="ticket-field ticket-input"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search title, category, status, excerpt..."
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label>Status</label>
                    <select className="ticket-field ticket-select" value={statusFilter} onChange={(event) => changeStatusFilter(event.target.value)}>
                      <option value="all">All Status</option>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="ticket-form-group">
                    <label>Category</label>
                    <select className="ticket-field ticket-select" value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}>
                      {CATEGORIES.map((category) => (
                        <option value={category} key={category}>
                          {category} ({getCategoryCount(category)})
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
                        <th>Category</th>
                        <th>Status</th>
                        <th>Feature</th>
                        <th>Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={6}>
                            <div className="admin-table-main">
                              <strong>Loading posts...</strong>
                              <span>Please wait while the marketing queue syncs.</span>
                            </div>
                          </td>
                        </tr>
                      ) : visiblePosts.length ? (
                        visiblePosts.map((post) => (
                          <tr key={post.id}>
                            <td>
                              <div className="admin-table-main marketing-story-cell">
                                {post.image && <img src={post.image} alt="" className="marketing-story-thumb" />}
                                <div>
                                  <strong>{post.title}</strong>
                                  <span>{post.excerpt || 'No excerpt yet.'}</span>
                                </div>
                              </div>
                            </td>
                            <td>{post.category}</td>
                            <td>
                              <span className={`status ${toStatusClass(post.status)}`}>{statusLabels[post.status] || 'Draft'}</span>
                            </td>
                            <td>
                              <span className={`status ${post.featured ? 'active' : 'inactive'}`}>{post.featured ? 'Featured' : 'Standard'}</span>
                            </td>
                            <td>{post.date || formatUpdatedAt(post.updatedAt)}</td>
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
                          <td colSpan={6}>
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
                  <p>{statusLabels[activePost.status]}</p>
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

                <div className="ma-field-grid">
                  <label className="ma-field">
                    <span>Category</span>
                    <select value={activePost.category} onChange={(event) => updatePost('category', event.target.value)}>
                      <option value="News">News</option>
                      <option value="Events">Events</option>
                      <option value="Announcement">Announcement</option>
                    </select>
                  </label>

                  <label className="ma-field">
                    <span>Type</span>
                    <select value={activePost.type} onChange={(event) => updatePost('type', event.target.value)}>
                      <option value="news">News</option>
                      <option value="event">Event</option>
                      <option value="announcement">Announcement</option>
                    </select>
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

                <label className="ma-check">
                  <input type="checkbox" checked={activePost.featured} onChange={(event) => updatePost('featured', event.target.checked)} />
                  <span>Feature this story</span>
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
                  <button type="button" className="ma-command archive" onClick={() => handleSave('archived')} disabled={isSaving || !activePost.id}>
                    <Archive aria-hidden="true" />
                    Archive
                  </button>
                  <button type="button" className="ma-command neutral" onClick={startNewPost}>
                    <Plus aria-hidden="true" />
                    New
                  </button>
                  {activePost.id && (
                    <button type="button" className="ma-command delete" onClick={() => handleDelete(activePost)}>
                      <Trash2 aria-hidden="true" />
                      Delete
                    </button>
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
