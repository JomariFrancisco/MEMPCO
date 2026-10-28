'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirmDialog } from '@/components/ConfirmationDialog';
import {
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
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
  Trophy,
  UploadCloud,
  UsersRound,
  X,
} from 'lucide-react';
import {
  getCurrentPortalUser,
  getPortalHomeRoute,
  isInactivePortalUser,
  isMarketingAdminRole,
  isPasswordChangeRequired,
  signOutPortal,
} from '@/lib/auth/portalAuth';
import {
  MARKETING_PLACEMENTS,
  MARKETING_PLACEMENT_LABELS,
  deleteMarketingPost,
  listMarketingPosts,
  saveMarketingPost,
  uploadMarketingImage,
  sortMarketingPosts,
} from '@/lib/marketing/marketingPosts';
import {
  createMarketingPreviewToken,
  getMarketingPreviewUrl,
  isMarketingPreviewReadyMessage,
  sendMarketingPreviewPost,
} from '@/lib/marketing/marketingPreview';
import PortalThemeToggle from '@/components/PortalThemeToggle';
import PortalProfilePhotoControl from '@/components/PortalProfilePhotoControl';
import '../admin-dashboard/admin-dashboard.css';
import './marketing-admin.css';
import '@/components/PortalWorkspaceTheme.css';
import '@/components/PortalAdminConsoleTheme.css';

const EDITOR_CATEGORIES = ['News', 'Events', 'Announcement', 'Awards', 'Member Stories'];
const ADMIN_DASHBOARD_ROUTE = '/admin-dashboard';
const HRMAX_ROUTE = 'http://120.28.214.253/hrmax/';
const POSTS_PER_PAGE = 3;
const SORT_OPTIONS = [
  { value: 'website_order', label: 'Website Order' },
  { value: 'updated_desc', label: 'Recent Updates' },
  { value: 'published_desc', label: 'Newest Published' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'category_asc', label: 'Category A-Z' },
  { value: 'status_asc', label: 'Status A-Z' },
];
const EDITOR_PLACEMENT_OPTIONS = [
  {
    value: 'featured',
    label: 'Main public feature',
    description: 'Large spotlight area. Publishing this moves the old featured post down.',
  },
  {
    value: 'latest',
    label: 'Latest updates section',
    description: 'Regular public card near the top of the updates area.',
  },
  {
    value: 'more',
    label: 'More updates list',
    description: 'Simple listing for supporting announcements and older updates.',
  },
];
const CONTENT_NAV_ITEMS = [
  { label: 'News', category: 'News', icon: Newspaper },
  { label: 'Events', category: 'Events', icon: CalendarDays },
  { label: 'Announcements', category: 'Announcement', icon: Megaphone },
  { label: 'Awards', category: 'Awards', icon: Trophy },
  { label: 'Stories', category: 'Member Stories', icon: UsersRound },
];
const CATEGORY_TO_TYPE = {
  News: 'news',
  Events: 'event',
  Announcement: 'announcement',
  Awards: 'award',
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
  organization: '',
  awardYear: '',
  eventDate: '',
  eventEndDate: '',
  eventLocation: '',
  registrationUrl: '',
  announcementPriority: 'standard',
  expiresAt: '',
  scheduledAt: '',
  imageAlt: '',
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
  in_review: 'In Review',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};
const isSuperAdmin = (user) => String(user?.role || '').toLowerCase() === 'superadmin';

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
    scheduledAt: status === 'scheduled' ? post.scheduledAt : '',
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

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use a JPG, PNG, or WEBP image.');
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Images must be 8 MB or smaller.');
  }

  const source = await fileToDataUrl(file);

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const maxWidth = 1600;
      const scale = Math.min(1, maxWidth / image.width);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Unable to process this image. Please choose another file.'));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Unable to compress the image. Please choose another file.'));
      }, 'image/jpeg', 0.86);
    };

    image.onerror = () => reject(new Error('Unable to read this image. Please choose another file.'));
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
  if (post.status === 'scheduled') {
    return {
      className: 'scheduled',
      label: 'Scheduled',
      date: formatUpdatedAt(post.scheduledAt),
      meta: 'Publication time',
    };
  }

  if (post.status === 'in_review') {
    return {
      className: 'in-review',
      label: 'In Review',
      date: formatUpdatedAt(post.updatedAt || post.createdAt),
      meta: '',
    };
  }

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

const getPlacementHint = (placement) => {
  if (placement === 'featured') return 'Shows in the large Featured Story / Spotlight area. Only one post should use this.';
  if (placement === 'latest') return 'Shows in the Latest Stories card grid below the featured area.';
  return 'Shows in the More Stories / Quick Updates list.';
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

const toLocalDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
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
  if (statusFilter === 'in_review') return 'Posts in Review';
  if (statusFilter === 'scheduled') return 'Scheduled Posts';
  return 'Website Publishing';
};

const getSaveSuccessMessage = ({ nextStatus, wasExisting, shouldRepublish }) => {
  if (nextStatus === 'in_review') return 'Submitted for Super Admin review.';
  if (nextStatus === 'scheduled') return 'Post scheduled for publication.';
  if (shouldRepublish) return 'Post republished.';
  if (nextStatus === 'published') return 'Post published.';
  if (nextStatus === 'archived') return 'Post archived.';
  if (wasExisting) return 'Post edited.';
  return 'Saved as draft.';
};

function StatCard({ icon: IconComponent, label, value, meta }) {
  return (
    <article className="stat-card glass">
      <div className="stat-card-head">
        <div className="stat-icon">
          <IconComponent className="admin-mono-icon" aria-hidden="true" />
        </div>
        <span className="stat-label">{label}</span>
      </div>
      <p className="stat-value">{value}</p>
      <span className="stat-meta">{meta}</span>
    </article>
  );
}

export default function MarketingAdminPage() {
  const router = useRouter();
  const confirmDialog = useConfirmDialog();
  const fileInputRef = useRef(null);
  const previewFrameRef = useRef(null);
  const previewTokenRef = useRef('');
  const autosaveInFlightRef = useRef(false);
  const autosaveTimerRef = useRef(null);
  const editRevisionRef = useRef(0);
  const savedRevisionRef = useRef(-1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
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
  const [autosaveState, setAutosaveState] = useState('idle');
  const [autosavePulse, setAutosavePulse] = useState(0);
  const isContentView = activeCategory !== 'All';
  const libraryTitle = getLibraryTitle(statusFilter, activeCategory);
  const previewPath = activePost.category === 'Awards'
    ? '/about/awards'
    : activePost.category === 'Member Stories'
      ? '/'
      : '/news';

  const openPublicPreview = () => {
    const token = createMarketingPreviewToken();
    previewTokenRef.current = token;
    setPreviewReady(false);
    setPreviewUrl(getMarketingPreviewUrl(previewPath, token));
    setPreviewOpen(true);
  };

  useEffect(() => {
    if (!previewOpen) return undefined;
    const onMessage = (event) => {
      if (!isMarketingPreviewReadyMessage(event, previewFrameRef.current, previewTokenRef.current)) return;
      setPreviewReady(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [previewOpen]);

  useEffect(() => {
    if (!previewOpen || !previewReady) return;
    sendMarketingPreviewPost(previewFrameRef.current, previewTokenRef.current, {
      ...toSavePayload(activePost, 'published'),
      id: activePost.id || `preview-${previewTokenRef.current}`,
    });
  }, [activePost, previewOpen, previewReady]);

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
      setPosts(await listMarketingPosts());
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

      if (!activeUser) {
        router.replace('/marketing');
        return;
      }

      if (isPasswordChangeRequired(activeUser)) {
        router.replace('/marketing?mode=force-password');
        return;
      }

      if (isInactivePortalUser(activeUser)) {
        await signOutPortal().catch(() => {});
        router.replace('/marketing');
        return;
      }

      if (!isMarketingAdminRole(activeUser.role)) {
        router.replace(getPortalHomeRoute(activeUser.role));
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
    if (checked && user?.id) {
      void loadPosts();
    }
  }, [checked, user?.id]);

  useEffect(() => {
    if (!editorOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.classList.add('ma-editor-open');
    document.documentElement.classList.add('ma-editor-open');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.classList.remove('ma-editor-open');
      document.documentElement.classList.remove('ma-editor-open');
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [editorOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, placementFilter, search, sortMode, statusFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const updatePost = (field, value) => {
    editRevisionRef.current += 1;
    setAutosaveState('waiting');
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

      if (nextType === 'member_story' || nextCategory === 'Member Stories' || nextType === 'award' || nextCategory === 'Awards') {
        nextPost.placement = 'more';
      }

      return nextPost;
    });
  };

  const startNewPost = (requestedCategory = activeCategory) => {
    const category = EDITOR_CATEGORIES.includes(requestedCategory) ? requestedCategory : 'News';
    editRevisionRef.current += 1;
    savedRevisionRef.current = editRevisionRef.current;
    setAutosaveState('idle');
    setActivePost({ ...blankPost, category, type: CATEGORY_TO_TYPE[category] });
    setImageFileLabel('');
    setMessage({ type: '', text: '' });
    setActiveCategory(category);
    setStatusFilter('all');
    setPlacementFilter('all');
    setEditorOpen(true);
  };

  const editPost = (post) => {
    editRevisionRef.current += 1;
    savedRevisionRef.current = editRevisionRef.current;
    setAutosaveState('idle');
    setActivePost(toEditablePost(post));
    setImageFileLabel('');
    setMessage({ type: '', text: '' });
    setEditorOpen(true);
  };

  const handleImageFile = async (file) => {
    if (!file) return;

    setIsUploadingImage(true);

    try {
      const processedImage = await compressImageFile(file);
      const imageUrl = await uploadMarketingImage(processedImage, user);
      editRevisionRef.current += 1;
      setAutosaveState('waiting');
      setActivePost((current) => ({ ...current, image: imageUrl }));
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
    editRevisionRef.current += 1;
    setAutosaveState('waiting');
    setActivePost((current) => ({ ...current, image: '' }));
    setImageFileLabel('');
    setMessage({ type: '', text: '' });
  };

  const handleSave = async (nextStatus = activePost.status, overrides = {}) => {
    const postToSave = { ...activePost, ...overrides };

    if (isUploadingImage) {
      setMessage({ type: 'error', text: 'Wait for the image upload to finish before saving.' });
      return;
    }

    const requiresPublicationContent = ['in_review', 'published', 'scheduled'].includes(nextStatus);
    if (requiresPublicationContent && !postToSave.title.trim()) {
      setMessage({ type: 'error', text: 'Title is required.' });
      return;
    }

    if (['published', 'scheduled'].includes(nextStatus) && !isSuperAdmin(user)) {
      setMessage({ type: 'error', text: 'Only a Super Admin can approve, publish, or schedule a post. Submit it for review instead.' });
      return;
    }

    if (requiresPublicationContent && !postToSave.excerpt.trim()) {
      setMessage({ type: 'error', text: 'Excerpt is required.' });
      return;
    }

    if (requiresPublicationContent && !postToSave.bodyText.trim()) {
      setMessage({ type: 'error', text: 'Add the article or story details before publishing.' });
      return;
    }

    if (requiresPublicationContent && postToSave.image && !postToSave.imageAlt.trim()) {
      setMessage({ type: 'error', text: 'Add a short image description (alt text) before publishing.' });
      return;
    }

    if (requiresPublicationContent && postToSave.type === 'award' && !postToSave.organization.trim()) {
      setMessage({ type: 'error', text: 'Add the awarding organization before publishing this award.' });
      return;
    }

    if (requiresPublicationContent && postToSave.type === 'event' && !postToSave.eventDate) {
      setMessage({ type: 'error', text: 'Add the event start date before publishing.' });
      return;
    }

    if (postToSave.type === 'event' && postToSave.eventEndDate && postToSave.eventEndDate < postToSave.eventDate) {
      setMessage({ type: 'error', text: 'The event end date must be on or after the start date.' });
      return;
    }

    if (nextStatus === 'scheduled' && (!postToSave.scheduledAt || new Date(postToSave.scheduledAt).getTime() <= Date.now())) {
      setMessage({ type: 'error', text: 'Choose a future publication date and time.' });
      return;
    }

    if (nextStatus === 'in_review' && activePost.status === 'published') {
      const confirmed = await confirmDialog({
        title: 'Unpublish and submit for review?',
        message: 'The current public post will be removed while this revision is reviewed.',
        confirmLabel: 'Unpublish and submit',
        variant: 'danger',
      });
      if (!confirmed) return;
    }

    if (nextStatus === 'draft' && activePost.status === 'published') {
      const confirmed = await confirmDialog({
        title: 'Unpublish and save as draft?',
        message: 'This post will be removed from public pages until it is approved and published again.',
        confirmLabel: 'Unpublish post',
        variant: 'danger',
      });
      if (!confirmed) return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
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
      setPosts(await listMarketingPosts());
      setActivePost(toEditablePost(savedPost));
      editRevisionRef.current += 1;
      savedRevisionRef.current = editRevisionRef.current;
      setAutosaveState('idle');
      setImageFileLabel('');
      setMessage({
        type: 'success',
        text: getSaveSuccessMessage({ nextStatus: savedPost.status, wasExisting, shouldRepublish }),
      });
      setEditorOpen(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to save post.' });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (
      !editorOpen ||
      !user ||
      activePost.status !== 'draft' ||
      isSaving ||
      isUploadingImage ||
      autosaveInFlightRef.current ||
      savedRevisionRef.current === editRevisionRef.current
    ) {
      return undefined;
    }

    const revision = editRevisionRef.current;
    const snapshot = { ...activePost };
    setAutosaveState('waiting');
    autosaveTimerRef.current = window.setTimeout(async () => {
      if (revision !== editRevisionRef.current || autosaveInFlightRef.current) return;

      autosaveInFlightRef.current = true;
      setAutosaveState('saving');

      try {
        const savedPost = await saveMarketingPost(toSavePayload(snapshot, 'draft'), user);
        savedRevisionRef.current = revision;
        setPosts((current) => {
          const exists = current.some((post) => post.id === savedPost.id);
          return sortMarketingPosts(exists
            ? current.map((post) => (post.id === savedPost.id ? savedPost : post))
            : [savedPost, ...current]);
        });
        setActivePost((current) => current.id
          ? current
          : { ...current, id: savedPost.id, slug: savedPost.slug, createdBy: savedPost.createdBy });
        if (revision === editRevisionRef.current) setAutosaveState('saved');
      } catch {
        if (revision === editRevisionRef.current) setAutosaveState('error');
      } finally {
        autosaveInFlightRef.current = false;
        autosaveTimerRef.current = null;
        if (revision !== editRevisionRef.current) setAutosavePulse((pulse) => pulse + 1);
      }
    }, 900);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [activePost, autosavePulse, editorOpen, isSaving, isUploadingImage, user]);

  const handleDelete = async (post) => {
    const confirmed = await confirmDialog({
      title: 'Delete post?',
      message: `Delete "${post.title}"?`,
      confirmLabel: 'Delete post',
      variant: 'danger',
      warning: 'This action cannot be undone.',
    });

    if (!confirmed) return;

    try {
      await deleteMarketingPost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));

      if (activePost.id === post.id) {
        setActivePost(blankPost);
      }

      setMessage({ type: 'success', text: 'Post deleted.' });
      setEditorOpen(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to delete post.' });
    }
  };

  const closeEditor = async () => {
    if (isSaving || autosaveState === 'saving') return;

    const hasUnsavedChanges = editRevisionRef.current !== savedRevisionRef.current;
    if (hasUnsavedChanges && activePost.status === 'draft' && activePost.title.trim()) {
      void handleSave('draft');
      return;
    }

    if (hasUnsavedChanges && activePost.status !== 'draft') {
      const confirmed = await confirmDialog({
        title: 'Discard unsaved changes?',
        message: 'Your changes to this published post will be lost.',
        confirmLabel: 'Discard changes',
        variant: 'danger',
      });
      if (!confirmed) return;
    }

    setEditorOpen(false);
  };

  const changeStatusFilter = (nextFilter) => {
    setActiveCategory('All');
    setStatusFilter(nextFilter);
  };

  const changeCategoryFilter = (nextCategory) => {
    setActiveCategory(nextCategory);
    setStatusFilter('all');
    setPlacementFilter('all');
  };

  const handleLogout = async () => {
    await signOutPortal().catch(() => {});
    router.replace('/marketing');
  };

  const isEditingMemberStory = activePost.type === 'member_story' || activePost.category === 'Member Stories';
  const isEditingAward = activePost.type === 'award' || activePost.category === 'Awards';
  const isEditingEvent = activePost.type === 'event' || activePost.category === 'Events';
  const isEditingAnnouncement = activePost.type === 'announcement' || activePost.category === 'Announcement';

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
            </div>

            <div className="portal-topbar-actions">
              <PortalThemeToggle />
              <div className="profile-chip">
                <PortalProfilePhotoControl
                  user={user}
                  fallback="MA"
                  onUserUpdated={setUser}
                  onStatus={(text, type) => setMessage({ type, text })}
                />
                <div className="profile-chip-copy">
                  <strong>{user.name}</strong>
                  <span>{user.role === 'superadmin' ? user.designation : 'Marketing'}</span>
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
                <button type="button" className={`sidebar-nav-btn ${!isContentView && statusFilter === 'in_review' ? 'active' : ''}`} onClick={() => changeStatusFilter('in_review')}>
                  <ShieldCheck className="sidebar-nav-icon" aria-hidden="true" />
                  In Review
                </button>
                <button type="button" className={`sidebar-nav-btn ${!isContentView && statusFilter === 'scheduled' ? 'active' : ''}`} onClick={() => changeStatusFilter('scheduled')}>
                  <Clock3 className="sidebar-nav-icon" aria-hidden="true" />
                  Scheduled
                </button>
                <button type="button" className={`sidebar-nav-btn ${!isContentView && statusFilter === 'archived' ? 'active' : ''}`} onClick={() => changeStatusFilter('archived')}>
                  <Archive className="sidebar-nav-icon" aria-hidden="true" />
                  Archived
                </button>
              </nav>

              <div className="marketing-sidebar-group">
                <span className="marketing-sidebar-label">Content</span>
                <nav className="sidebar-nav marketing-sidebar-nav" aria-label="Marketing content">
                  {CONTENT_NAV_ITEMS.map(({ label, category, icon: IconComponent }) => (
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${activeCategory === category ? 'active' : ''}`}
                      onClick={() => changeCategoryFilter(category)}
                      key={category}
                      aria-current={activeCategory === category ? 'page' : undefined}
                    >
                      <IconComponent className="sidebar-nav-icon" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="sidebar-logout">
                {user.role === 'superadmin' && (
                  <a className="sidebar-nav-btn sidebar-external-link" href={ADMIN_DASHBOARD_ROUTE}>
                    <LayoutDashboard className="sidebar-nav-icon" aria-hidden="true" />
                    IT Super Admin
                    <ExternalLink className="sidebar-trailing-icon" aria-hidden="true" />
                  </a>
                )}

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
                <div className="hero-copy">
                  <span className="section-kicker">Publishing Center</span>
                </div>
              </section>

              {message.text && (
                <div className={`admin-alert ${message.type}${message.type === 'error' ? ' app-error-alert' : ''}`} role={message.type === 'error' ? 'alert' : 'status'}>
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
                  <button
                      type="button"
                      className="quick-action-btn primary marketing-new-btn"
                      onClick={() => startNewPost(isContentView ? activeCategory : 'News')}
                    >
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
                      <select
                        className="marketing-placement-filter"
                        value={placementFilter}
                        onChange={(event) => setPlacementFilter(event.target.value)}
                        aria-label="Placement"
                      >
                        <option value="all">All Placements</option>
                        {MARKETING_PLACEMENTS.map((placement) => (
                          <option value={placement.value} key={placement.value}>
                            {placement.label}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      className="marketing-sort-filter"
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value)}
                      aria-label="Sort posts"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
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
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={3}>
                            <div className="admin-table-main">
                              <strong>Loading posts...</strong>
                              <span>Please wait while the publishing library syncs.</span>
                            </div>
                          </td>
                        </tr>
                      ) : visiblePosts.length ? (
                        paginatedPosts.map((post) => (
                          <tr
                            key={post.id}
                            className="marketing-post-row"
                            role="button"
                            tabIndex={0}
                            aria-label={`Open ${post.title}`}
                            onClick={() => editPost(post)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                editPost(post);
                              }
                            }}
                          >
                            <td>
                              <div className="admin-table-main marketing-story-cell">
                                {post.image && <img src={post.image} alt="" className="marketing-story-thumb" />}
                                <div>
                                  <strong>{post.title}</strong>
                                  <span>
                                    {post.category} / {post.type === 'member_story'
                                      ? post.storyRole || 'Member Story'
                                      : post.type === 'award'
                                        ? 'Awards page'
                                      : MARKETING_PLACEMENT_LABELS[post.placement] || 'More Updates List'}
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
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3}>
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
                      <ChevronLeft className="admin-mono-icon" aria-hidden="true" />
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
                      <ChevronRight className="admin-mono-icon" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </section>
            </section>
          </div>
        </div>

        {editorOpen && (
          <div className="ma-editor-overlay" role="dialog" aria-modal="true" aria-label="Marketing post editor">
            <aside className="ma-editor-drawer">
              <div className="ma-profile-head">
                <div>
                  <span className="section-kicker">{activePost.id ? 'Edit Post' : `New ${activePost.category === 'News' ? 'News Post' : activePost.category === 'Member Stories' ? 'Member Story' : activePost.category === 'Announcement' ? 'Announcement' : activePost.category.slice(0, -1) || 'Post'}`}</span>
                  <h2>{activePost.title || 'Untitled story'}</h2>
                </div>
                {activePost.status === 'draft' && (
                  <span className={`ma-autosave-state ${autosaveState}`} role="status" aria-live="polite">
                    {autosaveState === 'saving' ? 'Saving draft...' : autosaveState === 'saved' ? 'Draft saved' : autosaveState === 'error' ? 'Autosave paused' : autosaveState === 'waiting' ? 'Unsaved changes' : ''}
                    {autosaveState === 'error' && <button type="button" className="ma-autosave-retry" onClick={() => setAutosavePulse((pulse) => pulse + 1)}>Retry</button>}
                  </span>
                )}
                <span className={`ma-editor-status status ${toStatusClass(activePost.status)}`}>
                  {statusLabels[activePost.status] || 'Draft'}
                </span>
                <button type="button" className="ma-drawer-close" onClick={closeEditor} disabled={isSaving || isUploadingImage || autosaveState === 'saving'} aria-label="Close editor">
                  &times;
                </button>
              </div>

              <form className="ma-editor" onSubmit={(event) => {
                event.preventDefault();
                void handleSave('draft');
              }}>
                <section className="ma-editor-main">
                  <div className="ma-editor-row ma-editor-row-two">
                    <label className="ma-field">
                      <span>Title</span>
                      <input value={activePost.title} onChange={(event) => updatePost('title', event.target.value)} placeholder={isEditingAward ? 'Award or recognition title' : isEditingEvent ? 'Event title' : isEditingMemberStory ? 'Member story title' : 'Post title'} />
                    </label>

                    <label className="ma-field">
                      <span>Category</span>
                      <input value={activePost.category} readOnly aria-label="Category (fixed)" />
                    </label>
                  </div>

                  {isEditingAward && (
                    <div className="ma-editor-row ma-editor-row-two ma-type-fields">
                      <label className="ma-field">
                        <span>Awarding Organization</span>
                        <input value={activePost.organization} onChange={(event) => updatePost('organization', event.target.value)} placeholder="Organization or awarding body" />
                      </label>
                      <label className="ma-field">
                        <span>Award Year</span>
                        <input type="number" min="1900" max="2200" value={activePost.awardYear} onChange={(event) => updatePost('awardYear', event.target.value)} placeholder={String(new Date().getFullYear())} />
                      </label>
                    </div>
                  )}

                  {isEditingEvent && (
                    <div className="ma-editor-row ma-event-fields ma-type-fields">
                      <label className="ma-field">
                        <span>Event Start Date</span>
                        <input type="date" value={activePost.eventDate} onChange={(event) => updatePost('eventDate', event.target.value)} />
                      </label>
                      <label className="ma-field">
                        <span>Event End Date (Optional)</span>
                        <input type="date" min={activePost.eventDate || undefined} value={activePost.eventEndDate} onChange={(event) => updatePost('eventEndDate', event.target.value)} />
                      </label>
                      <label className="ma-field">
                        <span>Venue / Location</span>
                        <input value={activePost.eventLocation} onChange={(event) => updatePost('eventLocation', event.target.value)} placeholder="Venue or online" />
                      </label>
                      <label className="ma-field full">
                        <span>Registration Link</span>
                        <input type="url" value={activePost.registrationUrl} onChange={(event) => updatePost('registrationUrl', event.target.value)} placeholder="https://" />
                      </label>
                    </div>
                  )}

                  {isEditingAnnouncement && (
                    <div className="ma-editor-row ma-editor-row-two ma-type-fields">
                      <label className="ma-field">
                        <span>Priority</span>
                        <select value={activePost.announcementPriority} onChange={(event) => updatePost('announcementPriority', event.target.value)}>
                          <option value="standard">Standard</option>
                          <option value="important">Important</option>
                        </select>
                      </label>
                      <label className="ma-field">
                        <span>Display Until (Optional)</span>
                        <input type="date" value={activePost.expiresAt} onChange={(event) => updatePost('expiresAt', event.target.value)} />
                      </label>
                    </div>
                  )}

                  {isEditingMemberStory && (
                    <div className="ma-editor-row ma-editor-row-two ma-type-fields">
                      <label className="ma-field">
                        <span>Member Role</span>
                        <input value={activePost.storyRole} onChange={(event) => updatePost('storyRole', event.target.value)} placeholder="Member, officer, community leader..." />
                      </label>
                      <label className="ma-field">
                        <span>Location</span>
                        <input value={activePost.storyLocation} onChange={(event) => updatePost('storyLocation', event.target.value)} placeholder="Branch or community" />
                      </label>
                      <label className="ma-field full">
                        <span>Video Link (Optional)</span>
                        <input type="url" value={activePost.externalUrl} onChange={(event) => updatePost('externalUrl', event.target.value)} placeholder="YouTube or video link" />
                      </label>
                      <label className="ma-field full">
                        <span>Tags</span>
                        <input value={activePost.tagsText} onChange={(event) => updatePost('tagsText', event.target.value)} placeholder="Community, livelihood, member story" />
                      </label>
                    </div>
                  )}

                  {isSuperAdmin(user) && (
                    <label className="ma-field full">
                      <span>Schedule publication (optional)</span>
                      <input type="datetime-local" value={toLocalDateTimeInput(activePost.scheduledAt)} onChange={(event) => updatePost('scheduledAt', event.target.value ? new Date(event.target.value).toISOString() : '')} />
                      <small>Scheduled posts appear publicly at the selected time in your device’s local timezone.</small>
                    </label>
                  )}

                  <label className="ma-field full ma-excerpt-field">
                    <span>{isEditingAward ? 'Achievement Summary' : isEditingEvent ? 'Event Summary' : isEditingMemberStory ? 'Story Summary' : 'Short Summary'}</span>
                    <textarea value={activePost.excerpt} onChange={(event) => updatePost('excerpt', event.target.value)} placeholder={isEditingAward ? 'What was recognized and why it matters' : isEditingEvent ? 'What attendees can expect' : 'Short summary shown on public cards'} rows={3} />
                  </label>

                  <label className="ma-field full ma-body-field">
                    <span>{isEditingAward ? 'Recognition Details' : isEditingEvent ? 'Event Details' : isEditingMemberStory ? 'Member Story' : 'Article Body'}</span>
                    <textarea value={activePost.bodyText} onChange={(event) => updatePost('bodyText', event.target.value)} placeholder={isEditingAward ? 'Add the award context and achievement details.' : isEditingEvent ? 'Add agenda, audience, and other useful details.' : isEditingMemberStory ? 'Tell the member’s story in a few clear paragraphs.' : 'Write article paragraphs. Separate paragraphs with a blank line.'} rows={7} />
                  </label>
                </section>

                <aside className="ma-editor-side">
                  <section className="ma-settings-card">
                    <div className="ma-settings-head">
                      <span>Public Display</span>
                      <small>
                        {isEditingAward
                          ? 'Award posts appear on the Awards & Recognition page after publishing.'
                          : 'Choose where this post appears after publishing.'}
                      </small>
                    </div>

                    <div className="ma-placement-options">
                      {isEditingAward ? (
                        <div className="ma-placement-option active static">
                          <strong>Awards &amp; Recognition page</strong>
                          <span>Use this for current awards received by MEMPCO. The uploaded image will be shown on the public Awards page.</span>
                        </div>
                      ) : (
                        EDITOR_PLACEMENT_OPTIONS.map((option) => {
                          const disabled = isEditingMemberStory && option.value !== 'more';
                          return (
                            <button
                              type="button"
                              key={option.value}
                              className={`ma-placement-option ${activePost.placement === option.value ? 'active' : ''}`}
                              onClick={() => updatePost('placement', option.value)}
                              disabled={disabled}
                            >
                              <strong>{option.label}</strong>
                              <span>{disabled ? 'Member stories stay in the story list.' : option.description}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="ma-settings-card compact ma-image-card">
                    <div className="ma-field ma-post-image-field">
                      <span>Post Image</span>
                      <input ref={fileInputRef} className="ma-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageInputChange} />
                      <div className="ma-upload-box" onDragOver={(event) => event.preventDefault()} onDrop={handleImageDrop}>
                        {activePost.image ? (
                          <div className="ma-inline-preview">
                            <img src={activePost.image} alt="" />
                            <button type="button" onClick={clearImage} aria-label="Remove image">
                              <X aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <UploadCloud aria-hidden="true" />
                        )}
                        <div>
                          <strong>{isUploadingImage ? 'Adding image...' : activePost.image ? 'Image selected' : 'Upload image'}</strong>
                          <span>{imageFileLabel || 'JPG, PNG, or WEBP · up to 8 MB'}</span>
                        </div>
                        <button type="button" className="ma-mini-btn" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}>
                          <ImagePlus aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    {activePost.image && (
                      <>
                        <div className="ma-full-image-preview">
                          <img src={activePost.image} alt={activePost.imageAlt || ''} />
                        </div>
                        <label className="ma-field full">
                          <span>Image description (alt text)</span>
                          <input value={activePost.imageAlt} onChange={(event) => updatePost('imageAlt', event.target.value)} placeholder="Describe the image for screen reader users" />
                        </label>
                      </>
                    )}
                  </section>
                </aside>

                <div className="ma-editor-actions">
                  {message.text && (
                    <div className={`ma-editor-feedback ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
                      {message.text}
                    </div>
                  )}
                  <button type="button" className="ma-command preview" onClick={openPublicPreview} disabled={!activePost.title.trim()}>
                    <Eye aria-hidden="true" />
                    Preview Public Page
                  </button>
                  <button type="submit" className="ma-command save" disabled={isSaving || isUploadingImage || autosaveState === 'saving'}>
                    <Save aria-hidden="true" />
                    {isSaving ? 'Saving...' : activePost.status === 'published' ? 'Unpublish & Save Draft' : 'Save Draft'}
                  </button>
                  {isSuperAdmin(user) ? (
                    <>
                      {activePost.scheduledAt && (
                        <button type="button" className="ma-command publish" onClick={() => handleSave('scheduled')} disabled={isSaving || isUploadingImage || autosaveState === 'saving'}>
                          <Clock3 aria-hidden="true" />
                          Schedule
                        </button>
                      )}
                      <button type="button" className="ma-command publish" onClick={() => handleSave('published')} disabled={isSaving || isUploadingImage || autosaveState === 'saving'}>
                        <Send aria-hidden="true" />
                        {activePost.status === 'in_review' ? 'Approve & Publish' : 'Publish Now'}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="ma-command publish" onClick={() => handleSave('in_review')} disabled={isSaving || isUploadingImage || autosaveState === 'saving'}>
                      <Send aria-hidden="true" />
                      Submit for Review
                    </button>
                  )}
                  {activePost.id && (
                    <>
                      <button type="button" className="ma-command archive" onClick={() => handleSave('archived')} disabled={isSaving || isUploadingImage || autosaveState === 'saving'}>
                        <Archive aria-hidden="true" />
                        Archive
                      </button>
                      <button type="button" className="ma-command delete" onClick={() => handleDelete(activePost)} disabled={isSaving || isUploadingImage || autosaveState === 'saving'}>
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

        {previewOpen && (
          <div className="ma-public-preview-overlay" role="dialog" aria-modal="true" aria-label="Public page preview">
            <section className="ma-public-preview-panel">
              <header>
                <div>
                  <strong>Public page preview</strong>
                  <span>Preview only. Your changes are not published.</span>
                </div>
                <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Close public preview"><X aria-hidden="true" /></button>
              </header>
              <iframe ref={previewFrameRef} title="Marketing content public preview" src={previewUrl} />
            </section>
          </div>
        )}
      </main>
    </>
  );
}
