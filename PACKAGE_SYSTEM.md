# Hybrid Package System Documentation

## Overview

The hybrid package system combines **standard packages** (fixed pricing) with **coupons** (flexible promotions) to provide a scalable and flexible pricing solution.

## Architecture

### Three Main Components

1. **Packages** - Standard, predefined packages with fixed pricing
2. **Coupons** - Flexible promotional codes (discounts, custom packages, bonuses)
3. **Redemptions** - Unified tracking of all package purchases

## Database Schema

### Package Table

```sql
CREATE TABLE "Package" (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,              -- e.g., "SINGLE-RIDE", "ELITE-30"
  name TEXT NOT NULL,
  nameTr TEXT,
  type TEXT NOT NULL,                     -- 'SINGLE_RIDE', 'CREDIT_PACK', 'ELITE_30', 'ALL_ACCESS'
  price DECIMAL(10,2) NOT NULL,
  credits INTEGER,                         -- NULL for ALL_ACCESS
  pricePerCredit DECIMAL(10,2),           -- Calculated: price / credits

  -- Calculated fields (based on organization.creditPrice)
  basePrice DECIMAL(10,2),                -- creditPrice * credits
  discountAmount DECIMAL(10,2),           -- basePrice - price
  discountPercentage DECIMAL(5,2),        -- (discountAmount / basePrice) * 100

  benefits JSONB,                         -- ['friend_pass', 'priority_booking', 'elite_badge']
  validFrom TIMESTAMP,
  validUntil TIMESTAMP,
  isActive BOOLEAN DEFAULT true,
  displayOrder INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Coupon Table

```sql
CREATE TABLE "Coupon" (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  couponType TEXT NOT NULL,               -- 'DISCOUNT', 'PACKAGE', 'CREDIT_BONUS'

  -- For package coupons
  packageId TEXT,                         -- Reference to Package
  customPrice DECIMAL(10,2),
  customCredits INTEGER,

  -- For discount coupons
  discountType TEXT,                      -- 'PERCENTAGE', 'FIXED_AMOUNT'
  discountValue DECIMAL(10,2),
  applicablePackageIds TEXT[],

  -- For credit bonus
  bonusCredits INTEGER,

  validFrom TIMESTAMP,
  validUntil TIMESTAMP,
  maxRedemptions INTEGER,
  maxRedemptionsPerMember INTEGER DEFAULT 1,
  isActive BOOLEAN DEFAULT true
);
```

### PackageRedemption Table

```sql
CREATE TABLE "PackageRedemption" (
  id TEXT PRIMARY KEY,
  memberId TEXT NOT NULL,
  organizationId TEXT NOT NULL,

  packageId TEXT,                         -- NULL if redeemed via coupon
  couponId TEXT,                          -- NULL if direct package purchase

  redemptionType TEXT NOT NULL,           -- 'PACKAGE_DIRECT', 'COUPON_PACKAGE', 'COUPON_DISCOUNT'

  originalPrice DECIMAL(10,2) NOT NULL,
  discountAmount DECIMAL(10,2) DEFAULT 0,
  finalPrice DECIMAL(10,2) NOT NULL,

  creditsAdded INTEGER,
  allAccessExpiresAt TIMESTAMP,
  allAccessDays INTEGER,

  friendPassAvailable BOOLEAN DEFAULT false,
  friendPassExpiresAt TIMESTAMP,
  friendPassUsed BOOLEAN DEFAULT false,

  status TEXT DEFAULT 'ACTIVE',           -- 'ACTIVE', 'EXPIRED', 'CANCELLED', 'USED'

  CHECK ((packageId IS NOT NULL) OR (couponId IS NOT NULL))
);
```

## Standard Packages

### 1. Single Ride

- **Code**: `SINGLE-RIDE`
- **Price**: 1,500 TL
- **Credits**: 1
- **Type**: `SINGLE_RIDE`

### 2. Explorer Pack

- **Code**: `EXPLORER-5`
- **Price**: 5,000 TL
- **Credits**: 5
- **Price per credit**: 1,000 TL
- **Type**: `CREDIT_PACK`

### 3. Core Pack

- **Code**: `CORE-10`
- **Price**: 8,000 TL
- **Credits**: 10
- **Price per credit**: 800 TL
- **Type**: `CREDIT_PACK`

### 4. Elite Pack

- **Code**: `ELITE-20`
- **Price**: 14,000 TL
- **Credits**: 20
- **Price per credit**: 700 TL
- **Type**: `CREDIT_PACK`

### 5. Elite 30 - Signature Pack

- **Code**: `ELITE-30`
- **Price**: 18,000 TL
- **Credits**: 30
- **Price per credit**: 600 TL
- **Type**: `ELITE_30`
- **Benefits**:
  - Friend pass (worth 2,250 TL)
  - Priority booking
  - Elite member badge
  - Friend pass expires 30 days from purchase

### 6. All Access - 30 Days

- **Code**: `ALL-ACCESS-30`
- **Price**: 21,000 TL
- **Type**: `ALL_ACCESS`
- **Duration**: 30 days
- **Rules**:
  - Max 1 ride per day
  - Requires reservation
  - No-show burns the day
  - Non-transferable

## API Endpoints

### Packages

#### GET /api/packages

Get all packages for the organization.

**Response:**

```json
[
  {
    "id": "pkg-single-ride",
    "code": "SINGLE-RIDE",
    "name": "Single Ride",
    "nameTr": "Tek Sürüş",
    "type": "SINGLE_RIDE",
    "price": 1500.0,
    "credits": 1,
    "pricePerCredit": 1500.0,
    "basePrice": 1500.0,
    "discountAmount": 0,
    "discountPercentage": 0,
    "isActive": true
  }
]
```

#### POST /api/packages

Create a new package.

**Request:**

```json
{
  "code": "SUMMER-SPECIAL",
  "name": "Summer Special",
  "nameTr": "Yaz Özel",
  "type": "CREDIT_PACK",
  "price": 12000.0,
  "credits": 15,
  "description": "Limited time summer offer"
}
```

#### GET /api/packages/[id]

Get a specific package.

#### PATCH /api/packages/[id]

Update a package.

#### DELETE /api/packages/[id]

Delete a package.

### Coupons

#### GET /api/coupons

Get all coupons.

#### POST /api/coupons

Create a new coupon.

**Request (Discount Coupon):**

```json
{
  "code": "SUMMER2024",
  "name": "Summer Discount",
  "couponType": "DISCOUNT",
  "discountType": "PERCENTAGE",
  "discountValue": 15,
  "applicablePackageIds": ["pkg-explorer", "pkg-core"],
  "validUntil": "2024-08-31T23:59:59Z",
  "maxRedemptions": 100
}
```

**Request (Package Coupon):**

```json
{
  "code": "PROMO-ABC123",
  "name": "Special Promo",
  "couponType": "PACKAGE",
  "packageId": "pkg-elite-30",
  "customPrice": 16000.0
}
```

#### GET /api/coupons/[id]

Get a specific coupon.

#### GET /api/coupons/code/[code]

Get a coupon by code.

#### PATCH /api/coupons/[id]

Update a coupon.

#### DELETE /api/coupons/[id]

Delete a coupon.

### Redemptions

#### POST /api/packages/redeem

Redeem a package (direct or with coupon).

**Request (Direct Package):**

```json
{
  "memberId": "member-123",
  "packageId": "pkg-elite-30"
}
```

**Request (Package with Coupon):**

```json
{
  "memberId": "member-123",
  "packageId": "pkg-elite-30",
  "couponCode": "SUMMER2024"
}
```

**Response:**

```json
{
  "id": "redemption-123",
  "memberId": "member-123",
  "packageId": "pkg-elite-30",
  "couponId": "coupon-456",
  "redemptionType": "COUPON_PACKAGE",
  "originalPrice": 18000.0,
  "discountAmount": 2700.0,
  "finalPrice": 15300.0,
  "creditsAdded": 30,
  "friendPassAvailable": true,
  "friendPassExpiresAt": "2024-09-15T23:59:59Z",
  "status": "ACTIVE"
}
```

#### GET /api/redemptions

Get all redemptions for the organization.

#### GET /api/redemptions/[id]

Get a specific redemption.

#### GET /api/redemptions/[id]/all-access-usage

Get All Access daily usage for a redemption.

#### GET /api/members/[id]/redemptions

Get all redemptions for a member.

## Calculated Fields

The system automatically calculates pricing fields based on `Organization.creditPrice`:

### For Credit Packages:

- `basePrice` = `organization.creditPrice * package.credits`
- `discountAmount` = `basePrice - package.price`
- `discountPercentage` = `(discountAmount / basePrice) * 100`
- `pricePerCredit` = `package.price / package.credits`

### Example:

If `organization.creditPrice = 1,500 TL`:

- Explorer Pack (5 credits for 5,000 TL):
  - `basePrice` = 1,500 × 5 = 7,500 TL
  - `discountAmount` = 7,500 - 5,000 = 2,500 TL
  - `discountPercentage` = (2,500 / 7,500) × 100 = 33.33%
  - `pricePerCredit` = 5,000 / 5 = 1,000 TL

## Business Logic

### Package Redemption Flow

1. **Direct Package Purchase**:

   ```
   Admin selects package → Creates redemption → Adds credits/benefits to member
   ```

2. **Package with Coupon**:

   ```
   Admin selects package → Applies coupon → Calculates discount → Creates redemption
   ```

3. **Custom Coupon Package**:
   ```
   Admin creates coupon with custom pricing → Redeems for member → Creates redemption
   ```

### All Access Rules

- Check if member has active All Access (not expired)
- Check if already used today (max 1/day)
- On booking: Create `AllAccessDailyUsage` record
- On no-show: Mark `wasNoShow = true` (day is burned)

### Friend Pass Rules (Elite 30)

- Friend pass available for 30 days from purchase
- Must be used on the same ride as the member
- Can only be used once per Elite 30 package
- Expires if not used within 30 days

## Usage Examples

### Creating a Standard Package

```typescript
const package = await fetch("/api/packages", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    code: "ELITE-30",
    name: "Elite 30 - Signature Pack",
    nameTr: "Elite 30 - Signature Paket",
    type: "ELITE_30",
    price: 18000.0,
    credits: 30,
    benefits: ["friend_pass", "priority_booking", "elite_badge"],
  }),
});
```

### Creating a Discount Coupon

```typescript
const coupon = await fetch("/api/coupons", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    code: "SUMMER2024",
    name: "Summer Discount",
    couponType: "DISCOUNT",
    discountType: "PERCENTAGE",
    discountValue: 15,
    validUntil: "2024-08-31T23:59:59Z",
    maxRedemptions: 100,
  }),
});
```

### Redeeming a Package

```typescript
const redemption = await fetch("/api/packages/redeem", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    memberId: "member-123",
    packageId: "pkg-elite-30",
    couponCode: "SUMMER2024", // Optional
  }),
});
```

## Benefits of Hybrid Approach

✅ **Standard Packages**: Simple, fixed pricing for common packages  
✅ **Promotions**: Easy to create discount coupons  
✅ **Flexibility**: Custom packages via coupons  
✅ **Unified Tracking**: All redemptions in one place  
✅ **Scalability**: Easy to add new package types  
✅ **Analytics**: Track package performance and coupon usage







