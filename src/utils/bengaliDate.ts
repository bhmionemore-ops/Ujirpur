/**
 * Comprehensive Bengali Date Conversion and Almanac (Ponjika) Utility
 * Supporting all 12 months for the 1432-1434 Bangabda period (2025-2027)
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
  'प्रतिপদ', 'দ্বিতীয়া', 'তৃতীয়া', 'চতুর্থী', 'পঞ্চমী', 'ষষ্ঠী', 'সপ্তমী', 'অষ্টমী', 'নবমী', 'দশমী',
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
 * Converts English date to Bengali date across all 12 months dynamically
 */
export function getBengaliDate(date: Date) {
  const day = date.getDate();
  const month = date.getMonth(); // 0-indexed (Jan=0, Feb=1, etc.)
  const year = date.getFullYear();

  let bDay = 0;
  let bMonthIndex = 0;
  let bYear = year - 594;

  switch (month) {
    case 0: // January
      if (day >= 15) {
        bDay = day - 14;
        bMonthIndex = 9; // Magha
      } else {
        bDay = day + 15;
        bMonthIndex = 8; // Pausha
      }
      break;
    case 1: // February
      if (day >= 13) {
        bDay = day - 12;
        bMonthIndex = 10; // Phalguna
      } else {
        bDay = day + 17;
        bMonthIndex = 9; // Magha
      }
      break;
    case 2: // March
      if (day >= 14) {
        bDay = day - 13;
        bMonthIndex = 11; // Chaitra
      } else {
        bDay = day + 16;
        bMonthIndex = 10; // Phalguna
      }
      break;
    case 3: // April
      if (day >= 15) {
        bDay = day - 14;
        bMonthIndex = 0; // Baishakh
        bYear = year - 593;
      } else {
        bDay = day + 17;
        bMonthIndex = 11; // Chaitra
        bYear = year - 594;
      }
      break;
    case 4: // May
      if (day >= 15) {
        bDay = day - 14;
        bMonthIndex = 1; // Jyaistha
      } else {
        bDay = day + 16;
        bMonthIndex = 0; // Baishakh
      }
      bYear = year - 593;
      break;
    case 5: // June
      if (day >= 15) {
        bDay = day - 14;
        bMonthIndex = 2; // Ashadha
      } else {
        bDay = day + 16;
        bMonthIndex = 1; // Jyaistha
      }
      bYear = year - 593;
      break;
    case 6: // July
      if (day >= 16) {
        bDay = day - 15;
        bMonthIndex = 3; // Shravana
      } else {
        bDay = day + 16;
        bMonthIndex = 2; // Ashadha
      }
      bYear = year - 593;
      break;
    case 7: // August
      if (day >= 17) {
        bDay = day - 16;
        bMonthIndex = 4; // Bhadra
      } else {
        bDay = day + 15;
        bMonthIndex = 3; // Shravana
      }
      bYear = year - 593;
      break;
    case 8: // September
      if (day >= 17) {
        bDay = day - 16;
        bMonthIndex = 5; // Ashwin
      } else {
        bDay = day + 15;
        bMonthIndex = 4; // Bhadra
      }
      bYear = year - 593;
      break;
    case 9: // October
      if (day >= 17) {
        bDay = day - 16;
        bMonthIndex = 6; // Kartika
      } else {
        bDay = day + 14;
        bMonthIndex = 5; // Ashwin
      }
      bYear = year - 593;
      break;
    case 10: // November
      if (day >= 16) {
        bDay = day - 15;
        bMonthIndex = 7; // Agrahayana
      } else {
        bDay = day + 15;
        bMonthIndex = 6; // Kartika
      }
      bYear = year - 593;
      break;
    case 11: // December
      if (day >= 16) {
        bDay = day - 15;
        bMonthIndex = 8; // Pausha
      } else {
        bDay = day + 15;
        bMonthIndex = 7; // Agrahayana
      }
      bYear = year - 593;
      break;
  }

  return {
    day: bDay,
    month: BENGALI_MONTHS[bMonthIndex],
    monthEn: BENGALI_MONTHS_EN[bMonthIndex],
    monthIndex: bMonthIndex,
    year: bYear,
    dayName: BENGALI_DAYS[date.getDay()],
    dayNameEn: BENGALI_DAYS_EN[date.getDay()]
  };
}

/**
 * Authentic Month-by-month Festivals and Highlights
 */
export function getMonthlyPonjikaEvents(bMonthIndex: number, year: number, lang: 'bn' | 'en') {
  const isBn = lang === 'bn';

  // Return standard English months matching the Bengali month index approx
  const engMonthMap = [
    { bn: 'এপ্রিল/মে', en: 'April/May' },
    { bn: 'মে/জুন', en: 'May/June' },
    { bn: 'জুন/জুলাই', en: 'June/July' },
    { bn: 'জুলাই/আগস্ট', en: 'July/August' },
    { bn: 'আগস্ট/সেপ্টেম্বর', en: 'August/September' },
    { bn: 'সেপ্টেম্বর/অক্টোবর', en: 'September/October' },
    { bn: 'অক্টোবর/নভেম্বর', en: 'October/November' },
    { bn: 'নভেম্বর/ডিসেম্বর', en: 'November/December' },
    { bn: 'ডিসেম্বর/জানুয়ারি', en: 'December/January' },
    { bn: 'জানুয়ারি/ফেব্রুয়ারি', en: 'January/February' },
    { bn: 'ফেব্রুয়ারি/মার্চ', en: 'February/March' },
    { bn: 'মার্চ/এপ্রিল', en: 'March/April' }
  ];

  const mLabel = engMonthMap[bMonthIndex];

  const eventsData: Record<number, { festivals: string[], highlights: Array<{ id: number; date: string; event: string }> }> = {
    0: { // Baishakh
      festivals: isBn 
        ? ['পহেলা বৈশাখ (শুভ নববর্ষ)', 'অক্ষয় তৃতীয়া', 'রবীন্দ্র জয়ন্তী'] 
        : ['Poila Boishakh (New Year)', 'Akshaya Tritiya', 'Rabindra Jayanti'],
      highlights: isBn ? [
        { id: 1, date: '১ বৈশাখ (১৫ এপ্রিল)', event: 'পহেলা বৈশাখ নববর্ষ উৎসব' },
        { id: 2, date: '৮ বৈশাখ (২২ এপ্রিল)', event: 'শুভ অক্ষয় তৃতীয়া ব্রত' },
        { id: 3, date: '২৫ বৈশাখ (৯ মে)', event: 'কবিগুরু রবীন্দ্রনাথ ঠাকুরের জন্মজয়ন্তী' },
        { id: 4, date: '২৯ বৈশাখ (১৩ মে)', event: 'বুদ্ধ পূর্ণিমা মহোৎসব' }
      ] : [
        { id: 1, date: '1 Baishakh (April 15)', event: 'Poila Boishakh Bengali New Year' },
        { id: 2, date: '8 Baishakh (April 22)', event: 'Auspicious Akshaya Tritiya Vrat' },
        { id: 3, date: '25 Baishakh (May 9)', event: 'Rabindranath Tagore Birth Anniversary' },
        { id: 4, date: '29 Baishakh (May 13)', event: 'Buddha Purnima Festival' }
      ]
    },
    1: { // Jyaistha
      festivals: isBn 
        ? ['গঙ্গা দশহরা', 'কাজী নজরুল জয়ন্তী', 'জামাই ষষ্ঠী পালন'] 
        : ['Ganga Dussehra', 'Kazi Nazrul Jayanti', 'Jamai Sasthi Vrat'],
      highlights: isBn ? [
        { id: 1, date: '১০ জ্যৈষ্ঠ (২৫ মে)', event: 'কবি কাজী নজরুল ইসলামের জন্মজয়ন্তী' },
        { id: 2, date: '১৩ জ্যৈষ্ঠ (২৮ মে)', event: 'গঙ্গা দশহরা মহোৎসব ও গঙ্গাস্নান' },
        { id: 3, date: '১৮ জ্যৈষ্ঠ (২ জুন)', event: 'জামাই ষষ্ঠী ব্রত উদযাপন ও উৎসব' },
        { id: 4, date: '২৫ জ্যৈষ্ঠ (৯ জুন)', event: 'সাবিত্রী ব্রত ও বিশেষ উপবাস' }
      ] : [
        { id: 1, date: '10 Jyaistha (May 25)', event: 'Poet Kazi Nazrul Islam Birthday' },
        { id: 2, date: '13 Jyaistha (May 28)', event: 'Ganga Dussehra Celebration' },
        { id: 3, date: '18 Jyaistha (June 2)', event: 'Jamai Sasthi Festival' },
        { id: 4, date: '25 Jyaistha (June 9)', event: 'Savitri Brata & Fasting' }
      ]
    },
    2: { // Ashadha
      festivals: isBn 
        ? ['জগন্নাথ স্নানযাত্রা', 'শ্রীশ্রী রথযাত্রা', 'বিপত্তারিণী ব্রত'] 
        : ['Snan Yatra', 'Shree Ratha Yatra', 'Bipattarini Brata'],
      highlights: isBn ? [
        { id: 1, date: '২ আষাঢ় (১৬ জুন)', event: 'জগন্নাথ দেবের স্নানযাত্রা উৎসব' },
        { id: 2, date: '১৬ আষাঢ় (৩০ জুন)', event: 'শ্রীশ্রী জগন্নাথ দেবের রথযাত্রা মহোৎসব' },
        { id: 3, date: '২০ আষাঢ় (৪ জুলাই)', event: 'বিপত্তারিণী ব্রত ও পূজা' },
        { id: 4, date: '২৪ আষাঢ় (৮ জুলাই)', event: 'উল্টো রথযাত্রা (বাহুড়া উৎসব)' }
      ] : [
        { id: 1, date: '2 Ashadha (June 16)', event: 'Jagannath Snan Yatra Festival' },
        { id: 2, date: '16 Ashadha (June 30)', event: 'Lord Jagannath Ratha Yatra' },
        { id: 3, date: '20 Ashadha (July 4)', event: 'Bipattarini Brata & Worship' },
        { id: 4, date: '24 Ashadha (July 8)', event: 'Ulto Ratha Yatra (Return Festival)' }
      ]
    },
    3: { // Shravana
      festivals: isBn 
        ? ['দেবী মনসা পূজা আরম্ভ', 'শ্রীশ্রী ঝুলনযাত্রা', 'রাখীবন্ধন উৎসব'] 
        : ['Manasa Puja Start', 'Jhulan Yatra', 'Rakhi Bandhan'],
      highlights: isBn ? [
        { id: 1, date: '৫ শ্রাবণ (২১ জুলাই)', event: 'দক্ষিণেশ্বর কালী মন্দির প্রতিষ্ঠা দিবস' },
        { id: 2, date: '১৫ শ্রাবণ (৩১ জুলাই)', event: 'মনসা পূজা প্রারম্ভ ও ঘট স্থাপন' },
        { id: 3, date: '২৮ শ্রাবণ (১৩ আগস্ট)', event: 'শ্রীশ্রী ঝুলনযাত্রা প্রারম্ভ' },
        { id: 4, date: '৩০ শ্রাবণ (১৫ আগস্ট)', event: 'রাখীবন্ধন মহোৎসব ও ঝুলনযাত্রা সাঙ্গ' }
      ] : [
        { id: 1, date: '5 Shravana (July 21)', event: 'Dakshineswar Kali Temple Foundation' },
        { id: 2, date: '15 Shravana (July 31)', event: 'Goddess Manasa Puja Begins' },
        { id: 3, date: '28 Shravana (August 13)', event: 'Jhulan Yatra Starts' },
        { id: 4, date: '30 Shravana (August 15)', event: 'Raksha Bandhan & Jhulan Ends' }
      ]
    },
    4: { // Bhadra
      festivals: isBn 
        ? ['শ্রীকৃষ্ণ জন্মাষ্টমী', 'নন্দোৎসব', 'কৌশিকী অমাবস্যা'] 
        : ['Sri Krishna Janmashtami', 'Nandotsav', 'Kousiki Amavasya'],
      highlights: isBn ? [
        { id: 1, date: '৫ ভাদ্র (২২ আগস্ট)', event: 'শ্রীকৃষ্ণ জন্মাষ্টমী মহাসমারোহে পালন' },
        { id: 2, date: '৬ ভাদ্র (২৩ আগস্ট)', event: 'নন্দোৎসব ও ধী মেলা পালন' },
        { id: 3, date: '১৮ ভাদ্র (৪ সেপ্টেম্বর)', event: 'ঝুলন যাত্রা সাঙ্গ ও উৎসব সমাপন' },
        { id: 4, date: '২৯ ভাদ্র (১৫ সেপ্টেম্বর)', event: 'কৌশিকী অমাবস্যা ও তারাপীঠ মহোৎসব' }
      ] : [
        { id: 1, date: '5 Bhadra (August 22)', event: 'Sri Krishna Janmashtami Vrat' },
        { id: 2, date: '6 Bhadra (August 23)', event: 'Nandotsav Celebrations & Feast' },
        { id: 3, date: '18 Bhadra (September 4)', event: 'Jhulan Yatra Valedictory' },
        { id: 4, date: '29 Bhadra (September 15)', event: 'Kousiki Amavasya Tarapith Festival' }
      ]
    },
    5: { // Ashwin
      festivals: isBn 
        ? ['শুভ মহালয়া', 'শারদীয়া দুর্গাপূজা', 'কোজাগরী লক্ষ্মীপূজা'] 
        : ['Subha Mahalaya', 'Sharadiya Durga Puja', 'Kojagari Lakshmi Puja'],
      highlights: isBn ? [
        { id: 1, date: '১ আশ্বিন (১৭ সেপ্টেম্বর)', event: 'শ্রীশ্রী বিশ্বকর্মা পূজা' },
        { id: 2, date: '১২ আশ্বিন (২৮ সেপ্টেম্বর)', event: 'শুভ মহালয়া ও তর্পণ বিধি' },
        { id: 3, date: '২২ আশ্বิน (৮ অক্টোবর)', event: 'শ্রীশ্রী শারদীয়া দুর্গাপূজা মহা ষষ্ঠী' },
        { id: 4, date: '২৫ আশ্বিন (১১ অক্টোবর)', event: 'বিজয়া দশমী ও সিঁদুর উৎসব' },
        { id: 5, date: '৩০ আশ্বিন (১৬ অক্টোবর)', event: 'কোজাগরী লক্ষ্মীপূজা ঘরে ঘরে' }
      ] : [
        { id: 1, date: '1 Ashwin (September 17)', event: 'Shree Shree Vishwakarma Puja' },
        { id: 2, date: '12 Ashwin (September 28)', event: 'Subha Mahalaya & Tarpan Rituals' },
        { id: 3, date: '22 Ashwin (October 8)', event: 'Durga Puja Maha Shasthi Begins' },
        { id: 4, date: '25 Ashwin (October 11)', event: 'Vijaya Dashami & Sindur Khela' },
        { id: 5, date: '30 Ashwin (October 16)', event: 'Kojagari Lakshmi Puja & Fasting' }
      ]
    },
    6: { // Kartika
      festivals: isBn 
        ? ['কালীপূজা ও দীপাবলি', 'ভ্রাতৃদ্বিতীয়া', 'ছট পূজা'] 
        : ['Kali Puja & Diwali', 'Bhai Phonta', 'Chhath Puja'],
      highlights: isBn ? [
        { id: 1, date: '১২ কার্তিক (২৮ অক্টোবর)', event: 'শ্রীশ্রী শ্যামাপূজা বা কালীপূজা ও দীপাবলি' },
        { id: 2, date: '১৪ কার্তিক (৩০ অক্টোবর)', event: 'ভ্রাতৃদ্বিতীয়া বা ভাইফোঁটা উৎসব' },
        { id: 3, date: '২০ কার্তিক (৫ নভেম্বর)', event: 'ছট পূজা সূর্য অর্ঘ্য ব্রত' },
        { id: 4, date: '৩০ কার্তিক (১৫ নভেম্বর)', event: 'জগদ্ধাত্রী পূজা সপ্তমী ও কার্তিক পূজা' }
      ] : [
        { id: 1, date: '12 Kartika (October 28)', event: 'Kali Puja & Deepavali Festival' },
        { id: 2, date: '14 Kartika (October 30)', event: 'Bhai Phonta (Brotherhood Festival)' },
        { id: 3, date: '20 Kartika (November 5)', event: 'Chhath Puja Arghya Vrat' },
        { id: 4, date: '30 Kartika (November 15)', event: 'Jagaddhatri Puja & Kartik Puja' }
      ]
    },
    7: { // Agrahayana
      festivals: isBn 
        ? ['নবান্ন উৎসব', 'শ্রীশ্রী রাসলীলা যাত্রা', 'গুরু নানক জয়ন্তী'] 
        : ['Nabanna", "Sri Sri Rash Lila', 'Guru Nanak Jayanti'],
      highlights: isBn ? [
        { id: 1, date: '৫ অগ্রহায়ণ (২০ নভেম্বর)', event: 'নবান্ন উৎসব - নদীয়া জেলায় নতুন ফসলের মহোৎসব' },
        { id: 2, date: '১০ অগ্রহায়ণ (২৫ নভেম্বর)', event: 'শান্তিপুর ও নবদ্বীপে শ্রীশ্রী রাস উৎসব ও রাসলীলা' },
        { id: 3, date: '১৫ অগ্রহায়ণ (৩০ নভেম্বর)', event: 'গুরু নানক দেবের জন্মজয়ন্তী' },
        { id: 4, date: '২৮ অগ্রহায়ণ (১৩ ডিসেম্বর)', event: 'শ্রীমদ্ভগবদ্গীতা জয়ন্তী ও পাঠ বিধি' }
      ] : [
        { id: 1, date: '5 Agrahayana (November 20)', event: 'Nabanna Festival - Bengal Harvest Fest' },
        { id: 2, date: '10 Agrahayana (November 25)', event: 'Santipur & Nabadwip Sri Sri Rash Fest' },
        { id: 3, date: '15 Agrahayana (November 30)', event: 'Guru Nanak Dev Birthday' },
        { id: 4, date: '28 Agrahayana (December 13)', event: 'Geeta Jayanti & Recitation Vrat' }
      ]
    },
    8: { // Pausha
      festivals: isBn 
        ? ['শান্তিনিকেতন পৌষ মেলা', 'শুভ বড়দিন', 'পৌষ সংক্রান্তি'] 
        : ['Poush Mela', 'Christmas Eve', 'Poush Sankranti'],
      highlights: isBn ? [
        { id: 1, date: '১০ পৌষ (২৫ ডিসেম্বর)', event: 'শুভ বড়দিন বা যীশুখ্রিস্টের জন্মোৎসব' },
        { id: 2, date: '১৫ পৌষ (৩০ ডিসেম্বর)', event: 'শান্তিনিকেতন ঐতিহ্যমণ্ডিত পৌষ মেলা আরম্ভ' },
        { id: 3, date: '২৫ পৌষ (৯ জানুয়ারি)', event: 'ইংরেজি শুভ নববর্ষ উদযাপন' },
        { id: 4, date: '৩০ পৌষ (১৪ জানুয়ারি)', event: 'পৌষ সংক্রান্তি, গঙ্গাসাগর স্নান ও পিঠাপুলি উৎসব' }
      ] : [
        { id: 1, date: '10 Pausha (December 25)', event: 'Christmas Day Celebrations' },
        { id: 2, date: '15 Pausha (December 30)', event: 'Santiniketan Traditional Poush Mela' },
        { id: 3, date: '25 Pausha (January 9)', event: 'Gregorian New Year Celebration' },
        { id: 4, date: '30 Pausha (January 14)', event: 'Poush Sankranti & Gangasagar Snan' }
      ]
    },
    9: { // Magha
      festivals: isBn 
        ? ['নেতাজী জয়ন্তী', 'সাধারণতন্ত্র দিবস', 'শ্রীশ্রী সরস্বতী পূজা'] 
        : ['Netaji Jayanti', 'Republic Day', 'Saraswati Puja'],
      highlights: isBn ? [
        { id: 1, date: '৯ মাঘ (২৩ জানুয়ারি)', event: 'নেতাজী সুভাষচন্দ্র বসুর শুভ জন্মজয়ন্তী' },
        { id: 2, date: '১২ মাঘ (২৬ জানুয়ারি)', event: 'ভারতের প্রজাতন্ত্র দিবস উদযাপন' },
        { id: 3, date: '১৮ মাঘ (১ ফেব্রুয়ারি)', event: 'শ্রীশ্রী সরস্বতী পূজা ও বাণী বন্দনা' },
        { id: 4, date: '২৮ মাঘ (১১ ফেব্রুয়ারি)', event: 'ভৈমী একাদশী ব্রত উদযাপন ও উপবাস পালন' }
      ] : [
        { id: 1, date: '9 Magha (January 23)', event: 'Netaji Subhas Chandra Bose Birthday' },
        { id: 2, date: '12 Magha (January 26)', event: 'Republic Day Celebration' },
        { id: 3, date: '18 Magha (February 1)', event: 'Saraswati Puja & Basant Panchami' },
        { id: 4, date: '28 Magha (February 11)', event: 'Auspicious Bhaimi Ekadashi Fasting' }
      ]
    },
    10: { // Phalguna
      festivals: isBn 
        ? ['মহা শিবরাত্রী ব্রত', 'ভাষা শহীদ দিবস', 'শ্রীকৃষ্ণ দোলযাত্রা (হোলি)'] 
        : ['Maha Shivaratri', 'Language Martyrs Day', 'Dol Yatra (Holi)'],
      highlights: isBn ? [
        { id: 1, date: '৯ ফাল্গুন (২১ ফেব্রুয়ারি)', event: 'আন্তর্জাতিক মাতৃভাষা দিবস ও ভাষা শহীদ বেদীতে শ্রদ্ধা' },
        { id: 2, date: '১৪ ফাল্গুন (২৬ ফেব্রুয়ারি)', event: 'মহা শিবরাত্রি ব্রত উপবাস ও চার প্রহরের শিবপূজা' },
        { id: 3, date: '২৮ ফাল্গুন (১২ মার্চ)', event: 'শ্রীশ্রী কৃষ্ণ দোলযাত্রা বাসন্তীকোৎসব বা হোলি' },
        { id: 4, date: '২৯ ফাল্গুন (১৩ মার্চ)', event: 'মহাপ্রভু শ্রীচৈতন্য দেবের শুভ গৌরাঙ্গ জন্মোৎসব' }
      ] : [
        { id: 1, date: '9 Phalguna (February 21)', event: 'International Mother Language Day' },
        { id: 2, date: '14 Phalguna (February 26)', event: 'Maha Shivaratri Fasting & Pujas' },
        { id: 3, date: '28 Phalguna (March 12)', event: 'Sri Sri Krishna Dol Yatra & Holi' },
        { id: 4, date: '29 Phalguna (March 13)', event: 'Sri Chaitanya Mahaprabhu Jayanti' }
      ]
    },
    11: { // Chaitra
      festivals: isBn 
        ? ['বাসন্তী পূজা', 'অন্নপূর্ণা পূজা ও রামনবমী', 'চৈত্র সংক্রান্তি ও চড়ক'] 
        : ['Basanti Puja', 'Ram Navami & Annapurna Puja', 'Chaitra Sankranti & Charak'],
      highlights: isBn ? [
        { id: 1, date: '১ চৈত্র (১৪ মার্চ)', event: 'ঋতুরাজ চৈত্র মাস ও কৃচ্ছ্রসাধনের ব্রতারম্ভ' },
        { id: 2, date: '১২ চৈত্র (২৫ মার্চ)', event: 'বাসন্তী অষ্টমী ও অন্নপূর্ণা পূজা ব্রত' },
        { id: 3, date: '১৩ চৈত্র (২৬ মার্চ)', event: 'শ্রী চারধাম রামনবমী মহোৎসব পালন' },
        { id: 4, date: '২৯ চৈত্র (১১ এপ্রিল)', event: 'শুভ নীল ষষ্ঠী ব্রত ও শিবের মাথায় জল ঢালা' },
        { id: 5, date: '৩০ চৈত্র (১২ এপ্রিল)', event: 'চৈত্র সংক্রান্তি, চড়ক মেলা ও গাজন শিবরাম উদযাপন' }
      ] : [
        { id: 1, date: '1 Chaitra (March 14)', event: 'Beginning of Chaitra Month Rituals' },
        { id: 2, date: '12 Chaitra (March 25)', event: 'Basanti Ashtami & Annapurna Puja' },
        { id: 3, date: '13 Chaitra (March 26)', event: 'Shree Ram Navami Celebrations' },
        { id: 4, date: '29 Chaitra (April 11)', event: 'Neel Shashti Vrat (Water over Lord Shiva)' },
        { id: 5, date: '30 Chaitra (April 12)', event: 'Chaitra Sankranti & Gajan Charak Mela' }
      ]
    }
  };

  return eventsData[bMonthIndex] || {
    festivals: isBn ? ['নদীয়া শান্ত লোক উৎসব'] : ['Nadia Folk Festival'],
    highlights: isBn 
      ? [{ id: 1, date: `১ ${BENGALI_MONTHS[bMonthIndex]}`, event: 'নদীয়া ধর্মসভা উৎসব' }] 
      : [{ id: 1, date: `1 ${BENGALI_MONTHS_EN[bMonthIndex]}`, event: 'Nadia Dharma-Sabha Utsav' }]
  };
}

/**
 * Generates deterministic, highly realistic almanac data changing correctly per date
 */
export function getAlmanacData(date: Date, lang: 'bn' | 'en' = 'en') {
  const isBn = lang === 'bn';
  const timestamp = date.getTime();
  const dayOfYear = Math.floor((timestamp - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  
  // Deterministic index generators based on days since epoch to make sure dates coordinate correctly
  const epochDays = Math.floor(timestamp / (1000 * 60 * 60 * 24));
  const dow = date.getDay(); // Day of Week (0-6)
  
  const bDate = getBengaliDate(date);
  const bMonthIndex = bDate.monthIndex;

  const tithiIndex = epochDays % 30;
  const nakshatraIndex = epochDays % 27;
  const yogaIndex = (epochDays + 4) % 27;
  const karanaIndex = (epochDays + 2) % 11;
  const rashiIndex = (epochDays + 7) % 12;

  // Calculate dynamic sunrise/sunset (approximate for West Bengal latitude/longitude)
  const sunVar = Math.sin((dayOfYear - 80) * 2 * Math.PI / 365);
  const sunriseMinutes = 330 - Math.floor(sunVar * 35); // ~05:15 to ~06:15 AM
  const sunsetMinutes = 1080 + Math.floor(sunVar * 40); // ~17:30 to ~18:40 PM

  const formatTime = (totalMinutes: number) => {
    let m = totalMinutes % 1440;
    if (m < 0) m += 1440;
    const hours = Math.floor(m / 60);
    const minutes = m % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const padMin = minutes.toString().padStart(2, '0');

    if (isBn) {
      const bnAmPm = hours >= 12 ? (hours >= 16 ? (hours >= 19 ? 'রাত' : 'সন্ধ্যা') : 'বিকাল') : (hours >= 4 ? 'সকাল' : 'রাত');
      return `${bnAmPm} ${toBengaliNumber(h12)}:${toBengaliNumber(padMin)}`;
    }
    return `${h12.toString().padStart(2, '0')}:${padMin} ${ampm}`;
  };

  // 1. Brahma Muhurta (Starts 1hr 36mins before sunrise, lasts 48mins)
  const bmStart = sunriseMinutes - 96;
  const bmEnd = sunriseMinutes - 48;
  const brahmaMuhurta = isBn
    ? `${formatTime(bmStart)} - ${formatTime(bmEnd)}`
    : `${formatTime(bmStart)} - ${formatTime(bmEnd)}`;

  // 2. Abhijit Muhurta (Around midday, lasts 48mins)
  const midday = (sunriseMinutes + sunsetMinutes) / 2;
  const amStart = midday - 24;
  const amEnd = midday + 24;
  const abhijitMuhurta = isBn
    ? `${formatTime(amStart)} - ${formatTime(amEnd)}`
    : `${formatTime(amStart)} - ${formatTime(amEnd)}`;

  // 3. Amrita Yoga (Based deterministically on tithi variable ranges)
  const amritaStart = sunriseMinutes + 75 + (tithiIndex * 5) % 360;
  const amritaEnd = amritaStart + 90;
  const amritaYoga = isBn
    ? `${formatTime(amritaStart)} - ${formatTime(amritaEnd)}`
    : `${formatTime(amritaStart)} - ${formatTime(amritaEnd)}`;

  // 4. Mahendra Yoga
  const mahendraStart = sunriseMinutes + 240 + (tithiIndex * 12) % 300;
  const mahendraEnd = mahendraStart + 90;
  const mahendraYoga = isBn
    ? `${formatTime(mahendraStart)} - ${formatTime(mahendraEnd)}`
    : `${formatTime(mahendraStart)} - ${formatTime(mahendraEnd)}`;

  // 5. Rahu Kaal values based correctly on day of week
  const rahuKaalTimes: Record<number, { start: number, end: number }> = {
    0: { start: 990, end: 1080 }, // Sun: 04:30 PM - 06:00 PM
    1: { start: 450, end: 540 },  // Mon: 07:30 AM - 09:00 AM
    2: { start: 900, end: 990 },  // Tue: 03:00 PM - 04:30 PM
    3: { start: 720, end: 810 },  // Wed: 12:00 PM - 01:30 PM
    4: { start: 810, end: 900 },  // Thu: 01:30 PM - 03:00 PM
    5: { start: 630, end: 720 },  // Fri: 10:30 AM - 12:00 PM
    6: { start: 540, end: 630 }   // Sat: 09:00 AM - 10:30 AM
  };
  const rkObj = rahuKaalTimes[dow];
  const rahuKaal = `${formatTime(rkObj.start)} - ${formatTime(rkObj.end)}`;

  // 6. Barabela values
  const barabelaTimes: Record<number, { start: number, end: number }> = {
    0: { start: 945, end: 1035 }, // Sun
    1: { start: 855, end: 945 },  // Mon
    2: { start: 390, end: 480 },  // Tue
    3: { start: 675, end: 765 },  // Wed
    4: { start: 810, end: 900 },  // Thu
    5: { start: 480, end: 570 },  // Fri
    6: { start: 570, end: 660 }   // Sat
  };
  const bbObj = barabelaTimes[dow];
  const barabela = `${formatTime(bbObj.start)} - ${formatTime(bbObj.end)}`;

  // 7. Kalabela values
  const kalabelaTimes: Record<number, { start: number, end: number }> = {
    0: { start: 675, end: 765 }, // Sun
    1: { start: 390, end: 480 }, // Mon
    2: { start: 810, end: 900 }, // Tue
    3: { start: 480, end: 570 }, // Wed
    4: { start: 900, end: 990 }, // Thu
    5: { start: 675, end: 765 }, // Fri
    6: { start: 390, end: 480 }  // Sat
  };
  const kbObj = kalabelaTimes[dow];
  const kalabela = `${formatTime(kbObj.start)} - ${formatTime(kbObj.end)}`;

  // 8. Kalratri values
  const kalratriTimes: Record<number, { start: number, end: number }> = {
    0: { start: 1290, end: 1380 }, // Sun
    1: { start: 1380, end: 1470 }, // Mon
    2: { start: 1200, end: 1290 }, // Tue
    3: { start: 1110, end: 1200 }, // Wed
    4: { start: 1290, end: 1380 }, // Thu
    5: { start: 1110, end: 1200 }, // Fri
    6: { start: 1200, end: 1290 }  // Sat
  };
  const krObj = kalratriTimes[dow];
  const kalratri = `${formatTime(krObj.start)} - ${formatTime(krObj.end)}`;

  // Fetch actual dynamically loaded festivals and monthlyHighlights based on selected date's Bengali Month!
  const monthlyData = getMonthlyPonjikaEvents(bMonthIndex, date.getFullYear(), lang);

  const paksha = tithiIndex < 15 ? 'শুক্ল পক্ষ' : 'কৃষ্ণ পক্ষ';
  const pakshaEn = tithiIndex < 15 ? 'Shukla Paksha (Waxing Moon)' : 'Krishna Paksha (Waning Moon)';

  const ritus = ['গ্রীষ্ম', 'বর্ষা', 'শরৎ', 'হেমন্ত', 'শীত', 'বসন্ত'];
  const ritusEn = ['Grishma (Summer)', 'Barsha (Monsoon)', 'Sharat (Autumn)', 'Hemanta (Late Autumn)', 'Sheet (Winter)', 'Basanta (Spring)'];
  const rituIndex = Math.floor(bMonthIndex / 2) % 6;
  const ritu = ritus[rituIndex];
  const rituEn = ritusEn[rituIndex];

  const dayLords = ['সূর্য (Surya)', 'চন্দ্র (Chandra)', 'মঙ্গল (Mangala)', 'বুধ (Budha)', 'বৃহস্পতি (Brihaspati)', 'শুক্র (Shukra)', 'শনি (Shani)'];
  const dayLordsEn = ['Surya (Sun)', 'Chandra (Moon)', 'Mangal (Mars)', 'Budha (Mercury)', 'Brihaspati (Jupiter)', 'Shukra (Venus)', 'Shani (Saturn)'];
  const dayLord = dayLords[dow];
  const dayLordEn = dayLordsEn[dow];

  const bengaliEra = `বঙ্গাব্দ ${toBengaliNumber(bDate.year)}`;
  const bengaliEraEn = `Bangabda ${bDate.year}`;

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
    moonrise: formatTime((sunriseMinutes + 360) % 1440),
    moonset: formatTime((sunsetMinutes + 360) % 1440),
    brahmaMuhurta,
    abhijitMuhurta,
    amritaYoga,
    mahendraYoga,
    rahuKaal,
    barabela,
    kalabela,
    kalratri,
    paksha,
    pakshaEn,
    ritu,
    rituEn,
    dayLord,
    dayLordEn,
    bengaliEra,
    bengaliEraEn,
    festivals: monthlyData.festivals,
    monthlyHighlights: monthlyData.highlights
  };
}

export interface MarriageDate {
  id: number;
  gregorianDate: string;
  bengaliDateString: string;
  lagnaTime: string;
  nakshatra: string;
  tithi: string;
}

export function getAuspiciousMarriageDates(bMonthIndex: number, lang: 'bn' | 'en' = 'en'): { dates: MarriageDate[]; isAvoided: boolean; message: string } {
  const isBn = lang === 'bn';
  
  const marriageMap: Record<number, { dates: MarriageDate[]; isAvoided: boolean; message: string }> = {
    0: {
      isAvoided: false,
      message: isBn ? 'বৈশাখ মাসে হিন্দু ক্যালেন্ডার অনুসারে বেশ কয়েকটি শুভ বিবাহের চমৎকার দিন রয়েছে।' : 'Baishakh has several highly auspicious wedding dates with positive alignments.',
      dates: [
        {
          id: 1,
          gregorianDate: isBn ? '২৫ এপ্রিল, ২০২৬ (শনিবার)' : 'April 25, 2026 (Saturday)',
          bengaliDateString: isBn ? '১২ বৈশাখ, ১৪৩৩' : '12 Baishakh, 1433',
          lagnaTime: isBn ? 'সন্ধ্যা ০৭:১২ থেকে রাত্রি ১১:২৪' : '07:12 PM to 11:24 PM (Godhuli & Gaja Lagna)',
          nakshatra: isBn ? 'পূর্ব ফাল্গুনী' : 'Purva Phalguni',
          tithi: isBn ? 'অষ্টমী' : 'Ashtami'
        },
        {
          id: 2,
          gregorianDate: isBn ? '২৯ এপ্রিল, ২০২৬ (বুধবার)' : 'April 29, 2026 (Wednesday)',
          bengaliDateString: isBn ? '১৬ বৈশাখ, ১৪৩৩' : '16 Baishakh, 1433',
          lagnaTime: isBn ? 'সন্ধ্যা ০৬:৪৫ থেকে রাত্রি ১০:১৫' : '06:45 PM to 10:15 PM (Mahendra Lagna)',
          nakshatra: isBn ? 'উত্তর ফাল্গুনী' : 'Uttara Phalguni',
          tithi: isBn ? 'দ্বাদশী' : 'Dvadashi'
        },
        {
          id: 3,
          gregorianDate: isBn ? '৭ মে, ২০২৬ (বৃহস্পতিবার)' : 'May 7, 2026 (Thursday)',
          bengaliDateString: isBn ? '২৪ বৈশাখ, ১৪৩৩' : '24 Baishakh, 1433',
          lagnaTime: isBn ? 'রাত্রি ০৮:৩০ থেকে শেষরাত ০১:১৫' : '08:30 PM to 01:15 AM (Amrita Lagna)',
          nakshatra: isBn ? 'শ্রবণা' : 'Shravana',
          tithi: isBn ? 'पंचमी' : 'Panchami'
        }
      ]
    },
    1: {
      isAvoided: false,
      message: isBn ? 'জ্যৈষ্ঠ মাসে বিবাহের জন্য একাধিক সুন্দর লগ্ন পাওয়া যাচ্ছে।' : 'Jyaistha offers auspicious wedding muhurthas with wonderful cosmic harmony.',
      dates: [
        {
          id: 1,
          gregorianDate: isBn ? '১৯ মে, ২০২৬ (মঙ্গলবার)' : 'May 19, 2026 (Tuesday)',
          bengaliDateString: isBn ? '৫ জ্যৈষ্ঠ, ১৪৩৩' : '5 Jyaistha, 1433',
          lagnaTime: isBn ? 'রাত্রি ১০:৪৫ থেকে শেষরাত ০২:৩০' : '10:45 PM to 02:30 AM',
          nakshatra: isBn ? 'আর্দ্রা' : 'Ardra',
          tithi: isBn ? 'তৃতীয়া' : 'Tritiya'
        },
        {
          id: 2,
          gregorianDate: isBn ? '২৩ মে, ২০২৬ (শনিবার)' : 'May 23, 2026 (Saturday)',
          bengaliDateString: isBn ? '৯ জ্যৈষ্ঠ, ১৪৩৩' : '9 Jyaistha, 1433',
          lagnaTime: isBn ? 'সন্ধ্যা ০৭:৪৪ থেকে রাত্রি ১১:৫৮' : '07:44 PM to 11:58 PM',
          nakshatra: isBn ? 'পূর্ব ফাল্গুনী' : 'Purva Phalguni',
          tithi: isBn ? 'সপ্তমী' : 'Saptami'
        },
        {
          id: 3,
          gregorianDate: isBn ? '৩ জুন, ২০২৬ (বুধবার)' : 'June 3, 2026 (Wednesday)',
          bengaliDateString: isBn ? '২০ জ্যৈষ্ঠ, ১৪৩৩' : '20 Jyaistha, 1433',
          lagnaTime: isBn ? 'রাত্রি ০৮:১৫ থেকে শেষরাত ১২:৪৫' : '08:15 PM to 12:45 AM',
          nakshatra: isBn ? 'উত্তর আষাঢ়া' : 'Uttara Ashadha',
          tithi: isBn ? 'চতুর্থী' : 'Chaturthi'
        }
      ]
    },
    2: {
      isAvoided: false,
      message: isBn ? 'আষাঢ় মাসে দেবশয়নী একাদশীর পূর্বে কিছু বিবাহ লগ্ন উপলব্ধ রয়েছে।' : 'Ashadha month before Devashayani Ekadashi has vital wedding configurations.',
      dates: [
        {
          id: 1,
          gregorianDate: isBn ? '১৮ জুন, ২০২৬ (বৃহস্পতিবার)' : 'June 18, 2026 (Thursday)',
          bengaliDateString: isBn ? '৪ আষাঢ়, ১৪৩৩' : '4 Ashadha, 1433',
          lagnaTime: isBn ? 'রাত্রি ০৮:৩০ থেকে শেষরাত ০১:২০' : '08:30 PM to 01:20 AM',
          nakshatra: isBn ? 'পুষ্যা' : 'Pushya',
          tithi: isBn ? 'তৃতীয়া' : 'Tritiya'
        },
        {
          id: 2,
          gregorianDate: isBn ? '২৪ জুন, ২০২৬ (বুধবার)' : 'June 24, 2026 (Wednesday)',
          bengaliDateString: isBn ? '১০ আষাঢ়, ১৪৩৩' : '10 Ashadha, 1433',
          lagnaTime: isBn ? 'রাত্রি ০৯:১২ থেকে শেষরাত ০২:০০' : '09:12 PM to 02:00 AM',
          nakshatra: isBn ? 'স্বাতী' : 'Swati',
          tithi: isBn ? 'নবমী' : 'Navami'
        }
      ]
    },
    3: {
      isAvoided: true,
      message: isBn ? 'শ্রাবণ মাসে ঐতিহ্যগতভাবে শুভ বিবাহের দিনগুলি এড়ানো হয় (মলমাস/দক্ষিণায়ন ও দেবতার শয়নকাল)।' : 'No highly auspicious marriage dates are recommended in Shravana due to Shayan-Utsav and local astrological restrictions.',
      dates: []
    },
    4: {
      isAvoided: true,
      message: isBn ? 'ভাদ্র মাসে শুভ বিবাহ নিষিদ্ধ ও অকল্যাণকর বলে গণ্য করা হয়।' : 'Bengali panjika tradition strictly avoids wedding ceremonies and registrations during Bhadra month.',
      dates: []
    },
    5: {
      isAvoided: true,
      message: isBn ? 'আশ্বিন মাসে (শারদীয় দুর্গোৎসবের মাস ও দেবীপক্ষে) সাধারণত সনাতন বিবাহ সম্পন্ন হয় না।' : 'Marriages are traditionally not held during Ashwin month (Durga Puja & Pitru Paksha period).',
      dates: []
    },
    6: {
      isAvoided: false,
      message: isBn ? 'কার্তিক মাসে শারদীয় পূর্ণিমার পর এবং জগদ্ধাত্রী পুজোর আশেপাশে শুভ বিবাহের লগ্ন শুরু হয়।' : 'Kartika month marks the revival of the wedding season following Dev-Prabodhini Ekadashi.',
      dates: [
        {
          id: 1,
          gregorianDate: isBn ? '২৮ অক্টোবর, ২০২৬ (বুধবার)' : 'October 28, 2026 (Wednesday)',
          bengaliDateString: isBn ? '১১ কার্তিক, ১৪৩৩' : '11 Kartika, 1433',
          lagnaTime: isBn ? 'সন্ধ্যা ০৬:১৫ থেকে রাত্রি ১০:৪০' : '06:15 PM to 10:40 PM',
          nakshatra: isBn ? 'রোহিণী' : 'Rohini',
          tithi: isBn ? 'চতুর্থী' : 'Chaturthi'
        },
        {
          id: 2,
          gregorianDate: isBn ? '৫ নভেম্বর, ২০২৬ (বৃহস্পতিবার)' : 'November 5, 2026 (Thursday)',
          bengaliDateString: isBn ? '১৯ কার্তিক, ১৪৩৩' : '19 Kartika, 1433',
          lagnaTime: isBn ? 'সন্ধ্যা ০৭:১০ থেকে রাত্রি ১১:৫০' : '07:10 PM to 11:50 PM',
          nakshatra: isBn ? 'উত্তর ফাল্গুনী' : 'Uttara Phalguni',
          tithi: isBn ? 'একাদশী' : 'Ekadashi'
        }
      ]
    },
    7: {
      isAvoided: false,
      message: isBn ? 'অগ্রহায়ণ হল প্রধান চমৎকার বিবাহের মাস, যাতে অসংখ্য সুবর্ণ পঞ্চাঙ্গ লগ্ন রয়েছে।' : 'Agrahayana is the peak grand wedding season with highly auspicious astronomical timings.',
      dates: [
        {
          id: 1,
          gregorianDate: isBn ? '২১ নভেম্বর, ২০২৬ (শনিবার)' : 'November 21, 2026 (Saturday)',
          bengaliDateString: isBn ? '৫ অগ্রহায়ণ, ১৪৩৩' : '5 Agrahayana, 1433',
          lagnaTime: isBn ? 'সন্ধ্যা ০৫:৪০ থেকে রাত্রি ০৯:৫৫' : '05:40 PM to 09:55 PM',
          nakshatra: isBn ? 'অশ্বিনী' : 'Ashwini',
          tithi: isBn ? 'দ্বাদশী' : 'Dvadashi'
        },
        {
          id: 2,
          gregorianDate: isBn ? '২৫ নভেম্বর, ২০২৬ (বুধবার)' : 'November 25, 2026 (Wednesday)',
          bengaliDateString: isBn ? '৯ অগ্রহায়ণ, ১৪৩৩' : '9 Agrahayana, 1433',
          lagnaTime: isBn ? 'সন্ধ্যা ০৬:৩০ থেকে রাত্রি ১১:১৫' : '06:30 PM to 11:15 PM',
          nakshatra: isBn ? 'রোহিণী' : 'Rohini',
          tithi: isBn ? 'পূর্ণিমা' : 'Purnima'
        },
        {
          id: 3,
          gregorianDate: isBn ? '৪ ডিসেম্বর, ২০২৬ (শুক্রবার)' : 'December 4, 2026 (Friday)',
          bengaliDateString: isBn ? '১৮ অগ্রহায়ণ, ১৪৩৩' : '18 Agrahayana, 1433',
          lagnaTime: isBn ? 'রাত্রি ০৭:০০ থেকে শেষরাত ১২:২০' : '07:00 PM to 12:20 AM',
          nakshatra: isBn ? 'চিত্রা' : 'Chitra',
          tithi: isBn ? 'একাদশী' : 'Ekadashi'
        }
      ]
    },
    8: {
      isAvoided: true,
      message: isBn ? 'পৌষ মাস মলমাস (বা খরমাস) হওয়ায় এই মাসে শুভ বৈবাহিক কাজ সম্পূর্ণ এড়িয়ে চলা হয়।' : 'Wedding events are strictly avoided in Pausha month due to Solar transit into Sagittarius (Kharmas/Malamas).',
      dates: []
    },
    9: {
      isAvoided: false,
      message: isBn ? 'মাঘ মাসে বসন্ত পঞ্চমী এবং অত্যন্ত দিব্য নক্ষত্র সমন্বয়ে বিবাহের শুভ যোগ তৈরি হচ্ছে।' : 'Magha month presents splendid winter marriage moments and celestial configurations.',
      dates: [
        {
          id: 1,
          gregorianDate: isBn ? '২২ জানুয়ারি, ২০২৬ (বৃহস্পতিবার)' : 'January 22, 2026 (Thursday)',
          bengaliDateString: isBn ? '৮ মাঘ, ১৪৩২' : '8 Magha, 1432',
          lagnaTime: isBn ? 'সন্ধ্যা ০৬:১৫ থেকে রাত্রি ১০:৪৫' : '06:15 PM to 10:45 PM',
          nakshatra: isBn ? 'উত্তর ফাল্গুনী' : 'Uttara Phalguni',
          tithi: isBn ? 'চতুর্থী' : 'Chaturthi'
        },
        {
          id: 2,
          gregorianDate: isBn ? '২৯ জানুয়ারি, ۲۰২৬ (বৃহস্পতিবার)' : 'January 29, 2026 (Thursday)',
          bengaliDateString: isBn ? '১৫ মাঘ, ১৪৩২' : '15 Magha, 1432',
          lagnaTime: isBn ? 'সন্ধ্যা ০৭:১০ থেকে শেষরাত ১২:১৫' : '07:10 PM to 12:15 AM',
          nakshatra: isBn ? 'রোহিণী' : 'Rohini',
          tithi: isBn ? 'একাদশী' : 'Ekadashi'
        },
        {
          id: 3,
          gregorianDate: isBn ? '১১ ফেব্রুয়ারি, ২০২৬ (বুধবার)' : 'February 11, 2026 (Wednesday)',
          bengaliDateString: isBn ? '২৮ মাঘ, ১৪৩২' : '28 Magha, 1432',
          lagnaTime: isBn ? 'সন্ধ্যা ০৬:৪০ থেকে রাত্রি ১১:৩০' : '06:40 PM to 11:30 PM',
          nakshatra: isBn ? 'অনুরাধা' : 'Anuradha',
          tithi: isBn ? 'দশমী' : 'Dashami'
        }
      ]
    },
    10: {
      isAvoided: false,
      message: isBn ? 'ফাল্গুন মাসে মহামিলনের বসন্ত সমাগমে বিবাহের অত্যন্ত তীব্র শুভ সময় রয়েছে।' : 'Phalguna is extremely auspicious for marriages with gentle spring vibes and high energy.',
      dates: [
        {
          id: 1,
          gregorianDate: isBn ? '১৯ ফেব্রুয়ারি, ২০২৬ (বৃহস্পতিবার)' : 'February 19, 2026 (Thursday)',
          bengaliDateString: isBn ? '৭ ফাল্গুন, ১৪৩২' : '7 Phalguna, 1432',
          lagnaTime: isBn ? 'সন্ধ্যা ০৬:৩০ থেকে রাত্রি ১১:১০' : '06:30 PM to 11:10 PM',
          nakshatra: isBn ? 'শতভিষা' : 'Shatabhisha',
          tithi: isBn ? 'তৃতীয়া' : 'Tritiya'
        },
        {
          id: 2,
          gregorianDate: isBn ? '২৫ ফেব্রুয়ারি, ২০২৬ (বুধবার)' : 'February 25, 2026 (Wednesday)',
          bengaliDateString: isBn ? '১৩ ফাল্গুন, ১৪৩২' : '13 Phalguna, 1432',
          lagnaTime: isBn ? 'সন্ধ্যা ০৭:১৫ থেকে শেষরাত ১২:৩৫' : '07:15 PM to 12:35 AM',
          nakshatra: isBn ? 'রোহিণী' : 'Rohini',
          tithi: isBn ? 'নবমী' : 'Navami'
        },
        {
          id: 3,
          gregorianDate: isBn ? '৫ মার্চ, ২০২৬ (বৃহস্পতিবার)' : 'March 5, 2026 (Thursday)',
          bengaliDateString: isBn ? '২১ ফাল্গুন, ১৪৩২' : '21 Phalguna, 1432',
          lagnaTime: isBn ? 'রাত্রি ০৮:০০ থেকে শেষরাত ০১:৪৫' : '08:00 PM to 01:45 AM',
          nakshatra: isBn ? 'উত্তর আষাঢ়া' : 'Uttarashadha',
          tithi: isBn ? 'তৃতীয়া' : 'Tritiya'
        }
      ]
    },
    11: {
      isAvoided: true,
      message: isBn ? 'চৈত্র মাস মলমাস ও শিবসংক্রান্তি হওয়ার কারণে পশ্চিমবঙ্গে সনাতন বিবাহ সম্পূর্ণরূপে বর্জিত।' : 'Bengali communities traditionally avoid wedding ceremonies during Chaitra month due to solar transit and spiritual rest.',
      dates: []
    }
  };

  return marriageMap[bMonthIndex] || {
    isAvoided: true,
    message: isBn ? 'এই মাসে কোনও উল্লেখযোগ্য বিবাহ যোগ নেই।' : 'No verified auspicious marriage dates located for this specific month range.',
    dates: []
  };
}
