/**
 * Stroke paths (24×24 grid) for the icons that also appear in the token photo.
 * The React icons render them as <path>s; the token photo draws the same paths on a canvas,
 * so the photo always matches the page. Circles and rounded rects are written as paths.
 */
export const ICON_PATHS = {
  shikhar: [
    "M12 2.5v3.3",
    "M12 2.5l3.6 1.25L12 5",
    "M12 5.8c-2.7 2.3-4.7 4.5-4.7 8.2h9.4c0-3.7-2-5.9-4.7-8.2z",
    "M5.5 14h13",
    "M6.6 14v6.5h10.8V14",
    "M4 20.5h16",
    "M10.4 20.5v-2.9a1.6 1.6 0 0 1 3.2 0v2.9",
  ],
  cup: [
    "M5 10h11v3.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V10z",
    "M16 11.5h1.2a2.25 2.25 0 0 1 0 4.5H15.6",
    "M8.6 3.6c-.8.9-.8 1.6 0 2.4s.8 1.6 0 2.4M12.4 3.6c-.8.9-.8 1.6 0 2.4s.8 1.6 0 2.4",
    "M4 21h14",
  ],
  meal: [
    "M7.4 12a4.6 4.6 0 1 0 9.2 0a4.6 4.6 0 1 0-9.2 0z",
    "M9.9 12a2.1 2.1 0 1 0 4.2 0a2.1 2.1 0 1 0-4.2 0z",
    "M3.4 3.5v4a1.6 1.6 0 0 0 3.2 0v-4M5 3.5V20.5",
    "M19 20.5v-8.6M19 11.9c-1.2 0-1.9-1.8-1.9-4.1S17.8 3.5 19 3.5s1.9 2.1 1.9 4.3-.7 4.1-1.9 4.1z",
  ],
  bed: [
    "M3 5.5v14",
    "M3 16h18v3.5",
    "M10.5 16v-5.5h7.8A2.7 2.7 0 0 1 21 13.2V16",
    "M4.9 12.6a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0z",
  ],
  users: [
    "M5.8 8a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0z",
    "M3 19.5c.6-3.3 3-5.2 6-5.2s5.4 1.9 6 5.2",
    "M15.6 4.9a3.2 3.2 0 0 1 0 6.2M17.6 14.6c1.8.7 2.9 2.3 3.4 4.9",
  ],
  calendar: [
    "M5.5 5h13a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
    "M3.5 9.5h17M8 3v4M16 3v4",
  ],
  mapPin: [
    "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z",
    "M9.7 10a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0-4.6 0z",
  ],
  ticket: [
    "M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5z",
    "M14.5 6.5v1.5M14.5 11.25v1.5M14.5 16v1.5",
  ],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICON_PATHS;

/** Stroke width of every icon, in grid units. */
export const ICON_STROKE = 1.8;
