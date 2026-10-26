'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Trash2, UploadCloud } from 'lucide-react';
import { updateCurrentPortalUserProfilePhoto } from '@/lib/auth/portalAuth';
import styles from './PortalProfilePhotoControl.module.css';

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });

const compressProfilePhoto = async (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file?.type)) {
    throw new Error('Choose a JPG, PNG, WEBP, or GIF profile photo.');
  }
  if (file.size > 4 * 1024 * 1024) {
    throw new Error('Profile photo must be 4 MB or smaller.');
  }

  const source = await fileToDataUrl(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = Math.min(image.naturalWidth, image.naturalHeight);
      if (!size) {
        reject(new Error('Unable to process the selected profile photo.'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 420;
      canvas.height = 420;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Unable to process the selected profile photo.'));
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, 420, 420);
      context.drawImage(
        image,
        (image.naturalWidth - size) / 2,
        (image.naturalHeight - size) / 2,
        size,
        size,
        0,
        0,
        420,
        420,
      );
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    image.onerror = () => reject(new Error('Unable to read the selected profile photo.'));
    image.src = source;
  });
};

const getMenuPosition = (rect, hasPhoto, viewportWidth, viewportHeight) => {
  const menuHeight = hasPhoto ? 88 : 48;
  const belowTop = rect.bottom + 8;

  return {
    top: belowTop + menuHeight <= viewportHeight - 8
      ? belowTop
      : Math.max(8, rect.top - menuHeight - 8),
    right: Math.max(8, viewportWidth - rect.right),
  };
};

export default function PortalProfilePhotoControl({
  user,
  fallback = 'HR',
  onUserUpdated,
  onStatus,
}) {
  const controlRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 8 });

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    setMenuPosition(
      getMenuPosition(
        trigger.getBoundingClientRect(),
        Boolean(user?.profilePhoto),
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }, [user?.profilePhoto]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    updateMenuPosition();

    const closeOnOutsidePointer = (event) => {
      if (
        controlRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) return;
      setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [menuOpen, updateMenuPosition]);

  const savePhoto = async (photo, successMessage) => {
    setSaving(true);
    try {
      const updatedUser = await updateCurrentPortalUserProfilePhoto(photo);
      onUserUpdated?.(updatedUser);
      onStatus?.(successMessage, 'success');
    } catch (error) {
      onStatus?.(error.message || 'Unable to update profile photo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setMenuOpen(false);
    if (!file) return;

    try {
      const photo = await compressProfilePhoto(file);
      await savePhoto(photo, 'Profile photo updated.');
    } catch (error) {
      onStatus?.(error.message || 'Unable to read the selected profile photo.', 'error');
    }
  };

  return (
    <div className={styles.control} ref={controlRef}>
      <span className="profile-chip-avatar">
        {user?.profilePhoto ? (
          <img src={user.profilePhoto} alt="" aria-hidden="true" />
        ) : (
          user?.initials || user?.name?.slice(0, 2) || fallback
        )}
      </span>
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        onClick={() => {
          if (menuOpen) {
            setMenuOpen(false);
            return;
          }
          updateMenuPosition();
          setMenuOpen(true);
        }}
        disabled={saving}
        aria-label="Profile photo options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-busy={saving}
        title="Profile photo options"
      >
        <Camera size={12} aria-hidden="true" />
      </button>
      {menuOpen && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            role="menu"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            <button type="button" role="menuitem" onClick={() => inputRef.current?.click()}>
              <UploadCloud size={15} aria-hidden="true" />
              {user?.profilePhoto ? 'Change photo' : 'Upload photo'}
            </button>
            {user?.profilePhoto ? (
              <button
                className={styles.danger}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  savePhoto('', 'Profile photo removed.');
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
                Remove photo
              </button>
            ) : null}
          </div>,
          document.body,
        )
        : null}
      <input
        ref={inputRef}
        className={styles.input}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
