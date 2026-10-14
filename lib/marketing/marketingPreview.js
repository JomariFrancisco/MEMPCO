'use client';

import { useEffect, useRef, useState } from 'react';

const PREVIEW_QUERY_KEY = 'marketingPreview';
const PREVIEW_UPDATE_TYPE = 'marketing-preview:update';
const PREVIEW_READY_TYPE = 'marketing-preview:ready';

export const createMarketingPreviewToken = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getMarketingPreviewUrl = (path, token) => {
  const url = new URL(path, window.location.origin);
  url.searchParams.set(PREVIEW_QUERY_KEY, token);
  return `${url.pathname}${url.search}`;
};

export const useMarketingPreview = () => {
  const [previewPost, setPreviewPost] = useState(null);
  const hasFocusedStoryPreview = useRef(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get(PREVIEW_QUERY_KEY);
    if (!token) return undefined;

    const handleMessage = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== PREVIEW_UPDATE_TYPE ||
        event.data?.token !== token ||
        !event.data?.post
      ) {
        return;
      }

      setPreviewPost(event.data.post);

      if (event.data.post.type === 'member_story' && !hasFocusedStoryPreview.current) {
        hasFocusedStoryPreview.current = true;
        window.requestAnimationFrame(() => {
          document.getElementById('member-stories')?.scrollIntoView({ block: 'start' });
        });
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: PREVIEW_READY_TYPE, token }, window.location.origin);

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return previewPost;
};

export const isMarketingPreviewReadyMessage = (event, iframe, token) =>
  event.origin === window.location.origin &&
  event.source === iframe?.contentWindow &&
  event.data?.type === PREVIEW_READY_TYPE &&
  event.data?.token === token;

export const sendMarketingPreviewPost = (iframe, token, post) => {
  iframe?.contentWindow?.postMessage(
    { type: PREVIEW_UPDATE_TYPE, token, post },
    window.location.origin
  );
};
