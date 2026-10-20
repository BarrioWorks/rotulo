/**
 * The overlay colours the agent draws inside the owner's site. The preview iframe cannot read
 * the app's custom properties, so these mirror the `--overlay-*` tokens in app.css. A frontend
 * test parses app.css and fails when the two drift apart.
 */
export const OVERLAY = {
  /** --overlay-accent: the selection rule, crop marks and editing glow. */
  accent: "#3730BD",
  /** --overlay-accent-soft: the editing glow and the "just changed" pulse. */
  accentSoft: "rgba(55, 48, 189, 0.12)",
  /** --overlay-hover: the dashed hover rule. */
  hover: "rgba(55, 48, 189, 0.7)",
  /** --overlay-halo: the white line beside every rule, so it reads on dark photos. */
  halo: "#FFFFFF",
  /** --overlay-muted: parts that cannot be edited and hidden sections. */
  muted: "#85858F",
  /** --overlay-chip-bg: the slug that names the selected part. */
  chipBg: "#3730BD",
  /** --overlay-chip-ink: text on the slug. */
  chipInk: "#FFFFFF",
  /** --toast: the hidden-section badge. */
  badgeBg: "#1C1C22",
  /** --on-toast: text on the hidden-section badge. */
  badgeInk: "#F4F4F7",
  /** --select-stroke */
  stroke: "2px",
  /** --halo-width */
  haloWidth: "1.5px",
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
  haloWidth: "--halo-width",
  cropMark: "--crop-mark",
  cropGap: "--crop-gap",
};
