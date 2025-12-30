"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";
import Spinner from "@/components/Spinner";
import { showToast } from "@/components/Toast";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: string;
}

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();

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
    },
    dark: {
      cardBg: "#1e1e1e",
      theadBg: "#2a2a2a",
      rowEven: "#1e1e1e",
      rowOdd: "#252525",
      border: "#333",
      text: "#e0e0e0",
      textSecondary: "#b0b0b0",
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
    fetchSubmissions(authToken);
  }, [router]);

  const fetchSubmissions = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/contact/list", {
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
      setSubmissions(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch contact submissions");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    if (token) {
      fetchSubmissions(token);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
        backgroundColor: colors.cardBg,
        borderRadius: "8px",
        padding: "1.5rem",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: `1px solid ${colors.border}`,
        transition: "background-color 0.3s, border-color 0.3s",
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
          {t("contactSubmissions") || "Contact Form Submissions"}
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
            backgroundColor: "#ffebee",
            color: "#c62828",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          <p style={{ margin: 0 }}>Error: {error}</p>
        </div>
      )}

      {loading && (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Loading...</p>
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: "auto" }}>
          {submissions.length > 0 ? (
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
                    transition: "background-color 0.3s, border-color 0.3s",
                  }}
                >
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    {t("date") || "Date"}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    {t("name") || "Name"}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    {t("email") || "Email"}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    {t("phone") || "Phone"}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    {t("message") || "Message"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission, index) => (
                  <tr
                    key={submission.id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor:
                        index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                      transition: "background-color 0.3s, border-color 0.3s",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.75rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(submission.createdAt)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>{submission.name}</td>
                    <td style={{ padding: "0.75rem" }}>{submission.email}</td>
                    <td style={{ padding: "0.75rem" }}>
                      {submission.phone || "-"}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        maxWidth: "400px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {submission.message}
                    </td>
                  </tr>
                ))}
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
              <p>{t("noSubmissionsFound") || "No contact form submissions found."}</p>
              <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                Note: Submissions are also sent to the organization email.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
