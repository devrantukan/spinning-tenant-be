"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";
import { showToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";
import {
  Package,
  PackageRedemption,
  AllAccessDailyUsage,
  canUseAllAccessToday,
  isFriendPassValid,
} from "@/lib/packages";

interface Member {
  id: string;
  creditBalance: number;
  isEliteMember: boolean;
  hasAllAccess: boolean;
  allAccessExpiresAt?: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
}

interface Session {
  id: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  currentBookings: number;
  status: string;
  class?: {
    id: string;
    name: string;
  };
  instructor?: {
    user: {
      name?: string;
      email: string;
    };
  };
  location?: {
    id: string;
    name: string;
  };
}

export default function SpinningPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [redemptions, setRedemptions] = useState<PackageRedemption[]>([]);
  const [allAccessUsages, setAllAccessUsages] = useState<AllAccessDailyUsage[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"packages" | "sessions">(
    "packages"
  );
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState<{
    amount: number;
    finalPrice: number;
  } | null>(null);
  const [packagePaymentType, setPackagePaymentType] = useState<
    "CREDIT_CARD" | "BANK_TRANSFER"
  >("CREDIT_CARD");
  const [purchasing, setPurchasing] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "CREDITS" | "ALL_ACCESS" | "FRIEND_PASS"
  >("CREDITS");
  const [booking, setBooking] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  const themeColors = {
    light: {
      cardBg: "white",
      theadBg: "#f5f5f5",
      rowEven: "white",
      rowOdd: "#fafafa",
      border: "#e0e0e0",
      text: "#333",
      textSecondary: "#666",
      textMuted: "#999",
      inputBg: "white",
      inputBorder: "#ccc",
      primary: "#1976d2",
      success: "#28a745",
      error: "#dc3545",
      warning: "#ffc107",
    },
    dark: {
      cardBg: "#1e1e1e",
      theadBg: "#2a2a2a",
      rowEven: "#1e1e1e",
      rowOdd: "#252525",
      border: "#333",
      text: "#e0e0e0",
      textSecondary: "#b0b0b0",
      textMuted: "#888",
      inputBg: "#2a2a2a",
      inputBorder: "#444",
      primary: "#1976d2",
      success: "#28a745",
      error: "#dc3545",
      warning: "#ffc107",
    },
  };

  const colors = themeColors[theme];

  useEffect(() => {
    const authToken = localStorage.getItem("supabase_auth_token");
    if (!authToken) {
      router.push("/login");
      return;
    }
    setToken(authToken);
    fetchData(authToken);
  }, [router]);

  const fetchData = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch member info first
      const memberResponse = await fetch("/api/members/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      let memberData: Member | null = null;
      if (memberResponse.ok) {
        memberData = await memberResponse.json();
        setMember(memberData);
      }

      // Fetch packages
      const packagesResponse = await fetch("/api/packages", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (packagesResponse.ok) {
        const packagesData = await packagesResponse.json();
        setPackages(
          Array.isArray(packagesData)
            ? packagesData.filter((p: Package) => p.isActive)
            : []
        );
      }

      // Fetch sessions
      const sessionsResponse = await fetch("/api/sessions", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setSessions(
          Array.isArray(sessionsData)
            ? sessionsData.filter(
                (s: Session) =>
                  s.status === "SCHEDULED" && new Date(s.startTime) > new Date()
              )
            : []
        );
      }

      // Fetch redemptions if member exists
      if (memberData) {
        const redemptionsResponse = await fetch(
          `/api/members/${memberData.id}/redemptions`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        if (redemptionsResponse.ok) {
          const redemptionsData = await redemptionsResponse.json();
          const redemptionsList = Array.isArray(redemptionsData)
            ? redemptionsData
            : [];
          setRedemptions(redemptionsList);

          // Fetch All Access daily usage for active All Access redemptions
          const allAccessRedemptions = redemptionsList.filter(
            (r: PackageRedemption) =>
              r.status === "ACTIVE" &&
              r.allAccessExpiresAt &&
              new Date(r.allAccessExpiresAt) > new Date()
          );

          if (allAccessRedemptions.length > 0) {
            const usagePromises = allAccessRedemptions.map(
              (r: PackageRedemption) =>
                fetch(`/api/redemptions/${r.id}/all-access-usage`, {
                  headers: { Authorization: `Bearer ${authToken}` },
                }).then((res) => (res.ok ? res.json() : []))
            );

            const usageResults = await Promise.all(usagePromises);
            const allUsages = usageResults.flat();
            setAllAccessUsages(Array.isArray(allUsages) ? allUsages : []);
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const validateCoupon = async (code: string, packageId: string) => {
    if (!code.trim()) {
      setCouponDiscount(null);
      return;
    }

    setValidatingCoupon(true);
    try {
      const response = await fetch(`/api/coupons/code/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setCouponDiscount(null);
        showToast("Invalid coupon code", "error");
        return;
      }

      const coupon = await response.json();

      // Check if coupon applies to this package
      if (
        coupon.couponType === "DISCOUNT" &&
        coupon.applicablePackageIds &&
        !coupon.applicablePackageIds.includes(packageId)
      ) {
        setCouponDiscount(null);
        showToast("Coupon does not apply to this package", "error");
        return;
      }

      // Calculate discount
      const selectedPkg = packages.find((p) => p.id === packageId);
      if (!selectedPkg) return;

      let discountAmount = 0;
      if (coupon.couponType === "DISCOUNT") {
        if (coupon.discountType === "PERCENTAGE") {
          discountAmount = (selectedPkg.price * coupon.discountValue) / 100;
        } else if (coupon.discountType === "FIXED_AMOUNT") {
          discountAmount = coupon.discountValue;
        }
      } else if (coupon.couponType === "PACKAGE" && coupon.customPrice) {
        discountAmount = selectedPkg.price - coupon.customPrice;
      }

      const finalPrice = Math.max(0, selectedPkg.price - discountAmount);
      setCouponDiscount({ amount: discountAmount, finalPrice });
      showToast("Coupon applied successfully", "success");
    } catch (err) {
      setCouponDiscount(null);
      showToast("Failed to validate coupon", "error");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePurchasePackage = async () => {
    if (!token || !selectedPackage || !member) return;

    setPurchasing(true);
    try {
      const response = await fetch("/api/packages/redeem", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: member.id,
          packageId: selectedPackage.id,
          couponCode: couponCode.trim() || undefined,
          paymentType: packagePaymentType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to purchase package");
      }

      showToast("Package purchased successfully!", "success");
      setShowPackageModal(false);
      setSelectedPackage(null);
      setCouponCode("");
      setCouponDiscount(null);
      await fetchData(token);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to purchase package",
        "error"
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleBookSession = async () => {
    if (!token || !selectedSession || !member) return;

    setBooking(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          memberId: member.id,
          paymentType: paymentMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create booking");
      }

      showToast("Booking created successfully!", "success");
      setShowBookingModal(false);
      setSelectedSession(null);
      await fetchData(token);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to create booking",
        "error"
      );
    } finally {
      setBooking(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(
      language === "tr" ? "tr-TR" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const getAvailablePaymentMethods = (session: Session) => {
    const methods: Array<"CREDITS" | "ALL_ACCESS" | "FRIEND_PASS"> = [];

    if (!member) return methods;

    // Check credits
    const sessionCredits = 1; // Default, should come from session/seat
    if (member.creditBalance >= sessionCredits) {
      methods.push("CREDITS");
    }

    // Check All Access
    if (member.hasAllAccess && member.allAccessExpiresAt) {
      const activeRedemption = redemptions.find(
        (r) =>
          r.status === "ACTIVE" &&
          r.allAccessExpiresAt &&
          new Date(r.allAccessExpiresAt) > new Date()
      );
      if (activeRedemption) {
        const canUse = canUseAllAccessToday(activeRedemption, allAccessUsages);
        if (canUse) {
          methods.push("ALL_ACCESS");
        }
      }
    }

    // Check friend pass
    const friendPassRedemption = redemptions.find(
      (r) => isFriendPassValid(r) && !r.friendPassUsed
    );
    if (friendPassRedemption) {
      methods.push("FRIEND_PASS");
    }

    return methods;
  };

  if (!token) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: colors.text }}>
        <Spinner text={t("loading")} />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: colors.text }}>
        <Spinner text={t("loading")} />
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        color: colors.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: "2rem",
          padding: "1.5rem",
          backgroundColor: colors.cardBg,
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
          boxShadow:
            theme === "light"
              ? "0 2px 4px rgba(0,0,0,0.1)"
              : "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        <h1 style={{ margin: 0, marginBottom: "1rem", fontSize: "2rem" }}>
          {t("spinningApp") || "Spinning Studio"}
        </h1>

        {/* Member Info */}
        {member && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            <div
              style={{
                padding: "1rem",
                backgroundColor: colors.theadBg,
                borderRadius: "4px",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: colors.textMuted }}>
                {t("credits") || "Credits"}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                {member.creditBalance}
              </div>
            </div>

            {member.hasAllAccess && member.allAccessExpiresAt && (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: colors.theadBg,
                  borderRadius: "4px",
                }}
              >
                <div style={{ fontSize: "0.875rem", color: colors.textMuted }}>
                  {t("allAccess") || "All Access"}
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                  {new Date(member.allAccessExpiresAt) > new Date()
                    ? t("active") || "Active"
                    : t("expired") || "Expired"}
                </div>
                <div style={{ fontSize: "0.75rem", color: colors.textMuted }}>
                  {formatDate(member.allAccessExpiresAt)}
                </div>
              </div>
            )}

            {member.isEliteMember && (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: colors.warning + "20",
                  borderRadius: "4px",
                }}
              >
                <div style={{ fontSize: "0.875rem", color: colors.textMuted }}>
                  {t("eliteMember") || "Elite Member"}
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>⭐</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          borderBottom: `2px solid ${colors.border}`,
        }}
      >
        <button
          onClick={() => setActiveTab("packages")}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "transparent",
            border: "none",
            borderBottom:
              activeTab === "packages" ? `3px solid ${colors.primary}` : "none",
            color: activeTab === "packages" ? colors.primary : colors.text,
            cursor: "pointer",
            fontWeight: activeTab === "packages" ? "bold" : "normal",
            fontSize: "1rem",
          }}
        >
          {t("packages") || "Packages"}
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "transparent",
            border: "none",
            borderBottom:
              activeTab === "sessions" ? `3px solid ${colors.primary}` : "none",
            color: activeTab === "sessions" ? colors.primary : colors.text,
            cursor: "pointer",
            fontWeight: activeTab === "sessions" ? "bold" : "normal",
            fontSize: "1rem",
          }}
        >
          {t("sessions") || "Sessions"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: theme === "light" ? "#ffebee" : "#3d1f1f",
            color: theme === "light" ? "#c62828" : "#ef5350",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          <p style={{ margin: 0 }}>
            {t("error")}: {error}
          </p>
        </div>
      )}

      {/* Packages Tab */}
      {activeTab === "packages" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              style={{
                backgroundColor: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                padding: "1.5rem",
                boxShadow:
                  theme === "light"
                    ? "0 2px 4px rgba(0,0,0,0.1)"
                    : "0 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  color: colors.textMuted,
                  marginBottom: "0.5rem",
                }}
              >
                {pkg.code}
              </div>
              <h3
                style={{ margin: 0, marginBottom: "1rem", fontSize: "1.5rem" }}
              >
                {language === "tr" && pkg.nameTr ? pkg.nameTr : pkg.name}
              </h3>

              {pkg.description && (
                <p
                  style={{
                    color: colors.textSecondary,
                    marginBottom: "1rem",
                    fontSize: "0.875rem",
                  }}
                >
                  {language === "tr" && pkg.descriptionTr
                    ? pkg.descriptionTr
                    : pkg.description}
                </p>
              )}

              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                  {formatPrice(pkg.price)}
                </div>
                {pkg.discountPercentage && pkg.discountPercentage > 0 && (
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: colors.success,
                      marginTop: "0.25rem",
                    }}
                  >
                    {t("save") || "Save"} {formatPrice(pkg.discountAmount || 0)}{" "}
                    ({pkg.discountPercentage.toFixed(1)}%)
                  </div>
                )}
              </div>

              {pkg.credits && (
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: colors.textMuted,
                    marginBottom: "1rem",
                  }}
                >
                  {pkg.credits} {t("credits") || "credits"} •{" "}
                  {formatPrice(pkg.pricePerCredit || 0)} /{" "}
                  {t("credit") || "credit"}
                </div>
              )}

              {pkg.benefits && pkg.benefits.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  {pkg.benefits.map((benefit, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "0.875rem",
                        color: colors.success,
                        marginBottom: "0.25rem",
                      }}
                    >
                      ✓ {benefit.replace("_", " ")}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedPackage(pkg);
                  setShowPackageModal(true);
                  setCouponCode("");
                  setCouponDiscount(null);
                  setPackagePaymentType("CREDIT_CARD");
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                {t("purchase") || "Purchase"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <div>
          {sessions.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: colors.textSecondary,
              }}
            >
              {t("noSessionsFound") || "No upcoming sessions found"}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "1rem",
              }}
            >
              {sessions.map((session) => {
                const availableMethods = getAvailablePaymentMethods(session);
                return (
                  <div
                    key={session.id}
                    style={{
                      backgroundColor: colors.cardBg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "8px",
                      padding: "1.5rem",
                      boxShadow:
                        theme === "light"
                          ? "0 2px 4px rgba(0,0,0,0.1)"
                          : "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "1rem",
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0, marginBottom: "0.5rem" }}>
                          {session.class?.name || "Class"}
                        </h3>
                        <div style={{ color: colors.textSecondary }}>
                          {formatDate(session.startTime)} -{" "}
                          {formatDate(session.endTime)}
                        </div>
                        {session.instructor && (
                          <div
                            style={{
                              color: colors.textMuted,
                              fontSize: "0.875rem",
                            }}
                          >
                            {t("instructor") || "Instructor"}:{" "}
                            {session.instructor.user.name ||
                              session.instructor.user.email}
                          </div>
                        )}
                        {session.location && (
                          <div
                            style={{
                              color: colors.textMuted,
                              fontSize: "0.875rem",
                            }}
                          >
                            {t("location") || "Location"}:{" "}
                            {session.location.name}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: colors.textMuted,
                          }}
                        >
                          {session.currentBookings} / {session.maxCapacity}{" "}
                          {t("booked") || "booked"}
                        </div>
                        {availableMethods.length === 0 && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: colors.error,
                              marginTop: "0.5rem",
                            }}
                          >
                            {t("insufficientCredits") || "Insufficient credits"}
                          </div>
                        )}
                      </div>
                    </div>

                    {availableMethods.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedSession(session);
                          setPaymentMethod(availableMethods[0]);
                          setShowBookingModal(true);
                        }}
                        disabled={
                          session.currentBookings >= session.maxCapacity
                        }
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          backgroundColor:
                            session.currentBookings >= session.maxCapacity
                              ? colors.textMuted
                              : colors.primary,
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor:
                            session.currentBookings >= session.maxCapacity
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "1rem",
                          fontWeight: "bold",
                        }}
                      >
                        {session.currentBookings >= session.maxCapacity
                          ? t("full") || "Full"
                          : t("bookNow") || "Book Now"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Package Purchase Modal */}
      {showPackageModal && selectedPackage && (
        <Modal
          isOpen={showPackageModal}
          onClose={() => {
            setShowPackageModal(false);
            setSelectedPackage(null);
            setCouponCode("");
            setCouponDiscount(null);
            setPackagePaymentType("CREDIT_CARD");
          }}
          title={t("purchasePackage") || "Purchase Package"}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <h3 style={{ margin: 0, marginBottom: "0.5rem" }}>
                {language === "tr" && selectedPackage.nameTr
                  ? selectedPackage.nameTr
                  : selectedPackage.name}
              </h3>
              <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                {couponDiscount
                  ? formatPrice(couponDiscount.finalPrice)
                  : formatPrice(selectedPackage.price)}
              </div>
              {couponDiscount && (
                <div style={{ fontSize: "0.875rem", color: colors.textMuted }}>
                  {t("originalPrice") || "Original"}:{" "}
                  {formatPrice(selectedPackage.price)} •{" "}
                  {t("discount") || "Discount"}:{" "}
                  {formatPrice(couponDiscount.amount)}
                </div>
              )}
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {t("paymentMethod") || "Payment Method"}
              </label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="packagePaymentType"
                    value="CREDIT_CARD"
                    checked={packagePaymentType === "CREDIT_CARD"}
                    onChange={(e) =>
                      setPackagePaymentType(
                        e.target.value as "CREDIT_CARD" | "BANK_TRANSFER"
                      )
                    }
                  />
                  <span>{t("creditCard") || "Credit Card"}</span>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="packagePaymentType"
                    value="BANK_TRANSFER"
                    checked={packagePaymentType === "BANK_TRANSFER"}
                    onChange={(e) =>
                      setPackagePaymentType(
                        e.target.value as "CREDIT_CARD" | "BANK_TRANSFER"
                      )
                    }
                  />
                  <span>{t("bankTransfer") || "Bank Transfer"}</span>
                </label>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {t("couponCode") || "Coupon Code"} (
                {t("optional") || "Optional"})
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    if (e.target.value.trim()) {
                      validateCoupon(e.target.value, selectedPackage.id);
                    } else {
                      setCouponDiscount(null);
                    }
                  }}
                  placeholder="SUMMER2024"
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "4px",
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  }}
                />
                {validatingCoupon && (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Spinner size={20} />
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
                marginTop: "1rem",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowPackageModal(false);
                  setSelectedPackage(null);
                  setCouponCode("");
                  setCouponDiscount(null);
                  setPackagePaymentType("CREDIT_CARD");
                }}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: colors.border,
                  color: colors.text,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={handlePurchasePackage}
                disabled={purchasing}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: purchasing ? "not-allowed" : "pointer",
                  opacity: purchasing ? 0.6 : 1,
                }}
              >
                {purchasing
                  ? t("processing") || "Processing..."
                  : t("purchase") || "Purchase"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedSession && member && (
        <Modal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedSession(null);
          }}
          title={t("bookSession") || "Book Session"}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <h3 style={{ margin: 0, marginBottom: "0.5rem" }}>
                {selectedSession.class?.name || "Class"}
              </h3>
              <div style={{ color: colors.textSecondary }}>
                {formatDate(selectedSession.startTime)}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {t("paymentMethod") || "Payment Method"}
              </label>
              {getAvailablePaymentMethods(selectedSession).map((method) => (
                <label
                  key={method}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    marginBottom: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as
                          | "CREDITS"
                          | "ALL_ACCESS"
                          | "FRIEND_PASS"
                      )
                    }
                  />
                  <span>
                    {method === "CREDITS"
                      ? `${t("credits") || "Credits"} (${
                          member.creditBalance
                        } ${t("available") || "available"})`
                      : method === "ALL_ACCESS"
                      ? t("allAccess") || "All Access"
                      : t("friendPass") || "Friend Pass"}
                  </span>
                </label>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
                marginTop: "1rem",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedSession(null);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: colors.border,
                  color: colors.text,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={handleBookSession}
                disabled={booking}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: booking ? "not-allowed" : "pointer",
                  opacity: booking ? 0.6 : 1,
                }}
              >
                {booking
                  ? t("processing") || "Processing..."
                  : t("confirm") || "Confirm"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
