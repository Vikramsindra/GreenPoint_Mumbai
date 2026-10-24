// filepath: api/src/utils/dateHelper.js

/**
 * Returns current date or specified date formatted as YYYY-MM-DD in Indian Standard Time (Asia/Kolkata).
 * IST is UTC+5:30.
 * @param {Date} date
 * @returns {string} YYYY-MM-DD
 */
function getIstBusinessDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch (e) {
    // Fallback: manually offset UTC by +5 hours 30 mins
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(date.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
  }
}

/**
 * Returns start and end UTC Date objects for a given IST business date (or today).
 * 00:00:00.000 IST to 23:59:59.999 IST
 * @param {Date|string} dateOrStr
 * @returns {{ start: Date, end: Date, dateStr: string }}
 */
function getIstDayRange(dateOrStr = new Date()) {
  const dateStr = typeof dateOrStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrStr)
    ? dateOrStr
    : getIstBusinessDate(dateOrStr instanceof Date ? dateOrStr : new Date());

  const start = new Date(`${dateStr}T00:00:00.000+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);

  return { start, end, dateStr };
}

/**
 * Returns an array of the last N IST business date strings (ascending: oldest to today).
 * @param {number} numDays
 * @returns {string[]}
 */
function getPastIstDays(numDays = 7) {
  const todayRange = getIstDayRange();
  const days = [];
  for (let i = numDays - 1; i >= 0; i--) {
    // Subtract i days from start in ms (i * 24 * 3600 * 1000)
    const d = new Date(todayRange.start.getTime() - (i * 24 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000)); // safe midday
    days.push(getIstBusinessDate(d));
  }
  return days;
}

module.exports = {
  getIstBusinessDate,
  getIstDayRange,
  getPastIstDays
};

