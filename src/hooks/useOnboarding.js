import { useCallback } from 'react';

const STORAGE_KEY = 'cms-onboarding';

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function useOnboarding(userId) {
  const hasSeen = useCallback(
    (tourId) => {
      if (!userId) return true;
      return Boolean(readMap()[`${userId}:${tourId}`]);
    },
    [userId],
  );

  const markSeen = useCallback(
    (tourId) => {
      if (!userId) return;
      const map = readMap();
      map[`${userId}:${tourId}`] = true;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } catch {
        // storage full – ignore
      }
    },
    [userId],
  );

  return { hasSeen, markSeen };
}
