"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";

interface Booking {
  id: string;
  sessionId: string;
  memberId: string;
  status: string;
  createdAt: string;
  paymentType?: string;
  creditsUsed?: number;
  creditCost?: number;
  seatId?: string;
  seat?: {
    id: string;
    name: string;
    row: string;
    column: number;
  };
  packageRedemptionId?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  session?: {
    id: string;
    startTime: string;
    endTime: string;
    class?: {
      id: string;
      name: string;
      nameTr?: string;
    };
    location?: {
      id: string;
      name: string;
    };
    instructor?: {
      user: {
        name?: string;
        email: string;
      };
    };
  };
  member?: {
    id: string;
    user: {
      id: string;
      name?: string;
      email: string;
    };
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  // Theme colors
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
      background: "#f5f5f5",
      primary: "#1976d2",
      errorBg: "#ffebee",
      error: "#c62828",
      shadow: "0 2px 4px rgba(0,0,0,0.1)",
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
      background: "#121212",
      primary: "#1976d2",
      errorBg: "#3d1f1f",
      error: "#ef5350",
      shadow: "0 2px 4px rgba(0,0,0,0.3)",
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
    fetchBookings(authToken);
  }, [router]);

  const fetchBookings = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("supabase_auth_token");
          localStorage.removeItem("supabase_session");
          router.push("/login");
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const refreshBookings = () => {
    if (token) {
      fetchBookings(token);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "CONFIRMED":
        return { bg: "#e8f5e9", color: "#388e3c" };
      case "CANCELLED":
        return { bg: "#ffebee", color: "#d32f2f" };
      case "PENDING":
        return { bg: "#fff3e0", color: "#f57c00" };
      case "COMPLETED":
        return { bg: "#e3f2fd", color: "#1976d2" };
      case "NO_SHOW":
        return { bg: "#f3e5f5", color: "#7b1fa2" };
      default:
        return { bg: "#f5f5f5", color: "#666" };
    }
  };

  const canCancelBooking = (
    booking: Booking
  ): { canCancel: boolean; reason?: string; willRefund: boolean } => {
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return {
        canCancel: false,
        reason:
          language === "tr"
            ? "Bu rezervasyon zaten iptal edilmiş veya tamamlanmış"
            : "This booking is already cancelled or completed",
        willRefund: false,
      };
    }

    if (!booking.session?.startTime) {
      return {
        canCancel: false,
        reason:
          language === "tr"
            ? "Oturum bilgisi bulunamadı"
            : "Session information not found",
        willRefund: false,
      };
    }

    const sessionStartTime = new Date(booking.session.startTime);
    const now = new Date();
    const hoursUntilStart =
      (sessionStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Can cancel until 12 hours before session start
    if (hoursUntilStart < 12) {
      return {
        canCancel: false,
        reason:
          language === "tr"
            ? "Ders başlangıç saatinden 12 saat öncesine kadar iptal edilebilir"
            : "Cancellation is allowed only until 12 hours before session start",
        willRefund: false,
      };
    }

    // If cancelled less than 6 hours before, credit is not refunded
    const willRefund = hoursUntilStart >= 6;

    return { canCancel: true, willRefund };
  };

  const handleCancel = async (bookingId: string) => {
    if (!token) return;

    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const cancelInfo = canCancelBooking(booking);
    if (!cancelInfo.canCancel) {
      setError(
        cancelInfo.reason ||
          (language === "tr" ? "İptal edilemez" : "Cannot cancel")
      );
      return;
    }

    const refundMessage = cancelInfo.willRefund
      ? language === "tr"
        ? "Kredi iade edilecek."
        : "Credit will be refunded."
      : language === "tr"
      ? "Ders başlangıcına 6 saatten az kaldığı için kredi iade edilmeyecek."
      : "Credit will not be refunded as session starts in less than 6 hours.";

    const confirmMessage =
      language === "tr"
        ? `${
            booking.session?.class?.name || "Oturum"
          } rezervasyonunu iptal etmek istediğinizden emin misiniz? ${refundMessage}`
        : `Are you sure you want to cancel the booking for ${
            booking.session?.class?.name || "session"
          }? ${refundMessage}`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setCancellingId(bookingId);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "CANCELLED",
          cancelledAt: new Date().toISOString(),
          refundCredit: cancelInfo.willRefund,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchBookings(token);
    } catch (err: any) {
      setError(
        err.message ||
          (language === "tr"
            ? "Rezervasyon iptal edilemedi"
            : "Failed to cancel booking")
      );
    } finally {
      setCancellingId(null);
    }
  };

  if (!token) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Spinner text={t("loading")} />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: colors.background,
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <div
        style={{
          backgroundColor: colors.cardBg,
          borderRadius: "8px",
          padding: "1.5rem",
          boxShadow: colors.shadow,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: colors.text,
            }}
          >
            {t("bookings")}
          </h1>
          <button
            onClick={refreshBookings}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: colors.primary,
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            {loading ? (
              <>
                <Spinner size={16} color="#ffffff" />
                <span>{t("loading")}</span>
              </>
            ) : (
              t("refresh")
            )}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: colors.errorBg,
              color: colors.error,
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          >
            <p style={{ margin: 0 }}>
              {t("error")}: {error}
            </p>
          </div>
        )}

        {loading && (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <Spinner text={t("loading")} />
          </div>
        )}

        {!loading && !error && (
          <div style={{ overflowX: "auto" }}>
            {bookings.length > 0 ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.875rem",
                  color: colors.text,
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: colors.theadBg,
                      borderBottom: `2px solid ${colors.border}`,
                    }}
                  >
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {t("member") || "Member"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {t("class") || "Class"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {language === "tr" ? "Konum" : "Location"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {language === "tr" ? "Eğitmen" : "Instructor"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {t("startTime") || "Start Time"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {language === "tr" ? "Koltuk" : "Seat"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {language === "tr" ? "Ödeme Türü" : "Payment Type"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {language === "tr" ? "Kredi" : "Credits"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {t("status") || "Status"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {language === "tr" ? "İşlemler" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, index) => {
                    const statusColors = getStatusColor(booking.status);
                    return (
                      <tr
                        key={booking.id}
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                          backgroundColor:
                            index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                        }}
                      >
                        <td style={{ padding: "1rem", color: colors.text }}>
                          <div>
                            <strong>
                              {booking.member?.user?.name || "N/A"}
                            </strong>
                            {booking.member?.user?.email && (
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: colors.textSecondary,
                                  marginTop: "0.25rem",
                                }}
                              >
                                {booking.member.user.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "1rem", color: colors.text }}>
                          {language === "tr" && booking.session?.class?.nameTr
                            ? booking.session.class.nameTr
                            : booking.session?.class?.name || "N/A"}
                        </td>
                        <td style={{ padding: "1rem", color: colors.text }}>
                          {booking.session?.location?.name || "-"}
                        </td>
                        <td style={{ padding: "1rem", color: colors.text }}>
                          {booking.session?.instructor?.user?.name ||
                            booking.session?.instructor?.user?.email ||
                            "-"}
                        </td>
                        <td style={{ padding: "1rem", color: colors.text }}>
                          {booking.session?.startTime
                            ? formatDate(booking.session.startTime)
                            : "N/A"}
                        </td>
                        <td style={{ padding: "1rem", color: colors.text }}>
                          {booking.seat
                            ? booking.seat.name ||
                              `${booking.seat.row}-${booking.seat.column}`
                            : "-"}
                        </td>
                        <td style={{ padding: "1rem", color: colors.text }}>
                          {booking.paymentType
                            ? booking.paymentType === "CREDITS"
                              ? language === "tr"
                                ? "Kredi"
                                : "Credits"
                              : booking.paymentType === "ALL_ACCESS"
                              ? language === "tr"
                                ? "All Access"
                                : "All Access"
                              : booking.paymentType === "FRIEND_PASS"
                              ? language === "tr"
                                ? "Arkadaş Pası"
                                : "Friend Pass"
                              : booking.paymentType
                            : "-"}
                        </td>
                        <td style={{ padding: "1rem", color: colors.text }}>
                          {booking.creditsUsed !== undefined &&
                          booking.creditsUsed !== null
                            ? booking.creditsUsed
                            : booking.creditCost !== undefined &&
                              booking.creditCost !== null
                            ? booking.creditCost
                            : "-"}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.85rem",
                              backgroundColor: statusColors.bg,
                              color: statusColors.color,
                            }}
                          >
                            {booking.status || "UNKNOWN"}
                          </span>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "center",
                            }}
                          >
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowDetailsModal(true);
                              }}
                              style={{
                                padding: "0.25rem 0.75rem",
                                backgroundColor: colors.primary,
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                              }}
                            >
                              {language === "tr" ? "Detaylar" : "Details"}
                            </button>
                            {(() => {
                              const cancelInfo = canCancelBooking(booking);
                              return (
                                <button
                                  onClick={() => handleCancel(booking.id)}
                                  disabled={
                                    !cancelInfo.canCancel ||
                                    cancellingId === booking.id
                                  }
                                  style={{
                                    padding: "0.25rem 0.75rem",
                                    backgroundColor:
                                      !cancelInfo.canCancel ||
                                      cancellingId === booking.id
                                        ? "#999"
                                        : "#d32f2f",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor:
                                      !cancelInfo.canCancel ||
                                      cancellingId === booking.id
                                        ? "not-allowed"
                                        : "pointer",
                                    fontSize: "0.875rem",
                                    opacity:
                                      !cancelInfo.canCancel ||
                                      cancellingId === booking.id
                                        ? 0.6
                                        : 1,
                                  }}
                                  title={
                                    !cancelInfo.canCancel
                                      ? cancelInfo.reason || ""
                                      : cancelInfo.willRefund
                                      ? language === "tr"
                                        ? "Kredi iade edilecek"
                                        : "Credit will be refunded"
                                      : language === "tr"
                                      ? "Kredi iade edilmeyecek"
                                      : "Credit will not be refunded"
                                  }
                                >
                                  {cancellingId === booking.id
                                    ? language === "tr"
                                      ? "İptal ediliyor..."
                                      : "Cancelling..."
                                    : language === "tr"
                                    ? "İptal"
                                    : "Cancel"}
                                </button>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: colors.textSecondary,
                }}
              >
                <p>{t("noDataAvailable")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedBooking(null);
          }}
          title={
            language === "tr" ? "Rezervasyon Detayları" : "Booking Details"
          }
          size="large"
          showConfirm={false}
          showCancel={false}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {/* Booking ID */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: colors.text,
                  fontSize: "0.875rem",
                }}
              >
                {language === "tr" ? "Rezervasyon No" : "Booking ID"}
              </label>
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                  borderRadius: "4px",
                  color: colors.textSecondary,
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                }}
              >
                {selectedBooking.id}
              </div>
            </div>

            {/* Member Information */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: colors.text,
                  fontSize: "0.875rem",
                }}
              >
                {t("member") || "Member"}
              </label>
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                  borderRadius: "4px",
                }}
              >
                <div style={{ color: colors.text, marginBottom: "0.25rem" }}>
                  <strong>{selectedBooking.member?.user?.name || "N/A"}</strong>
                </div>
                {selectedBooking.member?.user?.email && (
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                    }}
                  >
                    {selectedBooking.member.user.email}
                  </div>
                )}
                {selectedBooking.member?.id && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: colors.textMuted,
                      marginTop: "0.25rem",
                      fontFamily: "monospace",
                    }}
                  >
                    ID: {selectedBooking.member.id}
                  </div>
                )}
              </div>
            </div>

            {/* Session Information */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: colors.text,
                  fontSize: "0.875rem",
                }}
              >
                {language === "tr" ? "Oturum Bilgileri" : "Session Information"}
              </label>
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                  borderRadius: "4px",
                  display: "grid",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: colors.textMuted,
                      display: "block",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {t("class") || "Class"}
                  </span>
                  <span style={{ color: colors.text }}>
                    {language === "tr" && selectedBooking.session?.class?.nameTr
                      ? selectedBooking.session.class.nameTr
                      : selectedBooking.session?.class?.name || "N/A"}
                  </span>
                </div>
                {selectedBooking.session?.location?.name && (
                  <div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textMuted,
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {language === "tr" ? "Konum" : "Location"}
                    </span>
                    <span style={{ color: colors.text }}>
                      {selectedBooking.session.location.name}
                    </span>
                  </div>
                )}
                {selectedBooking.session?.instructor?.user && (
                  <div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textMuted,
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {language === "tr" ? "Eğitmen" : "Instructor"}
                    </span>
                    <span style={{ color: colors.text }}>
                      {selectedBooking.session.instructor.user.name ||
                        selectedBooking.session.instructor.user.email ||
                        "N/A"}
                    </span>
                  </div>
                )}
                <div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: colors.textMuted,
                      display: "block",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {t("startTime") || "Start Time"}
                  </span>
                  <span style={{ color: colors.text }}>
                    {selectedBooking.session?.startTime
                      ? formatDate(selectedBooking.session.startTime)
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: colors.textMuted,
                      display: "block",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {t("endTime") || "End Time"}
                  </span>
                  <span style={{ color: colors.text }}>
                    {selectedBooking.session?.endTime
                      ? formatDate(selectedBooking.session.endTime)
                      : "N/A"}
                  </span>
                </div>
                {selectedBooking.session?.id && (
                  <div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textMuted,
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {language === "tr" ? "Oturum ID" : "Session ID"}
                    </span>
                    <span
                      style={{
                        color: colors.textSecondary,
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                      }}
                    >
                      {selectedBooking.session.id}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment & Seat Information */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              {/* Seat */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                >
                  {language === "tr" ? "Koltuk" : "Seat"}
                </label>
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                    borderRadius: "4px",
                    color: colors.text,
                  }}
                >
                  {selectedBooking.seat
                    ? selectedBooking.seat.name ||
                      `${selectedBooking.seat.row}-${selectedBooking.seat.column}`
                    : language === "tr"
                    ? "Belirtilmemiş"
                    : "Not Assigned"}
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                >
                  {language === "tr" ? "Ödeme Türü" : "Payment Type"}
                </label>
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                    borderRadius: "4px",
                    color: colors.text,
                  }}
                >
                  {selectedBooking.paymentType
                    ? selectedBooking.paymentType === "CREDITS"
                      ? language === "tr"
                        ? "Kredi"
                        : "Credits"
                      : selectedBooking.paymentType === "ALL_ACCESS"
                      ? "All Access"
                      : selectedBooking.paymentType === "FRIEND_PASS"
                      ? language === "tr"
                        ? "Arkadaş Pası"
                        : "Friend Pass"
                      : selectedBooking.paymentType
                    : language === "tr"
                    ? "Belirtilmemiş"
                    : "Not Specified"}
                </div>
              </div>
            </div>

            {/* Credits */}
            {(selectedBooking.creditsUsed !== undefined ||
              selectedBooking.creditCost !== undefined) && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                >
                  {language === "tr" ? "Kredi" : "Credits"}
                </label>
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                    borderRadius: "4px",
                    color: colors.text,
                  }}
                >
                  {selectedBooking.creditsUsed !== undefined &&
                  selectedBooking.creditsUsed !== null
                    ? selectedBooking.creditsUsed
                    : selectedBooking.creditCost !== undefined &&
                      selectedBooking.creditCost !== null
                    ? selectedBooking.creditCost
                    : "-"}
                </div>
              </div>
            )}

            {/* Status & Dates */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              {/* Status */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                >
                  {t("status") || "Status"}
                </label>
                <div
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    display: "inline-block",
                    backgroundColor: getStatusColor(selectedBooking.status).bg,
                    color: getStatusColor(selectedBooking.status).color,
                    fontWeight: "600",
                  }}
                >
                  {selectedBooking.status || "UNKNOWN"}
                </div>
              </div>

              {/* Created At */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                >
                  {language === "tr" ? "Oluşturulma" : "Created At"}
                </label>
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                    borderRadius: "4px",
                    color: colors.text,
                  }}
                >
                  {formatDate(selectedBooking.createdAt)}
                </div>
              </div>
            </div>

            {/* Check-in Status */}
            {selectedBooking.checkedIn !== undefined && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                >
                  {language === "tr" ? "Check-in Durumu" : "Check-in Status"}
                </label>
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                    borderRadius: "4px",
                  }}
                >
                  <div style={{ color: colors.text, marginBottom: "0.25rem" }}>
                    {selectedBooking.checkedIn
                      ? language === "tr"
                        ? "✓ Check-in yapıldı"
                        : "✓ Checked In"
                      : language === "tr"
                      ? "✗ Check-in yapılmadı"
                      : "✗ Not Checked In"}
                  </div>
                  {selectedBooking.checkedInAt && (
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: colors.textSecondary,
                      }}
                    >
                      {language === "tr" ? "Tarih" : "Date"}:{" "}
                      {formatDate(selectedBooking.checkedInAt)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Package Redemption (if applicable) */}
            {selectedBooking.packageRedemptionId && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                >
                  {language === "tr"
                    ? "Paket İndirimi ID"
                    : "Package Redemption ID"}
                </label>
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                    borderRadius: "4px",
                    color: colors.textSecondary,
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  {selectedBooking.packageRedemptionId}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
