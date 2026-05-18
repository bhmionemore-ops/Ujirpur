export function getCurrentFactDate() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const dateParts: { [key: string]: string } = {};
  parts.forEach(p => dateParts[p.type] = p.value);
  
  let year = parseInt(dateParts.year);
  let month = parseInt(dateParts.month);
  let day = parseInt(dateParts.day);
  let hour = parseInt(dateParts.hour);
  
  if (hour < 8) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getCurrentNewsDate() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const dateParts: { [key: string]: string } = {};
  parts.forEach(p => dateParts[p.type] = p.value);
  
  let year = parseInt(dateParts.year);
  let month = parseInt(dateParts.month);
  let day = parseInt(dateParts.day);
  let hour = parseInt(dateParts.hour);
  
  if (hour < 6) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
