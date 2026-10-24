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

module.exports = {
  getIstBusinessDate
};
