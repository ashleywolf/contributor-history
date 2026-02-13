// 2000s candy color palette — bubbly, saturated, joyful
const COLORS = [
  '#FF6B9D', // bubblegum pink
  '#51C4D3', // aqua
  '#FFB347', // tangerine
  '#87D68D', // mint green
  '#C084FC', // lavender
  '#FF6B6B', // coral
  '#4ECDC4', // teal
  '#FFE66D', // sunshine yellow
  '#7C83FD', // periwinkle
  '#F38181', // salmon
];

export function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

export const CHART_MARGIN = { top: 20, right: 30, bottom: 50, left: 60 };
export const CHART_HEIGHT = 420;
