"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";
import { showToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import Spinner from "@/components/Spinner";
import { mainBackendClient } from "@/lib/main-backend-client";

interface Location {
  id: string;
  name: string;
  description?: string;
  address?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sessions: number;
    seatLayouts: number;
  };
}

interface SeatLayout {
  id: string;
  locationId: string;
  name: string;
  description?: string;
  gridRows?: number;
  gridColumns?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  seats?: Seat[];
  _count?: {
    seats: number;
  };
}

interface Seat {
  id: string;
  seatLayoutId: string;
  seatNumber: string;
  row?: string;
  column?: number;
  type:
    | "NORMAL"
    | "EXCLUSIVE"
    | "INSTRUCTOR"
    | "PODIUM"
    | "ARCHITECTURAL_COLUMN";
  creditCost: number;
  x?: number;
  y?: number;
  isActive: boolean;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    location: Location | null;
  }>({ open: false, location: null });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(
    null
  );
  const [seatLayouts, setSeatLayouts] = useState<Record<string, SeatLayout[]>>(
    {}
  );
  const [loadingLayouts, setLoadingLayouts] = useState<Record<string, boolean>>(
    {}
  );
  const [showSeatLayoutForm, setShowSeatLayoutForm] = useState(false);
  const [editingSeatLayoutId, setEditingSeatLayoutId] = useState<string | null>(
    null
  );
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(
    null
  );
  const [seatLayoutFormData, setSeatLayoutFormData] = useState({
    name: "",
    description: "",
    gridRows: "",
    gridColumns: "",
    isActive: true,
  });
  const [deleteSeatLayoutModal, setDeleteSeatLayoutModal] = useState<{
    open: boolean;
    layout: SeatLayout | null;
    locationId: string | null;
  }>({ open: false, layout: null, locationId: null });
  const [expandedSeatLayoutId, setExpandedSeatLayoutId] = useState<
    string | null
  >(null);
  const [seats, setSeats] = useState<Record<string, Seat[]>>({});
  const [loadingSeats, setLoadingSeats] = useState<Record<string, boolean>>({});
  const [showSeatForm, setShowSeatForm] = useState(false);
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [currentSeatLayoutId, setCurrentSeatLayoutId] = useState<string | null>(
    null
  );
  const [seatFormData, setSeatFormData] = useState<{
    seatNumber: string;
    row?: string;
    column?: string;
    type:
      | "NORMAL"
      | "EXCLUSIVE"
      | "INSTRUCTOR"
      | "PODIUM"
      | "ARCHITECTURAL_COLUMN";
    creditCost: number;
    x?: number;
    y?: number;
    isActive: boolean;
  }>({
    seatNumber: "",
    row: "",
    column: "",
    type: "NORMAL" as
      | "NORMAL"
      | "EXCLUSIVE"
      | "INSTRUCTOR"
      | "PODIUM"
      | "ARCHITECTURAL_COLUMN",
    creditCost: 1,
    isActive: true,
  });
  const [deleteSeatModal, setDeleteSeatModal] = useState<{
    open: boolean;
    seat: Seat | null;
    seatLayoutId: string | null;
  }>({ open: false, seat: null, seatLayoutId: null });
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
      textMuted: "#999",
      inputBg: "white",
      inputBorder: "#ccc",
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
    fetchLocations(authToken);
  }, [router]);

  const fetchLocations = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/locations", {
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
      setLocations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch locations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: "",
      description: "",
      address: "",
      isDefault: false,
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (location: Location) => {
    setFormData({
      name: location.name,
      description: location.description || "",
      address: location.address || "",
      isDefault: location.isDefault,
    });
    setEditingId(location.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token) {
      setShowForm(false);
      return;
    }
    if (!formData.name.trim()) {
      showToast(t("locationName") + " " + t("isRequired"), "error");
      // Don't close modal on validation error
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingId ? `/api/locations/${editingId}` : "/api/locations";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchLocations(token);
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        address: "",
        isDefault: false,
      });
      showToast(
        editingId
          ? (t("location") || "Location") +
              " " +
              (t("updated") || "updated") +
              " " +
              (t("successfully") || "successfully")
          : (t("location") || "Location") +
              " " +
              (t("created") || "created") +
              " " +
              (t("successfully") || "successfully"),
        "success"
      );
      // Close modal on success
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to save location");
      showToast(err.message || "Failed to save location", "error");
      // Throw error to prevent Modal from auto-closing on error
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteModal.location) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/locations/${deleteModal.location.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchLocations(token);
      showToast(
        (t("location") || "Location") +
          " " +
          (t("deleted") || "deleted") +
          " " +
          (t("successfully") || "successfully"),
        "success"
      );
      // Modal will close via onConfirm
    } catch (err: any) {
      showToast(err.message || "Failed to delete location", "error");
    } finally {
      setSaving(false);
    }
  };

  const fetchSeatLayouts = async (locationId: string) => {
    if (!token) return;

    setLoadingLayouts((prev) => ({ ...prev, [locationId]: true }));
    try {
      const response = await fetch(
        `/api/locations/${locationId}/seat-layouts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSeatLayouts((prev) => ({
          ...prev,
          [locationId]: Array.isArray(data) ? data : [],
        }));
      }
    } catch (err) {
      console.error("Error fetching seat layouts:", err);
    } finally {
      setLoadingLayouts((prev) => ({ ...prev, [locationId]: false }));
    }
  };

  const toggleLocationExpanded = (locationId: string) => {
    if (expandedLocationId === locationId) {
      setExpandedLocationId(null);
    } else {
      setExpandedLocationId(locationId);
      if (!seatLayouts[locationId]) {
        fetchSeatLayouts(locationId);
      }
    }
  };

  const handleCreateSeatLayout = () => {
    if (!expandedLocationId) return;
    setSeatLayoutFormData({
      name: "",
      description: "",
      gridRows: "",
      gridColumns: "",
      isActive: true,
    });
    setEditingSeatLayoutId(null);
    setCurrentLocationId(expandedLocationId);
    setShowSeatLayoutForm(true);
  };

  const handleEditSeatLayout = (layout: SeatLayout) => {
    setSeatLayoutFormData({
      name: layout.name,
      description: layout.description || "",
      gridRows: layout.gridRows?.toString() || "",
      gridColumns: layout.gridColumns?.toString() || "",
      isActive: layout.isActive,
    });
    setEditingSeatLayoutId(layout.id);
    setCurrentLocationId(layout.locationId);
    setShowSeatLayoutForm(true);
  };

  const handleSaveSeatLayout = async () => {
    if (!token || !currentLocationId) return;
    if (!seatLayoutFormData.name.trim()) {
      showToast(t("layoutName") + " " + t("isRequired"), "error");
      return;
    }

    setSaving(true);
    try {
      const url = editingSeatLayoutId
        ? `/api/seat-layouts/${editingSeatLayoutId}`
        : `/api/locations/${currentLocationId}/seat-layouts`;
      const method = editingSeatLayoutId ? "PATCH" : "POST";

      const layoutData: any = {
        name: seatLayoutFormData.name,
        description: seatLayoutFormData.description || undefined,
        isActive: seatLayoutFormData.isActive,
      };

      // Only include grid dimensions if provided
      if (seatLayoutFormData.gridRows && seatLayoutFormData.gridRows.trim()) {
        const rows = parseInt(seatLayoutFormData.gridRows);
        if (!isNaN(rows) && rows > 0) {
          layoutData.gridRows = rows;
        }
      }
      if (
        seatLayoutFormData.gridColumns &&
        seatLayoutFormData.gridColumns.trim()
      ) {
        const cols = parseInt(seatLayoutFormData.gridColumns);
        if (!isNaN(cols) && cols > 0) {
          layoutData.gridColumns = cols;
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(layoutData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchSeatLayouts(currentLocationId);
      setShowSeatLayoutForm(false);
      setEditingSeatLayoutId(null);
      setCurrentLocationId(null);
      showToast(
        editingSeatLayoutId
          ? (t("seatLayout") || "Seat Layout") +
              " " +
              (t("updated") || "updated") +
              " " +
              (t("successfully") || "successfully")
          : (t("seatLayout") || "Seat Layout") +
              " " +
              (t("created") || "created") +
              " " +
              (t("successfully") || "successfully"),
        "success"
      );
      setShowSeatLayoutForm(false);
    } catch (err: any) {
      showToast(err.message || "Failed to save seat layout", "error");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSeatLayout = async () => {
    if (
      !token ||
      !deleteSeatLayoutModal.layout ||
      !deleteSeatLayoutModal.locationId
    )
      return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/seat-layouts/${deleteSeatLayoutModal.layout.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchSeatLayouts(deleteSeatLayoutModal.locationId);
      setDeleteSeatLayoutModal({ open: false, layout: null, locationId: null });
      showToast(
        (t("seatLayout") || "Seat Layout") +
          " " +
          (t("deleted") || "deleted") +
          " " +
          (t("successfully") || "successfully"),
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Failed to delete seat layout", "error");
    } finally {
      setSaving(false);
    }
  };

  const fetchSeats = async (seatLayoutId: string) => {
    if (!token) return;

    setLoadingSeats((prev) => ({ ...prev, [seatLayoutId]: true }));
    try {
      const response = await fetch(`/api/seat-layouts/${seatLayoutId}/seats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSeats((prev) => ({
          ...prev,
          [seatLayoutId]: Array.isArray(data) ? data : [],
        }));
      }
    } catch (err) {
      console.error("Error fetching seats:", err);
    } finally {
      setLoadingSeats((prev) => ({ ...prev, [seatLayoutId]: false }));
    }
  };

  const toggleSeatLayoutExpanded = (seatLayoutId: string) => {
    if (expandedSeatLayoutId === seatLayoutId) {
      setExpandedSeatLayoutId(null);
    } else {
      setExpandedSeatLayoutId(seatLayoutId);
      if (!seats[seatLayoutId]) {
        fetchSeats(seatLayoutId);
      }
    }
  };

  const handleCreateSeat = (seatLayoutId?: string) => {
    const layoutId = seatLayoutId || expandedSeatLayoutId;
    if (!layoutId) {
      showToast(
        t("selectSeatLayout") || "Please select a seat layout first",
        "error"
      );
      return;
    }
    setSeatFormData({
      seatNumber: "",
      row: "",
      column: "",
      type: "NORMAL",
      creditCost: 1,
      isActive: true,
    });
    setEditingSeatId(null);
    setCurrentSeatLayoutId(layoutId);
    setShowSeatForm(true);
  };

  const handleEditSeat = (seat: Seat) => {
    setSeatFormData({
      seatNumber: seat.seatNumber,
      row: seat.row || "",
      column: seat.column?.toString() || "",
      type: seat.type as
        | "NORMAL"
        | "EXCLUSIVE"
        | "INSTRUCTOR"
        | "PODIUM"
        | "ARCHITECTURAL_COLUMN",
      creditCost: seat.creditCost,
      isActive: seat.isActive,
    });
    setEditingSeatId(seat.id);
    setCurrentSeatLayoutId(seat.seatLayoutId);
    setShowSeatForm(true);
  };

  const handleSaveSeat = async () => {
    if (!token) {
      showToast(t("unauthorized") || "Unauthorized", "error");
      return;
    }
    if (!currentSeatLayoutId) {
      showToast(
        t("selectSeatLayout") || "Please select a seat layout first",
        "error"
      );
      return;
    }
    if (!seatFormData.seatNumber.trim()) {
      showToast(t("seatNumber") + " " + t("isRequired"), "error");
      return;
    }

    setSaving(true);
    try {
      const url = editingSeatId
        ? `/api/seats/${editingSeatId}`
        : `/api/seat-layouts/${currentSeatLayoutId}/seats`;
      const method = editingSeatId ? "PATCH" : "POST";

      const seatData: any = {
        seatNumber: seatFormData.seatNumber,
        type: seatFormData.type,
        creditCost: seatFormData.creditCost,
        isActive: seatFormData.isActive,
      };

      // Only include optional fields if they have values
      if (seatFormData.row && seatFormData.row.trim()) {
        seatData.row = seatFormData.row.trim();
      }
      if (seatFormData.column && seatFormData.column.trim()) {
        const colNum = parseInt(seatFormData.column);
        if (!isNaN(colNum)) {
          seatData.column = colNum;
        }
      }

      console.log("Saving seat:", {
        url,
        method,
        seatData,
        currentSeatLayoutId,
      });

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(seatData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        console.error("Error saving seat:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Seat saved successfully:", result);

      await fetchSeats(currentSeatLayoutId);
      setEditingSeatId(null);
      setCurrentSeatLayoutId(null);
      setSeatFormData({
        seatNumber: "",
        row: "",
        column: "",
        type: "NORMAL",
        creditCost: 1,
        isActive: true,
      });
      showToast(
        editingSeatId
          ? (t("seat") || "Seat") +
              " " +
              (t("updated") || "updated") +
              " " +
              (t("successfully") || "successfully")
          : (t("seat") || "Seat") +
              " " +
              (t("created") || "created") +
              " " +
              (t("successfully") || "successfully"),
        "success"
      );
      setShowSeatForm(false);
    } catch (err: any) {
      console.error("Error in handleSaveSeat:", err);
      showToast(err.message || "Failed to save seat", "error");
      // Don't throw error - keep modal open so user can fix and retry
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSeat = async () => {
    if (!token || !deleteSeatModal.seat || !deleteSeatModal.seatLayoutId)
      return;

    setSaving(true);
    try {
      const response = await fetch(`/api/seats/${deleteSeatModal.seat.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchSeats(deleteSeatModal.seatLayoutId);
      setDeleteSeatModal({ open: false, seat: null, seatLayoutId: null });
      showToast(
        (t("seat") || "Seat") +
          " " +
          (t("deleted") || "deleted") +
          " " +
          (t("successfully") || "successfully"),
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Failed to delete seat", "error");
    } finally {
      setSaving(false);
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
            {t("locations")}
          </h1>
          <button
            onClick={handleCreate}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: colors.primary,
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {t("addLocation")}
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
            {locations.length > 0 ? (
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
                      {t("locationName") || "Name"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {t("locationAddress") || "Address"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {t("isDefault") || "Default"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {t("seatLayouts") || "Layouts"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {t("sessions") || "Sessions"}
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location, index) => (
                    <Fragment key={location.id}>
                      <tr
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                          backgroundColor:
                            index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                        }}
                      >
                        <td style={{ padding: "1rem", color: colors.text }}>
                          <strong>{location.name}</strong>
                          {location.description && (
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: colors.textSecondary,
                                marginTop: "0.25rem",
                              }}
                            >
                              {location.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "1rem", color: colors.text }}>
                          {location.address || "-"}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          {location.isDefault ? (
                            <span
                              style={{
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                backgroundColor: "#e8f5e9",
                                color: "#388e3c",
                              }}
                            >
                              {t("defaultLocation") || "Default"}
                            </span>
                          ) : (
                            <span style={{ color: colors.textMuted }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: "1rem", color: colors.text }}>
                          {location._count?.seatLayouts || 0}
                        </td>
                        <td style={{ padding: "1rem", color: colors.text }}>
                          {location._count?.sessions || 0}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() =>
                                toggleLocationExpanded(location.id)
                              }
                              style={{
                                padding: "0.25rem 0.5rem",
                                backgroundColor:
                                  expandedLocationId === location.id
                                    ? colors.primary
                                    : "transparent",
                                color:
                                  expandedLocationId === location.id
                                    ? "white"
                                    : colors.primary,
                                border: `1px solid ${colors.primary}`,
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                              }}
                            >
                              {expandedLocationId === location.id
                                ? `▼ ${t("seatLayouts") || "Seat Layouts"}`
                                : `▶ ${t("seatLayouts") || "Seat Layouts"}`}
                            </button>
                            <button
                              onClick={() => handleEdit(location)}
                              style={{
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "transparent",
                                color: colors.primary,
                                border: `1px solid ${colors.primary}`,
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                              }}
                            >
                              {t("edit")}
                            </button>
                            <button
                              onClick={() =>
                                setDeleteModal({ open: true, location })
                              }
                              style={{
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "transparent",
                                color: colors.error,
                                border: `1px solid ${colors.error}`,
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                              }}
                            >
                              {t("delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedLocationId === location.id && (
                        <tr key={`${location.id}-expanded`}>
                          <td
                            colSpan={6}
                            style={{
                              padding: "1rem",
                              backgroundColor: colors.rowEven,
                            }}
                          >
                            <div
                              style={{
                                padding: "1rem",
                                border: `1px solid ${colors.border}`,
                                borderRadius: "4px",
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
                                <h3
                                  style={{
                                    margin: 0,
                                    color: colors.text,
                                    fontSize: "1.1rem",
                                  }}
                                >
                                  {t("seatLayouts")} - {location.name}
                                </h3>
                                <button
                                  onClick={handleCreateSeatLayout}
                                  style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: colors.primary,
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  + {t("addSeatLayout")}
                                </button>
                              </div>

                              {loadingLayouts[location.id] ? (
                                <div
                                  style={{
                                    padding: "2rem",
                                    textAlign: "center",
                                  }}
                                >
                                  <Spinner text={t("loading")} />
                                </div>
                              ) : (
                                <>
                                  {seatLayouts[location.id] &&
                                  seatLayouts[location.id].length > 0 ? (
                                    <div
                                      style={{ display: "grid", gap: "1rem" }}
                                    >
                                      {seatLayouts[location.id].map(
                                        (layout) => (
                                          <div
                                            key={layout.id}
                                            style={{
                                              padding: "1rem",
                                              border: `1px solid ${colors.border}`,
                                              borderRadius: "4px",
                                              backgroundColor: layout.isActive
                                                ? colors.cardBg
                                                : colors.rowOdd,
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "start",
                                                marginBottom: "0.5rem",
                                              }}
                                            >
                                              <div>
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    marginBottom: "0.25rem",
                                                  }}
                                                >
                                                  <strong
                                                    style={{
                                                      color: colors.text,
                                                    }}
                                                  >
                                                    {layout.name}
                                                  </strong>
                                                  {layout.isActive && (
                                                    <span
                                                      style={{
                                                        padding:
                                                          "0.125rem 0.5rem",
                                                        borderRadius: "4px",
                                                        fontSize: "0.75rem",
                                                        backgroundColor:
                                                          "#e8f5e9",
                                                        color: "#388e3c",
                                                      }}
                                                    >
                                                      {t("activeLayout") ||
                                                        "Active"}
                                                    </span>
                                                  )}
                                                </div>
                                                {layout.description && (
                                                  <div
                                                    style={{
                                                      fontSize: "0.875rem",
                                                      color:
                                                        colors.textSecondary,
                                                      marginTop: "0.25rem",
                                                    }}
                                                  >
                                                    {layout.description}
                                                  </div>
                                                )}
                                                <div
                                                  style={{
                                                    fontSize: "0.875rem",
                                                    color: colors.textMuted,
                                                    marginTop: "0.5rem",
                                                  }}
                                                >
                                                  {t("seats")}:{" "}
                                                  {layout._count?.seats ||
                                                    layout.seats?.length ||
                                                    0}
                                                  {layout.gridRows &&
                                                    layout.gridColumns && (
                                                      <span
                                                        style={{
                                                          marginLeft: "0.5rem",
                                                          fontWeight: "600",
                                                        }}
                                                      >
                                                        • {layout.gridRows}x
                                                        {layout.gridColumns}{" "}
                                                        {t("grid") || "grid"}
                                                      </span>
                                                    )}
                                                </div>
                                              </div>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  gap: "0.5rem",
                                                  flexWrap: "wrap",
                                                }}
                                              >
                                                <button
                                                  onClick={() =>
                                                    toggleSeatLayoutExpanded(
                                                      layout.id
                                                    )
                                                  }
                                                  style={{
                                                    padding: "0.25rem 0.5rem",
                                                    backgroundColor:
                                                      expandedSeatLayoutId ===
                                                      layout.id
                                                        ? "#ff9800"
                                                        : "transparent",
                                                    color:
                                                      expandedSeatLayoutId ===
                                                      layout.id
                                                        ? "white"
                                                        : "#ff9800",
                                                    border: "1px solid #ff9800",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "0.875rem",
                                                  }}
                                                >
                                                  {expandedSeatLayoutId ===
                                                  layout.id
                                                    ? `▼ ${
                                                        t("seats") || "Seats"
                                                      }`
                                                    : `▶ ${
                                                        t("seats") || "Seats"
                                                      }`}
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleEditSeatLayout(layout)
                                                  }
                                                  style={{
                                                    padding: "0.25rem 0.5rem",
                                                    backgroundColor:
                                                      "transparent",
                                                    color: colors.primary,
                                                    border: `1px solid ${colors.primary}`,
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "0.875rem",
                                                  }}
                                                >
                                                  {t("edit")}
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    setDeleteSeatLayoutModal({
                                                      open: true,
                                                      layout,
                                                      locationId: location.id,
                                                    })
                                                  }
                                                  style={{
                                                    padding: "0.25rem 0.5rem",
                                                    backgroundColor:
                                                      "transparent",
                                                    color: colors.error,
                                                    border: `1px solid ${colors.error}`,
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "0.875rem",
                                                  }}
                                                >
                                                  {t("delete")}
                                                </button>
                                              </div>
                                            </div>
                                            {expandedSeatLayoutId ===
                                              layout.id && (
                                              <div
                                                style={{
                                                  marginTop: "1rem",
                                                  padding: "1rem",
                                                  borderTop: `1px solid ${colors.border}`,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    alignItems: "center",
                                                    marginBottom: "1rem",
                                                  }}
                                                >
                                                  <h4
                                                    style={{
                                                      margin: 0,
                                                      color: colors.text,
                                                      fontSize: "1rem",
                                                    }}
                                                  >
                                                    {t("seats")} - {layout.name}
                                                  </h4>
                                                  <button
                                                    onClick={() =>
                                                      handleCreateSeat(
                                                        layout.id
                                                      )
                                                    }
                                                    style={{
                                                      padding: "0.5rem 1rem",
                                                      backgroundColor:
                                                        "#4caf50",
                                                      color: "white",
                                                      border: "none",
                                                      borderRadius: "4px",
                                                      cursor: "pointer",
                                                      fontSize: "0.875rem",
                                                    }}
                                                  >
                                                    + {t("addSeat")}
                                                  </button>
                                                </div>

                                                {loadingSeats[layout.id] ? (
                                                  <div
                                                    style={{
                                                      padding: "2rem",
                                                      textAlign: "center",
                                                    }}
                                                  >
                                                    <Spinner
                                                      text={t("loading")}
                                                    />
                                                  </div>
                                                ) : (
                                                  <>
                                                    {seats[layout.id] &&
                                                    seats[layout.id].length >
                                                      0 ? (
                                                      <div
                                                        style={{
                                                          overflowX: "auto",
                                                        }}
                                                      >
                                                        <table
                                                          style={{
                                                            width: "100%",
                                                            borderCollapse:
                                                              "collapse",
                                                            fontSize:
                                                              "0.875rem",
                                                          }}
                                                        >
                                                          <thead>
                                                            <tr
                                                              style={{
                                                                backgroundColor:
                                                                  colors.theadBg,
                                                                borderBottom: `2px solid ${colors.border}`,
                                                              }}
                                                            >
                                                              <th
                                                                style={{
                                                                  padding:
                                                                    "0.5rem",
                                                                  textAlign:
                                                                    "left",
                                                                  fontWeight:
                                                                    "bold",
                                                                  color:
                                                                    colors.text,
                                                                }}
                                                              >
                                                                {t(
                                                                  "seatNumber"
                                                                )}
                                                              </th>
                                                              <th
                                                                style={{
                                                                  padding:
                                                                    "0.5rem",
                                                                  textAlign:
                                                                    "left",
                                                                  fontWeight:
                                                                    "bold",
                                                                  color:
                                                                    colors.text,
                                                                }}
                                                              >
                                                                {t("row")}
                                                              </th>
                                                              <th
                                                                style={{
                                                                  padding:
                                                                    "0.5rem",
                                                                  textAlign:
                                                                    "left",
                                                                  fontWeight:
                                                                    "bold",
                                                                  color:
                                                                    colors.text,
                                                                }}
                                                              >
                                                                {t("column")}
                                                              </th>
                                                              <th
                                                                style={{
                                                                  padding:
                                                                    "0.5rem",
                                                                  textAlign:
                                                                    "left",
                                                                  fontWeight:
                                                                    "bold",
                                                                  color:
                                                                    colors.text,
                                                                }}
                                                              >
                                                                {t("seatType")}
                                                              </th>
                                                              <th
                                                                style={{
                                                                  padding:
                                                                    "0.5rem",
                                                                  textAlign:
                                                                    "left",
                                                                  fontWeight:
                                                                    "bold",
                                                                  color:
                                                                    colors.text,
                                                                }}
                                                              >
                                                                {t(
                                                                  "creditCost"
                                                                )}
                                                              </th>
                                                              <th
                                                                style={{
                                                                  padding:
                                                                    "0.5rem",
                                                                  textAlign:
                                                                    "left",
                                                                  fontWeight:
                                                                    "bold",
                                                                  color:
                                                                    colors.text,
                                                                }}
                                                              >
                                                                {t("status")}
                                                              </th>
                                                              <th
                                                                style={{
                                                                  padding:
                                                                    "0.5rem",
                                                                  textAlign:
                                                                    "left",
                                                                  fontWeight:
                                                                    "bold",
                                                                  color:
                                                                    colors.text,
                                                                }}
                                                              >
                                                                {t("actions")}
                                                              </th>
                                                            </tr>
                                                          </thead>
                                                          <tbody>
                                                            {seats[
                                                              layout.id
                                                            ].map(
                                                              (
                                                                seat,
                                                                seatIndex
                                                              ) => (
                                                                <tr
                                                                  key={seat.id}
                                                                  style={{
                                                                    borderBottom: `1px solid ${colors.border}`,
                                                                    backgroundColor:
                                                                      seatIndex %
                                                                        2 ===
                                                                      0
                                                                        ? colors.rowEven
                                                                        : colors.rowOdd,
                                                                  }}
                                                                >
                                                                  <td
                                                                    style={{
                                                                      padding:
                                                                        "0.75rem",
                                                                      color:
                                                                        colors.text,
                                                                    }}
                                                                  >
                                                                    <strong>
                                                                      {
                                                                        seat.seatNumber
                                                                      }
                                                                    </strong>
                                                                  </td>
                                                                  <td
                                                                    style={{
                                                                      padding:
                                                                        "0.75rem",
                                                                      color:
                                                                        colors.text,
                                                                    }}
                                                                  >
                                                                    {seat.row ||
                                                                      "-"}
                                                                  </td>
                                                                  <td
                                                                    style={{
                                                                      padding:
                                                                        "0.75rem",
                                                                      color:
                                                                        colors.text,
                                                                    }}
                                                                  >
                                                                    {seat.column ||
                                                                      "-"}
                                                                  </td>
                                                                  <td
                                                                    style={{
                                                                      padding:
                                                                        "0.75rem",
                                                                    }}
                                                                  >
                                                                    <span
                                                                      style={{
                                                                        padding:
                                                                          "0.25rem 0.5rem",
                                                                        borderRadius:
                                                                          "4px",
                                                                        fontSize:
                                                                          "0.75rem",
                                                                        backgroundColor:
                                                                          seat.type ===
                                                                          "EXCLUSIVE"
                                                                            ? theme ===
                                                                              "dark"
                                                                              ? "#4a148c"
                                                                              : "#f3e5f5"
                                                                            : seat.type ===
                                                                              "INSTRUCTOR"
                                                                            ? theme ===
                                                                              "dark"
                                                                              ? "#1b5e20"
                                                                              : "#e8f5e9"
                                                                            : seat.type ===
                                                                              "PODIUM"
                                                                            ? theme ===
                                                                              "dark"
                                                                              ? "#4a148c"
                                                                              : "#e1bee7"
                                                                            : seat.type ===
                                                                              "ARCHITECTURAL_COLUMN"
                                                                            ? theme ===
                                                                              "dark"
                                                                              ? "#004d40"
                                                                              : "#e0f2f1"
                                                                            : theme ===
                                                                              "dark"
                                                                            ? "#424242"
                                                                            : "#f5f5f5",
                                                                        color:
                                                                          seat.type ===
                                                                          "EXCLUSIVE"
                                                                            ? theme ===
                                                                              "dark"
                                                                              ? "#ce93d8"
                                                                              : "#7b1fa2"
                                                                            : seat.type ===
                                                                              "INSTRUCTOR"
                                                                            ? theme ===
                                                                              "dark"
                                                                              ? "#81c784"
                                                                              : "#388e3c"
                                                                            : seat.type ===
                                                                              "PODIUM"
                                                                            ? theme ===
                                                                              "dark"
                                                                              ? "#ba68c8"
                                                                              : "#8e24aa"
                                                                            : seat.type ===
                                                                              "ARCHITECTURAL_COLUMN"
                                                                            ? theme ===
                                                                              "dark"
                                                                              ? "#4db6ac"
                                                                              : "#00695c"
                                                                            : theme ===
                                                                              "dark"
                                                                            ? "#b0b0b0"
                                                                            : "#616161",
                                                                      }}
                                                                    >
                                                                      {seat.type ===
                                                                      "ARCHITECTURAL_COLUMN"
                                                                        ? t(
                                                                            "architecturalColumn"
                                                                          ) ||
                                                                          "Architectural Column"
                                                                        : t(
                                                                            seat.type.toLowerCase()
                                                                          ) ||
                                                                          seat.type}
                                                                    </span>
                                                                  </td>
                                                                  <td
                                                                    style={{
                                                                      padding:
                                                                        "0.75rem",
                                                                      color:
                                                                        colors.text,
                                                                    }}
                                                                  >
                                                                    <strong
                                                                      style={{
                                                                        color:
                                                                          seat.type ===
                                                                          "EXCLUSIVE"
                                                                            ? "#e91e63"
                                                                            : colors.text,
                                                                      }}
                                                                    >
                                                                      {seat.type ===
                                                                        "INSTRUCTOR" ||
                                                                      seat.type ===
                                                                        "PODIUM" ||
                                                                      seat.type ===
                                                                        "ARCHITECTURAL_COLUMN"
                                                                        ? t(
                                                                            "notBookable"
                                                                          ) ||
                                                                          "Not Bookable"
                                                                        : `${
                                                                            seat.creditCost
                                                                          } ${
                                                                            t(
                                                                              "credits"
                                                                            ) ||
                                                                            "credits"
                                                                          }`}
                                                                    </strong>
                                                                  </td>
                                                                  <td
                                                                    style={{
                                                                      padding:
                                                                        "0.75rem",
                                                                    }}
                                                                  >
                                                                    {seat.isActive ? (
                                                                      <span
                                                                        style={{
                                                                          padding:
                                                                            "0.25rem 0.5rem",
                                                                          borderRadius:
                                                                            "4px",
                                                                          fontSize:
                                                                            "0.75rem",
                                                                          backgroundColor:
                                                                            "#e8f5e9",
                                                                          color:
                                                                            "#388e3c",
                                                                        }}
                                                                      >
                                                                        {t(
                                                                          "active"
                                                                        ) ||
                                                                          "Active"}
                                                                      </span>
                                                                    ) : (
                                                                      <span
                                                                        style={{
                                                                          padding:
                                                                            "0.25rem 0.5rem",
                                                                          borderRadius:
                                                                            "4px",
                                                                          fontSize:
                                                                            "0.75rem",
                                                                          backgroundColor:
                                                                            "#ffebee",
                                                                          color:
                                                                            "#c62828",
                                                                        }}
                                                                      >
                                                                        {t(
                                                                          "inactive"
                                                                        ) ||
                                                                          "Inactive"}
                                                                      </span>
                                                                    )}
                                                                  </td>
                                                                  <td
                                                                    style={{
                                                                      padding:
                                                                        "0.75rem",
                                                                    }}
                                                                  >
                                                                    <div
                                                                      style={{
                                                                        display:
                                                                          "flex",
                                                                        gap: "0.5rem",
                                                                      }}
                                                                    >
                                                                      <button
                                                                        onClick={() =>
                                                                          handleEditSeat(
                                                                            seat
                                                                          )
                                                                        }
                                                                        style={{
                                                                          padding:
                                                                            "0.25rem 0.5rem",
                                                                          backgroundColor:
                                                                            "transparent",
                                                                          color:
                                                                            colors.primary,
                                                                          border: `1px solid ${colors.primary}`,
                                                                          borderRadius:
                                                                            "4px",
                                                                          cursor:
                                                                            "pointer",
                                                                          fontSize:
                                                                            "0.75rem",
                                                                        }}
                                                                      >
                                                                        {t(
                                                                          "edit"
                                                                        )}
                                                                      </button>
                                                                      <button
                                                                        onClick={() =>
                                                                          setDeleteSeatModal(
                                                                            {
                                                                              open: true,
                                                                              seat,
                                                                              seatLayoutId:
                                                                                layout.id,
                                                                            }
                                                                          )
                                                                        }
                                                                        style={{
                                                                          padding:
                                                                            "0.25rem 0.5rem",
                                                                          backgroundColor:
                                                                            "transparent",
                                                                          color:
                                                                            colors.error,
                                                                          border: `1px solid ${colors.error}`,
                                                                          borderRadius:
                                                                            "4px",
                                                                          cursor:
                                                                            "pointer",
                                                                          fontSize:
                                                                            "0.75rem",
                                                                        }}
                                                                      >
                                                                        {t(
                                                                          "delete"
                                                                        )}
                                                                      </button>
                                                                    </div>
                                                                  </td>
                                                                </tr>
                                                              )
                                                            )}
                                                          </tbody>
                                                        </table>
                                                      </div>
                                                    ) : (
                                                      <div
                                                        style={{
                                                          padding: "2rem",
                                                          textAlign: "center",
                                                          color:
                                                            colors.textSecondary,
                                                        }}
                                                      >
                                                        <p>
                                                          {t("noDataAvailable")}
                                                        </p>
                                                        <button
                                                          onClick={() =>
                                                            handleCreateSeat(
                                                              layout.id
                                                            )
                                                          }
                                                          style={{
                                                            marginTop: "1rem",
                                                            padding:
                                                              "0.5rem 1rem",
                                                            backgroundColor:
                                                              "#4caf50",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                          }}
                                                        >
                                                          + {t("addSeat")}
                                                        </button>
                                                      </div>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        padding: "2rem",
                                        textAlign: "center",
                                        color: colors.textSecondary,
                                      }}
                                    >
                                      <p>{t("noDataAvailable")}</p>
                                      <button
                                        onClick={handleCreateSeatLayout}
                                        style={{
                                          marginTop: "1rem",
                                          padding: "0.5rem 1rem",
                                          backgroundColor: colors.primary,
                                          color: "white",
                                          border: "none",
                                          borderRadius: "4px",
                                          cursor: "pointer",
                                        }}
                                      >
                                        + {t("addSeatLayout")}
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
                <p>{t("noDataAvailable")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
          setFormData({
            name: "",
            description: "",
            address: "",
            isDefault: false,
          });
        }}
        title={editingId ? t("editLocation") : t("addLocation")}
        size="medium"
        onConfirm={handleSave}
        confirmText={saving ? t("saving") : t("save")}
        cancelText={t("cancel")}
        confirmButtonStyle={{ backgroundColor: colors.primary }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "600",
                color: colors.text,
              }}
            >
              {t("locationName")} <span style={{ color: colors.error }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t("locationName")}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "4px",
                backgroundColor: colors.inputBg,
                color: colors.text,
                fontSize: "0.875rem",
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
              {t("locationDescription")}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={t("locationDescription")}
              rows={3}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "4px",
                backgroundColor: colors.inputBg,
                color: colors.text,
                fontSize: "0.875rem",
                fontFamily: "inherit",
                resize: "vertical",
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
              {t("locationAddress")}
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder={t("locationAddress")}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "4px",
                backgroundColor: colors.inputBg,
                color: colors.text,
                fontSize: "0.875rem",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                color: colors.text,
              }}
            >
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData({ ...formData, isDefault: e.target.checked })
                }
                style={{
                  width: "1rem",
                  height: "1rem",
                  cursor: "pointer",
                }}
              />
              <span>{t("setAsDefault")}</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, location: null })}
        title={t("deleteLocation")}
        size="small"
        onConfirm={handleDelete}
        confirmText={saving ? t("deleting") : t("delete")}
        cancelText={t("cancel")}
        confirmButtonStyle={{ backgroundColor: colors.error }}
      >
        <p style={{ color: colors.text, margin: 0 }}>
          {t("deleteWarning") ||
            "Are you sure you want to delete this location? This action cannot be undone."}
        </p>
        {deleteModal.location && (
          <p
            style={{
              color: colors.textSecondary,
              marginTop: "0.5rem",
              fontWeight: "bold",
            }}
          >
            {deleteModal.location.name}
          </p>
        )}
      </Modal>

      {/* Seat Layout Create/Edit Modal */}
      <Modal
        isOpen={showSeatLayoutForm}
        onClose={() => {
          setShowSeatLayoutForm(false);
          setEditingSeatLayoutId(null);
          setCurrentLocationId(null);
          setSeatLayoutFormData({
            name: "",
            description: "",
            gridRows: "",
            gridColumns: "",
            isActive: true,
          });
        }}
        title={editingSeatLayoutId ? t("editSeatLayout") : t("addSeatLayout")}
        size="medium"
        onConfirm={handleSaveSeatLayout}
        confirmText={saving ? t("saving") : t("save")}
        cancelText={t("cancel")}
        confirmButtonStyle={{ backgroundColor: colors.primary }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "600",
                color: colors.text,
              }}
            >
              {t("layoutName")} <span style={{ color: colors.error }}>*</span>
            </label>
            <input
              type="text"
              value={seatLayoutFormData.name}
              onChange={(e) =>
                setSeatLayoutFormData({
                  ...seatLayoutFormData,
                  name: e.target.value,
                })
              }
              placeholder={t("layoutName")}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "4px",
                backgroundColor: colors.inputBg,
                color: colors.text,
                fontSize: "0.875rem",
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
              {t("layoutDescription")}
            </label>
            <textarea
              value={seatLayoutFormData.description}
              onChange={(e) =>
                setSeatLayoutFormData({
                  ...seatLayoutFormData,
                  description: e.target.value,
                })
              }
              placeholder={t("layoutDescription")}
              rows={3}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "4px",
                backgroundColor: colors.inputBg,
                color: colors.text,
                fontSize: "0.875rem",
                fontFamily: "inherit",
                resize: "vertical",
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
              {t("gridSize") || "Grid Size"}
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.875rem",
                    color: colors.textSecondary,
                  }}
                >
                  {t("rows") || "Rows"}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={seatLayoutFormData.gridRows}
                  onChange={(e) =>
                    setSeatLayoutFormData({
                      ...seatLayoutFormData,
                      gridRows: e.target.value,
                    })
                  }
                  placeholder="e.g., 3"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "4px",
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.875rem",
                    color: colors.textSecondary,
                  }}
                >
                  {t("columns") || "Columns"}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={seatLayoutFormData.gridColumns}
                  onChange={(e) =>
                    setSeatLayoutFormData({
                      ...seatLayoutFormData,
                      gridColumns: e.target.value,
                    })
                  }
                  placeholder="e.g., 4"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "4px",
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.75rem",
                color: colors.textMuted,
              }}
            >
              {t("gridSizeHelp") ||
                "Optional: Define grid size (e.g., 3 rows x 4 columns = 3x4 grid)"}
            </div>
          </div>

          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                color: colors.text,
              }}
            >
              <input
                type="checkbox"
                checked={seatLayoutFormData.isActive}
                onChange={(e) =>
                  setSeatLayoutFormData({
                    ...seatLayoutFormData,
                    isActive: e.target.checked,
                  })
                }
                style={{
                  width: "1rem",
                  height: "1rem",
                  cursor: "pointer",
                }}
              />
              <span>{t("activeLayout")}</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Seat Layout Modal */}
      <Modal
        isOpen={deleteSeatLayoutModal.open}
        onClose={() =>
          setDeleteSeatLayoutModal({
            open: false,
            layout: null,
            locationId: null,
          })
        }
        title={t("deleteSeatLayout")}
        size="small"
        onConfirm={handleDeleteSeatLayout}
        confirmText={saving ? t("deleting") : t("delete")}
        cancelText={t("cancel")}
        confirmButtonStyle={{ backgroundColor: colors.error }}
      >
        <p style={{ color: colors.text, margin: 0 }}>
          {t("deleteWarning") ||
            "Are you sure you want to delete this seat layout? This action cannot be undone."}
        </p>
        {deleteSeatLayoutModal.layout && (
          <p
            style={{
              color: colors.textSecondary,
              marginTop: "0.5rem",
              fontWeight: "bold",
            }}
          >
            {deleteSeatLayoutModal.layout.name}
          </p>
        )}
      </Modal>

      {/* Seat Create/Edit Modal */}
      <Modal
        isOpen={showSeatForm}
        onClose={() => {
          setShowSeatForm(false);
          setEditingSeatId(null);
          setCurrentSeatLayoutId(null);
          setSeatFormData({
            seatNumber: "",
            row: "",
            column: "",
            type: "NORMAL",
            creditCost: 1,
            isActive: true,
          });
        }}
        title={editingSeatId ? t("editSeat") : t("addSeat")}
        size="medium"
        onConfirm={handleSaveSeat}
        confirmText={saving ? t("saving") : t("save")}
        cancelText={t("cancel")}
        confirmButtonStyle={{ backgroundColor: colors.primary }}
      >
        {(() => {
          // Find current seat layout to get grid size
          let currentLayout: SeatLayout | null = null;
          if (currentSeatLayoutId) {
            for (const location of locations) {
              if (seatLayouts[location.id]) {
                currentLayout =
                  seatLayouts[location.id].find(
                    (l) => l.id === currentSeatLayoutId
                  ) || null;
                if (currentLayout) break;
              }
            }
          }
          const maxRows = currentLayout?.gridRows;
          const maxColumns = currentLayout?.gridColumns;

          return (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {currentLayout && maxRows && maxColumns && (
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "#e3f2fd",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <strong>{t("gridSize")}:</strong> {maxRows}x{maxColumns}{" "}
                  {t("grid")}
                  {" - "}
                  {t("maxRow") || "Max Row"}: {maxRows},{" "}
                  {t("maxColumn") || "Max Column"}: {maxColumns}
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
                  {t("seatNumber")}{" "}
                  <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  type="text"
                  value={seatFormData.seatNumber}
                  onChange={(e) =>
                    setSeatFormData({
                      ...seatFormData,
                      seatNumber: e.target.value,
                    })
                  }
                  placeholder={t("seatNumber")}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "4px",
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
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
                    {t("row")} {maxRows && `(Max: ${maxRows})`}
                  </label>
                  <input
                    type="text"
                    value={seatFormData.row}
                    onChange={(e) => {
                      const value = e.target.value;
                      // If gridRows is set, validate input
                      if (maxRows && value) {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue > maxRows) {
                          showToast(
                            `${t("row")} ${
                              t("cannotExceed") || "cannot exceed"
                            } ${maxRows}`,
                            "error"
                          );
                          return;
                        }
                      }
                      setSeatFormData({ ...seatFormData, row: value });
                    }}
                    placeholder={maxRows ? `1-${maxRows} or A, B, C` : t("row")}
                    maxLength={maxRows ? maxRows.toString().length : undefined}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "4px",
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                      fontSize: "0.875rem",
                    }}
                  />
                  {maxRows && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textMuted,
                        marginTop: "0.25rem",
                      }}
                    >
                      {t("rowHelp") ||
                        `Enter row identifier (e.g., A, B, C or 1, 2, 3). Max rows: ${maxRows}`}
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
                    {t("column")} {maxColumns && `(Max: ${maxColumns})`}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxColumns || undefined}
                    value={seatFormData.column}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (maxColumns && value) {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue > maxColumns) {
                          showToast(
                            `${t("column")} ${
                              t("cannotExceed") || "cannot exceed"
                            } ${maxColumns}`,
                            "error"
                          );
                          return;
                        }
                      }
                      setSeatFormData({ ...seatFormData, column: value });
                    }}
                    placeholder={maxColumns ? `1-${maxColumns}` : t("column")}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "4px",
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                      fontSize: "0.875rem",
                    }}
                  />
                  {maxColumns && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textMuted,
                        marginTop: "0.25rem",
                      }}
                    >
                      {t("columnHelp") ||
                        `Enter column number (1 to ${maxColumns})`}
                    </div>
                  )}
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
                  {t("seatType")} <span style={{ color: colors.error }}>*</span>
                </label>
                <select
                  value={seatFormData.type}
                  onChange={(e) => {
                    const newType = e.target.value as
                      | "NORMAL"
                      | "EXCLUSIVE"
                      | "INSTRUCTOR"
                      | "PODIUM"
                      | "ARCHITECTURAL_COLUMN";
                    setSeatFormData({
                      ...seatFormData,
                      type: newType,
                      // Set default credit cost based on type (instructor, podium, and columns are not bookable, cost 0)
                      creditCost:
                        newType === "EXCLUSIVE"
                          ? 2
                          : newType === "INSTRUCTOR" ||
                            newType === "PODIUM" ||
                            newType === "ARCHITECTURAL_COLUMN"
                          ? 0
                          : 1,
                    });
                  }}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "4px",
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="NORMAL">{t("normal") || "Normal"}</option>
                  <option value="EXCLUSIVE">
                    {t("exclusive") || "Exclusive"}
                  </option>
                  <option value="INSTRUCTOR">
                    {t("instructor") || "Instructor"}
                  </option>
                  <option value="PODIUM">{t("podium") || "Podium"}</option>
                  <option value="ARCHITECTURAL_COLUMN">
                    {t("architecturalColumn") || "Architectural Column"}
                  </option>
                </select>
                <div
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.5rem",
                    backgroundColor:
                      seatFormData.type === "EXCLUSIVE"
                        ? "#fff3e0"
                        : seatFormData.type === "INSTRUCTOR"
                        ? "#e8f5e9"
                        : seatFormData.type === "PODIUM"
                        ? "#f3e5f5"
                        : seatFormData.type === "ARCHITECTURAL_COLUMN"
                        ? "#e0f2f1"
                        : "#e3f2fd",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    color: colors.textSecondary,
                  }}
                >
                  {seatFormData.type === "EXCLUSIVE"
                    ? t("exclusiveSeatInfo") ||
                      "Exclusive seats are premium seats with higher credit cost."
                    : seatFormData.type === "INSTRUCTOR"
                    ? t("instructorSeatInfo") ||
                      "Instructor position - not bookable by members."
                    : seatFormData.type === "PODIUM"
                    ? t("podiumSeatInfo") ||
                      "Podium position - elevated platform area."
                    : seatFormData.type === "ARCHITECTURAL_COLUMN"
                    ? t("architecturalColumnInfo") ||
                      "Architectural column - structural element, not bookable."
                    : t("normalSeatInfo") ||
                      "Normal seats have standard credit cost."}
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
                  {t("creditCost")}{" "}
                  <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={seatFormData.creditCost}
                  onChange={(e) =>
                    setSeatFormData({
                      ...seatFormData,
                      creditCost: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder={t("creditCost")}
                  disabled={
                    seatFormData.type === "INSTRUCTOR" ||
                    seatFormData.type === "PODIUM" ||
                    seatFormData.type === "ARCHITECTURAL_COLUMN"
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "4px",
                    backgroundColor:
                      seatFormData.type === "INSTRUCTOR" ||
                      seatFormData.type === "PODIUM" ||
                      seatFormData.type === "ARCHITECTURAL_COLUMN"
                        ? colors.rowOdd
                        : colors.inputBg,
                    color: colors.text,
                    fontSize: "0.875rem",
                    opacity:
                      seatFormData.type === "INSTRUCTOR" ||
                      seatFormData.type === "PODIUM" ||
                      seatFormData.type === "ARCHITECTURAL_COLUMN"
                        ? 0.6
                        : 1,
                    cursor:
                      seatFormData.type === "INSTRUCTOR" ||
                      seatFormData.type === "PODIUM" ||
                      seatFormData.type === "ARCHITECTURAL_COLUMN"
                        ? "not-allowed"
                        : "text",
                  }}
                />
                <div
                  style={{
                    marginTop: "0.25rem",
                    fontSize: "0.75rem",
                    color: colors.textMuted,
                  }}
                >
                  {t("creditCostHelp") ||
                    "Number of credits required to book this seat"}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    color: colors.text,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={seatFormData.isActive}
                    onChange={(e) =>
                      setSeatFormData({
                        ...seatFormData,
                        isActive: e.target.checked,
                      })
                    }
                    style={{
                      width: "1rem",
                      height: "1rem",
                      cursor: "pointer",
                    }}
                  />
                  <span>{t("active")}</span>
                </label>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Delete Seat Modal */}
      <Modal
        isOpen={deleteSeatModal.open}
        onClose={() =>
          setDeleteSeatModal({ open: false, seat: null, seatLayoutId: null })
        }
        title={t("deleteSeat")}
        size="small"
        onConfirm={handleDeleteSeat}
        confirmText={saving ? t("deleting") : t("delete")}
        cancelText={t("cancel")}
        confirmButtonStyle={{ backgroundColor: colors.error }}
      >
        <p style={{ color: colors.text, margin: 0 }}>
          {t("deleteWarning") ||
            "Are you sure you want to delete this seat? This action cannot be undone."}
        </p>
        {deleteSeatModal.seat && (
          <p
            style={{
              color: colors.textSecondary,
              marginTop: "0.5rem",
              fontWeight: "bold",
            }}
          >
            {t("seatNumber")}: {deleteSeatModal.seat.seatNumber} (
            {t(deleteSeatModal.seat.type.toLowerCase()) ||
              deleteSeatModal.seat.type}
            )
          </p>
        )}
      </Modal>
    </div>
  );
}
