-- ============================================
-- PACKAGE SYSTEM SEED DATA
-- For Main Backend Implementation
-- ============================================

-- Replace 'YOUR_ORG_ID' with actual organization ID
-- Replace timestamps with appropriate values

-- ============================================
-- 1. SINGLE RIDE
-- ============================================
INSERT INTO "Package" (
  id,
  "organizationId",
  code,
  name,
  "nameTr",
  type,
  price,
  credits,
  "pricePerCredit",
  description,
  "descriptionTr",
  "isActive",
  "displayOrder",
  "createdAt",
  "updatedAt"
) VALUES (
  'pkg-single-ride',
  'YOUR_ORG_ID',
  'SINGLE-RIDE',
  'Single Ride',
  'Tek Sürüş',
  'SINGLE_RIDE',
  1500.00,
  1,
  1500.00,
  'One ride credit',
  'Bir sürüş kredisi',
  true,
  1,
  NOW(),
  NOW()
);

-- ============================================
-- 2. EXPLORER PACK - 5 RIDES
-- ============================================
INSERT INTO "Package" (
  id,
  "organizationId",
  code,
  name,
  "nameTr",
  type,
  price,
  credits,
  "pricePerCredit",
  description,
  "descriptionTr",
  "isActive",
  "displayOrder",
  "createdAt",
  "updatedAt"
) VALUES (
  'pkg-explorer',
  'YOUR_ORG_ID',
  'EXPLORER-5',
  'Explorer Pack',
  'Explorer Paket',
  'CREDIT_PACK',
  5000.00,
  5,
  1000.00,
  '5 rides - Save 2,500 TL',
  '5 sürüş - 2,500 TL tasarruf',
  true,
  2,
  NOW(),
  NOW()
);

-- ============================================
-- 3. CORE PACK - 10 RIDES
-- ============================================
INSERT INTO "Package" (
  id,
  "organizationId",
  code,
  name,
  "nameTr",
  type,
  price,
  credits,
  "pricePerCredit",
  description,
  "descriptionTr",
  "isActive",
  "displayOrder",
  "createdAt",
  "updatedAt"
) VALUES (
  'pkg-core',
  'YOUR_ORG_ID',
  'CORE-10',
  'Core Pack',
  'Core Paket',
  'CREDIT_PACK',
  8000.00,
  10,
  800.00,
  '10 rides - Save 7,000 TL',
  '10 sürüş - 7,000 TL tasarruf',
  true,
  3,
  NOW(),
  NOW()
);

-- ============================================
-- 4. ELITE PACK - 20 RIDES
-- ============================================
INSERT INTO "Package" (
  id,
  "organizationId",
  code,
  name,
  "nameTr",
  type,
  price,
  credits,
  "pricePerCredit",
  description,
  "descriptionTr",
  "isActive",
  "displayOrder",
  "createdAt",
  "updatedAt"
) VALUES (
  'pkg-elite',
  'YOUR_ORG_ID',
  'ELITE-20',
  'Elite Pack',
  'Elite Paket',
  'CREDIT_PACK',
  14000.00,
  20,
  700.00,
  '20 rides - Save 16,000 TL',
  '20 sürüş - 16,000 TL tasarruf',
  true,
  4,
  NOW(),
  NOW()
);

-- ============================================
-- 5. ELITE 30 - SIGNATURE PACK
-- ============================================
INSERT INTO "Package" (
  id,
  "organizationId",
  code,
  name,
  "nameTr",
  type,
  price,
  credits,
  "pricePerCredit",
  description,
  "descriptionTr",
  benefits,
  "isActive",
  "displayOrder",
  "createdAt",
  "updatedAt"
) VALUES (
  'pkg-elite-30',
  'YOUR_ORG_ID',
  'ELITE-30',
  'Elite 30 - Signature Pack',
  'Elite 30 - Signature Paket',
  'ELITE_30',
  18000.00,
  30,
  600.00,
  '30 rides + friend pass + priority booking',
  '30 sürüş + arkadaş hakkı + öncelikli rezervasyon',
  '["friend_pass", "priority_booking", "elite_badge"]'::jsonb,
  true,
  5,
  NOW(),
  NOW()
);

-- ============================================
-- 6. ALL ACCESS - 30 DAYS
-- ============================================
INSERT INTO "Package" (
  id,
  "organizationId",
  code,
  name,
  "nameTr",
  type,
  price,
  credits,
  "pricePerCredit",
  description,
  "descriptionTr",
  "isActive",
  "displayOrder",
  "createdAt",
  "updatedAt"
) VALUES (
  'pkg-all-access',
  'YOUR_ORG_ID',
  'ALL-ACCESS-30',
  'All Access - 30 Days',
  'All Access - 30 Gün',
  'ALL_ACCESS',
  21000.00,
  NULL,
  NULL,
  'Unlimited rides for 30 days, max 1 per day. Requires reservation. No-show burns the day.',
  '30 gün boyunca sınırsız sürüş, günde maksimum 1. Rezervasyon gerekli. No-show yanar.',
  true,
  6,
  NOW(),
  NOW()
);

-- ============================================
-- EXAMPLE COUPON: SUMMER DISCOUNT
-- ============================================
INSERT INTO "Coupon" (
  id,
  "organizationId",
  code,
  name,
  "nameTr",
  "couponType",
  "discountType",
  "discountValue",
  "applicablePackageIds",
  "validFrom",
  "validUntil",
  "maxRedemptions",
  "maxRedemptionsPerMember",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  'coupon-summer-2024',
  'YOUR_ORG_ID',
  'SUMMER2024',
  'Summer Discount',
  'Yaz İndirimi',
  'DISCOUNT',
  'PERCENTAGE',
  15.00,
  ARRAY['pkg-explorer', 'pkg-core', 'pkg-elite', 'pkg-elite-30'],
  NOW(),
  '2024-08-31T23:59:59Z'::timestamp,
  100,
  1,
  true,
  NOW(),
  NOW()
);

-- ============================================
-- EXAMPLE COUPON: NEW MEMBER BONUS
-- ============================================
INSERT INTO "Coupon" (
  id,
  "organizationId",
  code,
  name,
  "nameTr",
  "couponType",
  "bonusCredits",
  "validFrom",
  "validUntil",
  "maxRedemptions",
  "maxRedemptionsPerMember",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  'coupon-new-member',
  'YOUR_ORG_ID',
  'NEWMEMBER2024',
  'New Member Bonus',
  'Yeni Üye Bonusu',
  'CREDIT_BONUS',
  2,
  NOW(),
  '2024-12-31T23:59:59Z'::timestamp,
  NULL, -- Unlimited
  1,
  true,
  NOW(),
  NOW()
);

-- ============================================
-- NOTES FOR MAIN BACKEND
-- ============================================

-- 1. After inserting packages, calculate basePrice, discountAmount, discountPercentage
--    based on Organization.creditPrice
-- 
--    UPDATE "Package" 
--    SET 
--      "basePrice" = (SELECT "creditPrice" FROM "Organization" WHERE id = "Package"."organizationId") * credits,
--      "discountAmount" = "basePrice" - price,
--      "discountPercentage" = CASE 
--        WHEN "basePrice" > 0 THEN ("discountAmount" / "basePrice") * 100 
--        ELSE 0 
--      END
--    WHERE type != 'ALL_ACCESS' AND credits IS NOT NULL;

-- 2. Create indexes for performance:
--    CREATE INDEX idx_package_org ON "Package"("organizationId");
--    CREATE INDEX idx_package_code ON "Package"(code);
--    CREATE INDEX idx_coupon_org ON "Coupon"("organizationId");
--    CREATE INDEX idx_coupon_code ON "Coupon"(code);
--    CREATE INDEX idx_redemption_member ON "PackageRedemption"("memberId");
--    CREATE INDEX idx_redemption_status ON "PackageRedemption"(status);

-- 3. Set up foreign key constraints:
--    ALTER TABLE "Package" ADD CONSTRAINT fk_package_org 
--      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id);
--    
--    ALTER TABLE "Coupon" ADD CONSTRAINT fk_coupon_org 
--      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id);
--    
--    ALTER TABLE "PackageRedemption" ADD CONSTRAINT fk_redemption_member 
--      FOREIGN KEY ("memberId") REFERENCES "Member"(id);
--    
--    ALTER TABLE "PackageRedemption" ADD CONSTRAINT fk_redemption_package 
--      FOREIGN KEY ("packageId") REFERENCES "Package"(id);
--    
--    ALTER TABLE "PackageRedemption" ADD CONSTRAINT fk_redemption_coupon 
--      FOREIGN KEY ("couponId") REFERENCES "Coupon"(id);






