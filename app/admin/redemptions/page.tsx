"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";
import { showToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";

interface PendingRedemption {
  id: string;
  order_id: string;
  member_id: string;
  package_id: string;
  payment_type: string;
  amount: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  coupon_code?: string;
  customer_email: string;
  customer_name: string;
  created_at: string;
  confirmed_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  redemption_id?: string;
}

interface Redemption {
  id: string;
  memberId: string;
  packageId: string;
  couponId?: string;
  redemptionType: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  creditsAdded?: number;
  status: string;
  redeemedAt: string;
  package?: {
    name: string;
    code: string;
  };
  member?: {
    user?: {
      email: string;
      name?: string;
    };
  };
}

export default function RedemptionsPage() {
  const [pendingRedemptions, setPendingRedemptions] = useState<
    PendingRedemption[]
  >([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    redemption: PendingRedemption | Redemption | null;
    receiptFile: File | null;
  }>({ isOpen: false, redemption: null, receiptFile: null });
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    redemption: PendingRedemption | Redemption | null;
    reason: string;
  }>({ isOpen: false, redemption: null, reason: "" });
  const [processing, setProcessing] = useState(false);
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
      error: "#dc3545",
      success: "#28a745",
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
      error: "#dc3545",
      success: "#28a745",
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
      // Try to fetch bank transfer pending redemptions from Supabase (optional)
      try {
        const pendingResponse = await fetch("/api/pending-redemptions", {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json();
          console.log("Bank transfer pending redemptions:", pendingData);
          setPendingRedemptions(Array.isArray(pendingData) ? pendingData : []);
        }
      } catch (pendingErr) {
        // Supabase table might not exist, that's okay - we'll use main backend data
        console.log(
          "Bank transfer pending redemptions not available:",
          pendingErr
        );
        setPendingRedemptions([]);
      }

      // Fetch all redemptions from main backend
      const redemptionsResponse = await fetch("/api/redemptions", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (redemptionsResponse.ok) {
        const redemptionsData = await redemptionsResponse.json();
        console.log("All redemptions data:", redemptionsData);
        setRedemptions(Array.isArray(redemptionsData) ? redemptionsData : []);
      } else {
        const errorText = await redemptionsResponse.text();
        console.error(
          "Error fetching redemptions:",
          redemptionsResponse.status,
          errorText
        );
      }
    } catch (err: unknown) {
      console.error("Error in fetchData:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!token || !confirmModal.redemption) return;

    setProcessing(true);
    try {
      // Check if this is a bank transfer redemption (has order_id) or main backend redemption
      const isBankTransfer = !!(confirmModal.redemption as any).order_id;

      let response;
      if (isBankTransfer) {
        // Bank transfer redemption - use pending-redemptions endpoint
        const formData = new FormData();
        if (confirmModal.receiptFile) {
          formData.append("receipt", confirmModal.receiptFile);
        }

        response = await fetch(
          `/api/pending-redemptions/${confirmModal.redemption.id}/confirm`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );
      } else {
        // Main backend redemption - approve via PATCH
        const formData = new FormData();
        if (confirmModal.receiptFile) {
          formData.append("receipt", confirmModal.receiptFile);
        }

        response = await fetch(
          `/api/redemptions/${confirmModal.redemption.id}/approve`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );
      }

      const data = await response.json();

      if (response.ok) {
        showToast(
          t("redemptionsConfirmSuccess") || "Package activated successfully",
          "success"
        );
        setConfirmModal({ isOpen: false, redemption: null, receiptFile: null });
        fetchData(token);
      } else {
        showToast(
          data.error ||
            t("redemptionsConfirmError") ||
            "Failed to confirm redemption",
          "error"
        );
      }
    } catch (err: unknown) {
      showToast(
        t("redemptionsConfirmError") || "Failed to confirm redemption",
        "error"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!token || !rejectModal.redemption) return;

    setProcessing(true);
    try {
      // Check if this is a bank transfer redemption (has order_id)
      const isBankTransfer = !!(rejectModal.redemption as any).order_id;

      if (!isBankTransfer) {
        showToast(
          t("redemptionsRejectError") ||
            "Can only reject pending bank transfer redemptions",
          "error"
        );
        setProcessing(false);
        return;
      }

      const response = await fetch(
        `/api/pending-redemptions/${rejectModal.redemption.id}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: rejectModal.reason || "Rejected by admin",
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        showToast(
          t("redemptionsRejectSuccess") || "Redemption rejected successfully",
          "success"
        );
        setRejectModal({ isOpen: false, redemption: null, reason: "" });
        fetchData(token);
      } else {
        showToast(
          data.error ||
            t("redemptionsRejectError") ||
            "Failed to reject redemption",
          "error"
        );
      }
    } catch (err: unknown) {
      showToast(
        t("redemptionsRejectError") || "Failed to reject redemption",
        "error"
      );
    } finally {
      setProcessing(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return colors.warning;
      case "CONFIRMED":
        return colors.success;
      case "REJECTED":
        return colors.error;
      case "ACTIVE":
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Spinner />
      </div>
    );
  }

  // Calculate deduplicated pending count
  const deduplicatedPendingCount = useMemo(() => {
    const pendingFromBackend = redemptions.filter(
      (r) => r.status === "PENDING"
    );

    const pendingBankTransfer = pendingRedemptions.filter(
      (r) => r.status === "PENDING"
    );

    // Deduplicate by ID - same pending redemptions might exist in both sources
    const seenIds = new Set<string>();

    // First, count items from main backend
    for (const item of pendingFromBackend) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
      }
    }

    // Then, count items from Supabase that aren't already included
    for (const item of pendingBankTransfer) {
      const itemId = item.id || (item as any).order_id;
      const redemptionId =
        (item as any).redemption_id || (item as any).redemptionId;

      if (
        itemId &&
        !seenIds.has(itemId) &&
        (!redemptionId || !seenIds.has(redemptionId))
      ) {
        seenIds.add(itemId);
        if (redemptionId) {
          seenIds.add(redemptionId);
        }
      }
    }

    return seenIds.size;
  }, [redemptions, pendingRedemptions]);

  // Debug info
  console.log("Component state:", {
    pendingRedemptions: pendingRedemptions.length,
    redemptions: redemptions.length,
    deduplicatedPendingCount,
    activeTab,
    loading,
    error,
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>
          {t("redemptionsTitle") || "Package Purchases"}
        </h2>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: colors.error + "20",
            color: colors.error,
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <button
          onClick={() => setActiveTab("pending")}
          style={{
            padding: "0.75rem 1.5rem",
            border: "none",
            borderBottom:
              activeTab === "pending"
                ? `2px solid ${colors.success}`
                : "2px solid transparent",
            backgroundColor: "transparent",
            color:
              activeTab === "pending" ? colors.success : colors.textSecondary,
            cursor: "pointer",
            fontWeight: activeTab === "pending" ? "bold" : "normal",
          }}
        >
          {t("redemptionsPending") || "Pending"} ({deduplicatedPendingCount})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          style={{
            padding: "0.75rem 1.5rem",
            border: "none",
            borderBottom:
              activeTab === "all"
                ? `2px solid ${colors.success}`
                : "2px solid transparent",
            backgroundColor: "transparent",
            color: activeTab === "all" ? colors.success : colors.textSecondary,
            cursor: "pointer",
            fontWeight: activeTab === "all" ? "bold" : "normal",
          }}
        >
          {t("redemptionsAll") || "All Redemptions"} ({redemptions.length})
        </button>
      </div>

      {/* Pending Redemptions Tab */}
      {activeTab === "pending" && (
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: "8px",
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
          }}
        >
          {(() => {
            // Get PENDING redemptions from main backend
            const pendingFromBackend = redemptions.filter(
              (r) => r.status === "PENDING"
            );

            // Get bank transfer pending redemptions from Supabase
            const pendingBankTransfer = pendingRedemptions.filter(
              (r) => r.status === "PENDING"
            );

            // Deduplicate by ID - same pending redemptions might exist in both sources
            const seenIds = new Set<string>();
            const allPendingItems: (PendingRedemption | Redemption)[] = [];

            // First, add items from main backend
            for (const item of pendingFromBackend) {
              if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                allPendingItems.push(item);
              }
            }

            // Then, add items from Supabase that aren't already included
            for (const item of pendingBankTransfer) {
              // Check both id and order_id fields for bank transfer items
              const itemId = item.id || (item as any).order_id;
              // Also check if this corresponds to a redemption ID from main backend
              const redemptionId =
                (item as any).redemption_id || (item as any).redemptionId;

              // Skip if we've already seen this ID or if it matches a redemption ID from backend
              if (
                itemId &&
                !seenIds.has(itemId) &&
                (!redemptionId || !seenIds.has(redemptionId))
              ) {
                seenIds.add(itemId);
                if (redemptionId) {
                  seenIds.add(redemptionId);
                }
                allPendingItems.push(item);
              }
            }

            console.log("Pending items to display:", allPendingItems.length);
            console.log("Pending from backend:", pendingFromBackend.length);
            console.log("Pending bank transfer:", pendingBankTransfer.length);
            console.log("Deduplicated count:", allPendingItems.length);

            if (allPendingItems.length === 0) {
              return (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <p style={{ color: colors.textSecondary }}>
                    {t("redemptionsNoPending") || "No pending redemptions"}
                  </p>
                </div>
              );
            }

            return (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: colors.theadBg }}>
                  <tr>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsOrderId") || "Order ID"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsCustomer") || "Customer"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsPackage") || "Package"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsAmount") || "Amount"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsDate") || "Date"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsActions") || "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allPendingItems.map((redemption, index) => {
                    // Check if this is a bank transfer redemption (has order_id) or main backend redemption
                    const isBankTransfer = !!(redemption as any).order_id;

                    return (
                      <tr
                        key={redemption.id}
                        style={{
                          backgroundColor:
                            index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                        }}
                      >
                        <td
                          style={{
                            padding: "1rem",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <code style={{ fontSize: "0.9rem" }}>
                            {isBankTransfer
                              ? (redemption as any).order_id
                              : redemption.id.substring(0, 8) + "..."}
                          </code>
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: "500" }}>
                              {isBankTransfer
                                ? (redemption as PendingRedemption)
                                    .customer_name
                                : (redemption as Redemption).member?.user
                                    ?.name ||
                                  (redemption as Redemption).member?.user
                                    ?.email ||
                                  (redemption as Redemption).memberId}
                            </div>
                            <div
                              style={{
                                fontSize: "0.875rem",
                                color: colors.textSecondary,
                              }}
                            >
                              {isBankTransfer
                                ? (redemption as PendingRedemption)
                                    .customer_email
                                : (redemption as Redemption).member?.user
                                    ?.email || ""}
                            </div>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <div style={{ fontWeight: "500" }}>
                            {isBankTransfer
                              ? (redemption as PendingRedemption).package_id
                              : (redemption as Redemption).package?.name ||
                                (redemption as Redemption).packageId}
                          </div>
                          {!isBankTransfer &&
                            (redemption as Redemption).package?.code && (
                              <div
                                style={{
                                  fontSize: "0.875rem",
                                  color: colors.textSecondary,
                                }}
                              >
                                {(redemption as Redemption).package?.code}
                              </div>
                            )}
                          {(isBankTransfer
                            ? (redemption as PendingRedemption).coupon_code
                            : (redemption as Redemption).couponId) && (
                            <div
                              style={{
                                fontSize: "0.875rem",
                                color: colors.textSecondary,
                                marginTop: "0.25rem",
                              }}
                            >
                              {t("redemptionsCoupon") || "Coupon"}:{" "}
                              {isBankTransfer
                                ? (redemption as PendingRedemption).coupon_code
                                : (redemption as Redemption).couponId}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <strong>
                            {formatPrice(
                              isBankTransfer
                                ? (redemption as PendingRedemption).amount
                                : (redemption as Redemption).finalPrice
                            )}
                          </strong>
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          {formatDate(
                            isBankTransfer
                              ? (redemption as PendingRedemption).created_at
                              : (redemption as Redemption).redeemedAt
                          )}
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            {isBankTransfer ? (
                              <>
                                <button
                                  onClick={() =>
                                    setConfirmModal({
                                      isOpen: true,
                                      redemption,
                                      receiptFile: null,
                                    })
                                  }
                                  disabled={processing}
                                  style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: colors.success,
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: processing
                                      ? "not-allowed"
                                      : "pointer",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {t("redemptionsConfirm") || "Confirm"}
                                </button>
                                <button
                                  onClick={() =>
                                    setRejectModal({
                                      isOpen: true,
                                      redemption,
                                      reason: "",
                                    })
                                  }
                                  disabled={processing}
                                  style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: colors.error,
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: processing
                                      ? "not-allowed"
                                      : "pointer",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {t("redemptionsReject") || "Reject"}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    redemption,
                                    receiptFile: null,
                                  })
                                }
                                disabled={processing}
                                style={{
                                  padding: "0.5rem 1rem",
                                  backgroundColor: colors.success,
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: processing
                                    ? "not-allowed"
                                    : "pointer",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {t("redemptionsConfirm") || "Approve"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {/* All Redemptions Tab */}
      {activeTab === "all" && (
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: "8px",
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
          }}
        >
          {(() => {
            console.log("All redemptions to display:", redemptions);
            if (redemptions.length === 0) {
              return (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <p style={{ color: colors.textSecondary }}>
                    {t("redemptionsNoRedemptions") || "No redemptions found"}
                  </p>
                </div>
              );
            }
            return (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: colors.theadBg }}>
                  <tr>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsId") || "ID"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsMember") || "Member"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsPackage") || "Package"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsPrice") || "Price"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsCredits") || "Credits"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsStatus") || "Status"}
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: "bold",
                      }}
                    >
                      {t("redemptionsDate") || "Date"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((redemption, index) => (
                    <tr
                      key={redemption.id}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                      }}
                    >
                      <td
                        style={{
                          padding: "1rem",
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        <code style={{ fontSize: "0.9rem" }}>
                          {redemption.id.substring(0, 8)}...
                        </code>
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        {redemption.member?.user?.email || redemption.memberId}
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        {redemption.package?.name || redemption.packageId}
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        <div>
                          <strong>{formatPrice(redemption.finalPrice)}</strong>
                          {redemption.discountAmount > 0 && (
                            <div
                              style={{
                                fontSize: "0.875rem",
                                color: colors.textSecondary,
                              }}
                            >
                              {t("redemptionsOriginal") || "Original"}:{" "}
                              {formatPrice(redemption.originalPrice)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        {redemption.creditsAdded || "-"}
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.875rem",
                            backgroundColor:
                              getStatusColor(redemption.status) + "30",
                            color: getStatusColor(redemption.status),
                          }}
                        >
                          {redemption.status}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        {formatDate(redemption.redeemedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({
            isOpen: false,
            redemption: null,
            receiptFile: null,
          })
        }
        title={t("redemptionsConfirmTitle") || "Confirm Package Activation"}
      >
        {confirmModal.redemption && (
          <div>
            <p style={{ marginBottom: "1rem", color: colors.text }}>
              {t("redemptionsConfirmMessage") ||
                "Are you sure you want to confirm this package purchase and activate it for the customer?"}
            </p>
            {(() => {
              const isBankTransfer = !!(confirmModal.redemption as any)
                .order_id;
              return (
                <>
                  {isBankTransfer ? (
                    <>
                      <div style={{ marginBottom: "1rem" }}>
                        <strong>
                          {t("redemptionsOrderId") || "Order ID"}:
                        </strong>{" "}
                        {(confirmModal.redemption as any).order_id}
                      </div>
                      <div style={{ marginBottom: "1rem" }}>
                        <strong>
                          {t("redemptionsCustomer") || "Customer"}:
                        </strong>{" "}
                        {(confirmModal.redemption as any).customer_name} (
                        {(confirmModal.redemption as any).customer_email})
                      </div>
                      <div style={{ marginBottom: "1rem" }}>
                        <strong>{t("redemptionsAmount") || "Amount"}:</strong>{" "}
                        {formatPrice((confirmModal.redemption as any).amount)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: "1rem" }}>
                        <strong>{t("redemptionsId") || "ID"}:</strong>{" "}
                        {confirmModal.redemption.id.substring(0, 8)}...
                      </div>
                      <div style={{ marginBottom: "1rem" }}>
                        <strong>{t("redemptionsMember") || "Member"}:</strong>{" "}
                        {(confirmModal.redemption as any).member?.user?.email ||
                          (confirmModal.redemption as any).memberId}
                      </div>
                      <div style={{ marginBottom: "1rem" }}>
                        <strong>{t("redemptionsPackage") || "Package"}:</strong>{" "}
                        {(confirmModal.redemption as any).package?.name ||
                          (confirmModal.redemption as any).packageId}
                      </div>
                      <div style={{ marginBottom: "1rem" }}>
                        <strong>{t("redemptionsAmount") || "Amount"}:</strong>{" "}
                        {formatPrice(
                          (confirmModal.redemption as any).finalPrice ||
                            (confirmModal.redemption as any).amount
                        )}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            {/* Receipt Upload Section */}
            <div style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: colors.text,
                }}
              >
                {t("redemptionsReceiptUpload") || "Receipt Upload"} (
                {t("optional") || "optional"}):
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setConfirmModal({
                    ...confirmModal,
                    receiptFile: file,
                  });
                }}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                }}
              />
              {confirmModal.receiptFile && (
                <p
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.875rem",
                    color: colors.textSecondary,
                  }}
                >
                  {t("redemptionsReceiptSelected") || "Selected"}:{" "}
                  {confirmModal.receiptFile.name}
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: false,
                    redemption: null,
                    receiptFile: null,
                  })
                }
                disabled={processing}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: colors.textSecondary,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: processing ? "not-allowed" : "pointer",
                }}
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: colors.success,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: processing ? "not-allowed" : "pointer",
                }}
              >
                {processing
                  ? t("processing") || "Processing..."
                  : t("redemptionsConfirm") || "Confirm"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() =>
          setRejectModal({ isOpen: false, redemption: null, reason: "" })
        }
        title={t("redemptionsRejectTitle") || "Reject Package Purchase"}
      >
        {rejectModal.redemption && (
          <div>
            <p style={{ marginBottom: "1rem", color: colors.text }}>
              {t("redemptionsRejectMessage") ||
                "Are you sure you want to reject this package purchase?"}
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                }}
              >
                {t("redemptionsReason") || "Reason"}:
              </label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) =>
                  setRejectModal({
                    ...rejectModal,
                    reason: e.target.value,
                  })
                }
                placeholder={
                  t("redemptionsReasonPlaceholder") ||
                  "Enter rejection reason..."
                }
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "0.5rem",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "4px",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() =>
                  setRejectModal({
                    isOpen: false,
                    redemption: null,
                    reason: "",
                  })
                }
                disabled={processing}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: colors.textSecondary,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: processing ? "not-allowed" : "pointer",
                }}
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: colors.error,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: processing ? "not-allowed" : "pointer",
                }}
              >
                {processing
                  ? t("processing") || "Processing..."
                  : t("redemptionsReject") || "Reject"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
