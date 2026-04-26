// Indian Financial Year helpers (IST based)
// FY 2026 means April 1, 2026 -> March 31, 2027

export const getCurrentFY = (date: Date = new Date()): number => {
  // Use IST
  const istStr = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const ist = new Date(istStr);
  const month = ist.getMonth(); // 0-11
  const year = ist.getFullYear();
  return month >= 3 ? year : year - 1; // April (month index 3) onwards
};

export const getFYLabel = (fy: number): string => `FY ${fy}-${String((fy + 1) % 100).padStart(2, '0')}`;

export const getFYStartDate = (fy: number): Date => new Date(`${fy}-04-01T00:00:00+05:30`);
export const getFYEndDate = (fy: number): Date => new Date(`${fy + 1}-03-31T23:59:59+05:30`);
