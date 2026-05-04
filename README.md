# Nexus Bank API

A full-featured, production-grade banking backend API built with Node.js, Express, and PostgreSQL. Supports dual-factor authentication (password + MPIN), JWT-based session management with refresh token rotation and reuse detection, and bank account operations. Designed to scale into a complete digital banking platform with upcoming features including fund transfers, transaction history, bill payments, beneficiary management, notifications, and KYC verification.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Auth:** JWT + bcrypt + MPIN

## Features

### Authentication & Security
- Dual-factor authentication (password + MPIN)
- JWT access tokens (15 min) with rotating refresh tokens (30 days)
- Refresh token reuse detection — auto-revokes session on suspected theft
- MPIN brute-force lockout (temp lock at 3 failed attempts, permanent at 10)
- Multi-device session management with force-logout capability
- Per-route rate limiting (4-5 requests/min on sensitive endpoints)
- Helmet security headers
- Request body size limiting (10KB)
- Input validation & sanitization via express-validator
- Password policy enforcement (uppercase, lowercase, digit, special char)

### Bank Accounts
- Create savings/current accounts with auto-generated account numbers
- View accounts, balance inquiry
- Freeze/activate/close accounts
- Soft delete support (paranoid mode)

### Session Management
- View all active sessions across devices
- Force logout specific sessions
- Session tracking (IP, device, OS, app version, geo-location)
- Auto session update on activity

## Project Structure

```
src/
├── config/          # Database configuration
├── controllers/     # Route handlers
│   ├── auth/
│   └── account/
├── middlewares/      # Auth, validation, rate limiting, error handling
│   └── auth/
├── models/          # Sequelize models & associations
│   ├── auth/        # User, Session, RefreshToken, MpinStore
│   └── account/     # BankAccount
├── routes/          # Express route definitions
│   ├── auth/
│   └── account/
├── services/        # Business logic layer
│   ├── auth/
│   └── account/
├── utils/           # ApiError, catchAsync
├── validators/      # Input validation rules
│   ├── auth/
│   └── account/
└── server.js        # App entry point
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
git clone https://github.com/JunaidJamshid123/nexus-bank-api.git
cd nexus-bank-api
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://username:password@localhost:5432/nexus_bank
JWT_SECRET=your-secret-key
```

### Run

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Auth (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/check-phone/:phone` | Check if phone exists |
| POST | `/api/auth/login` | Login (password + MPIN) |
| POST | `/api/auth/token/refresh` | Refresh access token |
| POST | `/api/auth/mpin/reset` | Reset MPIN |

### Auth (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/logout` | Logout current session |
| GET | `/api/auth/sessions` | Get all active sessions |
| DELETE | `/api/auth/sessions/:id` | Force logout a session |
| PUT | `/api/auth/mpin/change` | Change MPIN |
| PUT | `/api/auth/password/change` | Change password |
| GET | `/api/auth/me` | Get current user profile |

### Accounts (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/account` | Create bank account |
| GET | `/api/account` | List all accounts |
| GET | `/api/account/:id` | Get account by ID |
| GET | `/api/account/number/:num` | Get account by number |
| GET | `/api/account/:id/balance` | Balance inquiry |
| PUT | `/api/account/:id/status` | Update account status |
| DELETE | `/api/account/:id` | Close account |

## Upcoming Features

- Fund transfers (internal & external)
- Transaction history with filtering
- Bill payments
- Beneficiary management
- Push notifications
- KYC verification
- Admin panel & role-based access control

## License

ISC
