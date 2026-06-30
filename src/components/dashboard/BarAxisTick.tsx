type BarAxisTickProps = {
  x?: number;
  y?: number;
  payload?: {
    value?: unknown;
  };
  fill?: string;
  fontSize?: number;
  maxWidth?: number;
};

const DEFAULT_FILL = "#525252";
const DEFAULT_FONT_SIZE = 12;
const DEFAULT_MAX_WIDTH = 112;

export function BarAxisTick({
  x = 0,
  y = 0,
  payload,
  fill = DEFAULT_FILL,
  fontSize = DEFAULT_FONT_SIZE,
  maxWidth = DEFAULT_MAX_WIDTH,
}: BarAxisTickProps) {
  const label = String(payload?.value ?? "");
  const truncatedLabel = truncateLabel(label, maxWidth, fontSize);
  const isTruncated = truncatedLabel !== label;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={4}
        fill={fill}
        fontSize={fontSize}
        textAnchor="end"
      >
        {isTruncated ? <title>{label}</title> : null}
        {truncatedLabel}
      </text>
    </g>
  );
}

function truncateLabel(label: string, maxWidth: number, fontSize: number) {
  const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * 0.62)));

  if (label.length <= maxChars) {
    return label;
  }

  return `${label.slice(0, maxChars - 3)}...`;
}
