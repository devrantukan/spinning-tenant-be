"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";
import { showToast } from "@/components/Toast";
import dynamic from "next/dynamic";

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

interface Instructor {
  id: string;
  userId: string;
  organizationId: string;
  bio?: string;
  bioTr?: string;
  photoUrl?: string;
  specialties?: string[];
  specialtiesTr?: string[];
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newInstructor, setNewInstructor] = useState({
    email: "",
    name: "",
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    instructorId: string;
    instructorName: string;
  } | null>(null);
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
      inputBg: "white",
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
      inputBg: "#252525",
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
      bioTr: instructor.bioTr || "",
      photoUrl: instructor.photoUrl || "",
      specialties: instructor.specialties || [],
      specialtiesTr: instructor.specialtiesTr || [],
      status: instructor.status,
    });
    setPhotoPreview(instructor.photoUrl || null);
    setPhotoFile(null);
    setEditingId(instructor.id);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setPhotoFile(null);
    setPhotoPreview(null);
    setError(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        showToast(
          t("invalidFileType") ||
            "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
          "error"
        );
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast(
          t("fileSizeExceeded") || "File size exceeds 5MB limit",
          "error"
        );
        return;
      }

      setPhotoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!token || !editingId) return;

    setSaving(true);
    setError(null);

    try {
      // Upload photo first if a new photo was selected
      let photoUrl = editForm.photoUrl;
      if (photoFile) {
        setUploadingPhoto(true);
        const photoFormData = new FormData();
        photoFormData.append("photo", photoFile);

        const photoResponse = await fetch(
          `/api/instructors/${editingId}/photo`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: photoFormData,
          }
        );

        if (!photoResponse.ok) {
          const errorData = await photoResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to upload photo");
        }

        const photoData = await photoResponse.json();
        photoUrl = photoData.photoUrl;
        setUploadingPhoto(false);
      }

      // Update instructor data
      const updateData: any = {};
      if (editForm.bio !== undefined) updateData.bio = editForm.bio || null;
      if (editForm.bioTr !== undefined) updateData.bioTr = editForm.bioTr || null;
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null;
      if (editForm.specialties !== undefined)
        updateData.specialties = editForm.specialties;
      if (editForm.specialtiesTr !== undefined)
        updateData.specialtiesTr = editForm.specialtiesTr;
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
      setPhotoFile(null);
      setPhotoPreview(null);
      showToast(
        t("instructorUpdatedSuccessfully") || "Instructor updated successfully",
        "success"
      );
    } catch (err: any) {
      setError(err.message || "Failed to update instructor");
      showToast(err.message || "Failed to update instructor", "error");
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  };

  // ReactQuill modules configuration
  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }],
        ["link"],
        [{ color: [] }, { background: [] }],
        ["clean"],
      ],
    }),
    []
  );

  const handleDeleteClick = (id: string, instructorName: string) => {
    setDeleteModal({ isOpen: true, instructorId: id, instructorName });
  };

  const handleDelete = async () => {
    if (!token || !deleteModal) return;

    const { instructorId } = deleteModal;
    setDeleteModal(null);
    setDeletingId(instructorId);
    setError(null);

    try {
      const response = await fetch(`/api/instructors/${instructorId}`, {
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

      setInstructors(instructors.filter((i) => i.id !== instructorId));
      setDeletingId(null);
      showToast(
        t("instructorDeletedSuccessfully") || "Instructor deleted successfully",
        "success"
      );
    } catch (err: any) {
      const errorMsg = err.message || "Failed to delete instructor";
      setError(errorMsg);
      setDeletingId(null);
      showToast(errorMsg, "error");
    }
  };

  const handleSpecialtyChange = (value: string, lang: "en" | "tr" = "en") => {
    const specialties = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    
    if (lang === "tr") {
      setEditForm({ ...editForm, specialtiesTr: specialties });
    } else {
      setEditForm({ ...editForm, specialties: specialties });
    }
  };

  const handleAddInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setAdding(true);
    setError(null);

    try {
      // Create user with INSTRUCTOR role
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newInstructor.email,
          name: newInstructor.name || undefined,
          role: "INSTRUCTOR",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const created = await response.json();

      // Refresh instructors list
      await fetchInstructors(token);

      // Reset form
      setNewInstructor({ email: "", name: "" });
      setShowAddForm(false);

      // Show success message
      setError(null);
      showToast(
        `${t("createNewInstructor")} ${t("successfully") || "successfully"}! ${
          t("invitationSent") || "Invitation sent to"
        } ${created.email}`,
        "success"
      );
    } catch (err: any) {
      const errorMsg = err.message || "Failed to add instructor";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setAdding(false);
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
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showAddForm ? t("cancel") : t("addInstructor") || "Add Instructor"}
          </button>
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

      {showAddForm && (
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: theme === "dark" ? "#2a2a2a" : "#f9f9f9",
            borderRadius: "4px",
            marginBottom: "1.5rem",
            border: `1px solid ${colors.border}`,
          }}
        >
          <h3
            style={{ marginTop: 0, marginBottom: "1rem", color: colors.text }}
          >
            {t("createNewInstructor")}
          </h3>
          <p
            style={{
              marginBottom: "1rem",
              color: colors.textSecondary,
              fontSize: "0.875rem",
            }}
          >
            {t("createNewInstructorDescription")}
          </p>
          <form onSubmit={handleAddInstructor}>
            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "1fr 1fr auto",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                    color: colors.text,
                  }}
                >
                  {t("email")} *
                </label>
                <input
                  type="email"
                  required
                  value={newInstructor.email}
                  onChange={(e) =>
                    setNewInstructor({
                      ...newInstructor,
                      email: e.target.value,
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
                  }}
                  placeholder={t("emailPlaceholder")}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                    color: colors.text,
                  }}
                >
                  {t("name")}
                </label>
                <input
                  type="text"
                  value={newInstructor.name}
                  onChange={(e) =>
                    setNewInstructor({ ...newInstructor, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: `1px solid ${colors.border}`,
                    borderRadius: "4px",
                    fontSize: "1rem",
                    backgroundColor: colors.cardBg,
                    color: colors.text,
                  }}
                  placeholder={t("fullNamePlaceholder")}
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="submit"
                  disabled={adding}
                  style={{
                    padding: "0.5rem 1.5rem",
                    backgroundColor: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: adding ? "not-allowed" : "pointer",
                    opacity: adding ? 0.6 : 1,
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  {adding && <Spinner size={16} color="#ffffff" />}
                  {adding ? t("loading") : t("createAndSendInvite")}
                </button>
              </div>
            </div>
          </form>
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
                    {t("photo") || "Photo"}
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
                        {instructor.photoUrl ? (
                          <img
                            src={instructor.photoUrl}
                            alt={instructor.user?.name || "Instructor"}
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: `1px solid ${colors.border}`,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              backgroundColor: colors.inputBg,
                              border: `1px solid ${colors.border}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: colors.textSecondary,
                              fontSize: "0.875rem",
                              fontWeight: "bold",
                            }}
                          >
                            {(instructor.user?.name || "?").charAt(0).toUpperCase()}
                          </div>
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
                            onClick={() =>
                              handleDeleteClick(
                                instructor.id,
                                instructor.user?.name ||
                                  instructor.user?.email ||
                                  "Instructor"
                              )
                            }
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
                            padding: "1.5rem",
                            backgroundColor:
                              theme === "dark" ? "#252525" : "#f9f9f9",
                            borderBottom: `1px solid ${colors.border}`,
                            transition:
                              "background-color 0.3s, border-color 0.3s",
                          }}
                        >
                          <div
                            style={{
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
                            <h4
                              style={{
                                marginTop: 0,
                                marginBottom: "1.5rem",
                                fontSize: "1.125rem",
                                fontWeight: "600",
                                color: colors.text,
                              }}
                            >
                              {t("editInstructor")}
                            </h4>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1.5rem",
                              }}
                            >
                              <div
                                style={{
                                  display: "grid",
                                  gap: "1.5rem",
                                  gridTemplateColumns: "1fr 1fr",
                                }}
                              >
                                {typeof window !== "undefined" && ReactQuill && (
                                  <>
                                    <div style={{ gridColumn: "1 / -1" }}>
                                      <label
                                        style={{
                                          display: "block",
                                          marginBottom: "0.5rem",
                                          fontWeight: "600",
                                          fontSize: "0.875rem",
                                          color: colors.text,
                                        }}
                                      >
                                        {t("bio")} (EN)
                                      </label>
                                      <div
                                        style={{
                                          backgroundColor: colors.inputBg,
                                          borderRadius: "6px",
                                          overflow: "hidden",
                                        }}
                                      >
                                        <ReactQuill
                                          theme="snow"
                                          value={editForm.bio || ""}
                                          onChange={(value) =>
                                            setEditForm({
                                              ...editForm,
                                              bio: value,
                                            })
                                          }
                                          modules={quillModules}
                                          style={{
                                            minHeight: "200px",
                                            color: colors.text,
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div style={{ gridColumn: "1 / -1" }}>
                                      <label
                                        style={{
                                          display: "block",
                                          marginBottom: "0.5rem",
                                          fontWeight: "600",
                                          fontSize: "0.875rem",
                                          color: colors.text,
                                        }}
                                      >
                                        {t("bio")} (TR)
                                      </label>
                                      <div
                                        style={{
                                          backgroundColor: colors.inputBg,
                                          borderRadius: "6px",
                                          overflow: "hidden",
                                        }}
                                      >
                                        <ReactQuill
                                          theme="snow"
                                          value={editForm.bioTr || ""}
                                          onChange={(value) =>
                                            setEditForm({
                                              ...editForm,
                                              bioTr: value,
                                            })
                                          }
                                          modules={quillModules}
                                          style={{
                                            minHeight: "200px",
                                            color: colors.text,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </>
                                )}
                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      marginBottom: "0.5rem",
                                      fontWeight: "600",
                                      fontSize: "0.875rem",
                                      color: colors.text,
                                    }}
                                  >
                                    {t("photo") || "Photo"}
                                  </label>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "0.5rem",
                                    }}
                                  >
                                    {photoPreview && (
                                      <div
                                        style={{
                                          width: "150px",
                                          height: "150px",
                                          borderRadius: "8px",
                                          overflow: "hidden",
                                          border: `2px solid ${colors.border}`,
                                          backgroundColor: colors.inputBg,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        <img
                                          src={photoPreview}
                                          alt="Preview"
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                          }}
                                        />
                                      </div>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/webp"
                                      onChange={handlePhotoChange}
                                      disabled={uploadingPhoto}
                                      style={{
                                        width: "100%",
                                        padding: "0.5rem",
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: "6px",
                                        fontSize: "0.875rem",
                                        backgroundColor: colors.inputBg,
                                        color: colors.text,
                                        cursor: uploadingPhoto
                                          ? "not-allowed"
                                          : "pointer",
                                        opacity: uploadingPhoto ? 0.6 : 1,
                                      }}
                                    />
                                    {uploadingPhoto && (
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "0.5rem",
                                          fontSize: "0.875rem",
                                          color: colors.textSecondary,
                                        }}
                                      >
                                        <Spinner size={16} />
                                        <span>
                                          {t("uploading") || "Uploading..."}
                                        </span>
                                      </div>
                                    )}
                                    <p
                                      style={{
                                        fontSize: "0.75rem",
                                        color: colors.textMuted,
                                        margin: 0,
                                      }}
                                    >
                                      {t("photoUploadHint") ||
                                        "JPEG, PNG, or WebP. Max 5MB."}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      marginBottom: "0.5rem",
                                      fontWeight: "600",
                                      fontSize: "0.875rem",
                                      color: colors.text,
                                    }}
                                  >
                                    {t("specialtiesCommaSeparated")} (EN)
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      editForm.specialties?.join(", ") || ""
                                    }
                                    onChange={(e) =>
                                      handleSpecialtyChange(e.target.value, "en")
                                    }
                                    style={{
                                      width: "100%",
                                      padding: "0.75rem",
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: "6px",
                                      fontSize: "0.875rem",
                                      backgroundColor: colors.inputBg,
                                      color: colors.text,
                                      fontFamily: "inherit",
                                      transition:
                                        "border-color 0.3s, background-color 0.3s",
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = "#1976d2";
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor =
                                        colors.border;
                                    }}
                                    placeholder={t("specialtiesPlaceholder")}
                                  />
                                </div>
                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      marginBottom: "0.5rem",
                                      fontWeight: "600",
                                      fontSize: "0.875rem",
                                      color: colors.text,
                                    }}
                                  >
                                    {t("specialtiesCommaSeparated")} (TR)
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      editForm.specialtiesTr?.join(", ") || ""
                                    }
                                    onChange={(e) =>
                                      handleSpecialtyChange(e.target.value, "tr")
                                    }
                                    style={{
                                      width: "100%",
                                      padding: "0.75rem",
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: "6px",
                                      fontSize: "0.875rem",
                                      backgroundColor: colors.inputBg,
                                      color: colors.text,
                                      fontFamily: "inherit",
                                      transition:
                                        "border-color 0.3s, background-color 0.3s",
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = "#1976d2";
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor =
                                        colors.border;
                                    }}
                                    placeholder={t("specialtiesPlaceholder")}
                                  />
                                </div>
                                <div>
                                  <label
                                    style={{
                                      display: "block",
                                      marginBottom: "0.5rem",
                                      fontWeight: "600",
                                      fontSize: "0.875rem",
                                      color: colors.text,
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
                                      padding: "0.75rem",
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: "6px",
                                      fontSize: "0.875rem",
                                      backgroundColor: colors.inputBg,
                                      color: colors.text,
                                      fontFamily: "inherit",
                                      cursor: "pointer",
                                      transition:
                                        "border-color 0.3s, background-color 0.3s",
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = "#1976d2";
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor =
                                        colors.border;
                                    }}
                                  >
                                    <option value="ACTIVE">
                                      {t("active")}
                                    </option>
                                    <option value="INACTIVE">
                                      {t("inactive")}
                                    </option>
                                  </select>
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  gap: "0.75rem",
                                  paddingTop: "0.5rem",
                                }}
                              >
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={saving}
                                  style={{
                                    padding: "0.75rem 1.5rem",
                                    backgroundColor: saving
                                      ? theme === "dark"
                                        ? "#555"
                                        : "#ccc"
                                      : theme === "dark"
                                      ? "#666"
                                      : "#999",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: saving ? "not-allowed" : "pointer",
                                    opacity: saving ? 0.6 : 1,
                                    fontSize: "0.875rem",
                                    fontWeight: "600",
                                    whiteSpace: "nowrap",
                                    transition:
                                      "background-color 0.3s, opacity 0.3s",
                                    minWidth: "100px",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!saving) {
                                      e.currentTarget.style.backgroundColor =
                                        theme === "dark" ? "#777" : "#888";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!saving) {
                                      e.currentTarget.style.backgroundColor =
                                        theme === "dark" ? "#666" : "#999";
                                    }
                                  }}
                                >
                                  {t("cancel")}
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={saving}
                                  style={{
                                    padding: "0.75rem 1.5rem",
                                    backgroundColor: saving
                                      ? theme === "dark"
                                        ? "#555"
                                        : "#ccc"
                                      : "#4caf50",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: saving ? "not-allowed" : "pointer",
                                    opacity: saving ? 0.6 : 1,
                                    fontSize: "0.875rem",
                                    fontWeight: "600",
                                    whiteSpace: "nowrap",
                                    transition:
                                      "background-color 0.3s, opacity 0.3s",
                                    minWidth: "100px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.5rem",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!saving) {
                                      e.currentTarget.style.backgroundColor =
                                        "#45a049";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!saving) {
                                      e.currentTarget.style.backgroundColor =
                                        "#4caf50";
                                    }
                                  }}
                                >
                                  {saving && (
                                    <Spinner size={16} color="#ffffff" />
                                  )}
                                  {saving ? t("saving") : t("save")}
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

      {/* Delete Instructor Modal */}
      {deleteModal && (
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(null)}
          title={t("deleteInstructor") || "Delete Instructor"}
          onConfirm={handleDelete}
          confirmText={t("delete") || "Delete"}
          cancelText={t("cancel") || "Cancel"}
          confirmButtonStyle={{ backgroundColor: "#f44336" }}
        >
          <p>
            {t("deleteConfirm")?.replace(
              "{name}",
              deleteModal.instructorName
            ) ||
              `Are you sure you want to delete ${deleteModal.instructorName}?`}
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#f44336",
              marginTop: "0.5rem",
              fontWeight: "600",
            }}
          >
            {t("deleteWarning") || "This action cannot be undone."}
          </p>
        </Modal>
      )}
    </div>
  );
}
