
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

export const TITHIS = [
  'প্রতিপদ', 'দ্বিতীয়া', 'তৃতীয়া', 'চতুর্থী', 'পঞ্চমী', 'ষষ্ঠী', 'সপ্তমী', 'অষ্টমী', 'নবমী', 'দশমী',
  'একাদশী', 'দ্বাদশী', 'ত্রয়োদশী', 'চতুর্দশী', 'পূর্ণিমা', 'প্রতিপদ', 'দ্বিতীয়া', 'তৃতীয়া', 'চতুর্থী', 'পঞ্চমী',
  'ষষ্ঠী', 'সপ্তমী', 'অষ্টমী', 'নবমী', 'দশমী', 'একাদশী', 'দ্বাদশী', 'ত্রয়োদশী', 'চতুর্দশী', 'অমাবস্যা'
];

export const TITHIS_EN = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashti', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima', 'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashti', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
];

export const NAKSHATRAS = [
  'অশ্বিনী', 'ভরণী', 'কৃত্তিকা', 'রোহিণী', 'মৃগশিরা', 'আর্দ্রা', 'পুনর্বসু', 'পুষ্যা', 'অশ্লেষা', 'মঘা',
  'পূর্বফাল্গুনী', 'উত্তরফাল্গুনী', 'হস্তা', 'চিত্রা', 'স্বাতী', 'বিশাখা', 'অনুরাধা', 'জ্যেষ্ঠা', 'মূল', 'পূর্বাষাঢ়া',
  'উত্তরাষাঢ়া', 'শ্রবণা', 'ধনিষ্ঠা', 'শতভিষা', 'পূর্বভাদ্রপদ', 'উত্তরভাদ্রপদ', 'রেবতী'
];

export const NAKSHATRAS_EN = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanistha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

export const YOGAS = [
  'বিষ্কুম্ভ', 'প্রীতি', 'আয়ুষ্মান', 'সৌভাগ্য', 'শোভন', 'অতিগণ্ড', 'সুকর্মা', 'ধৃতি', 'শূল', 'গণ্ড',
  'বৃদ্ধি', 'ধ্রুব', 'ব্যাঘাত', 'হর্ষণ', 'বজ্র', 'অসিদ্ধি', 'ব্যতিপাত', 'বরীয়ান', 'পরিঘ', 'শিব',
  'সিদ্ধ', 'সাধ্য', 'শুভ', 'শুক্ল', 'ব্রহ্ম', 'ঐন্দ্র', 'বৈধৃতি'
];

export const YOGAS_EN = [
  'Vishkumbha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Asiddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Aindra', 'Vaidhriti'
];

export const KARANAS = [
  'বব', 'বালব', 'কৌলব', 'তৈতিল', 'গর', 'বণিজ', 'বিষ্টি', 'শকুনি', 'চতুষ্পদ', 'নাগ', 'কিংস্তুঘ্ন'
];

export const KARANAS_EN = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti', 'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna'
];

export const RASHIS = [
  'মেষ', 'বৃষ', 'মিথুন', 'কর্কট', 'সিংহ', 'কন্যা', 'তুলা', 'বৃশ্চিক', 'ধনু', 'মকর', 'কুম্ভ', 'মীন'
];

export const RASHIS_EN = [
  'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karkata (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)',
  'Tula (Libra)', 'Vrishchika (Scorpio)', 'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'
];

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

/**
 * Generates deterministic almanac data based on the date
 */
export function getAlmanacData(date: Date) {
  const timestamp = date.getTime();
  const dayOfYear = Math.floor((timestamp - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  
  // Deterministic indexing based on days since epoch or similar
  const epochDays = Math.floor(timestamp / (1000 * 60 * 60 * 24));
  
  const tithiIndex = epochDays % 30;
  const nakshatraIndex = epochDays % 27;
  const yogaIndex = epochDays % 27;
  const karanaIndex = epochDays % 11;
  const rashiIndex = epochDays % 12;

  // Calculate sunrise/sunset (approximate for Dhaka/Kolkata region)
  // Sunrise varies from ~05:00 to ~06:30
  // Sunset varies from ~17:15 to ~18:45
  const sunVar = Math.sin((dayOfYear - 80) * 2 * Math.PI / 365);
  const sunriseMinutes = 330 - Math.floor(sunVar * 45); // ~05:30 +/- 45 mins
  const sunsetMinutes = 1080 + Math.floor(sunVar * 45); // ~18:00 +/- 45 mins

  const formatTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return {
    tithi: TITHIS[tithiIndex],
    tithiEn: TITHIS_EN[tithiIndex],
    nakshatra: NAKSHATRAS[nakshatraIndex],
    nakshatraEn: NAKSHATRAS_EN[nakshatraIndex],
    yoga: YOGAS[yogaIndex],
    yogaEn: YOGAS_EN[yogaIndex],
    karana: KARANAS[karanaIndex],
    karanaEn: KARANAS_EN[karanaIndex],
    rashi: RASHIS[rashiIndex],
    rashiEn: RASHIS_EN[rashiIndex],
    sunrise: formatTime(sunriseMinutes),
    sunset: formatTime(sunsetMinutes),
    moonrise: formatTime((sunriseMinutes + 360) % 1440), // Simplified
    moonset: formatTime((sunsetMinutes + 360) % 1440),   // Simplified
  };
}
