/**
 * Formats a Date object strictly into Google Ads API accepted YYYY-MM-DD
 */
export function formatGoogleDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export type Timeframe = 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR';

/**
 * Calculates current and comparative date windows based on Canadian standard (Monday start).
 * Mathematical comparisons are mapped to exact elapsed days (e.g. Mon-Wed vs Last Mon-Wed) for fair KPI tracking.
 */
export function calculateDateWindows(timeframe: Timeframe): {
  currentStart: string;
  currentEnd: string;
  pastStart: string;
  pastEnd: string;
} {
  const today = new Date();
  
  const currentStart = new Date(today);
  const currentEnd = new Date(today);
  const pastStart = new Date(today);
  const pastEnd = new Date(today);

  if (timeframe === 'THIS_WEEK') {
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Shift current start safely to Monday
    currentStart.setDate(currentStart.getDate() - daysSinceMonday);
    
    // Safely clone and shift exactly 7 days back to preserve month crossings
    pastStart.setTime(currentStart.getTime());
    pastStart.setDate(pastStart.getDate() - 7);
    
    pastEnd.setTime(currentEnd.getTime());
    pastEnd.setDate(pastEnd.getDate() - 7);
  }
  
  else if (timeframe === 'THIS_MONTH') {
    currentStart.setDate(1); 
    
    // Past Month
    pastStart.setDate(1); // Set to 1st before shifting months to avoid 31st overflow bug
    pastStart.setMonth(pastStart.getMonth() - 1);
    
    pastEnd.setDate(1); 
    pastEnd.setMonth(today.getMonth() - 1);
    const daysInPastMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    pastEnd.setDate(Math.min(today.getDate(), daysInPastMonth));
  }

  else if (timeframe === 'THIS_YEAR') {
    currentStart.setMonth(0, 1); // Jan 1st
    
    // Past Year
    pastStart.setFullYear(pastStart.getFullYear() - 1);
    pastStart.setMonth(0, 1);
    
    pastEnd.setFullYear(pastEnd.getFullYear() - 1);
  }

  return {
    currentStart: formatGoogleDate(currentStart),
    currentEnd: formatGoogleDate(currentEnd),
    pastStart: formatGoogleDate(pastStart),
    pastEnd: formatGoogleDate(pastEnd)
  };
}
