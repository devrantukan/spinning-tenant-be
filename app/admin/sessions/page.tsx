"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";
import Spinner from "@/components/Spinner";
import DatePicker, { registerLocale } from "react-datepicker";
import { tr, enUS } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

// Register locales for react-datepicker
registerLocale("tr", tr);
registerLocale("en", enUS);

interface Session {
  id: string;
  classId: string;
  class?: {
    id: string;
    name: string;
    nameTr?: string;
    musicGenre?: string;
    musicGenreTr?: string;
  };
  startTime: string;
  endTime: string;
  duration?: number;
  amPm?: string;
  maxCapacity: number;
  currentBookings: number;
  status: string;
  instructorId?: string;
  instructor?: {
    user: {
      name?: string;
      email: string;
    };
  };
  locationId?: string;
  location?: {
    id: string;
    name: string;
  };
}

interface Class {
  id: string;
  name: string;
  musicGenre?: string;
}

interface Location {
  id: string;
  name: string;
  isDefault: boolean;
}

interface Instructor {
  id: string;
  userId: string;
  organizationId: string;
  bio?: string;
  specialties?: string[];
  status: string;
  user?: {
    id: string;
    name?: string;
    email: string;
    role: string;
  };
  name?: string;
  email?: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    classId: "",
    instructorId: "",
    locationId: "",
    startTime: "",
    endTime: "",
    status: "SCHEDULED",
  });
  const [calculatedMaxCapacity, setCalculatedMaxCapacity] = useState<
    number | null
  >(null);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [enableRepeat, setEnableRepeat] = useState(false);
  const [repeatCount, setRepeatCount] = useState(4);
  const [repeatInterval, setRepeatInterval] = useState<"daily" | "weekly">(
    "weekly"
  );
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
    },
  };

  const colors = themeColors[theme];

  const fetchSessions = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions", {
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
      const sessionsData = Array.isArray(result) ? result : [];

      // Debug: Log first session to check if duration/amPm are present
      if (sessionsData.length > 0) {
        console.log("Sample session data:", {
          id: sessionsData[0].id,
          duration: sessionsData[0].duration,
          amPm: sessionsData[0].amPm,
          startTime: sessionsData[0].startTime,
        });
      }

      setSessions(sessionsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async (authToken: string) => {
    try {
      const response = await fetch("/api/classes", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setClasses(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
  };

  const fetchInstructors = async (authToken: string) => {
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
        console.error("Error fetching instructors:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
          details: errorData.details,
          fullError: errorData,
        });
        // Still set empty array but log the error for debugging
        setInstructors([]);
        setError(
          errorData.error ||
            errorData.details ||
            `Failed to fetch instructors: HTTP ${response.status}`
        );
        return;
      }

      const result = await response.json();
      let instructorsData = Array.isArray(result) ? result : [];

      console.log(
        "Raw API response:",
        result,
        "Array check:",
        Array.isArray(result),
        "Length:",
        instructorsData.length
      );

      // Filter to only show active instructors
      instructorsData = instructorsData.filter((instructor: Instructor) => {
        const isActive = instructor.status === "ACTIVE";
        console.log(
          "Instructor:",
          instructor.id,
          "Status:",
          instructor.status,
          "IsActive:",
          isActive
        );
        return isActive;
      });

      console.log(
        "Filtered active instructors:",
        instructorsData.length,
        "instructors:",
        instructorsData
      );
      setInstructors(instructorsData);
    } catch (err) {
      console.error("Error fetching instructors:", err);
      setInstructors([]);
    }
  };

  const fetchLocations = async (authToken: string) => {
    try {
      const response = await fetch("/api/locations", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const locationsData = Array.isArray(result) ? result : [];
        setLocations(locationsData);
        // Set default location if available (only on initial load)
        const defaultLocation = locationsData.find(
          (loc: Location) => loc.isDefault
        );
        if (defaultLocation) {
          const locationIdToSet = defaultLocation.id;
          setFormData((prev) => ({
            ...prev,
            locationId: prev.locationId || locationIdToSet,
          }));
          // Fetch max capacity for default location
          if (!formData.locationId) {
            fetchMaxCapacityForLocation(locationIdToSet);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  };

  const fetchMaxCapacityForLocation = async (locationId: string) => {
    if (!token || !locationId) {
      setCalculatedMaxCapacity(null);
      return;
    }

    try {
      // Get all seat layouts for this location
      const response = await fetch(
        `/api/locations/${locationId}/seat-layouts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const seatLayouts = await response.json();
        // Find active seat layout
        const activeLayout = Array.isArray(seatLayouts)
          ? seatLayouts.find((layout: any) => layout.isActive)
          : null;

        if (activeLayout) {
          // Get seats for the active layout
          const seatsResponse = await fetch(
            `/api/seat-layouts/${activeLayout.id}/seats`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (seatsResponse.ok) {
            const seats = await seatsResponse.json();
            // Count only active seats
            const activeSeatsCount = Array.isArray(seats)
              ? seats.filter((seat: any) => seat.isActive).length
              : 0;
            setCalculatedMaxCapacity(activeSeatsCount);
          } else {
            setCalculatedMaxCapacity(null);
          }
        } else {
          setCalculatedMaxCapacity(null);
        }
      } else {
        setCalculatedMaxCapacity(null);
      }
    } catch (err) {
      console.error("Error fetching max capacity:", err);
      setCalculatedMaxCapacity(null);
    }
  };

  useEffect(() => {
    const authToken = localStorage.getItem("supabase_auth_token");

    if (!authToken) {
      router.push("/login");
      return;
    }

    setToken(authToken);
    fetchSessions(authToken);
    fetchClasses(authToken);
    fetchInstructors(authToken);
    fetchLocations(authToken);
  }, [router]);

  // Fetch max capacity when location changes
  useEffect(() => {
    if (token && formData.locationId) {
      fetchMaxCapacityForLocation(formData.locationId);
    } else {
      setCalculatedMaxCapacity(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, formData.locationId]);

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

  // Calculate time restrictions for start time picker
  const startTimeProps = useMemo(() => {
    if (editingId) {
      // When editing, no time restrictions
      return {};
    }
    // Check if selected date is today
    const now = new Date();
    const dateToCheck =
      selectedStartDate ||
      (formData.startTime ? new Date(formData.startTime) : null);
    const isToday =
      dateToCheck &&
      dateToCheck.getDate() === now.getDate() &&
      dateToCheck.getMonth() === now.getMonth() &&
      dateToCheck.getFullYear() === now.getFullYear();

    if (isToday) {
      // Round up to next 10-minute interval
      const minutes = now.getMinutes();
      const roundedMinutes = Math.ceil(minutes / 10) * 10;
      const minTime = new Date(now);
      minTime.setMinutes(roundedMinutes);
      minTime.setSeconds(0);
      minTime.setMilliseconds(0);
      // If rounded to 60, go to next hour
      if (minTime.getMinutes() === 60) {
        minTime.setMinutes(0);
        minTime.setHours(minTime.getHours() + 1);
      }
      return {
        minTime,
        maxTime: new Date(2000, 0, 1, 23, 59),
      };
    }
    // If no date selected yet or future date, no time restrictions
    return {};
  }, [editingId, selectedStartDate, formData.startTime]);

  // Calculate time restrictions for end time picker
  const endTimeProps = useMemo(() => {
    if (editingId) {
      // When editing, no time restrictions
      return {};
    }
    const now = new Date();
    const dateToCheck =
      selectedEndDate || (formData.endTime ? new Date(formData.endTime) : null);
    const isEndToday =
      dateToCheck &&
      dateToCheck.getDate() === now.getDate() &&
      dateToCheck.getMonth() === now.getMonth() &&
      dateToCheck.getFullYear() === now.getFullYear();

    // If end date is today
    if (isEndToday) {
      if (formData.startTime) {
        // Min time should be after startTime (add 10 min minimum)
        const startDateTime = new Date(formData.startTime);
        const startDate = new Date(startDateTime);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(now);
        endDate.setHours(0, 0, 0, 0);
        // If startTime is also today, use startTime + 10 min
        if (startDate.getTime() === endDate.getTime()) {
          const minTime = new Date(startDateTime);
          minTime.setMinutes(minTime.getMinutes() + 10);
          return {
            minTime,
            maxTime: new Date(2000, 0, 1, 23, 59),
          };
        }
      }
      // No startTime yet, use current time + 10 min
      const roundedMinutes = Math.ceil(now.getMinutes() / 10) * 10;
      const minTime = new Date(now);
      minTime.setMinutes(roundedMinutes + 10);
      minTime.setSeconds(0);
      minTime.setMilliseconds(0);
      if (minTime.getMinutes() >= 60) {
        minTime.setMinutes(minTime.getMinutes() - 60);
        minTime.setHours(minTime.getHours() + 1);
      }
      return {
        minTime,
        maxTime: new Date(2000, 0, 1, 23, 59),
      };
    }
    // Future date: ensure endTime is after startTime if startTime exists
    if (formData.startTime) {
      const startDateTime = new Date(formData.startTime);
      const startDate = new Date(startDateTime);
      startDate.setHours(0, 0, 0, 0);
      if (dateToCheck) {
        const endDate = new Date(dateToCheck);
        endDate.setHours(0, 0, 0, 0);
        // If same day, ensure endTime is after startTime
        if (startDate.getTime() === endDate.getTime()) {
          const minTime = new Date(startDateTime);
          minTime.setMinutes(minTime.getMinutes() + 10);
          return {
            minTime,
            maxTime: new Date(2000, 0, 1, 23, 59),
          };
        }
      }
    }
    // No time restrictions for future dates
    return {};
  }, [editingId, selectedEndDate, formData.endTime, formData.startTime]);

  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);

    // Validate that startTime is not in the past
    if (formData.startTime) {
      const startDateTime = new Date(formData.startTime);
      const now = new Date();
      if (startDateTime < now) {
        setError(
          language === "tr"
            ? "Geçmiş tarihli oturum oluşturulamaz. Lütfen gelecek bir tarih seçin."
            : "Cannot create sessions in the past. Please select a future date."
        );
        setSaving(false);
        return;
      }
    }

    // Validate that endTime is after startTime
    if (formData.startTime && formData.endTime) {
      const startDateTime = new Date(formData.startTime);
      const endDateTime = new Date(formData.endTime);
      if (endDateTime <= startDateTime) {
        setError(
          language === "tr"
            ? "Bitiş zamanı başlangıç zamanından sonra olmalıdır."
            : "End time must be after start time."
        );
        setSaving(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: formData.classId,
          instructorId: formData.instructorId,
          locationId:
            formData.locationId && formData.locationId.trim()
              ? formData.locationId
              : null,
          startTime: formData.startTime,
          endTime: formData.endTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchSessions(token);
      setShowForm(false);
      const defaultLocation = locations.find((loc) => loc.isDefault);
      setFormData({
        classId: "",
        instructorId: "",
        locationId: defaultLocation?.id || "",
        startTime: "",
        endTime: "",
        status: "SCHEDULED",
      });
      setSelectedStartDate(null);
      setSelectedEndDate(null);
      setCalculatedMaxCapacity(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (session: Session) => {
    setEditingId(session.id);
    setSelectedStartDate(
      session.startTime ? new Date(session.startTime) : null
    );
    setSelectedEndDate(session.endTime ? new Date(session.endTime) : null);
    // Get locationId from session - it might be in session.locationId or session.location?.id
    const sessionLocationId = session.locationId || session.location?.id || "";

    // Ensure locations are loaded before setting form data
    const formDataUpdate = {
      classId: session.classId,
      instructorId: session.instructorId || "",
      locationId: sessionLocationId,
      startTime: formatDateTimeLocal(session.startTime),
      endTime: formatDateTimeLocal(session.endTime),
      status: session.status,
    };

    setFormData(formDataUpdate);
    // Set calculated capacity from session
    setCalculatedMaxCapacity(session.maxCapacity);
    // Also fetch current capacity from location in case it changed
    if (sessionLocationId) {
      fetchMaxCapacityForLocation(sessionLocationId);
    }
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingId) return;

    setSaving(true);
    setError(null);

    // Only validate that endTime is after startTime (allow past dates when editing)
    if (formData.startTime && formData.endTime) {
      const startDateTime = new Date(formData.startTime);
      const endDateTime = new Date(formData.endTime);
      if (endDateTime <= startDateTime) {
        setError(
          language === "tr"
            ? "Bitiş zamanı başlangıç zamanından sonra olmalıdır."
            : "End time must be after start time."
        );
        setSaving(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/sessions/${editingId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: formData.classId,
          instructorId: formData.instructorId,
          locationId:
            formData.locationId && formData.locationId.trim()
              ? formData.locationId
              : null,
          startTime: formData.startTime,
          endTime: formData.endTime,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchSessions(token);
      setShowForm(false);
      setEditingId(null);
      const defaultLocation = locations.find((loc) => loc.isDefault);
      setFormData({
        classId: "",
        instructorId: "",
        locationId: defaultLocation?.id || "",
        startTime: "",
        endTime: "",
        status: "SCHEDULED",
      });
      setSelectedStartDate(null);
      setSelectedEndDate(null);
      setCalculatedMaxCapacity(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update session");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      classId: "",
      instructorId: "",
      locationId: "",
      startTime: "",
      endTime: "",
      status: "SCHEDULED",
    });
    setCalculatedMaxCapacity(null);
    setError(null);
  };

  const refreshData = () => {
    if (token) {
      fetchSessions(token);
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
          {t("sessions")}
        </h2>
        <div style={{ display: "flex", gap: "1rem" }}>
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
          <button
            onClick={() => {
              if (showForm) {
                handleCancel();
              } else {
                setShowForm(true);
                setEditingId(null);
              }
            }}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: showForm ? "#666" : "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showForm ? t("cancel") : `+ ${t("newSession")}`}
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
          <p style={{ margin: 0 }}>
            {t("error")}: {error}
          </p>
        </div>
      )}

      {showForm && (
        <div
          style={{
            backgroundColor: colors.cardBg,
            padding: "1.5rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            border: `1px solid ${colors.border}`,
          }}
        >
          <h3
            style={{ marginTop: 0, marginBottom: "1rem", color: colors.text }}
          >
            {editingId ? t("editSession") : t("createNewSession")}
          </h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1rem",
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
                  {t("class")} *
                </label>
                <select
                  required
                  value={formData.classId}
                  onChange={(e) =>
                    setFormData({ ...formData, classId: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "4px",
                    fontSize: "1rem",
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  }}
                >
                  <option value="">{t("selectClass")}</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
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
                  {t("location")}
                </label>
                <select
                  required
                  value={formData.locationId || ""}
                  onChange={(e) => {
                    const newLocationId = e.target.value;
                    setFormData({ ...formData, locationId: newLocationId });
                    // Fetch max capacity when location changes
                    fetchMaxCapacityForLocation(newLocationId);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "4px",
                    fontSize: "1rem",
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  }}
                >
                  <option value="">{t("selectLocation")}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.isDefault ? `(${t("default")})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {formData.locationId && (
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: colors.theadBg,
                    borderRadius: "4px",
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                      marginBottom: "0.25rem",
                    }}
                  >
                    {language === "tr"
                      ? "Maksimum Kapasite (Otomatik)"
                      : "Max Capacity (Auto)"}
                  </div>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {calculatedMaxCapacity !== null
                      ? calculatedMaxCapacity
                      : language === "tr"
                      ? "Hesaplanıyor..."
                      : "Calculating..."}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: colors.textMuted,
                      marginTop: "0.25rem",
                    }}
                  >
                    {language === "tr"
                      ? "Seçili lokasyonun aktif koltuk düzeninden hesaplanır"
                      : "Calculated from active seat layout of selected location"}
                  </div>
                </div>
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1rem",
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
                  {t("startTime")} *
                </label>
                <DatePicker
                  selected={
                    formData.startTime ? new Date(formData.startTime) : null
                  }
                  onChange={(date: Date | null) => {
                    setSelectedStartDate(date);
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0"
                      );
                      const day = String(date.getDate()).padStart(2, "0");
                      const hours = String(date.getHours()).padStart(2, "0");
                      const minutes = String(date.getMinutes()).padStart(
                        2,
                        "0"
                      );
                      setFormData({
                        ...formData,
                        startTime: `${year}-${month}-${day}T${hours}:${minutes}`,
                      });
                    }
                  }}
                  onChangeRaw={(e) => {
                    if (!e) return;
                    // Track when user types or changes date
                    const input = e.target as HTMLInputElement;
                    if (input.value) {
                      const date = new Date(input.value);
                      if (!isNaN(date.getTime())) {
                        setSelectedStartDate(date);
                      }
                    }
                  }}
                  onSelect={(date: Date | null) => {
                    // Track when user selects a date from calendar
                    if (date) {
                      setSelectedStartDate(date);
                    }
                  }}
                  showTimeSelect
                  timeIntervals={10}
                  dateFormat={
                    language === "tr"
                      ? "dd/MM/yyyy HH:mm"
                      : "MM/dd/yyyy h:mm aa"
                  }
                  locale={language === "tr" ? "tr" : "en"}
                  minDate={editingId ? undefined : new Date()}
                  {...startTimeProps}
                  required
                  wrapperClassName={`datepicker-wrapper datepicker-${theme}`}
                  calendarClassName={`datepicker-calendar-${theme}`}
                  customInput={
                    <input
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: "4px",
                        fontSize: "1rem",
                        backgroundColor: colors.inputBg,
                        color: colors.text,
                      }}
                    />
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
                  {t("endTime")} *
                </label>
                <DatePicker
                  selected={
                    formData.endTime ? new Date(formData.endTime) : null
                  }
                  onChange={(date: Date | null) => {
                    setSelectedEndDate(date);
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0"
                      );
                      const day = String(date.getDate()).padStart(2, "0");
                      const hours = String(date.getHours()).padStart(2, "0");
                      const minutes = String(date.getMinutes()).padStart(
                        2,
                        "0"
                      );
                      setFormData({
                        ...formData,
                        endTime: `${year}-${month}-${day}T${hours}:${minutes}`,
                      });
                    }
                  }}
                  onChangeRaw={(e) => {
                    if (!e) return;
                    // Track when user types or changes date
                    const input = e.target as HTMLInputElement;
                    if (input.value) {
                      const date = new Date(input.value);
                      if (!isNaN(date.getTime())) {
                        setSelectedEndDate(date);
                      }
                    }
                  }}
                  onSelect={(date: Date | null) => {
                    // Track when user selects a date from calendar
                    if (date) {
                      setSelectedEndDate(date);
                    }
                  }}
                  showTimeSelect
                  timeIntervals={10}
                  dateFormat={
                    language === "tr"
                      ? "dd/MM/yyyy HH:mm"
                      : "MM/dd/yyyy h:mm aa"
                  }
                  locale={language === "tr" ? "tr" : "en"}
                  minDate={
                    editingId
                      ? undefined
                      : formData.startTime
                      ? new Date(formData.startTime)
                      : new Date()
                  }
                  {...endTimeProps}
                  required
                  wrapperClassName={`datepicker-wrapper datepicker-${theme}`}
                  calendarClassName={`datepicker-calendar-${theme}`}
                  customInput={
                    <input
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: "4px",
                        fontSize: "1rem",
                        backgroundColor: colors.inputBg,
                        color: colors.text,
                      }}
                    />
                  }
                />
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {t("instructor")} *
              </label>
              <select
                required
                value={formData.instructorId}
                onChange={(e) =>
                  setFormData({ ...formData, instructorId: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "4px",
                  fontSize: "1rem",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                }}
              >
                <option value="">{t("selectInstructor")}</option>
                {instructors && instructors.length > 0 ? (
                  instructors.map((instructor) => {
                    const displayName =
                      instructor.user?.name ||
                      instructor.user?.email ||
                      instructor.name ||
                      instructor.email ||
                      instructor.id;
                    console.log("Rendering instructor option:", {
                      id: instructor.id,
                      displayName,
                      hasUser: !!instructor.user,
                      userData: instructor.user,
                    });
                    return (
                      <option key={instructor.id} value={instructor.id}>
                        {displayName}
                      </option>
                    );
                  })
                ) : (
                  <option value="" disabled>
                    {language === "tr"
                      ? `Eğitmen bulunamadı (${
                          instructors?.length || 0
                        } yüklendi)`
                      : `No instructors available (${
                          instructors?.length || 0
                        } loaded)`}
                  </option>
                )}
              </select>
            </div>
            {editingId && (
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {t("status")}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "4px",
                    fontSize: "1rem",
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  }}
                >
                  <option value="SCHEDULED">{t("scheduled")}</option>
                  <option value="IN_PROGRESS">{t("inProgress")}</option>
                  <option value="COMPLETED">{t("completed")}</option>
                  <option value="CANCELLED">{t("cancelled")}</option>
                </select>
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                fontWeight: "bold",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {saving && <Spinner size={16} color="#ffffff" />}
              {saving
                ? t("saving")
                : editingId
                ? t("save")
                : t("createSession")}
            </button>
          </form>
        </div>
      )}

      {loading && sessions.length === 0 ? (
        <div
          style={{ padding: "2rem", textAlign: "center", color: colors.text }}
        >
          <p>{t("loading")}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: colors.textSecondary,
          }}
        >
          <p>{t("noSessionsFound")}</p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: "8px",
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              padding: "1rem",
              borderBottom: `1px solid ${colors.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: colors.theadBg,
            }}
          >
            <strong style={{ color: colors.text }}>
              {t("allSessions")} ({sessions.length})
            </strong>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: colors.theadBg }}>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("class")}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("location")}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("startTime")}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("endTime")}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("duration")} ({language === "tr" ? "dakika" : "min"})
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  AM/PM
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("currentBookings")}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {language === "tr" ? "Müzik" : "Music"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("status")}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => (
                <tr
                  key={session.id}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    backgroundColor:
                      index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                  }}
                >
                  <td style={{ padding: "1rem", color: colors.text }}>
                    <strong>{session.class?.name || "N/A"}</strong>
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {session.location?.name || "-"}
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {formatDate(session.startTime)}
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {formatDate(session.endTime)}
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {(() => {
                      // Calculate duration if not present
                      let duration = session.duration;
                      if (duration === undefined || duration === null) {
                        if (session.startTime && session.endTime) {
                          const start = new Date(session.startTime);
                          const end = new Date(session.endTime);
                          duration = Math.round(
                            (end.getTime() - start.getTime()) / (1000 * 60)
                          );
                        }
                      }
                      return duration !== undefined && duration !== null
                        ? `${duration} ${language === "tr" ? "dakika" : "min"}`
                        : "-";
                    })()}
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {(() => {
                      // Calculate AM/PM if not present
                      if (session.amPm) {
                        return session.amPm;
                      }
                      if (session.startTime) {
                        const start = new Date(session.startTime);
                        const hour = start.getHours();
                        return hour < 12 ? "AM" : "PM";
                      }
                      return "-";
                    })()}
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {session.currentBookings} / {session.maxCapacity}
                  </td>
                  <td style={{ padding: "1rem", color: colors.text }}>
                    {(
                      language === "tr" && session.class?.musicGenreTr
                        ? session.class.musicGenreTr
                        : session.class?.musicGenre
                    ) ? (
                      <span>
                        {language === "tr" ? "Müzik : " : "Music : "}
                        {language === "tr" && session.class?.musicGenreTr
                          ? session.class.musicGenreTr
                          : session.class?.musicGenre}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.85rem",
                        backgroundColor:
                          session.status === "SCHEDULED"
                            ? "#e3f2fd"
                            : session.status === "COMPLETED"
                            ? "#e8f5e9"
                            : session.status === "CANCELLED"
                            ? "#ffebee"
                            : "#fff3e0",
                        color:
                          session.status === "SCHEDULED"
                            ? "#1976d2"
                            : session.status === "COMPLETED"
                            ? "#388e3c"
                            : session.status === "CANCELLED"
                            ? "#d32f2f"
                            : "#f57c00",
                      }}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <button
                      onClick={() => handleEdit(session)}
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: "#1976d2",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      {t("edit")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
