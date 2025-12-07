"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";

interface Instructor {
  id: string;
  userId: string;
  organizationId: string;
  bio?: string;
  specialties?: string[];
  status: string;
  user: {
    id: string;
    name?: string;
    email: string;
    role: string;
  };
  _count?: {
    classes: number;
    sessions: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Instructor>>({});
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();

  // Theme colors for tables
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
    fetchInstructors(authToken);
  }, [router]);

  const fetchInstructors = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/instructors", {
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
      setInstructors(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch instructors");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    if (token) {
      fetchInstructors(token);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const handleEdit = (instructor: Instructor) => {
    setEditForm({
      bio: instructor.bio || "",
      specialties: instructor.specialties || [],
      status: instructor.status,
    });
    setEditingId(instructor.id);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!token || !editingId) return;

    setSaving(true);
    setError(null);

    try {
      const updateData: any = {};
      if (editForm.bio !== undefined) updateData.bio = editForm.bio || null;
      if (editForm.specialties !== undefined)
        updateData.specialties = editForm.specialties;
      if (editForm.status !== undefined) updateData.status = editForm.status;

      const response = await fetch(`/api/instructors/${editingId}`, {
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
      setInstructors(
        instructors.map((i) => (i.id === editingId ? updated : i))
      );
      setEditingId(null);
      setEditForm({});
    } catch (err: any) {
      setError(err.message || "Failed to update instructor");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm(t("deleteConfirm"))) return;

    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/instructors/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.details || `HTTP ${response.status}`
        );
      }

      setInstructors(instructors.filter((i) => i.id !== id));
      setDeletingId(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete instructor");
      setDeletingId(null);
    }
  };

  const handleSpecialtyChange = (value: string) => {
    const specialties = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setEditForm({ ...editForm, specialties });
  };

  if (!token) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading...</p>
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
          {t("instructors")}
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
          }}
        >
          {loading ? t("loading") : t("refresh")}
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
          {instructors.length > 0 ? (
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
                      color: colors.text,
                    }}
                  >
                    {t("name")}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                      color: colors.text,
                    }}
                  >
                    {t("email")}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                      color: colors.text,
                    }}
                  >
                    {t("status")}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                      color: colors.text,
                    }}
                  >
                    {t("bio")}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                      color: colors.text,
                    }}
                  >
                    {t("specialties")}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "center",
                      fontWeight: "bold",
                      color: colors.text,
                    }}
                  >
                    {t("classes")}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "center",
                      fontWeight: "bold",
                      color: colors.text,
                    }}
                  >
                    {t("sessions")}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                      color: colors.text,
                    }}
                  >
                    {t("created")}
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "center",
                      fontWeight: "bold",
                      color: colors.text,
                    }}
                  >
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((instructor, index) => (
                  <React.Fragment key={instructor.id}>
                    <tr
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        backgroundColor:
                          index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                        transition: "background-color 0.3s, border-color 0.3s",
                      }}
                    >
                      <td style={{ padding: "0.75rem", color: colors.text }}>
                        {instructor.user?.name || (
                          <span
                            style={{
                              color: colors.textMuted,
                              fontStyle: "italic",
                            }}
                          >
                            {t("noName")}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem", color: colors.text }}>
                        {instructor.user?.email || "N/A"}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            backgroundColor:
                              instructor.status === "ACTIVE"
                                ? "#e8f5e9"
                                : "#ffebee",
                            color:
                              instructor.status === "ACTIVE"
                                ? "#388e3c"
                                : "#c62828",
                          }}
                        >
                          {instructor.status === "ACTIVE"
                            ? t("active")
                            : t("inactive")}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          maxWidth: "200px",
                          color: colors.text,
                        }}
                      >
                        {instructor.bio ? (
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={instructor.bio}
                          >
                            {instructor.bio}
                          </span>
                        ) : (
                          <span
                            style={{
                              color: colors.textMuted,
                              fontStyle: "italic",
                            }}
                          >
                            {t("noBio")}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {instructor.specialties &&
                        instructor.specialties.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.25rem",
                            }}
                          >
                            {instructor.specialties.map((specialty, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: "0.125rem 0.5rem",
                                  backgroundColor:
                                    theme === "dark" ? "#1e3a5f" : "#e3f2fd",
                                  color:
                                    theme === "dark" ? "#90caf9" : "#1976d2",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span
                            style={{
                              color: colors.textMuted,
                              fontStyle: "italic",
                            }}
                          >
                            {t("none")}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          textAlign: "center",
                          color: colors.text,
                        }}
                      >
                        {instructor._count?.classes || 0}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          textAlign: "center",
                          color: colors.text,
                        }}
                      >
                        {instructor._count?.sessions || 0}
                      </td>
                      <td style={{ padding: "0.75rem", color: colors.text }}>
                        {formatDate(instructor.createdAt)}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            onClick={() => handleEdit(instructor)}
                            disabled={
                              editingId === instructor.id ||
                              deletingId === instructor.id
                            }
                            style={{
                              padding: "0.25rem 0.5rem",
                              backgroundColor: "#ff9800",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor:
                                editingId === instructor.id ||
                                deletingId === instructor.id
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "0.75rem",
                              opacity:
                                editingId === instructor.id ||
                                deletingId === instructor.id
                                  ? 0.5
                                  : 1,
                            }}
                          >
                            {t("edit")}
                          </button>
                          <button
                            onClick={() => handleDelete(instructor.id)}
                            disabled={
                              editingId === instructor.id ||
                              deletingId === instructor.id
                            }
                            style={{
                              padding: "0.25rem 0.5rem",
                              backgroundColor: "#f44336",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor:
                                editingId === instructor.id ||
                                deletingId === instructor.id
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "0.75rem",
                              opacity:
                                editingId === instructor.id ||
                                deletingId === instructor.id
                                  ? 0.5
                                  : 1,
                            }}
                          >
                            {deletingId === instructor.id
                              ? t("deleting")
                              : t("delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingId === instructor.id && (
                      <tr key={`${instructor.id}-edit`}>
                        <td
                          colSpan={9}
                          style={{
                            padding: "1rem",
                            backgroundColor: "#f9f9f9",
                          }}
                        >
                          <div
                            style={{
                              padding: "1rem",
                              backgroundColor: "white",
                              borderRadius: "4px",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <h4 style={{ marginTop: 0, marginBottom: "1rem" }}>
                              {t("editInstructor")}
                            </h4>
                            <div
                              style={{
                                display: "grid",
                                gap: "1rem",
                                gridTemplateColumns: "1fr 1fr 1fr auto",
                              }}
                            >
                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    marginBottom: "0.5rem",
                                    fontWeight: "bold",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {t("bio")}
                                </label>
                                <textarea
                                  value={editForm.bio || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      bio: e.target.value,
                                    })
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    fontSize: "0.875rem",
                                    minHeight: "60px",
                                  }}
                                  placeholder={t("instructorBioPlaceholder")}
                                />
                              </div>
                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    marginBottom: "0.5rem",
                                    fontWeight: "bold",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {t("specialtiesCommaSeparated")}
                                </label>
                                <input
                                  type="text"
                                  value={editForm.specialties?.join(", ") || ""}
                                  onChange={(e) =>
                                    handleSpecialtyChange(e.target.value)
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    fontSize: "0.875rem",
                                  }}
                                  placeholder={t("specialtiesPlaceholder")}
                                />
                              </div>
                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    marginBottom: "0.5rem",
                                    fontWeight: "bold",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {t("status")}
                                </label>
                                <select
                                  value={editForm.status || "ACTIVE"}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      status: e.target.value,
                                    })
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  <option value="ACTIVE">{t("active")}</option>
                                  <option value="INACTIVE">
                                    {t("inactive")}
                                  </option>
                                </select>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "flex-end",
                                  gap: "0.5rem",
                                }}
                              >
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={saving}
                                  style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "#4caf50",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: saving ? "not-allowed" : "pointer",
                                    opacity: saving ? 0.6 : 1,
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {saving ? t("saving") : t("save")}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={saving}
                                  style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "#999",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: saving ? "not-allowed" : "pointer",
                                    opacity: saving ? 0.6 : 1,
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {t("cancel")}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
              <p>{t("noInstructorsFound")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
