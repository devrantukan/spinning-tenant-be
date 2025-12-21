/**
 * Package system types and utilities
 */

export type PackageType =
  | "SINGLE_RIDE" // Single ride credit
  | "CREDIT_PACK" // Multi-ride credit pack
  | "ELITE_30" // Elite 30 with friend pass
  | "ALL_ACCESS"; // Time-based unlimited access

export type CouponType =
  | "DISCOUNT" // Percentage or fixed discount
  | "PACKAGE" // Package coupon
  | "CREDIT_BONUS"; // Bonus credits

export type RedemptionType =
  | "PACKAGE_DIRECT" // Direct package purchase
  | "COUPON_PACKAGE" // Package purchased with coupon
  | "COUPON_DISCOUNT"; // Discount coupon applied

export type DiscountType =
  | "PERCENTAGE" // Percentage discount (e.g., 10%)
  | "FIXED_AMOUNT"; // Fixed amount discount (e.g., 500 TL)

export interface Package {
  id: string;
  organizationId: string;
  code: string; // e.g., "SINGLE-RIDE", "ELITE-30"
  name: string;
  nameTr?: string;
  type: PackageType;
  price: number; // Package price in TL
  credits?: number; // Number of credits (null for ALL_ACCESS)
  pricePerCredit?: number; // Calculated: price / credits
  description?: string;
  descriptionTr?: string;
  benefits?: string[]; // e.g., ["friend_pass", "priority_booking", "elite_badge"]

  // Calculated fields (based on organization.creditPrice)
  basePrice?: number; // creditPrice * credits (if applicable)
  discountAmount?: number; // basePrice - price
  discountPercentage?: number; // (discountAmount / basePrice) * 100

  // Validity
  validFrom?: string;
  validUntil?: string;

  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  organizationId: string;
  code: string; // e.g., "SUMMER2024", "PROMO-ABC123"
  name: string;
  nameTr?: string;
  description?: string;
  descriptionTr?: string;

  couponType: CouponType;

  // For package coupons
  packageId?: string; // Reference to Package (optional)
  customPrice?: number; // Override package price
  customCredits?: number; // Override package credits

  // For discount coupons
  discountType?: DiscountType;
  discountValue?: number; // 10 for 10%, or 500 for 500 TL
  applicablePackageIds?: string[]; // Which packages this applies to

  // For credit bonus coupons
  bonusCredits?: number;

  // Validity
  validFrom?: string;
  validUntil?: string;
  maxRedemptions?: number; // NULL = unlimited
  maxRedemptionsPerMember?: number; // Default: 1
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface PackageRedemption {
  id: string;
  memberId: string;
  organizationId: string;

  // Can be either Package or Coupon
  packageId?: string; // NULL if redeemed via coupon
  couponId?: string; // NULL if direct package purchase

  // Redemption details
  redemptionType: RedemptionType;
  redeemedAt: string;
  redeemedBy?: string; // Admin/user who redeemed

  // Pricing
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;

  // What was granted
  creditsAdded?: number;
  allAccessExpiresAt?: string;
  allAccessDays?: number;

  // For ELITE_30 packages
  friendPassAvailable: boolean;
  friendPassExpiresAt?: string;
  friendPassUsed: boolean;
  friendPassUsedAt?: string;
  friendPassBookingId?: string;

  // Status
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "USED";

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AllAccessDailyUsage {
  id: string;
  packageRedemptionId: string;
  memberId: string;
  usageDate: string; // YYYY-MM-DD
  bookingId?: string;
  wasNoShow: boolean;
  createdAt: string;
}

/**
 * Calculate package pricing based on organization credit price
 */
export function calculatePackagePricing(
  packageData: Package,
  organizationCreditPrice: number
): {
  basePrice: number;
  discountAmount: number;
  discountPercentage: number;
  pricePerCredit: number;
} | null {
  if (packageData.type === "ALL_ACCESS" || !packageData.credits) {
    return null; // No calculation for All Access
  }

  const basePrice = organizationCreditPrice * packageData.credits;
  const discountAmount = basePrice - packageData.price;
  const discountPercentage =
    basePrice > 0 ? (discountAmount / basePrice) * 100 : 0;
  const pricePerCredit = packageData.price / packageData.credits;

  return {
    basePrice,
    discountAmount,
    discountPercentage,
    pricePerCredit,
  };
}

/**
 * Calculate final price with coupon discount
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  coupon: Coupon
): {
  discountAmount: number;
  finalPrice: number;
} {
  let discountAmount = 0;

  if (
    coupon.couponType === "DISCOUNT" &&
    coupon.discountType &&
    coupon.discountValue
  ) {
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (originalPrice * coupon.discountValue) / 100;
    } else if (coupon.discountType === "FIXED_AMOUNT") {
      discountAmount = coupon.discountValue;
    }
  }

  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return {
    discountAmount,
    finalPrice,
  };
}

/**
 * Check if All Access can be used today
 */
export function canUseAllAccessToday(
  redemption: PackageRedemption,
  dailyUsages: AllAccessDailyUsage[]
): boolean {
  if (redemption.status !== "ACTIVE") return false;
  if (!redemption.allAccessExpiresAt) return false;

  const expiresAt = new Date(redemption.allAccessExpiresAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expiresAt < today) return false;

  // Check if already used today
  const todayStr = today.toISOString().split("T")[0];
  const usedToday = dailyUsages.some(
    (usage) => usage.usageDate === todayStr && !usage.wasNoShow
  );

  return !usedToday;
}

/**
 * Check if friend pass is available and valid
 */
export function isFriendPassValid(redemption: PackageRedemption): boolean {
  if (!redemption.friendPassAvailable) return false;
  if (redemption.friendPassUsed) return false;
  if (!redemption.friendPassExpiresAt) return false;

  const expiresAt = new Date(redemption.friendPassExpiresAt);
  const now = new Date();

  return expiresAt >= now;
}







