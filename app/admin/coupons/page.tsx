"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";
import { showToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";

interface Coupon {
  id: string;
  code: string;
  name: string;
  nameTr?: string;
  couponType: string;
  packageId?: string;
  customPrice?: number;
  customCredits?: number;
  discountType?: string;
  discountValue?: number;
  applicablePackageIds?: string[];
  bonusCredits?: number;
  validFrom?: string;
  validUntil?: string;
  maxRedemptions?: number;
  maxRedemptionsPerMember: number;
  isActive: boolean;
  package?: {
    id: string;
    code: string;
    name: string;
  };
}

interface Package {
  id: string;
  code: string;
  name: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    couponId: string;
    couponName: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nameTr: "",
    couponType: "DISCOUNT",
    packageId: "",
    customPrice: "",
    customCredits: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    applicablePackageIds: [] as string[],
    bonusCredits: "",
    validFrom: "",
    validUntil: "",
    maxRedemptions: "",
    maxRedemptionsPerMember: 1,
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
    fetchCoupons(authToken);
    fetchPackages(authToken);
  }, [router]);

  const fetchCoupons = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/coupons", {
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
      setCoupons(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async (authToken: string) => {
    try {
      const response = await fetch("/api/packages", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPackages(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      console.error("Error fetching packages:", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      const couponData: any = {
        code: formData.code,
        name: formData.name,
        nameTr: formData.nameTr || undefined,
        couponType: formData.couponType,
        maxRedemptionsPerMember: formData.maxRedemptionsPerMember,
      };

      if (formData.couponType === "PACKAGE") {
        if (formData.packageId) couponData.packageId = formData.packageId;
        if (formData.customPrice)
          couponData.customPrice = parseFloat(formData.customPrice);
        if (formData.customCredits)
          couponData.customCredits = parseInt(formData.customCredits);
      } else if (formData.couponType === "DISCOUNT") {
        couponData.discountType = formData.discountType;
        if (formData.discountValue)
          couponData.discountValue = parseFloat(formData.discountValue);
        if (formData.applicablePackageIds.length > 0)
          couponData.applicablePackageIds = formData.applicablePackageIds;
      } else if (formData.couponType === "CREDIT_BONUS") {
        if (formData.bonusCredits)
          couponData.bonusCredits = parseInt(formData.bonusCredits);
      }

      if (formData.validFrom) couponData.validFrom = formData.validFrom;
      if (formData.validUntil) couponData.validUntil = formData.validUntil;
      if (formData.maxRedemptions)
        couponData.maxRedemptions = parseInt(formData.maxRedemptions);

      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(couponData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchCoupons(token);
      setShowForm(false);
      resetForm();
      showToast(
        t("coupon") +
          " " +
          (t("createdSuccessfully") || "created successfully"),
        "success"
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create coupon");
      showToast(
        err instanceof Error ? err.message : "Failed to create coupon",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      nameTr: coupon.nameTr || "",
      couponType: coupon.couponType,
      packageId: coupon.packageId || "",
      customPrice: coupon.customPrice?.toString() || "",
      customCredits: coupon.customCredits?.toString() || "",
      discountType: coupon.discountType || "PERCENTAGE",
      discountValue: coupon.discountValue?.toString() || "",
      applicablePackageIds: coupon.applicablePackageIds || [],
      bonusCredits: coupon.bonusCredits?.toString() || "",
      validFrom: coupon.validFrom
        ? new Date(coupon.validFrom).toISOString().split("T")[0]
        : "",
      validUntil: coupon.validUntil
        ? new Date(coupon.validUntil).toISOString().split("T")[0]
        : "",
      maxRedemptions: coupon.maxRedemptions?.toString() || "",
      maxRedemptionsPerMember: coupon.maxRedemptionsPerMember,
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingId) return;

    setSaving(true);
    setError(null);

    try {
      const couponData: any = {
        code: formData.code,
        name: formData.name,
        nameTr: formData.nameTr || undefined,
        couponType: formData.couponType,
        maxRedemptionsPerMember: formData.maxRedemptionsPerMember,
      };

      if (formData.couponType === "PACKAGE") {
        if (formData.packageId) couponData.packageId = formData.packageId;
        if (formData.customPrice)
          couponData.customPrice = parseFloat(formData.customPrice);
        if (formData.customCredits)
          couponData.customCredits = parseInt(formData.customCredits);
      } else if (formData.couponType === "DISCOUNT") {
        couponData.discountType = formData.discountType;
        if (formData.discountValue)
          couponData.discountValue = parseFloat(formData.discountValue);
        if (formData.applicablePackageIds.length > 0)
          couponData.applicablePackageIds = formData.applicablePackageIds;
      } else if (formData.couponType === "CREDIT_BONUS") {
        if (formData.bonusCredits)
          couponData.bonusCredits = parseInt(formData.bonusCredits);
      }

      if (formData.validFrom) couponData.validFrom = formData.validFrom;
      if (formData.validUntil) couponData.validUntil = formData.validUntil;
      if (formData.maxRedemptions)
        couponData.maxRedemptions = parseInt(formData.maxRedemptions);

      const response = await fetch(`/api/coupons/${editingId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(couponData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchCoupons(token);
      setShowForm(false);
      setEditingId(null);
      resetForm();
      showToast(
        t("coupon") +
          " " +
          (t("updatedSuccessfully") || "updated successfully"),
        "success"
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update coupon");
      showToast(
        err instanceof Error ? err.message : "Failed to update coupon",
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
      const response = await fetch(`/api/coupons/${deleteModal.couponId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchCoupons(token);
      setDeleteModal(null);
      showToast(
        t("coupon") +
          " " +
          (t("deletedSuccessfully") || "deleted successfully"),
        "success"
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete coupon");
      showToast(
        err instanceof Error ? err.message : "Failed to delete coupon",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      nameTr: "",
      couponType: "DISCOUNT",
      packageId: "",
      customPrice: "",
      customCredits: "",
      discountType: "PERCENTAGE",
      discountValue: "",
      applicablePackageIds: [],
      bonusCredits: "",
      validFrom: "",
      validUntil: "",
      maxRedemptions: "",
      maxRedemptionsPerMember: 1,
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
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
          {t("coupons") || "Coupons"}
        </h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            resetForm();
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
          {t("addCoupon") || "Add Coupon"}
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

      {coupons.length === 0 && !loading ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: colors.textSecondary,
          }}
        >
          {t("noCouponsFound") || "No coupons found"}
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
                  {t("couponCode") || "Code"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("couponName") || "Name"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("couponType") || "Type"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("details") || "Details"}
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
              {coupons.map((coupon, index) => (
                <tr
                  key={coupon.id}
                  style={{
                    backgroundColor:
                      index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                  }}
                >
                  <td style={{ padding: "1rem", color: colors.text }}>
                    <code
                      style={{
                        backgroundColor: colors.theadBg,
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                      }}
                    >
                      {coupon.code}
                    </code>
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {language === "tr" && coupon.nameTr
                      ? coupon.nameTr
                      : coupon.name}
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {coupon.couponType === "DISCOUNT"
                      ? t("discountCoupon")
                      : coupon.couponType === "PACKAGE"
                      ? t("packageCoupon")
                      : t("creditBonusCoupon")}
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      color: colors.text,
                      fontSize: "0.875rem",
                    }}
                  >
                    {coupon.couponType === "DISCOUNT" && (
                      <div>
                        {coupon.discountType === "PERCENTAGE"
                          ? `${coupon.discountValue}%`
                          : `${coupon.discountValue} TL`}
                        {coupon.applicablePackageIds &&
                          coupon.applicablePackageIds.length > 0 && (
                            <div
                              style={{
                                color: colors.textMuted,
                                marginTop: "0.25rem",
                              }}
                            >
                              {coupon.applicablePackageIds.length}{" "}
                              {t("packages") || "packages"}
                            </div>
                          )}
                      </div>
                    )}
                    {coupon.couponType === "PACKAGE" && coupon.package && (
                      <div>{coupon.package.name}</div>
                    )}
                    {coupon.couponType === "CREDIT_BONUS" && (
                      <div>
                        +{coupon.bonusCredits} {t("credits") || "credits"}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        backgroundColor: coupon.isActive
                          ? colors.success + "20"
                          : colors.error + "20",
                        color: coupon.isActive ? colors.success : colors.error,
                      }}
                    >
                      {coupon.isActive
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
                        onClick={() => handleEdit(coupon)}
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
                            couponId: coupon.id,
                            couponName: coupon.name,
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
            resetForm();
          }}
          title={
            editingId
              ? t("editCoupon") || "Edit Coupon"
              : t("addCoupon") || "Add Coupon"
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
                {t("couponCode") || "Code"}{" "}
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
                placeholder="e.g., SUMMER2024"
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
                {t("couponName") || "Name"}{" "}
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
                {t("couponType") || "Coupon Type"}{" "}
                <span style={{ color: colors.error }}>*</span>
              </label>
              <select
                value={formData.couponType}
                onChange={(e) =>
                  setFormData({ ...formData, couponType: e.target.value })
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
                <option value="DISCOUNT">
                  {t("discountCoupon") || "Discount Coupon"}
                </option>
                <option value="PACKAGE">
                  {t("packageCoupon") || "Package Coupon"}
                </option>
                <option value="CREDIT_BONUS">
                  {t("creditBonusCoupon") || "Credit Bonus"}
                </option>
              </select>
            </div>

            {formData.couponType === "DISCOUNT" && (
              <>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {t("discountType") || "Discount Type"}{" "}
                    <span style={{ color: colors.error }}>*</span>
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value,
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
                  >
                    <option value="PERCENTAGE">
                      {t("percentage") || "Percentage"}
                    </option>
                    <option value="FIXED_AMOUNT">
                      {t("fixedAmount") || "Fixed Amount"}
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
                    {t("discountValue") || "Discount Value"}{" "}
                    <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountValue: e.target.value,
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
                    placeholder={
                      formData.discountType === "PERCENTAGE"
                        ? "e.g., 15 for 15%"
                        : "e.g., 500 for 500 TL"
                    }
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
                    {t("applicablePackages") || "Applicable Packages"}
                  </label>
                  <div
                    style={{
                      maxHeight: "150px",
                      overflowY: "auto",
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "4px",
                      padding: "0.5rem",
                      backgroundColor: colors.inputBg,
                    }}
                  >
                    {packages.map((pkg) => (
                      <label
                        key={pkg.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          color: colors.text,
                          marginBottom: "0.5rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.applicablePackageIds.includes(
                            pkg.id
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                applicablePackageIds: [
                                  ...formData.applicablePackageIds,
                                  pkg.id,
                                ],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                applicablePackageIds:
                                  formData.applicablePackageIds.filter(
                                    (id) => id !== pkg.id
                                  ),
                              });
                            }
                          }}
                        />
                        {pkg.name} ({pkg.code})
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {formData.couponType === "PACKAGE" && (
              <>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {t("selectPackage") || "Select Package"}
                  </label>
                  <select
                    value={formData.packageId}
                    onChange={(e) =>
                      setFormData({ ...formData, packageId: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "4px",
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                    }}
                  >
                    <option value="">{t("none") || "None"}</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.code})
                      </option>
                    ))}
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
                    {t("customPrice") || "Custom Price"} (TL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.customPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customPrice: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "4px",
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                    }}
                    placeholder="Override package price"
                  />
                </div>
              </>
            )}

            {formData.couponType === "CREDIT_BONUS" && (
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {t("bonusCredits") || "Bonus Credits"}{" "}
                  <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.bonusCredits}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bonusCredits: e.target.value,
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
                {t("validFrom") || "Valid From"}
              </label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) =>
                  setFormData({ ...formData, validFrom: e.target.value })
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
                {t("validUntil") || "Valid Until"}
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
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
                {t("maxRedemptions") || "Max Redemptions"}
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxRedemptions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxRedemptions: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "4px",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                }}
                placeholder="Leave empty for unlimited"
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
                {t("maxRedemptionsPerMember") || "Max Per Member"}
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxRedemptionsPerMember}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxRedemptionsPerMember: parseInt(e.target.value) || 1,
                  })
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
                  resetForm();
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
          title={t("deleteCoupon") || "Delete Coupon"}
        >
          <p style={{ color: colors.text }}>
            {t("confirmDelete") || "Are you sure you want to delete"}{" "}
            {deleteModal.couponName}?
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


