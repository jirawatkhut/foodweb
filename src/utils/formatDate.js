export function formatThaiDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return "-";
  const opts = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: undefined,
    hour12: false,
  };
  // Use Buddhist calendar for Thai locale
  try {
    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", opts).format(d);
  } catch (e) {
    // Fallback: format parts and adjust year
    const y = d.getFullYear() + 543;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${y} ${hh}:${mi}`;
  }
}

export function formatThaiDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return "-";
  const opts = { year: "numeric", month: "short", day: "numeric" };
  try {
    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", opts).format(d);
  } catch (e) {
    const y = d.getFullYear() + 543;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${dd}/${mm}/${y}`;
  }
}
