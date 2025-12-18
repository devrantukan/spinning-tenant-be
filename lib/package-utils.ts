/**
 * Utility functions for package system operations
 */

import {
  Package,
  Coupon,
  PackageRedemption,
  calculatePackagePricing,
  calculateDiscountedPrice,
} from "./packages";

/**
 * Calculate package pricing with organization credit price
 */
export function enrichPackageWithPricing(
  packageData: Package,
  organizationCreditPrice: number
): Package {
  if (packageData.type === "ALL_ACCESS" || !packageData.credits) {
    return packageData;
  }

  const pricing = calculatePackagePricing(packageData, organizationCreditPrice);
  if (!pricing) {
    return packageData;
  }

  return {
    ...packageData,
    basePrice: pricing.basePrice,
    discountAmount: pricing.discountAmount,
    discountPercentage: pricing.discountPercentage,
    pricePerCredit: pricing.pricePerCredit,
  };
}

/**
 * Enrich multiple packages with pricing
 */
export function enrichPackagesWithPricing(
  packages: Package[],
  organizationCreditPrice: number
): Package[] {
  return packages.map((pkg) =>
    enrichPackageWithPricing(pkg, organizationCreditPrice)
  );
}

/**
 * Calculate redemption price with coupon
 */
export function calculateRedemptionPrice(
  packageData: Package,
  coupon?: Coupon
): {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  redemptionType: "PACKAGE_DIRECT" | "COUPON_PACKAGE" | "COUPON_DISCOUNT";
} {
  const originalPrice = packageData.price;

  if (!coupon) {
    return {
      originalPrice,
      discountAmount: 0,
      finalPrice: originalPrice,
      redemptionType: "PACKAGE_DIRECT",
    };
  }

  if (coupon.couponType === "DISCOUNT") {
    const discount = calculateDiscountedPrice(originalPrice, coupon);
    return {
      originalPrice,
      discountAmount: discount.discountAmount,
      finalPrice: discount.finalPrice,
      redemptionType: "COUPON_DISCOUNT",
    };
  }

  if (coupon.couponType === "PACKAGE" && coupon.customPrice) {
    const discountAmount = originalPrice - coupon.customPrice;
    return {
      originalPrice,
      discountAmount,
      finalPrice: coupon.customPrice,
      redemptionType: "COUPON_PACKAGE",
    };
  }

  // No discount applied
  return {
    originalPrice,
    discountAmount: 0,
    finalPrice: originalPrice,
    redemptionType: "PACKAGE_DIRECT",
  };
}

/**
 * Determine credits to add based on package type
 */
export function getCreditsFromPackage(
  packageData: Package,
  coupon?: Coupon
): number {
  if (packageData.type === "ALL_ACCESS") {
    return 0; // All Access doesn't add credits
  }

  // If coupon overrides credits
  if (coupon?.customCredits) {
    return coupon.customCredits;
  }

  return packageData.credits || 0;
}

/**
 * Calculate All Access expiration date
 */
export function calculateAllAccessExpiration(
  purchaseDate: Date,
  days: number = 30
): Date {
  const expiration = new Date(purchaseDate);
  expiration.setDate(expiration.getDate() + days);
  expiration.setHours(23, 59, 59, 999); // End of day
  return expiration;
}

/**
 * Calculate friend pass expiration date
 */
export function calculateFriendPassExpiration(
  purchaseDate: Date,
  days: number = 30
): Date {
  const expiration = new Date(purchaseDate);
  expiration.setDate(expiration.getDate() + days);
  expiration.setHours(23, 59, 59, 999); // End of day
  return expiration;
}

/**
 * Check if package has friend pass benefit
 */
export function hasFriendPassBenefit(packageData: Package): boolean {
  return (
    packageData.type === "ELITE_30" &&
    packageData.benefits?.includes("friend_pass")
  );
}

/**
 * Check if package is All Access
 */
export function isAllAccessPackage(packageData: Package): boolean {
  return packageData.type === "ALL_ACCESS";
}

/**
 * Format package price for display
 */
export function formatPackagePrice(
  price: number,
  currency: string = "TL"
): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency === "TL" ? "TRY" : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format discount percentage for display
 */
export function formatDiscountPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

/**
 * Get package display name (with Turkish fallback)
 */
export function getPackageDisplayName(
  packageData: Package,
  language: "en" | "tr" = "en"
): string {
  if (language === "tr" && packageData.nameTr) {
    return packageData.nameTr;
  }
  return packageData.name;
}

/**
 * Validate coupon can be applied to package
 */
export function canApplyCouponToPackage(
  coupon: Coupon,
  packageData: Package
): { valid: boolean; reason?: string } {
  // Check if coupon is active
  if (!coupon.isActive) {
    return { valid: false, reason: "Coupon is not active" };
  }

  // Check validity dates
  const now = new Date();
  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    return { valid: false, reason: "Coupon not yet valid" };
  }
  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    return { valid: false, reason: "Coupon has expired" };
  }

  // Check if coupon applies to this package
  if (coupon.couponType === "DISCOUNT") {
    if (
      coupon.applicablePackageIds &&
      !coupon.applicablePackageIds.includes(packageData.id)
    ) {
      return {
        valid: false,
        reason: "Coupon does not apply to this package",
      };
    }
  }

  if (coupon.couponType === "PACKAGE") {
    if (coupon.packageId && coupon.packageId !== packageData.id) {
      return {
        valid: false,
        reason: "Coupon is for a different package",
      };
    }
  }

  return { valid: true };
}

/**
 * Get redemption status display
 */
export function getRedemptionStatusDisplay(redemption: PackageRedemption): {
  text: string;
  color: string;
} {
  switch (redemption.status) {
    case "ACTIVE":
      // Check if expired
      if (redemption.allAccessExpiresAt) {
        const expiresAt = new Date(redemption.allAccessExpiresAt);
        if (expiresAt < new Date()) {
          return { text: "Expired", color: "gray" };
        }
      }
      return { text: "Active", color: "green" };
    case "EXPIRED":
      return { text: "Expired", color: "gray" };
    case "CANCELLED":
      return { text: "Cancelled", color: "red" };
    case "USED":
      return { text: "Used", color: "blue" };
    default:
      return { text: "Unknown", color: "gray" };
  }
}

/**
 * Calculate savings display
 */
export function getSavingsDisplay(
  basePrice: number,
  finalPrice: number
): { amount: number; percentage: number; display: string } {
  const amount = basePrice - finalPrice;
  const percentage = basePrice > 0 ? (amount / basePrice) * 100 : 0;

  return {
    amount,
    percentage,
    display: `Save ${formatPackagePrice(amount)} (${formatDiscountPercentage(
      percentage
    )} off)`,
  };
}



