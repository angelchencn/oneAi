const CHINA_TIME_ZONE = "Asia/Shanghai";
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;

const chinaDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CHINA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parseChinaDateStamp(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid China date stamp: ${value}`);
  }

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  };
}

function resolveChinaDateParts(input = new Date()) {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return parseChinaDateStamp(input);
  }

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${input}`);
  }

  const parts = chinaDateFormatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number.parseInt(lookup.year, 10),
    month: Number.parseInt(lookup.month, 10),
    day: Number.parseInt(lookup.day, 10),
  };
}

export function getChinaDateStamp(input = new Date()) {
  const { year, month, day } = resolveChinaDateParts(input);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatChinaDisplayDate(input = new Date()) {
  const { year, month, day } = resolveChinaDateParts(input);
  return `${year}年${month}月${day}日`;
}

export function buildChinaDayWindow(dateStamp) {
  const { year, month, day } = resolveChinaDateParts(dateStamp);
  const startMs = Date.UTC(year, month - 1, day) - CHINA_OFFSET_MS;
  const endMs = startMs + 24 * 60 * 60 * 1000;

  return {
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
  };
}
