
-- Delete duplicate dealer transaction for INV-R-0007
DELETE FROM dealer_transactions WHERE id = '468c6b85-74bf-44bf-a9cc-948958031715';

-- Delete duplicate invoice items
DELETE FROM invoice_items WHERE invoice_id = '6fe53be3-e992-46af-8ee0-bde008cb0d65';

-- Delete duplicate invoice INV-R-0007
DELETE FROM invoices WHERE id = '6fe53be3-e992-46af-8ee0-bde008cb0d65';
