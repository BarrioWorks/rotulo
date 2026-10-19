/**
 * The overlay colours the agent draws inside the owner's site. The preview iframe cannot read
 * the app's custom properties, so these mirror the `--overlay-*` tokens in app.css. A frontend
 * test parses app.css and fails when the two drift apart.
 */
export const OVERLAY = {
  /** --overlay-accent: the selection rule, crop marks and editing glow. */
  accent: "#0A86D6",
  /** --overlay-accent-soft: the editing glow and the "just changed" pulse. */
  accentSoft: "rgba(10, 134, 214, 0.2)",
  /** --overlay-hover: the dashed hover rule. */
  hover: "rgba(10, 134, 214, 0.7)",
  /** --overlay-halo: the white line beside every rule, so it reads on dark photos. */
  halo: "rgba(255, 255, 255, 0.9)",
  /** --overlay-muted: parts that cannot be edited and hidden sections. */
  muted: "#8C8B85",
  /** --overlay-chip-bg: the slug that names the selected part. */
  chipBg: "#0070B8",
  /** --overlay-chip-ink: text on the slug. */
  chipInk: "#FFFFFF",
  /** --toast: the hidden-section badge. */
  badgeBg: "#16161A",
  /** --on-toast: text on the hidden-section badge. */
  badgeInk: "#F4F3EF",
  /** --select-stroke */
  stroke: "1.5px",
  /** --crop-mark: arm length of each crop mark. */
  cropMark: "8px",
  /** --crop-gap: crop marks sit this far outside the corner. */
  cropGap: "4px",
} as const;

/** The app.css custom property each value mirrors. */
export const OVERLAY_TOKENS: Record<keyof typeof OVERLAY, string> = {
  accent: "--overlay-accent",
  accentSoft: "--overlay-accent-soft",
  hover: "--overlay-hover",
  halo: "--overlay-halo",
  muted: "--overlay-muted",
  chipBg: "--overlay-chip-bg",
  chipInk: "--overlay-chip-ink",
  badgeBg: "--toast",
  badgeInk: "--on-toast",
  stroke: "--select-stroke",
  cropMark: "--crop-mark",
  cropGap: "--crop-gap",
};
