// Types for the Mobile Shop POS System

export interface ShopProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  gstNumber: string;
  logoUrl?: string;
  termsAndConditions: string[];
  invoicePrefix: string;
  lastInvoiceNumber: number;
}

export interface Product {
  id: string;
  brand: string;
  model: string;
  variant: string; // RAM/Storage e.g. "6GB/128GB"
  color: string;
  purchasePrice: number;
  salePrice: number;
  gstPercent: number; // e.g. 18
  category: 'mobile' | 'accessory' | 'other';
}

export interface IMEIRecord {
  imei: string;
  productId: string;
  status: 'in_stock' | 'sold' | 'returned';
  purchaseDate: string;
  soldDate?: string;
  invoiceId?: string;
  dealerId?: string;
}

export interface BillItem {
  id: string;
  productId: string;
  product: Product;
  imei?: string;
  quantity: number;
  unitPrice: number;
  discount: number; // amount
  discountType: 'percentage' | 'flat';
  discountValue: number; // input value
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  shopId: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerGST?: string;
  items: BillItem[];
  subtotal: number;
  totalDiscount: number;
  billDiscount: number;
  billDiscountType: 'percentage' | 'flat';
  cgst: number;
  sgst: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'mixed';
  paymentDetails?: {
    cash?: number;
    upi?: number;
    card?: number;
  };
  isGSTBill: boolean;
  printType: 'thermal' | 'a4';
  status: 'completed' | 'cancelled';
}

export interface Dealer {
  id: string;
  name: string;
  phone: string;
  address: string;
  gstin: string;
  outstandingBalance: number;
}

export interface DealerTransaction {
  id: string;
  dealerId: string;
  type: 'purchase' | 'payment';
  amount: number;
  date: string;
  description: string;
  invoiceRef?: string;
}

export type AppModule = 'billing' | 'inventory' | 'dealers' | 'reports' | 'settings';
