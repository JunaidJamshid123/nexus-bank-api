# NEXUS BANK — Production Backend Database Schema

> Complete PostgreSQL schema for the NexusBank backend.
> This is the **server-side** production database — NOT the mobile Room cache.
> Designed for: PostgreSQL 15+ with partitioning, audit trails, and regulatory compliance.

---

## TABLE OF CONTENTS

1. Schema Overview (ER Diagram)
2. Core Tables (Users, Auth, Sessions)
3. Banking Tables (Accounts, Transactions, Beneficiaries)
4. Cards & Payments
5. Loans & EMI
6. KYC & Compliance
7. Notifications & Preferences
8. Investments
9. Bill Payments
10. Support & Config
11. Audit & Security
12. Indexes & Constraints Summary

---

# 1. SCHEMA OVERVIEW (ER DIAGRAM)

```
╔══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                            NEXUS BANK — PRODUCTION DATABASE SCHEMA (PostgreSQL)                       ║
╠══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                       ║
║  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐                 ║
║  │   otp_log    │    │  mpin_store  │    │  refresh_tokens  │    │     sessions       │                 ║
║  │─────────────│    │──────────────│    │──────────────────│    │────────────────────│                 ║
║  │ id (PK)     │    │ id (PK)      │    │ id (PK)          │    │ id (PK)            │                 ║
║  │ phone       │    │ user_id (FK)─┼─┐  │ user_id (FK)─────┼─┐  │ user_id (FK)───────┼──┐              ║
║  │ otp_hash    │    │ mpin_hash    │ │  │ token_hash       │ │  │ device_id          │  │              ║
║  │ otp_ref     │    │ salt         │ │  │ device_id        │ │  │ device_name        │  │              ║
║  │ purpose     │    │ attempts     │ │  │ issued_at        │ │  │ os_version         │  │              ║
║  │ attempts    │    │ is_locked    │ │  │ expires_at       │ │  │ app_version        │  │              ║
║  │ expires_at  │    │ locked_until │ │  │ revoked_at       │ │  │ ip_address         │  │              ║
║  │ verified_at │    │ updated_at   │ │  │ replaced_by      │ │  │ is_active          │  │              ║
║  │ ip_address  │    └──────────────┘ │  └──────────────────┘ │  │ login_at           │  │              ║
║  │ created_at  │                     │                       │  │ last_active_at     │  │              ║
║  └─────────────┘                     │                       │  │ logout_at          │  │              ║
║                                      │                       │  └────────────────────┘  │              ║
║  ┌───────────────────────────────────┼───────────────────────┼──────────────────────────┘              ║
║  │                                   │                       │                                         ║
║  │                                   ▼                       ▼                                         ║
║  │  ╔════════════════════════════════════════════════════════════════════╗                              ║
║  │  ║                        users (MASTER)                             ║                              ║
║  │  ╠══════════════════════════════════════════════════════════════════  ║                              ║
║  │  ║  id              UUID (PK)  DEFAULT gen_random_uuid()             ║                              ║
║  │  ║  phone           VARCHAR(15)  UNIQUE NOT NULL                     ║                              ║
║  │  ║  email           VARCHAR(255) UNIQUE                              ║                              ║
║  │  ║  full_name       VARCHAR(255) NOT NULL                            ║                              ║
║  │  ║  date_of_birth   DATE                                             ║                              ║
║  │  ║  gender          VARCHAR(10)                                      ║                              ║
║  │  ║  avatar_url      TEXT                                             ║                              ║
║  │  ║  kyc_status      VARCHAR(20)  DEFAULT 'NOT_STARTED'               ║                              ║
║  │  ║  risk_category   VARCHAR(20)  DEFAULT 'LOW'                       ║                              ║
║  │  ║  is_active       BOOLEAN  DEFAULT true                            ║                              ║
║  │  ║  is_blocked      BOOLEAN  DEFAULT false                           ║                              ║
║  │  ║  blocked_reason  TEXT                                             ║                              ║
║  │  ║  created_at      TIMESTAMPTZ  DEFAULT NOW()                       ║                              ║
║  │  ║  updated_at      TIMESTAMPTZ  DEFAULT NOW()                       ║                              ║
║  │  ║  deleted_at      TIMESTAMPTZ  (soft delete)                       ║                              ║
║  │  ╚══════════════════════════════════════════════════════════════════  ╝                              ║
║  │           │              │            │            │             │                                   ║
║  │           │              │            │            │             │                                   ║
║  │     ┌─────┘     ┌────────┘    ┌───────┘    ┌──────┘      ┌──────┘                                   ║
║  │     ▼           ▼             ▼            ▼             ▼                                          ║
║  │  ┌────────┐ ┌────────┐  ┌──────────┐ ┌─────────┐  ┌──────────────┐                                 ║
║  │  │addresses│ │accounts│  │  cards   │ │  loans  │  │beneficiaries │                                 ║
║  │  │        │ │        │  │          │ │         │  │              │                                  ║
║  │  │ (1:N)  │ │ (1:N)  │  │  (1:N)   │ │  (1:N)  │  │    (1:N)     │                                 ║
║  │  └────────┘ └───┬────┘  └──────────┘ └────┬────┘  └──────────────┘                                 ║
║  │                 │                          │                                                        ║
║  │                 ▼                          ▼                                                        ║
║  │           ┌──────────┐            ┌──────────────┐                                                 ║
║  │           │transactions│          │emi_schedule   │                                                 ║
║  │           │  (1:N)    │           │  (1:N)        │                                                 ║
║  │           └──────────┘            └──────────────┘                                                 ║
║  │                                                                                                    ║
║  │   Also linked from users:                                                                          ║
║  │   ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐                ║
║  │   │ kyc_documents  │  │  notifications  │  │scheduled_payments│  │  investments   │                ║
║  │   │   (1:N)        │  │    (1:N)        │  │     (1:N)        │  │    (1:N)       │                ║
║  │   └────────────────┘  └─────────────────┘  └──────────────────┘  └────────────────┘                ║
║  │                                                                                                    ║
║  │   Standalone / Reference tables:                                                                   ║
║  │   ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────┐                  ║
║  │   │ audit_trail  │  │ bill_payments │  │ support_tickets  │  │  app_config     │                  ║
║  │   └──────────────┘  └───────────────┘  └──────────────────┘  └─────────────────┘                  ║
║  │   ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐                                       ║
║  │   │bill_operators│  │bill_categories│  │ offers           │                                       ║
║  │   └──────────────┘  └───────────────┘  └──────────────────┘                                       ║
║  │                                                                                                    ║
╚══╧════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# 2. CORE TABLES — USERS, AUTH, SESSIONS

## 2.1  users

```
┌──────────────────────────────────────────────────────────────────┐
│                          users                                    │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ phone           VARCHAR(15) UQ  NOT NULL                          │
│ email           VARCHAR(255)UQ  NULL                              │
│ full_name       VARCHAR(255)    NOT NULL                          │
│ date_of_birth   DATE            NULL                              │
│ gender          VARCHAR(10)     CHECK (gender IN                  │
│                                   ('MALE','FEMALE','OTHER'))      │
│ avatar_url      TEXT            NULL                              │
│ kyc_status      VARCHAR(20)     DEFAULT 'NOT_STARTED'             │
│                                 CHECK (kyc_status IN              │
│                                   ('NOT_STARTED','PENDING',       │
│                                    'VERIFIED','REJECTED'))        │
│ risk_category   VARCHAR(20)     DEFAULT 'LOW'                     │
│                                 CHECK (risk_category IN           │
│                                   ('LOW','MEDIUM','HIGH'))        │
│ is_active       BOOLEAN         DEFAULT true                      │
│ is_blocked      BOOLEAN         DEFAULT false                     │
│ blocked_reason  TEXT            NULL                              │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ deleted_at      TIMESTAMPTZ     NULL  (soft delete)               │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_users_phone      ON (phone)                             │
│ INDEX idx_users_email      ON (email)                             │
│ INDEX idx_users_kyc        ON (kyc_status)                        │
│ INDEX idx_users_active     ON (is_active) WHERE deleted_at IS NULL│
└──────────────────────────────────────────────────────────────────┘
```

## 2.2  addresses

```
┌──────────────────────────────────────────────────────────────────┐
│                         addresses                                 │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ user_id         UUID        FK → users(id) ON DELETE CASCADE      │
│ type            VARCHAR(20)     CHECK (type IN                    │
│                                   ('PERMANENT','CURRENT',         │
│                                    'CORRESPONDENCE'))             │
│ address_line1   VARCHAR(255)    NOT NULL                          │
│ address_line2   VARCHAR(255)    NULL                              │
│ city            VARCHAR(100)    NOT NULL                          │
│ state           VARCHAR(100)    NOT NULL                          │
│ pincode         VARCHAR(10)     NOT NULL                          │
│ country         VARCHAR(50)     DEFAULT 'INDIA'                   │
│ is_primary      BOOLEAN         DEFAULT false                     │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_addr_user ON (user_id)                                  │
│ UNIQUE (user_id, type)  — one address per type per user           │
└──────────────────────────────────────────────────────────────────┘
```

## 2.3  mpin_store  (Authentication)

```
┌──────────────────────────────────────────────────────────────────┐
│                        mpin_store                                 │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ user_id         UUID        FK → users(id) ON DELETE CASCADE      │
│                             UQ  (one MPIN per user)               │
│ mpin_hash       VARCHAR(255)    NOT NULL (bcrypt/argon2)          │
│ salt            VARCHAR(255)    NOT NULL                          │
│ failed_attempts INT             DEFAULT 0                         │
│ is_locked       BOOLEAN         DEFAULT false                     │
│ locked_until    TIMESTAMPTZ     NULL                              │
│ last_changed_at TIMESTAMPTZ     DEFAULT NOW()                     │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ Max 3 failed attempts → auto-lock for 30 min                      │
│ Max 10 failed attempts → permanent lock (manual unlock required)  │
└──────────────────────────────────────────────────────────────────┘
```

## 2.4  otp_log

```
┌──────────────────────────────────────────────────────────────────┐
│                          otp_log                                  │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ phone           VARCHAR(15)     NOT NULL                          │
│ otp_hash        VARCHAR(255)    NOT NULL (hashed, never plaintext)│
│ otp_ref         VARCHAR(50)     NOT NULL  (client reference)      │
│ purpose         VARCHAR(30)     NOT NULL                          │
│                                 CHECK (purpose IN ('LOGIN',       │
│                                   'REGISTRATION','TXN_VERIFY',    │
│                                   'MPIN_RESET','CARD_PIN'))       │
│ attempts        INT             DEFAULT 0                         │
│ max_attempts    INT             DEFAULT 3                         │
│ is_verified     BOOLEAN         DEFAULT false                     │
│ verified_at     TIMESTAMPTZ     NULL                              │
│ ip_address      INET            NOT NULL                          │
│ user_agent      TEXT            NULL                              │
│ expires_at      TIMESTAMPTZ     NOT NULL  (NOW() + 5 min)         │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_otp_phone   ON (phone, created_at DESC)                 │
│ INDEX idx_otp_ref     ON (otp_ref)                                │
│ TTL: Auto-delete after 24 hours (pg_cron job)                     │
└──────────────────────────────────────────────────────────────────┘
```

## 2.5  refresh_tokens

```
┌──────────────────────────────────────────────────────────────────┐
│                      refresh_tokens                               │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ user_id         UUID        FK → users(id) ON DELETE CASCADE      │
│ token_hash      VARCHAR(255)    NOT NULL  (SHA-256 of token)      │
│ device_id       VARCHAR(255)    NOT NULL                          │
│ session_id      UUID        FK → sessions(id)                     │
│ issued_at       TIMESTAMPTZ     DEFAULT NOW()                     │
│ expires_at      TIMESTAMPTZ     NOT NULL  (NOW() + 30 days)       │
│ revoked_at      TIMESTAMPTZ     NULL                              │
│ replaced_by     UUID            NULL  (token rotation chain)      │
│ revoke_reason   VARCHAR(50)     NULL                              │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_rt_user     ON (user_id)                                │
│ INDEX idx_rt_token    ON (token_hash)                             │
│ INDEX idx_rt_device   ON (user_id, device_id)                     │
│ Supports token rotation: old token → replaced_by → new token      │
└──────────────────────────────────────────────────────────────────┘
```

## 2.6  sessions

```
┌──────────────────────────────────────────────────────────────────┐
│                         sessions                                  │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ user_id         UUID        FK → users(id) ON DELETE CASCADE      │
│ device_id       VARCHAR(255)    NOT NULL                          │
│ device_name     VARCHAR(255)    NULL  ('Samsung Galaxy S24')      │
│ os_version      VARCHAR(50)     NULL  ('Android 15')              │
│ app_version     VARCHAR(20)     NULL  ('2.3.1')                   │
│ ip_address      INET            NOT NULL                          │
│ geo_location    VARCHAR(100)    NULL  ('Mumbai, India')           │
│ is_active       BOOLEAN         DEFAULT true                      │
│ login_at        TIMESTAMPTZ     DEFAULT NOW()                     │
│ last_active_at  TIMESTAMPTZ     DEFAULT NOW()                     │
│ logout_at       TIMESTAMPTZ     NULL                              │
│ logout_reason   VARCHAR(50)     NULL  ('USER','TOKEN_EXPIRED',    │
│                                        'FORCE_LOGOUT','NEW_LOGIN')│
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_sess_user   ON (user_id, is_active)                     │
│ INDEX idx_sess_device ON (device_id)                              │
└──────────────────────────────────────────────────────────────────┘
```

---

# 3. BANKING TABLES — ACCOUNTS, TRANSACTIONS, BENEFICIARIES

## 3.1  branches  (Reference Table)

```
┌──────────────────────────────────────────────────────────────────┐
│                         branches                                  │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ branch_name     VARCHAR(255)    NOT NULL                          │
│ branch_code     VARCHAR(20)     UQ NOT NULL                       │
│ ifsc_code       VARCHAR(11)     UQ NOT NULL                       │
│ address         TEXT            NOT NULL                          │
│ city            VARCHAR(100)    NOT NULL                          │
│ state           VARCHAR(100)    NOT NULL                          │
│ phone           VARCHAR(15)     NULL                              │
│ is_active       BOOLEAN         DEFAULT true                      │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_branch_ifsc ON (ifsc_code)                              │
│ INDEX idx_branch_city ON (city)                                   │
└──────────────────────────────────────────────────────────────────┘
```

## 3.2  accounts

```
┌──────────────────────────────────────────────────────────────────┐
│                         accounts                                  │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ user_id         UUID        FK → users(id) ON DELETE RESTRICT     │
│ branch_id       UUID        FK → branches(id)                     │
│ account_number  VARCHAR(20)     UQ NOT NULL                       │
│ type            VARCHAR(30)     NOT NULL                          │
│                                 CHECK (type IN ('SAVINGS',        │
│                                   'CURRENT','FIXED_DEPOSIT',      │
│                                   'RECURRING_DEPOSIT','SALARY',   │
│                                   'NRI_NRE','NRI_NRO','OVERDRAFT')│
│ balance         DECIMAL(18,2)   NOT NULL DEFAULT 0.00             │
│ available_bal   DECIMAL(18,2)   NOT NULL DEFAULT 0.00             │
│ currency        VARCHAR(3)      DEFAULT 'INR'                     │
│ interest_rate   DECIMAL(5,2)    NULL  (for FD/RD)                 │
│ maturity_date   DATE            NULL  (for FD/RD)                 │
│ nominee_name    VARCHAR(255)    NULL                              │
│ nominee_relation VARCHAR(50)    NULL                              │
│ is_active       BOOLEAN         DEFAULT true                      │
│ is_frozen       BOOLEAN         DEFAULT false                     │
│ frozen_reason   TEXT            NULL                              │
│ daily_txn_limit DECIMAL(18,2)   DEFAULT 500000.00                 │
│ opened_at       TIMESTAMPTZ     DEFAULT NOW()                     │
│ closed_at       TIMESTAMPTZ     NULL                              │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_acc_user    ON (user_id)                                │
│ INDEX idx_acc_number  ON (account_number)                         │
│ INDEX idx_acc_type    ON (type)                                   │
│ INDEX idx_acc_active  ON (user_id, is_active)                     │
│ NOTE: balance updates MUST go through transactions — never direct │
│       UPDATE. Use SELECT ... FOR UPDATE for row-level locking.    │
└──────────────────────────────────────────────────────────────────┘
```

## 3.3  transactions  (Partitioned by month)

```
┌──────────────────────────────────────────────────────────────────┐
│                    transactions (PARTITIONED)                     │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ account_id      UUID        FK → accounts(id)                     │
│ type            VARCHAR(10)     NOT NULL                          │
│                                 CHECK (type IN ('CREDIT','DEBIT'))│
│ amount          DECIMAL(18,2)   NOT NULL  CHECK (amount > 0)      │
│ currency        VARCHAR(3)      DEFAULT 'INR'                     │
│ balance_before  DECIMAL(18,2)   NOT NULL                          │
│ balance_after   DECIMAL(18,2)   NOT NULL                          │
│ description     TEXT            NOT NULL                          │
│ category        VARCHAR(50)     NULL                              │
│                                 (e.g., 'TRANSFER','BILL_PAYMENT', │
│                                  'SALARY','ATM','POS','INTEREST', │
│                                  'REVERSAL','CHARGE','EMI')       │
│ reference_id    VARCHAR(50)     UQ NOT NULL  (bank ref number)    │
│ external_ref    VARCHAR(100)    NULL  (UPI ref / NEFT UTR)        │
│ status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING'        │
│                                 CHECK (status IN ('PENDING',      │
│                                   'SUCCESS','FAILED','REVERSED',  │
│                                   'ON_HOLD'))                     │
│ failure_reason  TEXT            NULL                              │
│ mode            VARCHAR(20)     NULL                              │
│                                 CHECK (mode IN ('UPI','NEFT',     │
│                                   'IMPS','RTGS','INTERNAL',       │
│                                   'ATM','POS','NET_BANKING',      │
│                                   'AUTO_DEBIT','STANDING_ORDER')) │
│ sender_account  VARCHAR(20)     NULL                              │
│ sender_name     VARCHAR(255)    NULL                              │
│ sender_ifsc     VARCHAR(11)     NULL                              │
│ recipient_account VARCHAR(20)   NULL                              │
│ recipient_name  VARCHAR(255)    NULL                              │
│ recipient_ifsc  VARCHAR(11)     NULL                              │
│ recipient_vpa   VARCHAR(100)    NULL  (for UPI)                   │
│ remarks         TEXT            NULL  (user-entered note)         │
│ channel         VARCHAR(20)     DEFAULT 'MOBILE_APP'              │
│                                 (MOBILE_APP, NET_BANKING, ATM,    │
│                                  BRANCH, AUTO)                    │
│ ip_address      INET            NULL                              │
│ device_id       VARCHAR(255)    NULL                              │
│ created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()            │
│ settled_at      TIMESTAMPTZ     NULL                              │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ PARTITION BY RANGE (created_at)  — monthly partitions             │
│   transactions_2026_01, transactions_2026_02, ... etc.            │
│                                                                   │
│ INDEX idx_txn_account   ON (account_id, created_at DESC)          │
│ INDEX idx_txn_ref       ON (reference_id)                         │
│ INDEX idx_txn_ext_ref   ON (external_ref) WHERE external_ref      │
│                            IS NOT NULL                            │
│ INDEX idx_txn_status    ON (status) WHERE status = 'PENDING'      │
│ INDEX idx_txn_created   ON (created_at DESC)                      │
│                                                                   │
│ NOTE: For IMPS/UPI, two rows are created atomically:              │
│   1. DEBIT on sender's account                                    │
│   2. CREDIT on recipient's account  (if internal)                 │
│   Both share the same reference_id.                               │
└──────────────────────────────────────────────────────────────────┘
```

## 3.4  beneficiaries

```
┌──────────────────────────────────────────────────────────────────┐
│                       beneficiaries                               │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ user_id         UUID        FK → users(id) ON DELETE CASCADE      │
│ name            VARCHAR(255)    NOT NULL                          │
│ account_number  VARCHAR(20)     NOT NULL                          │
│ ifsc_code       VARCHAR(11)     NOT NULL                          │
│ bank_name       VARCHAR(255)    NOT NULL                          │
│ nickname        VARCHAR(100)    NULL                              │
│ vpa             VARCHAR(100)    NULL  (UPI VPA if applicable)     │
│ transfer_limit  DECIMAL(18,2)   NULL  (per-txn limit)             │
│ daily_limit     DECIMAL(18,2)   NULL                              │
│ is_verified     BOOLEAN         DEFAULT false                     │
│ verified_at     TIMESTAMPTZ     NULL                              │
│ verification_mode VARCHAR(20)   NULL  ('PENNY_DROP','MANUAL')     │
│ is_active       BOOLEAN         DEFAULT true                      │
│ cooldown_until  TIMESTAMPTZ     NULL  (24hr delay for new benef)  │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ deleted_at      TIMESTAMPTZ     NULL                              │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_benef_user ON (user_id)                                 │
│ UNIQUE (user_id, account_number, ifsc_code)                       │
│   WHERE deleted_at IS NULL                                        │
└──────────────────────────────────────────────────────────────────┘
```

## 3.5  scheduled_payments

```
┌──────────────────────────────────────────────────────────────────┐
│                    scheduled_payments                              │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ user_id         UUID        FK → users(id)                        │
│ from_account_id UUID        FK → accounts(id)                     │
│ beneficiary_id  UUID        FK → beneficiaries(id)                │
│ amount          DECIMAL(18,2)   NOT NULL                          │
│ currency        VARCHAR(3)      DEFAULT 'INR'                     │
│ frequency       VARCHAR(20)     NOT NULL                          │
│                                 CHECK (frequency IN ('ONCE',      │
│                                   'DAILY','WEEKLY','BIWEEKLY',    │
│                                   'MONTHLY','QUARTERLY','YEARLY'))│
│ mode            VARCHAR(20)     DEFAULT 'NEFT'                    │
│ next_exec_date  DATE            NOT NULL                          │
│ last_exec_date  DATE            NULL                              │
│ last_exec_status VARCHAR(20)    NULL                              │
│ total_executions INT            DEFAULT 0                         │
│ max_executions  INT             NULL  (NULL = unlimited)          │
│ remarks         TEXT            NULL                              │
│ is_active       BOOLEAN         DEFAULT true                      │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_sched_user     ON (user_id)                             │
│ INDEX idx_sched_next     ON (next_exec_date, is_active)           │
│   WHERE is_active = true   — used by scheduler cron job           │
└──────────────────────────────────────────────────────────────────┘
```

---

# 4. CARDS & PAYMENTS

## 4.1  cards

```
┌──────────────────────────────────────────────────────────────────┐
│                           cards                                   │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ user_id         UUID        FK → users(id) ON DELETE RESTRICT     │
│ account_id      UUID        FK → accounts(id)  NULL for credit    │
│ card_number_hash VARCHAR(64)    NOT NULL  (SHA-256)               │
│ card_number_last4 VARCHAR(4)    NOT NULL                          │
│ card_number_enc BYTEA           NOT NULL  (AES-256 encrypted)     │
│ type            VARCHAR(10)     NOT NULL                          │
│                                 CHECK (type IN ('DEBIT','CREDIT'))│
│ network         VARCHAR(20)     NOT NULL                          │
│                                 CHECK (network IN ('VISA',        │
│                                   'MASTERCARD','RUPAY','AMEX'))   │
│ name_on_card    VARCHAR(255)    NOT NULL                          │
│ expiry_month    INT             NOT NULL  CHECK (1..12)           │
│ expiry_year     INT             NOT NULL                          │
│ cvv_hash        VARCHAR(64)     NOT NULL  (never stored plain)    │
│ pin_hash        VARCHAR(255)    NOT NULL  (ATM PIN)               │
│ credit_limit    DECIMAL(18,2)   NULL  (credit cards only)         │
│ available_limit DECIMAL(18,2)   NULL                              │
│ billing_date    INT             NULL  (day of month, credit only) │
│ due_date        INT             NULL  (day of month, credit only) │
│ min_due_amount  DECIMAL(18,2)   NULL                              │
│ outstanding_amt DECIMAL(18,2)   NULL                              │
│ reward_points   INT             DEFAULT 0                         │
│ is_locked       BOOLEAN         DEFAULT false                     │
│ is_online_enabled BOOLEAN       DEFAULT true                      │
│ is_intl_enabled BOOLEAN         DEFAULT false                     │
│ is_contactless  BOOLEAN         DEFAULT true                      │
│ daily_limit     DECIMAL(18,2)   DEFAULT 200000.00                 │
│ per_txn_limit   DECIMAL(18,2)   DEFAULT 100000.00                 │
│ atm_daily_limit DECIMAL(18,2)   DEFAULT 50000.00                  │
│ status          VARCHAR(20)     DEFAULT 'ACTIVE'                  │
│                                 CHECK (status IN ('ACTIVE',       │
│                                   'BLOCKED','EXPIRED','CANCELLED',│
│                                   'PENDING_ACTIVATION'))          │
│ blocked_reason  TEXT            NULL                              │
│ issued_at       TIMESTAMPTZ     DEFAULT NOW()                     │
│ activated_at    TIMESTAMPTZ     NULL                              │
│ blocked_at      TIMESTAMPTZ     NULL                              │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_card_user     ON (user_id)                              │
│ INDEX idx_card_hash     ON (card_number_hash)                     │
│ INDEX idx_card_account  ON (account_id)                           │
│ INDEX idx_card_status   ON (status)                               │
│                                                                   │
│ SECURITY: Full card number is AES-256 encrypted at rest.          │
│           Only last 4 digits + hash stored in queryable columns.  │
│           CVV is NEVER stored — only hash for verification.       │
│           PCI-DSS compliant storage.                              │
└──────────────────────────────────────────────────────────────────┘
```

## 4.2  card_transactions  (for credit card statements)

```
┌──────────────────────────────────────────────────────────────────┐
│                     card_transactions                             │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ card_id         UUID        FK → cards(id)                        │
│ merchant_name   VARCHAR(255)    NOT NULL                          │
│ merchant_category VARCHAR(50)   NULL  (MCC code description)     │
│ mcc_code        VARCHAR(4)      NULL  (Merchant Category Code)    │
│ amount          DECIMAL(18,2)   NOT NULL                          │
│ currency        VARCHAR(3)      DEFAULT 'INR'                     │
│ billing_amount  DECIMAL(18,2)   NOT NULL  (converted to INR)      │
│ type            VARCHAR(10)     CHECK (IN ('PURCHASE','REFUND',   │
│                                   'CASHBACK','EMI','FEE',         │
│                                   'INTEREST','PAYMENT'))          │
│ status          VARCHAR(20)     DEFAULT 'POSTED'                  │
│ auth_code       VARCHAR(10)     NULL                              │
│ terminal_id     VARCHAR(20)     NULL                              │
│ is_international BOOLEAN        DEFAULT false                     │
│ transaction_at  TIMESTAMPTZ     NOT NULL                          │
│ posted_at       TIMESTAMPTZ     NULL                              │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_ctxn_card ON (card_id, transaction_at DESC)             │
└──────────────────────────────────────────────────────────────────┘
```

---

# 5. LOANS & EMI

## 5.1  loans

```
┌──────────────────────────────────────────────────────────────────┐
│                           loans                                   │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ user_id         UUID        FK → users(id) ON DELETE RESTRICT     │
│ disbursement_account_id UUID FK → accounts(id)                   │
│ application_id  VARCHAR(30)     UQ NOT NULL                       │
│ type            VARCHAR(20)     NOT NULL                          │
│                                 CHECK (type IN ('PERSONAL','HOME',│
│                                   'AUTO','EDUCATION','GOLD',      │
│                                   'BUSINESS','CREDIT_CARD',       │
│                                   'OVERDRAFT'))                   │
│ principal_amount DECIMAL(18,2)  NOT NULL                          │
│ disbursed_amount DECIMAL(18,2)  NOT NULL                          │
│ outstanding_amount DECIMAL(18,2) NOT NULL                         │
│ interest_rate   DECIMAL(5,2)    NOT NULL  (annual %)              │
│ interest_type   VARCHAR(20)     DEFAULT 'REDUCING'                │
│                                 CHECK (IN ('FLAT','REDUCING'))    │
│ emi_amount      DECIMAL(18,2)   NOT NULL                          │
│ tenure_months   INT             NOT NULL                          │
│ remaining_months INT            NOT NULL                          │
│ total_interest  DECIMAL(18,2)   NOT NULL  (over full tenure)      │
│ processing_fee  DECIMAL(18,2)   DEFAULT 0.00                     │
│ prepayment_charge_pct DECIMAL(5,2) NULL (e.g., 2.00 = 2%)       │
│ emi_debit_account_id UUID  FK → accounts(id)                     │
│ emi_debit_day   INT             NOT NULL  CHECK (1..28)           │
│ start_date      DATE            NOT NULL                          │
│ end_date        DATE            NOT NULL                          │
│ next_emi_date   DATE            NULL                              │
│ last_emi_date   DATE            NULL                              │
│ emis_paid       INT             DEFAULT 0                         │
│ emis_overdue    INT             DEFAULT 0                         │
│ status          VARCHAR(20)     DEFAULT 'ACTIVE'                  │
│                                 CHECK (status IN ('PENDING',      │
│                                   'APPROVED','ACTIVE','CLOSED',   │
│                                   'DEFAULT','WRITTEN_OFF',        │
│                                   'RESTRUCTURED'))                │
│ sanction_letter_url TEXT        NULL                              │
│ approved_by     VARCHAR(100)    NULL                              │
│ approved_at     TIMESTAMPTZ     NULL                              │
│ closed_at       TIMESTAMPTZ     NULL                              │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_loan_user     ON (user_id)                              │
│ INDEX idx_loan_status   ON (status)                               │
│ INDEX idx_loan_app      ON (application_id)                       │
│ INDEX idx_loan_next_emi ON (next_emi_date, status)                │
│   WHERE status = 'ACTIVE'   — used by EMI scheduler              │
└──────────────────────────────────────────────────────────────────┘
```

## 5.2  emi_schedule

```
┌──────────────────────────────────────────────────────────────────┐
│                       emi_schedule                                │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ loan_id         UUID        FK → loans(id) ON DELETE CASCADE      │
│ emi_number      INT             NOT NULL  (1, 2, 3...)            │
│ due_date        DATE            NOT NULL                          │
│ emi_amount      DECIMAL(18,2)   NOT NULL                          │
│ principal_comp  DECIMAL(18,2)   NOT NULL  (principal portion)     │
│ interest_comp   DECIMAL(18,2)   NOT NULL  (interest portion)      │
│ outstanding_after DECIMAL(18,2) NOT NULL  (balance after EMI)     │
│ paid_amount     DECIMAL(18,2)   NULL                              │
│ paid_date       DATE            NULL                              │
│ penalty_amount  DECIMAL(18,2)   DEFAULT 0.00                     │
│ transaction_id  UUID        FK → transactions(id)  NULL           │
│ status          VARCHAR(20)     DEFAULT 'UPCOMING'                │
│                                 CHECK (status IN ('UPCOMING',     │
│                                   'DUE','PAID','OVERDUE',         │
│                                   'PARTIALLY_PAID','WAIVED'))     │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ UNIQUE (loan_id, emi_number)                                      │
│ INDEX idx_emi_loan    ON (loan_id, emi_number)                    │
│ INDEX idx_emi_due     ON (due_date, status)                       │
│   WHERE status IN ('UPCOMING','DUE')  — scheduler index           │
└──────────────────────────────────────────────────────────────────┘
```

## 5.3  loan_applications  (Pre-approval + new applications)

```
┌──────────────────────────────────────────────────────────────────┐
│                    loan_applications                              │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ user_id         UUID        FK → users(id)                        │
│ application_ref VARCHAR(30)     UQ NOT NULL                       │
│ type            VARCHAR(20)     NOT NULL                          │
│ requested_amount DECIMAL(18,2)  NOT NULL                          │
│ approved_amount DECIMAL(18,2)   NULL                              │
│ requested_tenure INT            NOT NULL                          │
│ offered_rate    DECIMAL(5,2)    NULL                              │
│ is_pre_approved BOOLEAN         DEFAULT false                     │
│ cibil_score     INT             NULL                              │
│ employer_name   VARCHAR(255)    NULL                              │
│ monthly_income  DECIMAL(18,2)   NULL                              │
│ status          VARCHAR(30)     DEFAULT 'SUBMITTED'               │
│                                 CHECK (IN ('SUBMITTED',           │
│                                   'UNDER_REVIEW','DOCS_PENDING',  │
│                                   'APPROVED','REJECTED',          │
│                                   'DISBURSED','CANCELLED',        │
│                                   'EXPIRED'))                     │
│ rejection_reason TEXT           NULL                              │
│ reviewed_by     VARCHAR(100)    NULL                              │
│ submitted_at    TIMESTAMPTZ     DEFAULT NOW()                     │
│ reviewed_at     TIMESTAMPTZ     NULL                              │
│ expires_at      TIMESTAMPTZ     NULL  (for pre-approved offers)   │
│ loan_id         UUID        FK → loans(id)  NULL (after disburse) │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_lapp_user ON (user_id, status)                          │
└──────────────────────────────────────────────────────────────────┘
```

---

# 6. KYC & COMPLIANCE

## 6.1  kyc_documents

```
┌──────────────────────────────────────────────────────────────────┐
│                       kyc_documents                               │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ user_id         UUID        FK → users(id) ON DELETE CASCADE      │
│ document_type   VARCHAR(30)     NOT NULL                          │
│                                 CHECK (IN ('AADHAAR','PAN',       │
│                                   'PASSPORT','VOTER_ID',          │
│                                   'DRIVING_LICENSE','SELFIE',     │
│                                   'ADDRESS_PROOF','INCOME_PROOF'))│
│ document_number_enc BYTEA       NULL  (AES-256 encrypted)         │
│ document_number_hash VARCHAR(64) NULL  (SHA-256 for lookup)       │
│ document_url    TEXT            NOT NULL  (S3 presigned URL ref)   │
│ file_size_bytes BIGINT          NULL                              │
│ mime_type       VARCHAR(50)     NULL                              │
│ verification_status VARCHAR(20) DEFAULT 'PENDING'                 │
│                                 CHECK (IN ('PENDING','VERIFIED',  │
│                                   'REJECTED','EXPIRED'))          │
│ verified_by     VARCHAR(100)    NULL  (agent ID or 'SYSTEM')      │
│ rejection_reason TEXT           NULL                              │
│ match_score     DECIMAL(5,2)    NULL  (for selfie/biometric)      │
│ expires_at      DATE            NULL  (document expiry)           │
│ submitted_at    TIMESTAMPTZ     DEFAULT NOW()                     │
│ verified_at     TIMESTAMPTZ     NULL                              │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_kyc_user ON (user_id)                                   │
│ INDEX idx_kyc_doc  ON (document_number_hash) WHERE                │
│                       document_number_hash IS NOT NULL             │
│                                                                   │
│ SECURITY: Document numbers stored ENCRYPTED (AES-256-GCM).       │
│           Original documents stored in S3 with server-side        │
│           encryption. Presigned URLs expire in 5 minutes.         │
└──────────────────────────────────────────────────────────────────┘
```

## 6.2  kyc_verification_log

```
┌──────────────────────────────────────────────────────────────────┐
│                   kyc_verification_log                             │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ user_id         UUID        FK → users(id)                        │
│ kyc_document_id UUID        FK → kyc_documents(id) NULL           │
│ step            VARCHAR(30)     NOT NULL                          │
│                                 ('AADHAAR_VERIFY','PAN_VERIFY',   │
│                                  'SELFIE_MATCH','VIDEO_KYC',      │
│                                  'MANUAL_REVIEW')                 │
│ status          VARCHAR(20)     NOT NULL                          │
│ request_payload JSONB           NULL  (sanitized, no PII)         │
│ response_code   VARCHAR(10)     NULL                              │
│ response_message TEXT           NULL                              │
│ provider        VARCHAR(50)     NULL  (3rd party API name)        │
│ ip_address      INET            NULL                              │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_kyclog_user ON (user_id, created_at DESC)               │
└──────────────────────────────────────────────────────────────────┘
```

---

# 7. NOTIFICATIONS & PREFERENCES

## 7.1  notifications

```
┌──────────────────────────────────────────────────────────────────┐
│                       notifications                               │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK  DEFAULT gen_random_uuid()         │
│ user_id         UUID        FK → users(id) ON DELETE CASCADE      │
│ title           VARCHAR(255)    NOT NULL                          │
│ body            TEXT            NOT NULL                          │
│ type            VARCHAR(30)     NOT NULL                          │
│                                 CHECK (type IN ('TRANSACTION',    │
│                                   'PAYMENT_DUE','OFFER',          │
│                                   'SECURITY','GENERAL','KYC',     │
│                                   'CARD','LOAN','SYSTEM'))        │
│ priority        VARCHAR(10)     DEFAULT 'NORMAL'                  │
│                                 CHECK (IN ('LOW','NORMAL','HIGH', │
│                                   'CRITICAL'))                    │
│ is_read         BOOLEAN         DEFAULT false                     │
│ read_at         TIMESTAMPTZ     NULL                              │
│ deep_link       TEXT            NULL  (in-app navigation URI)     │
│ image_url       TEXT            NULL                              │
│ data_payload    JSONB           NULL  (extra metadata)            │
│ channel         VARCHAR(20)     DEFAULT 'PUSH'                    │
│                                 ('PUSH','SMS','EMAIL','IN_APP')   │
│ delivered_at    TIMESTAMPTZ     NULL                              │
│ fcm_message_id  VARCHAR(100)    NULL                              │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ expires_at      TIMESTAMPTZ     NULL                              │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_notif_user    ON (user_id, created_at DESC)             │
│ INDEX idx_notif_unread  ON (user_id, is_read)                     │
│   WHERE is_read = false                                           │
│ INDEX idx_notif_type    ON (type)                                 │
└──────────────────────────────────────────────────────────────────┘
```

## 7.2  notification_preferences

```
┌──────────────────────────────────────────────────────────────────┐
│                  notification_preferences                         │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ user_id         UUID        FK → users(id) UQ                     │
│ txn_alerts_push BOOLEAN         DEFAULT true                      │
│ txn_alerts_sms  BOOLEAN         DEFAULT true                      │
│ txn_alerts_email BOOLEAN        DEFAULT false                     │
│ payment_due_push BOOLEAN        DEFAULT true                      │
│ payment_due_sms BOOLEAN         DEFAULT true                      │
│ offers_push     BOOLEAN         DEFAULT true                      │
│ offers_email    BOOLEAN         DEFAULT true                      │
│ security_push   BOOLEAN         DEFAULT true                      │
│ security_sms    BOOLEAN         DEFAULT true                      │
│ marketing_email BOOLEAN         DEFAULT false                     │
│ quiet_hours_start TIME          NULL  ('22:00')                   │
│ quiet_hours_end TIME            NULL  ('07:00')                   │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ UNIQUE (user_id)  — one preference row per user                   │
└──────────────────────────────────────────────────────────────────┘
```

## 7.3  fcm_tokens  (Push notification device tokens)

```
┌──────────────────────────────────────────────────────────────────┐
│                        fcm_tokens                                 │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ user_id         UUID        FK → users(id) ON DELETE CASCADE      │
│ device_id       VARCHAR(255)    NOT NULL                          │
│ fcm_token       TEXT            NOT NULL                          │
│ platform        VARCHAR(10)     CHECK (IN ('ANDROID','IOS'))      │
│ is_active       BOOLEAN         DEFAULT true                      │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ UNIQUE (user_id, device_id)                                       │
│ INDEX idx_fcm_user ON (user_id, is_active)                        │
└──────────────────────────────────────────────────────────────────┘
```

---

# 8. INVESTMENTS

## 8.1  fixed_deposits

```
┌──────────────────────────────────────────────────────────────────┐
│                      fixed_deposits                               │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ user_id         UUID        FK → users(id)                        │
│ linked_account_id UUID      FK → accounts(id)                     │
│ fd_number       VARCHAR(20)     UQ NOT NULL                       │
│ principal       DECIMAL(18,2)   NOT NULL                          │
│ interest_rate   DECIMAL(5,2)    NOT NULL  (annual %)              │
│ maturity_amount DECIMAL(18,2)   NOT NULL                          │
│ tenure_days     INT             NOT NULL                          │
│ interest_payout VARCHAR(20)     DEFAULT 'ON_MATURITY'             │
│                                 ('MONTHLY','QUARTERLY',           │
│                                  'ON_MATURITY')                   │
│ is_auto_renew   BOOLEAN         DEFAULT false                     │
│ nominee_name    VARCHAR(255)    NULL                              │
│ status          VARCHAR(20)     DEFAULT 'ACTIVE'                  │
│                                 CHECK (IN ('ACTIVE','MATURED',    │
│                                   'PREMATURE_CLOSED','RENEWED'))  │
│ opened_at       DATE            NOT NULL                          │
│ maturity_date   DATE            NOT NULL                          │
│ closed_at       DATE            NULL                              │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_fd_user ON (user_id, status)                            │
└──────────────────────────────────────────────────────────────────┘
```

## 8.2  recurring_deposits

```
┌──────────────────────────────────────────────────────────────────┐
│                    recurring_deposits                             │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ user_id         UUID        FK → users(id)                        │
│ linked_account_id UUID      FK → accounts(id)                     │
│ rd_number       VARCHAR(20)     UQ NOT NULL                       │
│ monthly_amount  DECIMAL(18,2)   NOT NULL                          │
│ interest_rate   DECIMAL(5,2)    NOT NULL                          │
│ maturity_amount DECIMAL(18,2)   NOT NULL                          │
│ tenure_months   INT             NOT NULL                          │
│ installments_paid INT           DEFAULT 0                         │
│ debit_day       INT             NOT NULL  CHECK (1..28)           │
│ status          VARCHAR(20)     DEFAULT 'ACTIVE'                  │
│ opened_at       DATE            NOT NULL                          │
│ maturity_date   DATE            NOT NULL                          │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_rd_user ON (user_id, status)                            │
└──────────────────────────────────────────────────────────────────┘
```

---

# 9. BILL PAYMENTS

## 9.1  bill_categories  (Reference)

```
┌──────────────────────────────────────────────────────────────────┐
│                      bill_categories                              │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ name            VARCHAR(100)    UQ NOT NULL                       │
│ icon_url        TEXT            NULL                              │
│ display_order   INT             DEFAULT 0                         │
│ is_active       BOOLEAN         DEFAULT true                      │
├──────────────────────────────────────────────────────────────────┤
│ Examples: Electricity, Water, Gas, Mobile, DTH, Broadband,        │
│           Insurance, Municipal Tax, Education, LPG                │
└──────────────────────────────────────────────────────────────────┘
```

## 9.2  bill_operators  (Reference)

```
┌──────────────────────────────────────────────────────────────────┐
│                      bill_operators                               │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ category_id     UUID        FK → bill_categories(id)              │
│ name            VARCHAR(255)    NOT NULL  ('Jio','BSES Delhi')    │
│ operator_code   VARCHAR(30)     UQ NOT NULL                       │
│ logo_url        TEXT            NULL                              │
│ customer_id_label VARCHAR(50)   NOT NULL  ('Consumer Number',     │
│                                            'Mobile Number')       │
│ is_active       BOOLEAN         DEFAULT true                      │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_billop_cat ON (category_id)                             │
└──────────────────────────────────────────────────────────────────┘
```

## 9.3  bill_payments

```
┌──────────────────────────────────────────────────────────────────┐
│                       bill_payments                               │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ user_id         UUID        FK → users(id)                        │
│ account_id      UUID        FK → accounts(id)                     │
│ operator_id     UUID        FK → bill_operators(id)               │
│ customer_id     VARCHAR(100)    NOT NULL  (consumer number)       │
│ bill_number     VARCHAR(100)    NULL                              │
│ bill_date       DATE            NULL                              │
│ due_date        DATE            NULL                              │
│ bill_amount     DECIMAL(18,2)   NOT NULL                          │
│ paid_amount     DECIMAL(18,2)   NOT NULL                          │
│ convenience_fee DECIMAL(18,2)   DEFAULT 0.00                     │
│ transaction_id  UUID        FK → transactions(id)                 │
│ status          VARCHAR(20)     DEFAULT 'PENDING'                 │
│                                 CHECK (IN ('PENDING','SUCCESS',   │
│                                   'FAILED','REFUNDED'))           │
│ payment_ref     VARCHAR(50)     NULL                              │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_bill_user ON (user_id, created_at DESC)                 │
└──────────────────────────────────────────────────────────────────┘
```

---

# 10. SUPPORT & CONFIG

## 10.1  support_tickets

```
┌──────────────────────────────────────────────────────────────────┐
│                      support_tickets                              │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ user_id         UUID        FK → users(id)                        │
│ ticket_ref      VARCHAR(20)     UQ NOT NULL  ('TKT-000123')       │
│ category        VARCHAR(50)     NOT NULL                          │
│                                 ('ACCOUNT','CARD','LOAN',         │
│                                  'TRANSACTION','UPI','GENERAL')   │
│ subject         VARCHAR(255)    NOT NULL                          │
│ description     TEXT            NOT NULL                          │
│ priority        VARCHAR(10)     DEFAULT 'MEDIUM'                  │
│                                 CHECK (IN ('LOW','MEDIUM','HIGH', │
│                                   'CRITICAL'))                    │
│ status          VARCHAR(20)     DEFAULT 'OPEN'                    │
│                                 CHECK (IN ('OPEN','IN_PROGRESS',  │
│                                   'AWAITING_USER','RESOLVED',     │
│                                   'CLOSED','REOPENED'))           │
│ assigned_to     VARCHAR(100)    NULL  (agent/team)                │
│ resolution_note TEXT            NULL                              │
│ related_txn_id  UUID            NULL  (linked transaction)        │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ resolved_at     TIMESTAMPTZ     NULL                              │
│ closed_at       TIMESTAMPTZ     NULL                              │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_ticket_user   ON (user_id, created_at DESC)             │
│ INDEX idx_ticket_status ON (status)                               │
│ INDEX idx_ticket_ref    ON (ticket_ref)                           │
└──────────────────────────────────────────────────────────────────┘
```

## 10.2  support_ticket_messages

```
┌──────────────────────────────────────────────────────────────────┐
│                  support_ticket_messages                           │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ ticket_id       UUID        FK → support_tickets(id) ON DELETE    │
│                                  CASCADE                          │
│ sender_type     VARCHAR(10)     CHECK (IN ('USER','AGENT',        │
│                                   'SYSTEM'))                      │
│ sender_id       VARCHAR(100)    NULL                              │
│ message         TEXT            NOT NULL                          │
│ attachment_urls TEXT[]          NULL  (array of S3 URLs)           │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_tktmsg_ticket ON (ticket_id, created_at)                │
└──────────────────────────────────────────────────────────────────┘
```

## 10.3  offers

```
┌──────────────────────────────────────────────────────────────────┐
│                          offers                                   │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ title           VARCHAR(255)    NOT NULL                          │
│ description     TEXT            NOT NULL                          │
│ image_url       TEXT            NULL                              │
│ offer_type      VARCHAR(30)     NOT NULL                          │
│                                 ('CASHBACK','DISCOUNT','REWARD',  │
│                                  'LOAN_OFFER','CARD_OFFER')       │
│ target_segment  VARCHAR(30)     DEFAULT 'ALL'                     │
│                                 ('ALL','NEW_USER','PREMIUM',      │
│                                  'SALARY','HIGH_BALANCE')         │
│ terms_url       TEXT            NULL                              │
│ promo_code      VARCHAR(30)     NULL                              │
│ min_txn_amount  DECIMAL(18,2)   NULL                              │
│ max_benefit     DECIMAL(18,2)   NULL                              │
│ deep_link       TEXT            NULL                              │
│ is_active       BOOLEAN         DEFAULT true                      │
│ start_date      DATE            NOT NULL                          │
│ end_date        DATE            NOT NULL                          │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_offer_active ON (is_active, start_date, end_date)       │
└──────────────────────────────────────────────────────────────────┘
```

## 10.4  app_config  (Feature flags + remote config)

```
┌──────────────────────────────────────────────────────────────────┐
│                        app_config                                 │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ config_key      VARCHAR(100)    UQ NOT NULL                       │
│ config_value    JSONB           NOT NULL                          │
│ description     TEXT            NULL                              │
│ updated_by      VARCHAR(100)    NULL                              │
│ updated_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ Examples:                                                         │
│   'force_update'         → {"min_version":"2.0.0","store_url":..}│
│   'maintenance_mode'     → {"enabled":false,"message":"..."}     │
│   'feature_flags'        → {"upi":true,"intl_cards":true,        │
│                              "video_kyc":false,"gold_loan":false} │
│   'transfer_limits'      → {"imps_max":500000,"neft_max":1000000}│
└──────────────────────────────────────────────────────────────────┘
```

---

# 11. AUDIT & SECURITY

## 11.1  audit_trail  (Immutable — append-only)

```
┌──────────────────────────────────────────────────────────────────┐
│                    audit_trail (PARTITIONED)                      │
├──────────────────────────────────────────────────────────────────┤
│ id              BIGSERIAL   PK                                    │
│ user_id         UUID            NULL  (NULL for system events)    │
│ action          VARCHAR(50)     NOT NULL                          │
│                                 ('LOGIN','LOGOUT','TRANSFER',     │
│                                  'CARD_LOCK','CARD_UNLOCK',       │
│                                  'MPIN_CHANGE','PROFILE_UPDATE',  │
│                                  'BENEFICIARY_ADD','KYC_SUBMIT',  │
│                                  'LOAN_APPLY','PASSWORD_RESET',   │
│                                  'LIMIT_CHANGE','DEVICE_REMOVE',  │
│                                  'ACCOUNT_FREEZE','FORCED_LOGOUT')│
│ entity_type     VARCHAR(30)     NOT NULL  ('USER','ACCOUNT',      │
│                                  'CARD','LOAN','BENEFICIARY',     │
│                                  'TRANSACTION','SESSION')         │
│ entity_id       UUID            NULL                              │
│ old_value       JSONB           NULL  (before change)             │
│ new_value       JSONB           NULL  (after change)              │
│ ip_address      INET            NULL                              │
│ user_agent      TEXT            NULL                              │
│ device_id       VARCHAR(255)    NULL                              │
│ session_id      UUID            NULL                              │
│ channel         VARCHAR(20)     DEFAULT 'MOBILE_APP'              │
│ risk_score      DECIMAL(5,2)    NULL  (fraud detection score)     │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
├──────────────────────────────────────────────────────────────────┤
│ PARTITION BY RANGE (created_at)  — monthly partitions             │
│                                                                   │
│ INDEX idx_audit_user    ON (user_id, created_at DESC)             │
│ INDEX idx_audit_action  ON (action, created_at DESC)              │
│ INDEX idx_audit_entity  ON (entity_type, entity_id)               │
│                                                                   │
│ This table is APPEND-ONLY. No UPDATE or DELETE allowed.           │
│ Retention: 7 years (RBI regulatory requirement).                  │
│ Old partitions archived to cold storage (S3 + Glacier).           │
└──────────────────────────────────────────────────────────────────┘
```

## 11.2  fraud_alerts

```
┌──────────────────────────────────────────────────────────────────┐
│                       fraud_alerts                                │
├──────────────────────────────────────────────────────────────────┤
│ id              UUID        PK                                    │
│ user_id         UUID        FK → users(id)                        │
│ transaction_id  UUID            NULL                              │
│ alert_type      VARCHAR(30)     NOT NULL                          │
│                                 ('UNUSUAL_AMOUNT','NEW_DEVICE',   │
│                                  'NEW_LOCATION','RAPID_TXN',      │
│                                  'INTERNATIONAL','BRUTE_FORCE',   │
│                                  'SIM_CHANGE')                    │
│ risk_score      DECIMAL(5,2)    NOT NULL  (0.00 - 100.00)         │
│ details         JSONB           NOT NULL                          │
│ action_taken    VARCHAR(30)     NULL                              │
│                                 ('BLOCKED','FLAGGED','OTP_SENT',  │
│                                  'ACCOUNT_FROZEN','NONE')         │
│ resolved_by     VARCHAR(100)    NULL                              │
│ status          VARCHAR(20)     DEFAULT 'OPEN'                    │
│                                 CHECK (IN ('OPEN','INVESTIGATING',│
│                                   'RESOLVED','FALSE_POSITIVE'))   │
│ created_at      TIMESTAMPTZ     DEFAULT NOW()                     │
│ resolved_at     TIMESTAMPTZ     NULL                              │
├──────────────────────────────────────────────────────────────────┤
│ INDEX idx_fraud_user   ON (user_id)                               │
│ INDEX idx_fraud_status ON (status) WHERE status = 'OPEN'          │
└──────────────────────────────────────────────────────────────────┘
```

---

# 12. COMPLETE RELATIONSHIP DIAGRAM

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
║                         NEXUS BANK — ENTITY RELATIONSHIP MAP                                 ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                              ║
║                              ┌──────────────┐                                                ║
║                              │  app_config   │  (standalone)                                  ║
║                              └──────────────┘                                                ║
║                              ┌──────────────┐                                                ║
║                              │    offers     │  (standalone)                                  ║
║                              └──────────────┘                                                ║
║           ┌──────────────┐   ┌──────────────┐                                                ║
║           │bill_categories│──▶│bill_operators│  (reference data)                              ║
║           └──────────────┘   └──────┬───────┘                                                ║
║                                     │                                                        ║
║                                     │ FK                                                     ║
║                                     ▼                                                        ║
║  ┌─────────┐                ┌──────────────┐                                                 ║
║  │ otp_log │ (by phone)     │bill_payments │                                                 ║
║  └─────────┘                └──────┬───────┘                                                 ║
║                                    │ FK                                                      ║
║  ╔═════════════════════════════════╪═════════════════════════════════════════════════════╗     ║
║  ║                                │                                                     ║     ║
║  ║           ┌────────────────────┼──────────────────────────────┐                      ║     ║
║  ║           │                    │                              │                      ║     ║
║  ║           ▼                    ▼                              ▼                      ║     ║
║  ║  ┌──────────────┐    ┌──────────────┐              ┌──────────────────┐             ║     ║
║  ║  │  mpin_store  │    │   sessions   │              │  fcm_tokens      │             ║     ║
║  ║  │  (1:1)       │    │   (1:N)      │              │  (1:N)           │             ║     ║
║  ║  └──────┬───────┘    └──────┬───────┘              └────────┬─────────┘             ║     ║
║  ║         │                   │                               │                       ║     ║
║  ║         │ FK                │ FK                             │ FK                    ║     ║
║  ║         │                   │                               │                       ║     ║
║  ║         ▼                   ▼                               ▼                       ║     ║
║  ║  ╔══════════════════════════════════════════════════════════════════════════════╗    ║     ║
║  ║  ║                              users (MASTER)                                 ║    ║     ║
║  ║  ╠════════════════════════════════════════════════════════════════════════════  ║    ║     ║
║  ║  ║  id | phone | email | full_name | kyc_status | is_active | created_at       ║    ║     ║
║  ║  ╚══════════╤══════╤═══════╤═══════╤═══════╤══════╤═══════╤═══════╤══════════╝    ║     ║
║  ║             │      │       │       │       │      │       │       │               ║     ║
║  ║     ┌───────┘   ┌──┘    ┌──┘    ┌──┘    ┌──┘   ┌──┘    ┌──┘   ┌──┘               ║     ║
║  ║     ▼           ▼       ▼       ▼       ▼      ▼       ▼      ▼                  ║     ║
║  ║ ┌────────┐ ┌────────┐┌──────┐┌──────┐┌──────┐┌─────┐┌──────┐┌─────────┐         ║     ║
║  ║ │address-│ │accounts││cards ││loans ││benef-││notif││kyc_  ││support_ │         ║     ║
║  ║ │  es    │ │        ││      ││      ││iciar-││icat-││docs  ││tickets  │         ║     ║
║  ║ │ (1:N)  │ │ (1:N)  ││(1:N) ││(1:N) ││ies   ││ions ││(1:N) ││ (1:N)   │         ║     ║
║  ║ └────────┘ └───┬────┘└──┬───┘└──┬───┘│(1:N) │└──┬──┘└──────┘└────┬────┘         ║     ║
║  ║                │        │       │    └──┬───┘   │                │              ║     ║
║  ║                │        │       │       │       │                │              ║     ║
║  ║          ┌─────┘    ┌───┘  ┌────┘       │       │           ┌────┘              ║     ║
║  ║          ▼          ▼      ▼            ▼       ▼           ▼                   ║     ║
║  ║   ┌──────────┐┌─────────┐┌──────────┐┌──────┐┌──────┐┌──────────┐              ║     ║
║  ║   │transact- ││card_    ││emi_      ││sched-││notif_││ticket_   │              ║     ║
║  ║   │  ions    ││transact-││schedule  ││uled_ ││prefs ││messages  │              ║     ║
║  ║   │ (1:N)    ││ions     ││ (1:N)    ││paymts││(1:1) ││ (1:N)    │              ║     ║
║  ║   └─────┬────┘│(1:N)    │└──────────┘│(1:N) │└──────┘└──────────┘              ║     ║
║  ║         │     └─────────┘            └──────┘                                  ║     ║
║  ║         │                                                                       ║     ║
║  ║         ▼                                                                       ║     ║
║  ║   ┌────────────┐   ┌────────────────┐   ┌──────────────┐                       ║     ║
║  ║   │refresh_    │   │fraud_alerts    │   │kyc_verif_log │                       ║     ║
║  ║   │tokens (1:N)│   │(references txn)│   │  (1:N)       │                       ║     ║
║  ║   └────────────┘   └────────────────┘   └──────────────┘                       ║     ║
║  ║                                                                                ║     ║
║  ║   ┌──────────────────────┐   ┌──────────────┐   ┌────────────────┐             ║     ║
║  ║   │ loan_applications    │   │fixed_deposits│   │recurring_      │             ║     ║
║  ║   │ (1:N per user)       │   │ (1:N)        │   │deposits (1:N)  │             ║     ║
║  ║   └──────────────────────┘   └──────────────┘   └────────────────┘             ║     ║
║  ║                                                                                ║     ║
║  ║   ┌──────────────────────────────────────────────────────────────────┐          ║     ║
║  ║   │  audit_trail (APPEND-ONLY, PARTITIONED — references all above)  │          ║     ║
║  ║   └──────────────────────────────────────────────────────────────────┘          ║     ║
║  ╚════════════════════════════════════════════════════════════════════════════════  ╝     ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# 13. TABLE COUNT & SUMMARY

```
┌────┬───────────────────────────┬──────────┬───────────────────────────────────┐
│ #  │ Table                     │ Type     │ Key Relationships                 │
├────┼───────────────────────────┼──────────┼───────────────────────────────────┤
│  1 │ users                     │ MASTER   │ Central entity, all FKs point here│
│  2 │ addresses                 │ DETAIL   │ users (1:N)                       │
│  3 │ mpin_store                │ AUTH     │ users (1:1)                       │
│  4 │ otp_log                   │ AUTH     │ by phone (no FK)                  │
│  5 │ refresh_tokens            │ AUTH     │ users (1:N), sessions (1:1)       │
│  6 │ sessions                  │ AUTH     │ users (1:N)                       │
│  7 │ branches                  │ REF      │ standalone reference table        │
│  8 │ accounts                  │ BANKING  │ users (1:N), branches (N:1)       │
│  9 │ transactions              │ BANKING  │ accounts (1:N), PARTITIONED       │
│ 10 │ beneficiaries             │ BANKING  │ users (1:N)                       │
│ 11 │ scheduled_payments        │ BANKING  │ users, accounts, beneficiaries    │
│ 12 │ cards                     │ CARDS    │ users (1:N), accounts (N:1)       │
│ 13 │ card_transactions         │ CARDS    │ cards (1:N)                       │
│ 14 │ loans                     │ LENDING  │ users (1:N), accounts (N:1)       │
│ 15 │ emi_schedule              │ LENDING  │ loans (1:N)                       │
│ 16 │ loan_applications         │ LENDING  │ users (1:N), loans (1:1)          │
│ 17 │ kyc_documents             │ KYC      │ users (1:N)                       │
│ 18 │ kyc_verification_log      │ KYC      │ users (1:N), kyc_documents        │
│ 19 │ notifications             │ NOTIF    │ users (1:N)                       │
│ 20 │ notification_preferences  │ NOTIF    │ users (1:1)                       │
│ 21 │ fcm_tokens                │ NOTIF    │ users (1:N)                       │
│ 22 │ fixed_deposits            │ INVEST   │ users (1:N), accounts (N:1)       │
│ 23 │ recurring_deposits        │ INVEST   │ users (1:N), accounts (N:1)       │
│ 24 │ bill_categories           │ BILLS    │ standalone reference              │
│ 25 │ bill_operators            │ BILLS    │ bill_categories (N:1)             │
│ 26 │ bill_payments             │ BILLS    │ users, accounts, operators, txns  │
│ 27 │ support_tickets           │ SUPPORT  │ users (1:N)                       │
│ 28 │ support_ticket_messages   │ SUPPORT  │ support_tickets (1:N)             │
│ 29 │ offers                    │ CONFIG   │ standalone                        │
│ 30 │ app_config                │ CONFIG   │ standalone (key-value)            │
│ 31 │ audit_trail               │ SECURITY │ APPEND-ONLY, PARTITIONED          │
│ 32 │ fraud_alerts              │ SECURITY │ users, transactions               │
└────┴───────────────────────────┴──────────┴───────────────────────────────────┘

Total: 32 tables across 9 domains
```

---

# 14. PRODUCTION NOTES

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION CONSIDERATIONS                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  DATABASE ENGINE:    PostgreSQL 15+ (with partitioning, JSONB, INET types)      │
│  HOSTING:            AWS RDS Multi-AZ / Aurora PostgreSQL                       │
│  READ REPLICAS:      2+ replicas for read-heavy queries (statements, notifs)    │
│                                                                                 │
│  ENCRYPTION:                                                                    │
│    • At rest:    RDS encryption (AES-256) + column-level for PII                │
│    • In transit: TLS 1.3 for all connections                                    │
│    • App-level:  AES-256-GCM for card numbers, Aadhaar, PAN                    │
│    • Hashing:    Argon2id for MPIN, bcrypt for OTP, SHA-256 for lookups         │
│                                                                                 │
│  PARTITIONING:                                                                  │
│    • transactions  → monthly range partitions (by created_at)                   │
│    • audit_trail   → monthly range partitions (by created_at)                   │
│    • otp_log       → TTL-based cleanup (pg_cron, delete after 24h)              │
│                                                                                 │
│  RETENTION:                                                                     │
│    • transactions  → 10 years (regulatory), archive after 2 years               │
│    • audit_trail   → 7 years (RBI requirement), cold storage after 1 year       │
│    • sessions      → 1 year active, then archive                                │
│    • notifications → 6 months, then delete                                      │
│    • otp_log       → 24 hours (auto-purge)                                      │
│                                                                                 │
│  BACKUP:                                                                        │
│    • Automated daily snapshots (35-day retention)                                │
│    • Point-in-time recovery (PITR) enabled                                      │
│    • Cross-region backup for DR                                                 │
│                                                                                 │
│  CONCURRENCY:                                                                   │
│    • Balance updates use SELECT ... FOR UPDATE (row-level locking)               │
│    • Double-entry bookkeeping: every transfer = 2 atomic rows                   │
│    • Idempotency keys on transfers (reference_id is UNIQUE)                     │
│                                                                                 │
│  COMPLIANCE:                                                                    │
│    • PCI-DSS for card data storage                                              │
│    • RBI data localization (all data in India region)                            │
│    • GDPR-ready soft deletes on user data                                       │
│    • KYC document retention per RBI norms                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# 15. MOBILE vs BACKEND SCHEMA COMPARISON

```
┌──────────────────────────┬─────────────────────┬─────────────────────────────┐
│ Aspect                   │ Mobile (Room)       │ Backend (PostgreSQL)        │
├──────────────────────────┼─────────────────────┼─────────────────────────────┤
│ Purpose                  │ Offline cache        │ Source of truth             │
│ Tables                   │ 7                    │ 32                          │
│ Auth tables              │ None (EncryptedPrefs)│ 4 (mpin, otp, tokens, sess)│
│ Audit trail              │ None                 │ Append-only partitioned     │
│ Card numbers             │ Masked last 4 only   │ AES-256 encrypted + hash   │
│ KYC documents            │ None                 │ Encrypted + S3 storage      │
│ Transactions             │ Recent only          │ Full history (10 years)     │
│ Partitioning             │ N/A                  │ Monthly (txns + audit)      │
│ Soft deletes             │ No                   │ Yes (deleted_at)            │
│ Fraud detection          │ No                   │ fraud_alerts table          │
│ Bill payments            │ No                   │ Full workflow tables        │
│ Investments (FD/RD)      │ No                   │ Dedicated tables            │
│ Support tickets          │ No                   │ Full ticketing system       │
│ Feature flags            │ No                   │ app_config (JSONB)          │
│ Data sync                │ lastSynced field     │ updated_at + event streams  │
│ Foreign key behavior     │ CASCADE all          │ RESTRICT on financial data  │
└──────────────────────────┴─────────────────────┴─────────────────────────────┘
```
