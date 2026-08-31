# Mobile Shop Master

Develop a production-ready Mobile Shop Billing & Inventory Management Software specifically for mobile retail stores in India.

The system must be fast, secure, GST-compliant, and optimized for real-time shop usage.

CORE REQUIREMENTS:

The software must include:

Fast POS Billing System

IMEI-based product tracking (IMEI acts as barcode)

Inventory Management

Multi-Shop GST System (2 or more GST numbers)

GST Billing (inclusive calculation)

Dealer / Supplier Ledger

Discount System

Tamil Terms & Conditions in bill

Thermal Printer Support (58mm / 80mm)

A4 Invoice Printing

PIN-based Security System

IMEI AS BARCODE (IMPORTANT):

IMEI number must act as the barcode

No separate barcode field for mobiles

Each IMEI must be unique

IMEI is used for:

Product identification

Scanning during billing

Inventory tracking

When IMEI is scanned:

Product must auto-detect

Product must be added instantly to bill

Bill must display IMEI instead of barcode

POS BILLING SYSTEM:

Ultra fast billing interface

IMEI scan → auto add product

Manual search (model / name / IMEI)

Quantity control

Product-level discount

Bill-level discount

Multiple payment methods:

Cash

UPI

Card

Mixed

Keyboard shortcuts:
F2 → GST Bill
F3 → Non-GST Bill
F4 → Discount
F9 → Print

MULTI SHOP GST SYSTEM:

Support multiple shop profiles with different GST numbers

Each shop profile must include:

Shop Name

Address

Phone

GST Number

Logo

Terms & Conditions

Billing screen must include a shop selector dropdown

When switching shop:

Shop name updates

GST number updates

Invoice header updates

Invoice series changes automatically

GST SYSTEM:

GST must be calculated from sale price (inclusive GST)

Automatically split:

CGST

SGST

GST MODE TOGGLE:

GST BILL → show GST breakdown

NON GST BILL → hide GST

CUSTOMER GST SUPPORT:

Optional GSTIN field

If filled → B2B Invoice

If empty → B2C Invoice

INVENTORY MANAGEMENT:

Add / Edit / Delete products

Bulk import via Excel

Low stock alerts

Dashboard view

Each product must include:

Brand

Model

Variant (RAM / Storage)

Color

IMEI

Purchase Price

Sale Price

GST %

IMEI INVENTORY:

Add IMEI during stock entry

Prevent duplicate IMEI

Track sold / unsold IMEI

Auto assign IMEI during billing

Prevent selling same IMEI twice

IMEI LABEL PRINTING:

Print labels using IMEI as barcode

Label must include:

Product Name

Price

IMEI barcode

Sizes:

50×25 mm

40×20 mm

DEALER LEDGER:

Dealer profile:

Name

Phone

Address

GSTIN

Features:

Purchase entry

Payment entry

Outstanding balance

Dealer statement

DISCOUNT SYSTEM:

Enable / Disable in settings

Types:

Percentage

Flat amount

REPORTS:

Daily Sales

Monthly Sales

GST Report

Profit Report

Stock Report

Dealer Report

IMEI-wise report

Export:

PDF

Excel

PIN SECURITY SYSTEM:

Billing screen → NO PIN

All other modules → PIN required

Protected modules:

Inventory

Product management

IMEI management

Dealer ledger

Reports

Settings

GST settings

Shop profiles

PIN features:

4 or 6 digit PIN

Change PIN option

Error on wrong PIN

Optional lock after 3 attempts

Session unlock support

BILLING FORMATS:

Support two formats:

Thermal Bill (POS)

A4 Invoice (Professional)

User must choose print type:

Thermal

A4

THERMAL BILL:

Compact format

Fast printing

Suitable for 58mm / 80mm printers

A4 INVOICE FORMAT:

Header:

Shop Logo

Shop Name (bold)

Address

Phone

GSTIN

Invoice Details:

Invoice Number

Date & Time

Customer Name

Phone

Customer GST (optional)

Product Table:

S.No

Product Name

Variant

IMEI

Qty

Price

Discount

GST

Amount

Summary:

Subtotal

Discount

CGST

SGST

Grand Total (bold)

Amount in Words:

Example: Rupees Ten Thousand Only

Footer:

Tamil Terms & Conditions

Customer Signature

Authorized Signature

TAMIL TERMS & CONDITIONS:

வாங்கிய பொருள் மாற்றம் / பணம் திருப்பம் இல்லை

பில் இல்லாமல் மாற்றம் செய்ய முடியாது

2 நாட்களுக்குள் மட்டும் மாற்றம்

தொழில்நுட்ப குறைபாடு மட்டும் மாற்றம்

IMEI பொருந்த வேண்டும்

சேதமடைந்த பொருளுக்கு கடை பொறுப்பல்ல

PRINTING:

Instant print (no new tab)

PDF preview support

Print directly from billing screen

USER ROLES:

Admin → Full access
Staff → Billing only

UI REQUIREMENTS:

Clean and modern design

Fast POS layout

Touch-friendly

Keyboard optimized

TECH STACK:

Frontend: React / Next.js
Backend: Node.js / Express
Database: PostgreSQL / Firebase
Deployment: Vercel / Cloud

FINAL OUTPUT:

The system must be:

IMEI-driven

Fast billing optimized

GST compliant

Multi-shop ready

Secure with PIN protection

Thermal + A4 printing supported

Production-ready

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ditmobiles.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4f2442d1-2bc5-41e6-b7b7-b85dd33910a0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
