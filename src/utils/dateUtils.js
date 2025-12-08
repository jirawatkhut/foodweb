// Utility for formatting dates to Thai (Buddhist year) with optional time
export function formatThaiDate(dateInput, includeTime = true) {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "-";
  const opts = {
    year: "numeric",
    month: includeTime ? "short" : "long",
    day: "numeric",
  };
  if (includeTime) {
    opts.hour = "2-digit";
    opts.minute = "2-digit";
  }
  try {
    // Use the Buddhist calendar explicitly
    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", opts).format(d);
  } catch (err) {
    // Fallback: manually add 543 to year
    const year = d.getFullYear() + 543;
    const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const day = d.getDate();
    const month = monthNames[d.getMonth()];
    if (includeTime) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${day} ${month} ${year} ${hh}:${mm}`;
    }
    return `${day} ${month} ${year}`;
  }
}
