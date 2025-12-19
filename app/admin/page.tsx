"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/useTheme";
import Spinner from "@/components/Spinner";
import { showToast } from "@/components/Toast";

interface OrganizationData {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  latitude?: number;
  longitude?: number;
  // SMTP Configuration
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFromEmail?: string | null;
  smtpFromName?: string | null;
  // Language preference
  language?: string | null;
  // Pricing
  creditPrice?: number | null;
  currency?: string | null;
  pricePeriodStart?: string | null;
  pricePeriodEnd?: string | null;
  _count?: {
    users: number;
    members: number;
    classes: number;
    sessions: number;
  };
}

export default function OrganizationPage() {
  const [data, setData] = useState<OrganizationData | null>(null);
  const [users, setUsers] = useState<Array<{
    id: string;
    name?: string | null;
    email: string;
    role: string;
  }> | null>(null);
  const [instructorsCount, setInstructorsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<OrganizationData>>({});
  const [priceChangeReason, setPriceChangeReason] = useState('');
  const [viewingPriceHistory, setViewingPriceHistory] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();

  // Theme colors
  const themeColors = {
    light: {
      cardBg: "white",
      text: "#333",
      textSecondary: "#666",
      border: "#e0e0e0",
      infoBg: "#f9f9f9",
      shadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
    dark: {
      cardBg: "#1e1e1e",
      text: "#e0e0e0",
      textSecondary: "#b0b0b0",
      border: "#333",
      infoBg: "#2a2a2a",
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
    fetchOrganization(authToken);
    fetchUsers(authToken);
    fetchInstructors(authToken);
  }, [router]);

  const fetchOrganization = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/organization", {
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

      const result = await response.json();
      setData(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t("failedToFetchOrganization")
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (authToken: string) => {
    try {
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const usersData = await response.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
    }
  };

  const fetchInstructors = async (authToken: string) => {
    try {
      const response = await fetch("/api/instructors", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const instructorsData = await response.json();
        setInstructorsCount(
          Array.isArray(instructorsData) ? instructorsData.length : 0
        );
      } else {
        setInstructorsCount(0);
      }
    } catch (err) {
      console.error("Error fetching instructors:", err);
      setInstructorsCount(0);
    }
  };

  const handleEditOrganization = () => {
    if (data) {
      // Don't include masked password in edit form
      const { smtpPassword: _, ...formData } = data;
      setEditForm(formData);
      setIsEditing(true);
    }
  };

  const handleSaveOrganization = async () => {
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      // Prepare update data - only include password if it was changed (not empty)
      const updateData: any = { ...editForm };
      // If password is empty, don't send it (to keep current password)
      if (!updateData.smtpPassword || updateData.smtpPassword === "") {
        delete updateData.smtpPassword;
      }

      // Include price change reason if credit price or currency is being changed
      if ((updateData.creditPrice !== undefined && updateData.creditPrice !== data?.creditPrice) ||
          (updateData.currency !== undefined && updateData.currency !== data?.currency)) {
        if (priceChangeReason) {
          updateData.priceChangeReason = priceChangeReason;
        }
      }

      const response = await fetch("/api/organization", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const updated = await response.json();
      setData(updated);
      setIsEditing(false);
      setPriceChangeReason('');
      fetchOrganization(token);

      // Show success toast
      showToast(t("organizationUpdatedSuccessfully") || "Organization updated successfully", "success");

      // Dispatch event to update page title
      window.dispatchEvent(new CustomEvent("organization-updated"));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t("failedToUpdateOrganization");
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
    setPriceChangeReason('');
    setError(null);
  };

  const fetchPriceHistory = async () => {
    if (!token) return;
    
    setLoadingPriceHistory(true);
    try {
      const response = await fetch("/api/organization/price-history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const history = await response.json();
        setPriceHistory(Array.isArray(history) ? history : []);
      } else {
        setPriceHistory([]);
      }
    } catch (err) {
      console.error("Error fetching price history:", err);
      setPriceHistory([]);
    } finally {
      setLoadingPriceHistory(false);
    }
  };

  const refreshData = () => {
    if (token) {
      fetchOrganization(token);
      fetchUsers(token);
      fetchInstructors(token);
    }
  };

  if (!token) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: colors.text }}>
        <Spinner text={t("loading")} />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: colors.cardBg,
        borderRadius: "8px",
        padding: "1.5rem",
        boxShadow: colors.shadow,
        border: `1px solid ${colors.border}`,
        transition: "background-color 0.3s, border-color 0.3s",
        color: colors.text,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: colors.text }}>
          {t("organization")}
        </h2>
        <button
          onClick={refreshData}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem"
          }}
        >
          {loading ? (
            <>
              <Spinner size={16} color="#ffffff" />
              <span>{t("loading")}</span>
            </>
          ) : t("refresh")}
        </button>
      </div>

      {loading && (
        <div
          style={{ padding: "2rem", textAlign: "center", color: colors.text }}
        >
          <Spinner text={t("loading")} />
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#ffebee",
            color: "#c62828",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          <p style={{ margin: 0 }}>
            {t("error")}: {error}
          </p>
        </div>
      )}

      {!loading && !error && data && (
        <div>
          {!isEditing ? (
            <div>
              <div
                style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}
              >
                <button
                  onClick={handleEditOrganization}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#1976d2",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {t("editOrganization")}
                </button>
              </div>

              {/* Organization Details Table */}
              <div
                style={{
                  backgroundColor: colors.infoBg,
                  padding: "1.5rem",
                  borderRadius: "4px",
                  border: `1px solid ${colors.border}`,
                  transition: "background-color 0.3s, border-color 0.3s",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "1rem",
                    color: colors.text,
                  }}
                >
                  {t("basicInformation")}
                </h3>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                          width: "200px",
                        }}
                      >
                        {t("name")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.name || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("slug")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.slug || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                          verticalAlign: "top",
                        }}
                      >
                        {t("description")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.description || "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  backgroundColor: colors.infoBg,
                  padding: "1.5rem",
                  borderRadius: "4px",
                  border: `1px solid ${colors.border}`,
                  transition: "background-color 0.3s, border-color 0.3s",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "1rem",
                    color: colors.text,
                  }}
                >
                  {t("contactInformation")}
                </h3>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                          width: "200px",
                        }}
                      >
                        {t("email")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.email || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("phone")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.phone || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                          verticalAlign: "top",
                        }}
                      >
                        {t("address")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.address || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("website")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.website ? (
                          <a
                            href={data.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: colors.text,
                              textDecoration: "underline",
                            }}
                          >
                            {data.website}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  backgroundColor: colors.infoBg,
                  padding: "1.5rem",
                  borderRadius: "4px",
                  border: `1px solid ${colors.border}`,
                  transition: "background-color 0.3s, border-color 0.3s",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "1rem",
                    color: colors.text,
                  }}
                >
                  {t("socialMedia")}
                </h3>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                          width: "200px",
                        }}
                      >
                        {t("facebook")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.facebook ? (
                          <a
                            href={data.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: colors.text,
                              textDecoration: "underline",
                            }}
                          >
                            {data.facebook}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("twitter")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.twitter ? (
                          <a
                            href={data.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: colors.text,
                              textDecoration: "underline",
                            }}
                          >
                            {data.twitter}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("instagram")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.instagram ? (
                          <a
                            href={data.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: colors.text,
                              textDecoration: "underline",
                            }}
                          >
                            {data.instagram}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("linkedin")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.linkedin ? (
                          <a
                            href={data.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: colors.text,
                              textDecoration: "underline",
                            }}
                          >
                            {data.linkedin}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("tiktok")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.tiktok ? (
                          <a
                            href={data.tiktok}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: colors.text,
                              textDecoration: "underline",
                            }}
                          >
                            {data.tiktok}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  backgroundColor: colors.infoBg,
                  padding: "1.5rem",
                  borderRadius: "4px",
                  border: `1px solid ${colors.border}`,
                  transition: "background-color 0.3s, border-color 0.3s",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "1rem",
                    color: colors.text,
                  }}
                >
                  {t("location")}
                </h3>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                          width: "200px",
                        }}
                      >
                        {t("latitude")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.latitude !== null && data.latitude !== undefined
                          ? data.latitude.toString()
                          : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("longitude")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.longitude !== null && data.longitude !== undefined
                          ? data.longitude.toString()
                          : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SMTP Configuration Display */}
              {(data.smtpHost || data.smtpUser) && (
                <div
                  style={{
                    backgroundColor: colors.infoBg,
                    padding: "1.5rem",
                    borderRadius: "4px",
                    border: `1px solid ${colors.border}`,
                    transition: "background-color 0.3s, border-color 0.3s",
                    marginBottom: "1.5rem",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "1rem",
                      color: colors.text,
                    }}
                  >
                    {t("smtpConfiguration")}
                  </h3>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <tbody>
                      {data.smtpHost && (
                        <tr>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              fontWeight: "600",
                              color: colors.text,
                              width: "200px",
                            }}
                          >
                            {t("smtpHost")}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              color: colors.text,
                            }}
                          >
                            {data.smtpHost}
                          </td>
                        </tr>
                      )}
                      {data.smtpPort && (
                        <tr>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              fontWeight: "600",
                              color: colors.text,
                            }}
                          >
                            {t("smtpPort")}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              color: colors.text,
                            }}
                          >
                            {data.smtpPort}
                          </td>
                        </tr>
                      )}
                      {data.smtpUser && (
                        <tr>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              fontWeight: "600",
                              color: colors.text,
                            }}
                          >
                            {t("smtpUser")}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              color: colors.text,
                            }}
                          >
                            {data.smtpUser}
                          </td>
                        </tr>
                      )}
                      {data.smtpPassword && (
                        <tr>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              fontWeight: "600",
                              color: colors.text,
                            }}
                          >
                            {t("smtpPassword")}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              color: colors.text,
                            }}
                          >
                            {data.smtpPassword === "••••••••"
                              ? data.smtpPassword
                              : "••••••••"}
                          </td>
                        </tr>
                      )}
                      {data.smtpFromEmail && (
                        <tr>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              fontWeight: "600",
                              color: colors.text,
                            }}
                          >
                            {t("smtpFromEmail")}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              color: colors.text,
                            }}
                          >
                            {data.smtpFromEmail}
                          </td>
                        </tr>
                      )}
                      {data.smtpFromName && (
                        <tr>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              fontWeight: "600",
                              color: colors.text,
                            }}
                          >
                            {t("smtpFromName")}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: `1px solid ${colors.border}`,
                              color: colors.text,
                            }}
                          >
                            {data.smtpFromName}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Language Configuration Display */}
              <div
                style={{
                  backgroundColor: colors.infoBg,
                  padding: "1.5rem",
                  borderRadius: "4px",
                  border: `1px solid ${colors.border}`,
                  transition: "background-color 0.3s, border-color 0.3s",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "1rem",
                    color: colors.text,
                  }}
                >
                  {t("emailLanguage")}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: colors.textSecondary,
                    marginBottom: "1rem",
                  }}
                >
                  {t("languageDescription")}
                </p>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                          width: "200px",
                        }}
                      >
                        {t("language")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.language === "tr" ? t("turkish") : t("english")} ({data.language || "en"})
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pricing Configuration Display */}
              <div
                style={{
                  backgroundColor: colors.infoBg,
                  padding: "1.5rem",
                  borderRadius: "4px",
                  border: `1px solid ${colors.border}`,
                  transition: "background-color 0.3s, border-color 0.3s",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "1rem",
                    color: colors.text,
                  }}
                >
                  {t("pricing") || "Pricing"}
                </h3>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                          width: "200px",
                        }}
                      >
                        {t("creditPrice") || "Credit Price"}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.creditPrice !== null && data.creditPrice !== undefined
                          ? `${data.currency || 'USD'} ${data.creditPrice.toFixed(2)}`
                          : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("currency") || "Currency"}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {data.currency || "USD"}
                      </td>
                    </tr>
                    {data.pricePeriodStart && (
                      <tr>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: `1px solid ${colors.border}`,
                            fontWeight: "600",
                            color: colors.text,
                          }}
                        >
                          {t("pricePeriodStart") || "Price Period Start"}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: `1px solid ${colors.border}`,
                            color: colors.text,
                          }}
                        >
                          {new Date(data.pricePeriodStart).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    {data.pricePeriodEnd && (
                      <tr>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: `1px solid ${colors.border}`,
                            fontWeight: "600",
                            color: colors.text,
                          }}
                        >
                          {t("pricePeriodEnd") || "Price Period End"}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: `1px solid ${colors.border}`,
                            color: colors.text,
                          }}
                        >
                          {new Date(data.pricePeriodEnd).toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {(data.creditPrice !== null && data.creditPrice !== undefined) && (
                  <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => {
                        setViewingPriceHistory(!viewingPriceHistory);
                        if (!viewingPriceHistory) {
                          fetchPriceHistory();
                        }
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: theme === "dark" ? "#666" : "#999",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      {viewingPriceHistory ? (t("hidePriceHistory") || "Hide Price History") : (t("viewPriceHistory") || "View Price History")}
                    </button>
                  </div>
                )}
              </div>

              {/* Price History */}
              {viewingPriceHistory && (
                <div
                  style={{
                    backgroundColor: colors.infoBg,
                    padding: "1.5rem",
                    borderRadius: "4px",
                    border: `1px solid ${colors.border}`,
                    transition: "background-color 0.3s, border-color 0.3s",
                    marginBottom: "1.5rem",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "1rem",
                      color: colors.text,
                    }}
                  >
                    {t("priceHistory") || "Price History"}
                  </h3>
                  {loadingPriceHistory ? (
                    <div style={{ padding: "2rem", textAlign: "center" }}>
                      <Spinner text={t("loading")} />
                    </div>
                  ) : priceHistory.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                        }}
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                borderBottom: `2px solid ${colors.border}`,
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("changedOn") || "Changed On"}
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                borderBottom: `2px solid ${colors.border}`,
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("effectiveFrom") || "Effective From"}
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                borderBottom: `2px solid ${colors.border}`,
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("effectiveUntil") || "Effective Until"}
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                borderBottom: `2px solid ${colors.border}`,
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("creditPriceBefore") || "Credit Price Before"}
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                borderBottom: `2px solid ${colors.border}`,
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("creditPriceAfter") || "Credit Price After"}
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                borderBottom: `2px solid ${colors.border}`,
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("currencyBefore") || "Currency Before"}
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                borderBottom: `2px solid ${colors.border}`,
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("currencyAfter") || "Currency After"}
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                borderBottom: `2px solid ${colors.border}`,
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("changedBy") || "Changed By"}
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                borderBottom: `2px solid ${colors.border}`,
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("reason") || "Reason"}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {priceHistory.map((item: any) => (
                            <tr key={item.id}>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  borderBottom: `1px solid ${colors.border}`,
                                  color: colors.text,
                                }}
                              >
                                {new Date(item.createdAt).toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  borderBottom: `1px solid ${colors.border}`,
                                  color: colors.text,
                                }}
                              >
                                {item.effectiveFrom ? new Date(item.effectiveFrom).toLocaleString() : "-"}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  borderBottom: `1px solid ${colors.border}`,
                                  color: colors.text,
                                }}
                              >
                                {item.effectiveUntil ? new Date(item.effectiveUntil).toLocaleString() : (t("indefinite") || "Indefinite")}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  borderBottom: `1px solid ${colors.border}`,
                                  color: colors.text,
                                }}
                              >
                                {item.creditPriceBefore !== null ? `${item.currencyBefore || ''} ${item.creditPriceBefore.toFixed(2)}` : "-"}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  borderBottom: `1px solid ${colors.border}`,
                                  color: colors.text,
                                  fontWeight: "600",
                                }}
                              >
                                {item.currencyAfter} {item.creditPriceAfter.toFixed(2)}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  borderBottom: `1px solid ${colors.border}`,
                                  color: colors.text,
                                }}
                              >
                                {item.currencyBefore || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  borderBottom: `1px solid ${colors.border}`,
                                  color: colors.text,
                                  fontWeight: "600",
                                }}
                              >
                                {item.currencyAfter}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  borderBottom: `1px solid ${colors.border}`,
                                  color: colors.textSecondary,
                                }}
                              >
                                {item.changedBy?.name || item.changedBy?.email || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  borderBottom: `1px solid ${colors.border}`,
                                  color: colors.textSecondary,
                                }}
                              >
                                {item.reason || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: colors.textSecondary }}>
                      {t("noPriceHistory") || "No price history available."}
                    </p>
                  )}
                </div>
              )}

              {data._count && (
                <div style={{ marginTop: "1.5rem" }}>
                  <h3 style={{ marginBottom: "0.5rem", color: colors.text }}>
                    {t("statistics")}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor:
                          theme === "dark" ? "#0d47a1" : "#e3f2fd",
                        padding: "1rem",
                        borderRadius: "4px",
                        textAlign: "center",
                        border: `1px solid ${colors.border}`,
                        transition: "background-color 0.3s, border-color 0.3s",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: theme === "dark" ? "#90caf9" : "#1976d2",
                        }}
                      >
                        {data._count.users || 0}
                      </div>
                      <div style={{ color: colors.textSecondary }}>
                        {t("users")}
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor:
                          theme === "dark" ? "#1b5e20" : "#e8f5e9",
                        padding: "1rem",
                        borderRadius: "4px",
                        textAlign: "center",
                        border: `1px solid ${colors.border}`,
                        transition: "background-color 0.3s, border-color 0.3s",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: theme === "dark" ? "#81c784" : "#388e3c",
                        }}
                      >
                        {data._count.members || 0}
                      </div>
                      <div style={{ color: colors.textSecondary }}>
                        {t("members")}
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor:
                          theme === "dark" ? "#5d4037" : "#fff3e0",
                        padding: "1rem",
                        borderRadius: "4px",
                        textAlign: "center",
                        border: `1px solid ${colors.border}`,
                        transition: "background-color 0.3s, border-color 0.3s",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: theme === "dark" ? "#ffab91" : "#f57c00",
                        }}
                      >
                        {data._count.classes || 0}
                      </div>
                      <div style={{ color: colors.textSecondary }}>
                        {t("classes")}
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor:
                          theme === "dark" ? "#880e4f" : "#fce4ec",
                        padding: "1rem",
                        borderRadius: "4px",
                        textAlign: "center",
                        border: `1px solid ${colors.border}`,
                        transition: "background-color 0.3s, border-color 0.3s",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: theme === "dark" ? "#f48fb1" : "#c2185b",
                        }}
                      >
                        {data._count.sessions || 0}
                      </div>
                      <div style={{ color: colors.textSecondary }}>
                        {t("sessions")}
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor:
                          theme === "dark" ? "#4a148c" : "#e1bee7",
                        padding: "1rem",
                        borderRadius: "4px",
                        textAlign: "center",
                        border: `1px solid ${colors.border}`,
                        transition: "background-color 0.3s, border-color 0.3s",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: theme === "dark" ? "#ce93d8" : "#7b1fa2",
                        }}
                      >
                        {instructorsCount}
                      </div>
                      <div style={{ color: colors.textSecondary }}>
                        {t("instructors")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {users && users.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <h3 style={{ marginBottom: "0.5rem", color: colors.text }}>
                    {t("users")} ({users.length})
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gap: "0.5rem",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(250px, 1fr))",
                    }}
                  >
                    {users.map((user) => (
                      <div
                        key={user.id}
                        style={{
                          padding: "0.75rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          backgroundColor:
                            theme === "dark" ? "#2a2a2a" : "#fafafa",
                          transition:
                            "background-color 0.3s, border-color 0.3s",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "bold",
                            marginBottom: "0.25rem",
                            color: colors.text,
                          }}
                        >
                          {user.name || user.email}
                        </div>
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: colors.textSecondary,
                          }}
                        >
                          {user.email}
                        </div>
                        {user.role && (
                          <div
                            style={{
                              fontSize: "0.875rem",
                              color: colors.textSecondary,
                              marginTop: "0.25rem",
                            }}
                          >
                            {t("role")}:{" "}
                            <span
                              style={{ fontWeight: "bold", color: colors.text }}
                            >
                              {user.role}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: "grid", gap: "1.5rem" }}>
                {/* Basic Information Section */}
                <div
                  style={{
                    backgroundColor: colors.infoBg,
                    padding: "1.5rem",
                    borderRadius: "4px",
                    border: `1px solid ${colors.border}`,
                    transition: "background-color 0.3s, border-color 0.3s",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "1rem",
                      color: colors.text,
                    }}
                  >
                    {t("basicInformation")}
                  </h3>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("name")} *
                      </label>
                      <input
                        type="text"
                        value={editForm.name || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        required
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("slug")}
                      </label>
                      <input
                        type="text"
                        value={editForm.slug || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, slug: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("description")}
                      </label>
                      <textarea
                        value={editForm.description || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          fontFamily: "inherit",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div
                  style={{
                    backgroundColor: colors.infoBg,
                    padding: "1.5rem",
                    borderRadius: "4px",
                    border: `1px solid ${colors.border}`,
                    transition: "background-color 0.3s, border-color 0.3s",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "1rem",
                      color: colors.text,
                    }}
                  >
                    {t("contactInformation")}
                  </h3>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("email")}
                      </label>
                      <input
                        type="email"
                        value={editForm.email || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("phone")}
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("address")}
                      </label>
                      <textarea
                        value={editForm.address || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, address: e.target.value })
                        }
                        rows={2}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          fontFamily: "inherit",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("website")}
                      </label>
                      <input
                        type="url"
                        value={editForm.website || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, website: e.target.value })
                        }
                        placeholder="https://example.com"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media Links Section */}
                <div
                  style={{
                    backgroundColor: colors.infoBg,
                    padding: "1.5rem",
                    borderRadius: "4px",
                    border: `1px solid ${colors.border}`,
                    transition: "background-color 0.3s, border-color 0.3s",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "1rem",
                      color: colors.text,
                    }}
                  >
                    {t("socialMediaLinks")}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("facebook")}
                      </label>
                      <input
                        type="url"
                        value={editForm.facebook || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, facebook: e.target.value })
                        }
                        placeholder="https://facebook.com/yourpage"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("twitter")}
                      </label>
                      <input
                        type="url"
                        value={editForm.twitter || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, twitter: e.target.value })
                        }
                        placeholder="https://twitter.com/yourhandle"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("instagram")}
                      </label>
                      <input
                        type="url"
                        value={editForm.instagram || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            instagram: e.target.value,
                          })
                        }
                        placeholder="https://instagram.com/yourhandle"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("linkedin")}
                      </label>
                      <input
                        type="url"
                        value={editForm.linkedin || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, linkedin: e.target.value })
                        }
                        placeholder="https://linkedin.com/company/yourcompany"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("tiktok")}
                      </label>
                      <input
                        type="url"
                        value={editForm.tiktok || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, tiktok: e.target.value })
                        }
                        placeholder="https://tiktok.com/@yourhandle"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div
                  style={{
                    backgroundColor: colors.infoBg,
                    padding: "1.5rem",
                    borderRadius: "4px",
                    border: `1px solid ${colors.border}`,
                    transition: "background-color 0.3s, border-color 0.3s",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "1rem",
                      color: colors.text,
                    }}
                  >
                    {t("location")}
                  </h3>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("latitude")}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={
                          editForm.latitude !== null &&
                          editForm.latitude !== undefined
                            ? editForm.latitude
                            : ""
                        }
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            latitude: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="e.g., 41.0082"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("longitude")}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={
                          editForm.longitude !== null &&
                          editForm.longitude !== undefined
                            ? editForm.longitude
                            : ""
                        }
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            longitude: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="e.g., 28.9784"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* SMTP Configuration Section */}
                <div
                  style={{
                    backgroundColor: colors.infoBg,
                    padding: "1.5rem",
                    borderRadius: "4px",
                    border: `1px solid ${colors.border}`,
                    transition: "background-color 0.3s, border-color 0.3s",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "1rem",
                      color: colors.text,
                    }}
                  >
                    {t("smtpConfiguration")}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                      marginBottom: "1rem",
                    }}
                  >
                    {t("smtpConfigurationDescription")}
                  </p>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("smtpHost")}
                      </label>
                      <input
                        type="text"
                        value={editForm.smtpHost || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            smtpHost: e.target.value || undefined,
                          })
                        }
                        placeholder="smtp.zoho.com"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("smtpPort")}
                      </label>
                      <input
                        type="number"
                        value={editForm.smtpPort || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            smtpPort: e.target.value
                              ? parseInt(e.target.value, 10)
                              : undefined,
                          })
                        }
                        placeholder="587"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("smtpUser")}
                      </label>
                      <input
                        type="text"
                        value={editForm.smtpUser || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            smtpUser: e.target.value || undefined,
                          })
                        }
                        placeholder="noreply@yourdomain.com"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("smtpPassword")}
                      </label>
                      <input
                        type="password"
                        value={editForm.smtpPassword || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            smtpPassword: e.target.value || undefined,
                          })
                        }
                        placeholder={
                          data?.smtpPassword === "••••••••"
                            ? t("leaveBlankToKeepCurrent")
                            : ""
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
                      {data?.smtpPassword === "••••••••" && (
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: colors.textSecondary,
                            marginTop: "0.25rem",
                          }}
                        >
                          {t("leaveBlankToKeepCurrent")}
                        </p>
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
                        {t("smtpFromEmail")}
                      </label>
                      <input
                        type="email"
                        value={editForm.smtpFromEmail || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            smtpFromEmail: e.target.value || undefined,
                          })
                        }
                        placeholder="noreply@yourdomain.com"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("smtpFromName")}
                      </label>
                      <input
                        type="text"
                        value={editForm.smtpFromName || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            smtpFromName: e.target.value || undefined,
                          })
                        }
                        placeholder="Spin8 Studio"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Language Configuration Section */}
                <div
                  style={{
                    backgroundColor: colors.infoBg,
                    padding: "1.5rem",
                    borderRadius: "4px",
                    border: `1px solid ${colors.border}`,
                    transition: "background-color 0.3s, border-color 0.3s",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "1rem",
                      color: colors.text,
                    }}
                  >
                    {t("emailLanguage")}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                      marginBottom: "1rem",
                    }}
                  >
                    {t("languageDescription")}
                  </p>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("language") || "Language"}
                      </label>
                      <select
                        value={editForm.language || "en"}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            language: e.target.value || "en",
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      >
                        <option value="en">{t("english")}</option>
                        <option value="tr">{t("turkish")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pricing Section */}
                <div
                  style={{
                    backgroundColor: colors.infoBg,
                    padding: "1.5rem",
                    borderRadius: "4px",
                    border: `1px solid ${colors.border}`,
                    transition: "background-color 0.3s, border-color 0.3s",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "1rem",
                      color: colors.text,
                    }}
                  >
                    {t("pricing") || "Pricing"}
                  </h3>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {t("creditPrice") || "Credit Price"}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.creditPrice !== null && editForm.creditPrice !== undefined ? editForm.creditPrice : ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            creditPrice: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="0.00"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      />
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
                        {t("currency") || "Currency"}
                      </label>
                      <select
                        value={editForm.currency || "USD"}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            currency: e.target.value || "USD",
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          fontSize: "1rem",
                          backgroundColor: colors.cardBg,
                          color: colors.text,
                          transition:
                            "background-color 0.3s, border-color 0.3s, color 0.3s",
                        }}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="TRY">TRY (₺)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                    {(editForm.creditPrice !== data?.creditPrice || editForm.currency !== data?.currency) && (
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: colors.text,
                          }}
                        >
                          {`${t("priceChangeReason") || "Price Change Reason"} (${t("optional") || "optional"})`}
                        </label>
                        <input
                          type="text"
                          value={priceChangeReason}
                          onChange={(e) => setPriceChangeReason(e.target.value)}
                          placeholder={t("priceChangeReasonPlaceholder") || "e.g., Seasonal adjustment"}
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: `1px solid ${colors.border}`,
                            borderRadius: "4px",
                            fontSize: "1rem",
                            backgroundColor: colors.cardBg,
                            color: colors.text,
                            transition:
                              "background-color 0.3s, border-color 0.3s, color 0.3s",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div
                style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}
              >
                  <button
                    onClick={handleSaveOrganization}
                    disabled={saving}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#4caf50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? t("saving") : t("save")}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#666",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {t("cancel")}
                  </button>
                </div>
            </div>
          )}
        </div>
      )}

      {!loading && !error && !data && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
          <p>No data available</p>
        </div>
      )}
    </div>
  );
}
