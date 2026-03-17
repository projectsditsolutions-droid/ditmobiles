// GST Calculation (inclusive)
export const calculateGST = (amount: number, gstPercent: number) => {
  const taxableAmount = amount / (1 + gstPercent / 100);
  const totalGST = amount - taxableAmount;
  return {
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgst: Math.round((totalGST / 2) * 100) / 100,
    sgst: Math.round((totalGST / 2) * 100) / 100,
    totalGST: Math.round(totalGST * 100) / 100,
  };
};

// GST Calculation (exclusive)
export const calculateExclusiveGST = (amount: number, gstPercent: number) => {
  const totalGST = amount * (gstPercent / 100);
  return {
    taxableAmount: Math.round(amount * 100) / 100,
    cgst: Math.round((totalGST / 2) * 100) / 100,
    sgst: Math.round((totalGST / 2) * 100) / 100,
    totalGST: Math.round(totalGST * 100) / 100,
  };
};

// Amount in words (Indian numbering)
export const amountInWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero Rupees Only';
  const n = Math.round(num);
  
  const convertChunk = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
  };
  
  let result = '';
  if (n >= 10000000) result += convertChunk(Math.floor(n / 10000000)) + ' Crore ';
  if (n >= 100000) result += convertChunk(Math.floor((n % 10000000) / 100000)) + ' Lakh ';
  if (n >= 1000) result += convertChunk(Math.floor((n % 100000) / 1000)) + ' Thousand ';
  result += convertChunk(n % 1000);
  
  return 'Rupees ' + result.trim() + ' Only';
};

// Format currency
export const formatINR = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
