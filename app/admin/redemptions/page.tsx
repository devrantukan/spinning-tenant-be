"use client";

import { useState, useEffect } from "react";
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
    redemption: PendingRedemption | null;
  }>({ isOpen: false, redemption: null });
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    redemption: PendingRedemption | null;
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
      // Fetch pending redemptions
      const pendingResponse = await fetch("/api/pending-redemptions", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        console.log("Pending redemptions data:", pendingData);
        setPendingRedemptions(Array.isArray(pendingData) ? pendingData : []);
      } else {
        const errorText = await pendingResponse.text();
        console.error(
          "Error fetching pending redemptions:",
          pendingResponse.status,
          errorText
        );
      }

      // Fetch all redemptions
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
      const response = await fetch(
        `/api/pending-redemptions/${confirmModal.redemption.id}/confirm`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        showToast(
          t("redemptionsConfirmSuccess") || "Package activated successfully",
          "success"
        );
        setConfirmModal({ isOpen: false, redemption: null });
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

  // Debug info
  console.log("Component state:", {
    pendingRedemptions: pendingRedemptions.length,
    redemptions: redemptions.length,
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
          {t("redemptionsPending") || "Pending"} (
          {
            pendingRedemptions.filter(
              (r) => r.status === "PENDING" || r.status === "pending"
            ).length
          }
          )
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
            const pendingItems = pendingRedemptions.filter(
              (r) => r.status === "PENDING" || r.status === "pending"
            );
            console.log("Pending items to display:", pendingItems);
            console.log("All pending redemptions:", pendingRedemptions);

            if (pendingItems.length === 0) {
              return (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <p style={{ color: colors.textSecondary }}>
                    {t("redemptionsNoPending") || "No pending redemptions"}
                  </p>
                  {pendingRedemptions.length > 0 && (
                    <p
                      style={{
                        color: colors.textMuted,
                        fontSize: "0.875rem",
                        marginTop: "0.5rem",
                      }}
                    >
                      Found {pendingRedemptions.length} redemption(s) but none
                      with PENDING status. Statuses:{" "}
                      {[
                        ...new Set(
                          pendingRedemptions.map((r: any) => r.status)
                        ),
                      ].join(", ")}
                    </p>
                  )}
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
                  {pendingRedemptions
                    .filter(
                      (r) => r.status === "PENDING" || r.status === "pending"
                    )
                    .map((redemption, index) => (
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
                            {redemption.order_id}
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
                              {redemption.customer_name}
                            </div>
                            <div
                              style={{
                                fontSize: "0.875rem",
                                color: colors.textSecondary,
                              }}
                            >
                              {redemption.customer_email}
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
                            {(redemption as any).package_name ||
                              redemption.package_id}
                          </div>
                          {(redemption as any).package_code && (
                            <div
                              style={{
                                fontSize: "0.875rem",
                                color: colors.textSecondary,
                              }}
                            >
                              {(redemption as any).package_code}
                            </div>
                          )}
                          {redemption.coupon_code && (
                            <div
                              style={{
                                fontSize: "0.875rem",
                                color: colors.textSecondary,
                                marginTop: "0.25rem",
                              }}
                            >
                              {t("redemptionsCoupon") || "Coupon"}:{" "}
                              {redemption.coupon_code}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <strong>{formatPrice(redemption.amount)}</strong>
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          {formatDate(redemption.created_at)}
                        </td>
                        <td
                          style={{
                            padding: "1rem",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  redemption,
                                })
                              }
                              disabled={processing}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: colors.success,
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: processing ? "not-allowed" : "pointer",
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
                                cursor: processing ? "not-allowed" : "pointer",
                                fontSize: "0.875rem",
                              }}
                            >
                              {t("redemptionsReject") || "Reject"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
        onClose={() => setConfirmModal({ isOpen: false, redemption: null })}
        title={t("redemptionsConfirmTitle") || "Confirm Package Activation"}
      >
        {confirmModal.redemption && (
          <div>
            <p style={{ marginBottom: "1rem", color: colors.text }}>
              {t("redemptionsConfirmMessage") ||
                "Are you sure you want to confirm this package purchase and activate it for the customer?"}
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <strong>{t("redemptionsOrderId") || "Order ID"}:</strong>{" "}
              {confirmModal.redemption.order_id}
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <strong>{t("redemptionsCustomer") || "Customer"}:</strong>{" "}
              {confirmModal.redemption.customer_name} (
              {confirmModal.redemption.customer_email})
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <strong>{t("redemptionsAmount") || "Amount"}:</strong>{" "}
              {formatPrice(confirmModal.redemption.amount)}
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
                  setConfirmModal({ isOpen: false, redemption: null })
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
