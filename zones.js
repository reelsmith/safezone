/*
 * safezone: platform UI zone definitions
 * ======================================
 *
 * Every rectangle is { x, y, w, h } in PERCENT of a 1080 x 1920 (9:16) frame,
 * measured from the top-left corner. For example, { x: 0, y: 0, w: 100, h: 8 }
 * is a full-width strip covering the top 8% (about 154 px) of the frame.
 *
 * IMPORTANT: these are APPROXIMATIONS. Every platform moves its UI between app
 * versions, devices, languages, and caption lengths, and none of them publish
 * exact pixel specs for the organic feed. The numbers below are a deliberately
 * conservative average of the modern iOS/Android apps in portrait on a tall
 * (19.5:9-ish) phone. Treat them as a "keep clear of here" guide, not a spec.
 *
 * To update a platform, edit its entry below. Each platform has:
 *   name     Display name.
 *   notes    One-line description shown under the platform switcher.
 *   updated  Year-month the numbers were last checked (YYYY-MM).
 *   zones    Areas the app UI covers. `kind` picks the colour from KINDS.
 *   safe     The recommended area for important text and faces.
 *
 * See README.md, "How zones are defined", for how to contribute measurements.
 */
window.SAFEZONE = (function () {
  'use strict';

  /** Reference frame the percentages are relative to. */
  const FRAME = { width: 1080, height: 1920 };

  /** Zone categories. The colour is shared across platforms so overlays read the same way. */
  const KINDS = {
    top:     { label: 'Top bar',        color: '#3b82f6' },
    rail:    { label: 'Action buttons', color: '#a855f7' },
    caption: { label: 'Caption area',   color: '#f59e0b' },
    nav:     { label: 'Tab bar',        color: '#64748b' },
  };

  const platforms = {
    /* ---------------------------------------------------------------- TikTok */
    tiktok: {
      name: 'TikTok',
      notes: 'For You feed. The caption area grows with long captions and "See more".',
      updated: '2026-09',
      zones: [
        // "LIVE · Following · For You" tabs and the search icon.
        { id: 'top',     kind: 'top',     label: 'Feed tabs & search',          x: 0,    y: 0,  w: 100,  h: 8 },
        // Avatar + follow, like, comment, save, share, spinning sound disc.
        { id: 'rail',    kind: 'rail',    label: 'Like · comment · save · share', x: 86.5, y: 40, w: 13.5, h: 47 },
        // @username, caption text, sound ticker. Stops short of the rail.
        { id: 'caption', kind: 'caption', label: 'Username, caption & sound',   x: 0,    y: 76, w: 86.5, h: 16 },
        // Home · Friends · + · Inbox · Profile.
        { id: 'nav',     kind: 'nav',     label: 'Tab bar',                     x: 0,    y: 92, w: 100,  h: 8 },
      ],
      // Roughly 60 px side margin, clear of the rail and caption block.
      safe: { x: 5.5, y: 8, w: 80, h: 67 },
    },

    /* ------------------------------------------------------ Instagram Reels */
    reels: {
      name: 'Instagram Reels',
      notes: 'Reels tab. Meta also recommends keeping the top ~14% clear for ads.',
      updated: '2026-09',
      zones: [
        // "Reels" title / Friends toggle and the camera icon.
        { id: 'top',     kind: 'top',     label: 'Reels header & camera',       x: 0,  y: 0,  w: 100, h: 8 },
        // Like, comment, share/send, more (...), audio thumbnail.
        { id: 'rail',    kind: 'rail',    label: 'Like · comment · share · audio', x: 86, y: 52, w: 14, h: 38 },
        // Avatar, username, Follow, caption, audio / collab line.
        { id: 'caption', kind: 'caption', label: 'Username, caption & audio',   x: 0,  y: 76, w: 86,  h: 16 },
        // Home · Reels · + · Search · Profile.
        { id: 'nav',     kind: 'nav',     label: 'Tab bar',                     x: 0,  y: 92, w: 100, h: 8 },
      ],
      safe: { x: 6, y: 10, w: 78, h: 62 },
    },

    /* ------------------------------------------------------- YouTube Shorts */
    shorts: {
      name: 'YouTube Shorts',
      notes: 'Shorts feed. Titles, product tags and the Subscribe button sit bottom-left.',
      updated: '2026-09',
      zones: [
        // Search, camera, and overflow menu.
        { id: 'top',     kind: 'top',     label: 'Search & menu',               x: 0,  y: 0,  w: 100, h: 8 },
        // Like, dislike, comments, share, remix, sound.
        { id: 'rail',    kind: 'rail',    label: 'Like · dislike · comment · share', x: 85, y: 42, w: 15, h: 48 },
        // Title, channel + Subscribe, sound / product tags.
        { id: 'caption', kind: 'caption', label: 'Title, channel & subscribe',  x: 0,  y: 74, w: 85,  h: 18 },
        // Home · Shorts · + · Subscriptions · You.
        { id: 'nav',     kind: 'nav',     label: 'Tab bar',                     x: 0,  y: 92, w: 100, h: 8 },
      ],
      safe: { x: 6, y: 9, w: 77, h: 63 },
    },
  };

  return { FRAME, KINDS, platforms };
})();
