"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";
import { showToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";

interface Package {
  id: string;
  code: string;
  name: string;
  nameTr?: string;
  type: string;
  price: number;
  credits?: number;
  pricePerCredit?: number;
  basePrice?: number;
  discountAmount?: number;
  discountPercentage?: number;
  description?: string;
  descriptionTr?: string;
  benefits?: string[];
  isActive: boolean;
  displayOrder: number;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    packageId: string;
    packageName: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nameTr: "",
    type: "SINGLE_RIDE",
    price: "",
    credits: "",
    description: "",
    descriptionTr: "",
    benefits: [] as string[],
    displayOrder: 0,
  });
  const [saving, setSaving] = useState(false);
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
    fetchPackages(authToken);
  }, [router]);

  const fetchPackages = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/packages", {
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
      setPackages(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch packages");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      const packageData = {
        code: formData.code,
        name: formData.name,
        nameTr: formData.nameTr || undefined,
        type: formData.type,
        price: parseFloat(formData.price),
        credits:
          formData.type !== "ALL_ACCESS"
            ? parseInt(formData.credits) || undefined
            : undefined,
        description: formData.description || undefined,
        descriptionTr: formData.descriptionTr || undefined,
        benefits: formData.benefits.length > 0 ? formData.benefits : undefined,
        displayOrder: formData.displayOrder,
      };

      const response = await fetch("/api/packages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(packageData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchPackages(token);
      setShowForm(false);
      setFormData({
        code: "",
        name: "",
        nameTr: "",
        type: "SINGLE_RIDE",
        price: "",
        credits: "",
        description: "",
        descriptionTr: "",
        benefits: [],
        displayOrder: 0,
      });
      showToast(
        t("package") +
          " " +
          (t("createdSuccessfully") || "created successfully"),
        "success"
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create package");
      showToast(
        err instanceof Error ? err.message : "Failed to create package",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    setFormData({
      code: pkg.code,
      name: pkg.name,
      nameTr: pkg.nameTr || "",
      type: pkg.type,
      price: pkg.price.toString(),
      credits: pkg.credits?.toString() || "",
      description: pkg.description || "",
      descriptionTr: pkg.descriptionTr || "",
      benefits: Array.isArray(pkg.benefits) ? pkg.benefits : [],
      displayOrder: pkg.displayOrder,
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingId) return;

    setSaving(true);
    setError(null);

    try {
      const packageData = {
        code: formData.code,
        name: formData.name,
        nameTr: formData.nameTr || undefined,
        type: formData.type,
        price: parseFloat(formData.price),
        credits:
          formData.type !== "ALL_ACCESS"
            ? parseInt(formData.credits) || undefined
            : undefined,
        description: formData.description || undefined,
        descriptionTr: formData.descriptionTr || undefined,
        benefits: formData.benefits.length > 0 ? formData.benefits : undefined,
        displayOrder: formData.displayOrder,
      };

      const response = await fetch(`/api/packages/${editingId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(packageData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchPackages(token);
      setShowForm(false);
      setEditingId(null);
      setFormData({
        code: "",
        name: "",
        nameTr: "",
        type: "SINGLE_RIDE",
        price: "",
        credits: "",
        description: "",
        descriptionTr: "",
        benefits: [],
        displayOrder: 0,
      });
      showToast(
        t("package") +
          " " +
          (t("updatedSuccessfully") || "updated successfully"),
        "success"
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update package");
      showToast(
        err instanceof Error ? err.message : "Failed to update package",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteModal) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/packages/${deleteModal.packageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchPackages(token);
      setDeleteModal(null);
      showToast(
        t("package") +
          " " +
          (t("deletedSuccessfully") || "deleted successfully"),
        "success"
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete package");
      showToast(
        err instanceof Error ? err.message : "Failed to delete package",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
    }).format(price);
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
        backgroundColor: colors.cardBg,
        borderRadius: "8px",
        padding: "1.5rem",
        boxShadow:
          theme === "light"
            ? "0 2px 4px rgba(0,0,0,0.1)"
            : "0 2px 4px rgba(0,0,0,0.3)",
        border: `1px solid ${colors.border}`,
        color: colors.text,
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
        <h2 style={{ margin: 0, fontSize: "1.5rem", color: colors.text }}>
          {t("packages") || "Packages"}
        </h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              code: "",
              name: "",
              nameTr: "",
              type: "SINGLE_RIDE",
              price: "",
              credits: "",
              description: "",
              descriptionTr: "",
              benefits: [],
              displayOrder: 0,
            });
          }}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          {t("addPackage") || "Add Package"}
        </button>
      </div>

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

      {packages.length === 0 && !loading ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: colors.textSecondary,
          }}
        >
          {t("noPackagesFound") || "No packages found"}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: colors.theadBg }}>
              <tr>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("packageCode") || "Code"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("packageName") || "Name"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("packageType") || "Type"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "right",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("packagePrice") || "Price"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "right",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("packageCredits") || "Credits"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("status") || "Status"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("actions") || "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, index) => (
                <tr
                  key={pkg.id}
                  style={{
                    backgroundColor:
                      index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                  }}
                >
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {pkg.code}
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {language === "tr" && pkg.nameTr ? pkg.nameTr : pkg.name}
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {pkg.type === "SINGLE_RIDE"
                      ? t("singleRide")
                      : pkg.type === "CREDIT_PACK"
                      ? t("creditPack")
                      : pkg.type === "ELITE_30"
                      ? t("elite30")
                      : t("allAccess")}
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      textAlign: "right",
                      color: colors.text,
                    }}
                  >
                    {formatPrice(pkg.price)}
                    {pkg.discountPercentage && pkg.discountPercentage > 0 && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: colors.success,
                          marginTop: "0.25rem",
                        }}
                      >
                        {t("save") || "Save"}{" "}
                        {formatPrice(pkg.discountAmount || 0)} (
                        {pkg.discountPercentage.toFixed(1)}%)
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      textAlign: "right",
                      color: colors.text,
                    }}
                  >
                    {pkg.credits || "-"}
                    {pkg.pricePerCredit && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: colors.textMuted,
                          marginTop: "0.25rem",
                        }}
                      >
                        {formatPrice(pkg.pricePerCredit)} /{" "}
                        {t("credit") || "credit"}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        backgroundColor: pkg.isActive
                          ? colors.success + "20"
                          : colors.error + "20",
                        color: pkg.isActive ? colors.success : colors.error,
                      }}
                    >
                      {pkg.isActive
                        ? t("active") || "Active"
                        : t("inactive") || "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={() => handleEdit(pkg)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: "#1976d2",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        {t("edit") || "Edit"}
                      </button>
                      <button
                        onClick={() =>
                          setDeleteModal({
                            isOpen: true,
                            packageId: pkg.id,
                            packageName: pkg.name,
                          })
                        }
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: colors.error,
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        {t("delete") || "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
            setFormData({
              code: "",
              name: "",
              nameTr: "",
              type: "SINGLE_RIDE",
              price: "",
              credits: "",
              description: "",
              descriptionTr: "",
              benefits: [],
              displayOrder: 0,
            });
          }}
          title={
            editingId
              ? t("editPackage") || "Edit Package"
              : t("addPackage") || "Add Package"
          }
        >
          <form
            onSubmit={editingId ? handleUpdate : handleCreate}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {t("packageCode") || "Code"}{" "}
                <span style={{ color: colors.error }}>*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "4px",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                }}
                placeholder="e.g., SINGLE-RIDE"
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
                {t("packageName") || "Name"}{" "}
                <span style={{ color: colors.error }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "4px",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
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
                {t("packageName") || "Name"} (TR)
              </label>
              <input
                type="text"
                value={formData.nameTr}
                onChange={(e) =>
                  setFormData({ ...formData, nameTr: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "4px",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
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
                {t("packageType") || "Type"}{" "}
                <span style={{ color: colors.error }}>*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "4px",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                }}
              >
                <option value="SINGLE_RIDE">
                  {t("singleRide") || "Single Ride"}
                </option>
                <option value="CREDIT_PACK">
                  {t("creditPack") || "Credit Pack"}
                </option>
                <option value="ELITE_30">{t("elite30") || "Elite 30"}</option>
                <option value="ALL_ACCESS">
                  {t("allAccess") || "All Access"}
                </option>
              </select>
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
                {t("packagePrice") || "Price"} (TL){" "}
                <span style={{ color: colors.error }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "4px",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                }}
              />
            </div>

            {formData.type !== "ALL_ACCESS" && (
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {t("packageCredits") || "Credits"}{" "}
                  <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.credits}
                  onChange={(e) =>
                    setFormData({ ...formData, credits: e.target.value })
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "4px",
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  }}
                />
              </div>
            )}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {t("packageDescription") || "Description"}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "4px",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                }}
              />
            </div>

            {formData.type === "ELITE_30" && (
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {t("packageBenefits") || "Benefits"}
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {["friend_pass", "priority_booking", "elite_badge"].map(
                    (benefit) => (
                      <label
                        key={benefit}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          color: colors.text,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.benefits.includes(benefit)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                benefits: [...formData.benefits, benefit],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                benefits: formData.benefits.filter(
                                  (b) => b !== benefit
                                ),
                              });
                            }
                          }}
                        />
                        {benefit
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </label>
                    )
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
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
                type="submit"
                disabled={saving}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? t("saving") || "Saving..."
                  : editingId
                  ? t("update") || "Update"
                  : t("create") || "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(null)}
          title={t("deletePackage") || "Delete Package"}
        >
          <p style={{ color: colors.text }}>
            {t("confirmDelete") || "Are you sure you want to delete"}{" "}
            {deleteModal.packageName}?
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "flex-end",
              marginTop: "1rem",
            }}
          >
            <button
              onClick={() => setDeleteModal(null)}
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
              onClick={handleDelete}
              disabled={saving}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: colors.error,
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? t("deleting") || "Deleting..."
                : t("delete") || "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}





