-- ============================================================================
-- NSSF Repost History Table Schema
-- ============================================================================

CREATE DATABASE IF NOT EXISTS nssf_repost CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nssf_repost;

-- 2. Create the Repost History table matching your exact columns
DROP TABLE IF EXISTS repost_history;
CREATE TABLE repost_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_time_update VARCHAR(100) NOT NULL,   -- Date & Time of Update
    updated_by VARCHAR(64) NOT NULL,          -- Updated By (Caro / Seth)
    invoice_no VARCHAR(64) NOT NULL,          -- Invoice No
    transaction_id VARCHAR(64) NOT NULL,      -- Transaction ID
    amount DECIMAL(12,2) NOT NULL,            -- Amount (KES)
    tps_no VARCHAR(64) NOT NULL,              -- TPS No
    phone VARCHAR(32) NOT NULL,               -- Phone (MSISDN)
    sap_doc_ref VARCHAR(64) NOT NULL,         -- SAP Doc Ref
    source VARCHAR(32) DEFAULT 'DB Match'     -- Source (DB Match / Manual)
) ENGINE=InnoDB;

