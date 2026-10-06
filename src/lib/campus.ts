export const ITEM_KINDS = ["lost", "found"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_CATEGORIES = [
  "ID Cards",
  "Room Keys",
  "Calculators",
  "Lab Equipment",
  "Earphones",
  "Wallets",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_STATUSES = ["active", "resolved"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const CLAIM_STATUSES = ["pending", "approved", "rejected"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function hostelVenues(prefix: "MH" | "LH", last: string): string[] {
  const end = LETTERS.indexOf(last);
  return Array.from({ length: end + 1 }, (_, i) => `${prefix}-${LETTERS[i]}`);
}

export const VENUE_GROUPS: { group: string; venues: string[] }[] = [
  {
    group: "Academic Blocks",
    venues: ["SJT", "TT", "PRP", "SMV", "MB", "GDN", "CDMM"],
  },
  { group: "Men's Hostel Blocks", venues: hostelVenues("MH", "T") },
  { group: "Ladies' Hostel Blocks", venues: hostelVenues("LH", "J") },
  { group: "Food Courts", venues: ["Gazebo", "Food Mall", "DC"] },
  { group: "Campus Landmarks", venues: ["Central Library", "Sports Complex"] },
];

export const CAMPUS_VENUES: string[] = VENUE_GROUPS.flatMap((g) => g.venues);

export const VENUE_LABELS: Record<string, string> = {
  SJT: "SJT — Silver Jubilee Tower",
  TT: "TT — Technology Tower",
  PRP: "PRP — Pearl Research Park",
  SMV: "SMV — Academic Block",
  MB: "MB — Main Building",
  GDN: "GDN — Gandhi Block",
  CDMM: "CDMM — Centre for Disaster Mitigation",
  Gazebo: "Gazebo Food Court",
  "Food Mall": "Food Mall",
  DC: "DC — Darling Court",
  "Central Library": "Central Library",
  "Sports Complex": "Sports Complex",
};

export function venueLabel(venue: string): string {
  return VENUE_LABELS[venue] ?? venue;
}

export const HANDOFF_CHECKPOINTS = [
  "SJT Ground Floor Reception",
  "TT Main Entrance Desk",
  "PRP Ground Floor Lobby",
  "SMV Front Desk",
  "MB Visitor Lounge",
  "GDN Security Gate",
  "CDMM Reception",
  "Central Library Security Desk",
  "Food Mall Information Counter",
  "Sports Complex Reception",
] as const;
export type HandoffCheckpoint = (typeof HANDOFF_CHECKPOINTS)[number];

export const REG_NUMBER_RE = /^[0-9]{2}[A-Za-z]{3}[0-9]{4}$/;
export const PHONE_RE = /^[6-9][0-9]{9}$/;

export function isCampusVenue(value: string): boolean {
  return CAMPUS_VENUES.includes(value);
}

export function isCategory(value: string): value is ItemCategory {
  return (ITEM_CATEGORIES as readonly string[]).includes(value);
}

export function isCheckpoint(value: string): value is HandoffCheckpoint {
  return (HANDOFF_CHECKPOINTS as readonly string[]).includes(value);
}
