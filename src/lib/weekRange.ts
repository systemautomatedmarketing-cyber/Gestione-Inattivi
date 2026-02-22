function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDateIT(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateUS(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Converte "2026-W06" in range Date {start=lun} {end=dom}
 */
export function weekLabelToRange(weekLabel: string): { start: Date; end: Date } {
  // atteso: YYYY-Www
  const m = /^(\d{4})-W(\d{2})$/.exec(weekLabel.trim());
  if (!m) {
    // fallback: settimana corrente
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // 0 = lun
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const year = Number(m[1]);
  const week = Number(m[2]);

  // ISO week: lunedì della settimana 1 è quella che contiene il 4 gennaio
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7; // 0=lun..6=dom
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day);
  week1Monday.setHours(0, 0, 0, 0);

  const start = new Date(week1Monday);
  start.setDate(week1Monday.getDate() + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function formatWeekRange(start: Date, end: Date) {
  return `${formatDateIT(start)}-${formatDateIT(end)}`;
}
