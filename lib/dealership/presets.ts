/** Quick date presets (dataset is June–December 2025). */
export const DATE_PRESETS = [
  {
    id: "full",
    label: "Jun–Dec 2025",
    from: "2025-06-01",
    to: "2025-12-31",
  },
  {
    id: "q3",
    label: "Q3 2025",
    from: "2025-07-01",
    to: "2025-09-30",
  },
  {
    id: "h2",
    label: "H2 2025",
    from: "2025-07-01",
    to: "2025-12-31",
  },
  {
    id: "dec",
    label: "Dec 2025",
    from: "2025-12-01",
    to: "2025-12-31",
  },
] as const;
