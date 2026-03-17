import { ShopProfile, Product, IMEIRecord, Invoice, Dealer, DealerTransaction } from '@/types';

const KEYS = {
  shops: 'pos_shops',
  products: 'pos_products',
  imeis: 'pos_imeis',
  invoices: 'pos_invoices',
  dealers: 'pos_dealers',
  dealerTxns: 'pos_dealer_txns',
  pin: 'pos_pin',
  activeShop: 'pos_active_shop',
  settings: 'pos_settings',
};

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Default shop
const defaultShop: ShopProfile = {
  id: 'shop-1',
  name: 'My Mobile Shop',
  address: '123 Main Road, Chennai',
  phone: '9876543210',
  gstNumber: '33XXXXX1234X1Z5',
  termsAndConditions: [
    'வாங்கிய பொருள் மாற்றம் / பணம் திருப்பம் இல்லை',
    'பில் இல்லாமல் மாற்றம் செய்ய முடியாது',
    '2 நாட்களுக்குள் மட்டும் மாற்றம்',
    'தொழில்நுட்ப குறைபாடு மட்டும் மாற்றம்',
    'IMEI பொருந்த வேண்டும்',
    'சேதமடைந்த பொருளுக்கு கடை பொறுப்பல்ல',
  ],
  invoicePrefix: 'INV',
  lastInvoiceNumber: 0,
};

// Shops
export const getShops = (): ShopProfile[] => get(KEYS.shops, [defaultShop]);
export const saveShops = (shops: ShopProfile[]) => set(KEYS.shops, shops);
export const getActiveShopId = (): string => get(KEYS.activeShop, 'shop-1');
export const setActiveShopId = (id: string) => set(KEYS.activeShop, id);
export const getActiveShop = (): ShopProfile => {
  const shops = getShops();
  const id = getActiveShopId();
  return shops.find(s => s.id === id) || shops[0] || defaultShop;
};

// Products
export const getProducts = (): Product[] => get(KEYS.products, []);
export const saveProducts = (products: Product[]) => set(KEYS.products, products);

// IMEI
export const getIMEIs = (): IMEIRecord[] => get(KEYS.imeis, []);
export const saveIMEIs = (imeis: IMEIRecord[]) => set(KEYS.imeis, imeis);
export const findIMEI = (imei: string): IMEIRecord | undefined => getIMEIs().find(r => r.imei === imei);
export const isIMEIAvailable = (imei: string): boolean => {
  const record = findIMEI(imei);
  return !!record && record.status === 'in_stock';
};

// Invoices
export const getInvoices = (): Invoice[] => get(KEYS.invoices, []);
export const saveInvoices = (invoices: Invoice[]) => set(KEYS.invoices, invoices);
export const getNextInvoiceNumber = (shopId: string): string => {
  const shops = getShops();
  const shop = shops.find(s => s.id === shopId);
  if (!shop) return 'INV-001';
  const next = shop.lastInvoiceNumber + 1;
  shop.lastInvoiceNumber = next;
  saveShops(shops);
  return `${shop.invoicePrefix}-${String(next).padStart(4, '0')}`;
};

// Dealers
export const getDealers = (): Dealer[] => get(KEYS.dealers, []);
export const saveDealers = (dealers: Dealer[]) => set(KEYS.dealers, dealers);
export const getDealerTxns = (): DealerTransaction[] => get(KEYS.dealerTxns, []);
export const saveDealerTxns = (txns: DealerTransaction[]) => set(KEYS.dealerTxns, txns);

// PIN
export const getPIN = (): string => get(KEYS.pin, '1234');
export const setPIN = (pin: string) => set(KEYS.pin, pin);
export const verifyPIN = (input: string): boolean => input === getPIN();

// Settings
export interface AppSettings {
  discountEnabled: boolean;
  defaultGSTPercent: number;
  thermalWidth: '58mm' | '80mm';
  defaultPrintType: 'thermal' | 'a4';
}
export const getSettings = (): AppSettings => get(KEYS.settings, {
  discountEnabled: true,
  defaultGSTPercent: 18,
  thermalWidth: '80mm',
  defaultPrintType: 'thermal',
});
export const saveSettings = (s: AppSettings) => set(KEYS.settings, s);

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

// Amount in words
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
  
  // Indian numbering: Lakh, Crore
  let result = '';
  if (n >= 10000000) {
    result += convertChunk(Math.floor(n / 10000000)) + ' Crore ';
  }
  if (n >= 100000) {
    result += convertChunk(Math.floor((n % 10000000) / 100000)) + ' Lakh ';
  }
  if (n >= 1000) {
    result += convertChunk(Math.floor((n % 100000) / 1000)) + ' Thousand ';
  }
  result += convertChunk(n % 1000);
  
  return 'Rupees ' + result.trim() + ' Only';
};
