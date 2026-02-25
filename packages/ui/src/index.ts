export const tokens = {
  colors: {
    bg: "#0a0f12",
    panel: "#121a1f",
    border: "#22313b",
    text: "#e7f0f5",
    muted: "#8ea3b1",
    accent: "#35c47c",
    danger: "#f65b5b",
    warn: "#f9b24b",
  },
};

export function cardClassName(extra = ""): string {
  return `rounded-lg border p-4 ${extra}`;
}
