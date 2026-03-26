
/**
 * Simple Bengali Date Conversion Utility
 * This is a simplified version for the 1432-1433 Bangabda period (2025-2027)
 */

export const BENGALI_MONTHS = [
  'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 
  'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'
];

export const BENGALI_MONTHS_EN = [
  'Baishakh', 'Jyaistha', 'Ashadha', 'Shravana', 'Bhadra', 'Ashwin',
  'Kartika', 'Agrahayana', 'Pausha', 'Magha', 'Phalguna', 'Chaitra'
];

export const BENGALI_DAYS = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
];

export const BENGALI_DAYS_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const BENGALI_NUMBERS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliNumber(n: number | string): string {
  return n.toString().split('').map(d => BENGALI_NUMBERS[parseInt(d)] || d).join('');
}

/**
 * Converts English date to Bengali date (Simplified for 1432-1433)
 * Note: Real Bengali date calculation is complex due to sunrise-based day change.
 * This follows the standard West Bengal calendar format.
 */
export function getBengaliDate(date: Date) {
  const day = date.getDate();
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();

  let bDay = 0;
  let bMonthIndex = 0;
  let bYear = year - 594; // Default for before April 15

  // Simplified logic for 2026
  // Chaitra 1432 starts around March 15, 2026
  if (month === 2) { // March
    if (day >= 15) {
      bDay = day - 14;
      bMonthIndex = 11; // Chaitra
    } else {
      bDay = day + 15;
      bMonthIndex = 10; // Phalguna
    }
  } else if (month === 3) { // April
    if (day >= 15) {
      bDay = day - 14;
      bMonthIndex = 0; // Baishakh
      bYear = year - 593; // New year starts
    } else {
      bDay = day + 16;
      bMonthIndex = 11; // Chaitra
    }
  } else if (month === 4) { // May
    if (day >= 15) {
      bDay = day - 14;
      bMonthIndex = 1; // Jyaistha
      bYear = year - 593;
    } else {
      bDay = day + 16;
      bMonthIndex = 0; // Baishakh
      bYear = year - 593;
    }
  }
  
  // Fallback for other months (approximate)
  if (bDay === 0) {
    const startOfBengaliYear = new Date(year, 3, 15);
    if (date >= startOfBengaliYear) {
      bYear = year - 593;
      const diffTime = date.getTime() - startOfBengaliYear.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      bMonthIndex = Math.floor(diffDays / 30.4) % 12;
      bDay = Math.floor(diffDays % 30.4) + 1;
    } else {
      bYear = year - 594;
      const prevYearStart = new Date(year - 1, 3, 15);
      const diffTime = date.getTime() - prevYearStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      bMonthIndex = Math.floor(diffDays / 30.4) % 12;
      bDay = Math.floor(diffDays % 30.4) + 1;
    }
  }

  return {
    day: bDay,
    month: BENGALI_MONTHS[bMonthIndex],
    monthEn: BENGALI_MONTHS_EN[bMonthIndex],
    year: bYear,
    dayName: BENGALI_DAYS[date.getDay()],
    dayNameEn: BENGALI_DAYS_EN[date.getDay()]
  };
}
