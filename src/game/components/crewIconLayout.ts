export interface CrewIconLayoutOptions {
  count: number;
  x: number;
  y: number;
  width: number;
  height: number;
  iconSize: number;
  iconGap: number;
  horizontalPadding: number;
  topInset: number;
  bottomInset: number;
}

export interface CrewIconPosition {
  x: number;
  y: number;
  size: number;
}

export function getCrewIconLayout({
  count,
  x,
  y,
  width,
  height,
  iconSize,
  iconGap,
  horizontalPadding,
  topInset,
  bottomInset,
}: CrewIconLayoutOptions): CrewIconPosition[] {
  if (count === 0) return [];

  const availableWidth = width - horizontalPadding * 2;
  const columns = Math.max(
    1,
    Math.floor((availableWidth + iconGap) / (iconSize + iconGap)),
  );
  const rows = Math.ceil(count / columns);
  const naturalWidth = columns * iconSize + (columns - 1) * iconGap;
  const naturalHeight = rows * iconSize + (rows - 1) * iconGap;
  const scale = Math.min(
    1,
    availableWidth / naturalWidth,
    (height - topInset - bottomInset) / naturalHeight,
  );
  const size = iconSize * scale;
  const gap = iconGap * scale;
  const layoutHeight = rows * size + (rows - 1) * gap;
  const startY = y + height - bottomInset - layoutHeight;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      x: x + horizontalPadding + column * (size + gap),
      y: startY + row * (size + gap),
      size,
    };
  });
}
