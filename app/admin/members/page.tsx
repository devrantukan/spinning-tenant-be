"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/LanguageContext";
import { showToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    name?: string;
    email: string;
    role: string;
  };
  status: string;
  creditBalance?: number;
  createdAt: string;
  _count?: {
    bookings: number;
  };
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    userId: "",
    status: "ACTIVE",
    creditBalance: 0,
    // For creating new user
    newUserEmail: "",
    newUserName: "",
    createNewUser: true,
  });
  const [creditChange, setCreditChange] = useState({
    amount: 0,
    description: "",
  });
  const [viewingTransactionsFor, setViewingTransactionsFor] = useState<
    string | null
  >(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    userId: string;
    email: string;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    memberId: string;
    memberName: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [resettingPasswords, setResettingPasswords] = useState<Set<string>>(
    new Set()
  );
  const [invitationStatuses, setInvitationStatuses] = useState<
    Record<string, any>
  >({});
  const [redeemPackageModal, setRedeemPackageModal] = useState<{
    isOpen: boolean;
    memberId: string;
    memberName: string;
  } | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [redemptionFormData, setRedemptionFormData] = useState({
    packageId: "",
    couponCode: "",
  });
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

  useEffect(() => {
    const authToken = localStorage.getItem("supabase_auth_token");

    if (!authToken) {
      router.push("/login");
      return;
    }

    setToken(authToken);
    fetchMembers(authToken);
    fetchPackages(authToken);
  }, [router]);

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

  // Initial users fetch and update when members change
  useEffect(() => {
    if (token) {
      fetchUsers(token, members);
    }
  }, [members, token]);

  const fetchMembers = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/members", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const membersList = Array.isArray(data) ? data : [];
      setMembers(membersList);

      // Check invitation status for all members
      if (membersList.length > 0) {
        // Set initial empty statuses
        const initialStatuses: Record<string, any> = {};
        membersList.forEach((member: Member) => {
          if (member.userId) {
            initialStatuses[member.userId] = null; // null means checking
          }
        });
        setInvitationStatuses(initialStatuses);

        // Set a timeout to show "Unknown" if checks take too long
        setTimeout(() => {
          setInvitationStatuses((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((userId) => {
              if (updated[userId] === null) {
                updated[userId] = {
                  hasInvitation: false,
                  emailConfirmed: false,
                  needsResend: false,
                  error: true,
                  message: "Status check timeout",
                };
              }
            });
            return updated;
          });
        }, 15000); // 15 second timeout

        // Then check actual statuses
        checkInvitationStatuses(membersList, authToken);
      }

      return membersList;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch members");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (
    authToken: string,
    currentMembers: Member[] = members
  ) => {
    try {
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out users who already have member records
        const existingMemberUserIds = new Set(
          currentMembers.map((m) => m.userId)
        );
        const availableUsers = Array.isArray(data)
          ? data.filter((u: User) => !existingMemberUserIds.has(u.id))
          : [];
        setUsers(availableUsers);
      }
    } catch (err) {
      // Silently fail - users list is optional
      console.error("Failed to fetch users:", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      let userId = formData.userId;

      // Always create new user
      if (formData.createNewUser) {
        if (!formData.newUserEmail) {
          setError(t("email") + " " + t("isRequired"));
          setSaving(false);
          return;
        }

        // Create new user with MEMBER role
        const userResponse = await fetch("/api/users", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.newUserEmail,
            name: formData.newUserName || undefined,
            role: "MEMBER",
          }),
        });

        if (!userResponse.ok) {
          const errorData = await userResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to create user: HTTP ${userResponse.status}`
          );
        }

        const newUser = await userResponse.json();
        userId = newUser.id;
      }

      // Create member
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          status: formData.status,
          creditBalance: Math.round(formData.creditBalance || 0),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchMembers(token);
      await fetchUsers(token, []); // Refresh users list
      setShowForm(false);
      setFormData({
        userId: "",
        status: "ACTIVE",
        creditBalance: 0,
        newUserEmail: "",
        newUserName: "",
        createNewUser: true,
      });
      showToast(t("memberCreatedSuccessfully"), "success");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create member";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast(t("notAuthenticated") || "Not authenticated", "error");
      return;
    }

    // Capture editingId in a variable to avoid stale closure issues
    const currentEditingId = editingId;
    if (!currentEditingId) {
      console.error("handleUpdate called but editingId is null/undefined");
      showToast("No member selected for editing", "error");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updateBody: any = {
        status: formData.status,
      };

      // If credit change is specified, use it; otherwise use direct balance
      if (creditChange.amount !== 0) {
        updateBody.creditChange = Math.round(creditChange.amount);
        if (creditChange.description) {
          updateBody.description = creditChange.description;
        }
      } else if (formData.creditBalance !== undefined) {
        updateBody.creditBalance = Math.round(formData.creditBalance || 0);
      }

      console.log(
        "Updating member with ID:",
        currentEditingId,
        "Body:",
        updateBody
      );
      const response = await fetch(`/api/members/${currentEditingId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchMembers(token);
      await fetchUsers(token, []); // Refresh users list
      setShowForm(false);
      setEditingId(null);
      setFormData({
        userId: "",
        status: "ACTIVE",
        creditBalance: 0,
        newUserEmail: "",
        newUserName: "",
        createNewUser: false,
      });
      setCreditChange({ amount: 0, description: "" });
      showToast(t("memberUpdatedSuccessfully"), "success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string, memberName: string) => {
    setDeleteModal({ isOpen: true, memberId: id, memberName });
  };

  const handleDelete = async () => {
    if (!token || !deleteModal) return;

    const { memberId } = deleteModal;
    setDeleteModal(null);

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await fetchMembers(token);
      await fetchUsers(token, []); // Refresh users list
      showToast(t("memberDeletedSuccessfully"), "success");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete member";
      setError(errorMessage);
      showToast(errorMessage, "error");
    }
  };

  const handleEdit = (member: Member) => {
    setEditingId(member.id);
    setFormData({
      userId: member.userId,
      status: member.status,
      creditBalance: member.creditBalance || 0,
      newUserEmail: "",
      newUserName: "",
      createNewUser: false,
    });
    setCreditChange({ amount: 0, description: "" });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      userId: "",
      status: "ACTIVE",
      creditBalance: 0,
      newUserEmail: "",
      newUserName: "",
      createNewUser: false,
    });
    setCreditChange({ amount: 0, description: "" });
    setError(null);
  };

  const fetchTransactions = async (memberId: string) => {
    if (!token) return;

    setLoadingTransactions(true);
    try {
      const response = await fetch(
        `/api/members/${memberId}/credit-transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTransactions(Array.isArray(data) ? data : []);
        setViewingTransactionsFor(memberId);
      } else {
        showToast("Failed to fetch transaction history", "error");
      }
    } catch (error) {
      showToast("Error loading transaction history", "error");
    } finally {
      setLoadingTransactions(false);
    }
  };

  const checkInvitationStatuses = async (
    membersList: Member[],
    authToken: string
  ) => {
    if (!authToken) {
      console.warn("No auth token, skipping invitation status check");
      return;
    }

    console.log(
      `Checking invitation statuses for ${membersList.length} members`
    );
    const statuses: Record<string, any> = {};

    // Check status for each member in parallel with timeout
    const statusPromises = membersList
      .filter((member) => member.userId)
      .map(async (member) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const res = await fetch(
            `/api/users/${member.userId}/invitation-status`,
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (res.ok) {
            const status = await res.json();
            console.log(`Status for member ${member.userId}:`, status);
            return { userId: member.userId, status };
          } else {
            const errorData = await res.json().catch(() => ({}));
            console.error(
              `Failed to get status for member ${member.userId} (${res.status}):`,
              errorData
            );

            if (res.status === 401) {
              return {
                userId: member.userId,
                status: {
                  hasInvitation: false,
                  emailConfirmed: false,
                  needsResend: false,
                  error: true,
                  message: "Authentication failed. Please refresh the page.",
                },
              };
            }

            return {
              userId: member.userId,
              status: {
                hasInvitation: false,
                emailConfirmed: false,
                needsResend: false,
                error: true,
                message: errorData.error || "Failed to check status",
              },
            };
          }
        } catch (error: any) {
          console.error(
            `Error checking status for member ${member.userId}:`,
            error
          );
          return {
            userId: member.userId,
            status: {
              hasInvitation: false,
              emailConfirmed: false,
              needsResend: false,
              error: true,
              message:
                error.name === "AbortError"
                  ? "Request timeout"
                  : error.message || "Failed to check status",
            },
          };
        }
      });

    try {
      const results = await Promise.allSettled(statusPromises);
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const { userId, status } = result.value;
          statuses[userId] = status;
        }
      });

      console.log("Final invitation statuses:", statuses);
      setInvitationStatuses(statuses);
    } catch (error) {
      console.error("Error processing invitation statuses:", error);
    }
  };

  const handleResetPasswordClick = (userId: string, userEmail: string) => {
    setResetPasswordModal({ isOpen: true, userId, email: userEmail });
  };

  const handleResetPassword = async () => {
    if (!token || !resetPasswordModal) {
      showToast(t("error") + ": Not authenticated", "error");
      return;
    }

    const { userId } = resetPasswordModal;
    setResetPasswordModal(null);
    setResettingPasswords((prev) => new Set(prev).add(userId));

    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || "Failed to reset password";
        showToast(errorMsg, "error");
        return;
      }

      showToast(
        t("passwordResetSent") || "Password reset email sent",
        "success"
      );
    } catch (error: any) {
      showToast(`${t("error")}: ${error.message}`, "error");
    } finally {
      setResettingPasswords((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const refreshData = async () => {
    if (token) {
      const updatedMembers = await fetchMembers(token);
      if (updatedMembers) {
        await fetchUsers(token, updatedMembers);
      }
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
          {t("members")}
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
            {showForm ? t("cancel") : `+ ${t("newMember")}`}
          </button>
        </div>
      </div>

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
            {editingId ? t("editMember") : t("createNewMember")}
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingId) {
                handleUpdate(e);
              } else {
                handleCreate(e);
              }
            }}
          >
            {!editingId && (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {t("email")} *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.newUserEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, newUserEmail: e.target.value })
                    }
                    placeholder={t("email")}
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
                    {t("name")} ({t("optional")})
                  </label>
                  <input
                    type="text"
                    value={formData.newUserName}
                    onChange={(e) =>
                      setFormData({ ...formData, newUserName: e.target.value })
                    }
                    placeholder={t("name")}
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
                </div>
              </>
            )}
            {editingId ? (
              <>
                <div
                  style={{
                    marginBottom: "1rem",
                    padding: "1rem",
                    backgroundColor: theme === "dark" ? "#2a2a2a" : "#f0f7ff",
                    borderRadius: "6px",
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <h4
                    style={{
                      marginTop: 0,
                      marginBottom: "0.75rem",
                      color: colors.text,
                      fontSize: "0.9rem",
                      fontWeight: "600",
                    }}
                  >
                    {t("adjustCreditBalance") || "Adjust Credit Balance"}
                  </h4>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "600",
                        color: colors.text,
                        fontSize: "0.875rem",
                      }}
                    >
                      {t("creditChange") || "Credit Change"} (
                      {t("positiveToAdd") || "Positive to add"},{" "}
                      {t("negativeToDeduct") || "Negative to deduct"})
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={
                        creditChange.amount !== 0 ? creditChange.amount : ""
                      }
                      onChange={(e) =>
                        setCreditChange({
                          ...creditChange,
                          amount: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
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
                  </div>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "600",
                        color: colors.text,
                        fontSize: "0.875rem",
                      }}
                    >
                      {t("description") || "Description"} ({t("optional")})
                    </label>
                    <input
                      type="text"
                      value={creditChange.description}
                      onChange={(e) =>
                        setCreditChange({
                          ...creditChange,
                          description: e.target.value,
                        })
                      }
                      placeholder={
                        t("transactionDescriptionPlaceholder") ||
                        "e.g., Payment received, Refund, Adjustment"
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
                    />
                  </div>
                  <div
                    style={{ fontSize: "0.75rem", color: colors.textSecondary }}
                  >
                    {t("currentBalance") || "Current Balance"}:{" "}
                    {Math.round(formData.creditBalance || 0)} |
                    {creditChange.amount !== 0 && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          color:
                            creditChange.amount > 0 ? "#4caf50" : "#f44336",
                        }}
                      >
                        {t("newBalance") || "New Balance"}:{" "}
                        {Math.round(
                          (formData.creditBalance || 0) + creditChange.amount
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {t("creditBalance") || "Credit Balance"}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={Math.round(formData.creditBalance || 0)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      creditBalance: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
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
              </div>
            )}
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
                <option value="ACTIVE">{t("active")}</option>
                <option value="INACTIVE">{t("inactive")}</option>
                <option value="ARCHIVED">{t("archived")}</option>
              </select>
            </div>
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
              {saving ? t("saving") : editingId ? t("save") : t("createMember")}
            </button>
          </form>
        </div>
      )}

      {loading && members.length === 0 ? (
        <div
          style={{ padding: "2rem", textAlign: "center", color: colors.text }}
        >
          <Spinner text={t("loading")} />
        </div>
      ) : members.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: colors.textSecondary,
          }}
        >
          <p>{t("noMembersFound")}</p>
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
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: colors.theadBg }}>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {t("name")}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {t("email")}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {t("status")}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {t("creditBalance") || "Credit Balance"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {t("invitationStatus") || "Invitation"}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {t("bookings")}
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr
                  key={member.id}
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
                    {member.user?.name || "-"}
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    {member.user?.email || "-"}
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                        backgroundColor:
                          member.status === "ACTIVE"
                            ? "#4caf50"
                            : member.status === "INACTIVE"
                            ? "#ff9800"
                            : "#757575",
                        color: "white",
                      }}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      borderBottom: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  >
                    {typeof member.creditBalance === "number"
                      ? Math.round(member.creditBalance)
                      : 0}
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    {(() => {
                      const invitationStatus =
                        invitationStatuses[member.userId];
                      if (
                        invitationStatus === null ||
                        invitationStatus === undefined
                      ) {
                        return (
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              backgroundColor:
                                theme === "dark" ? "#2a2a2a" : "#f5f5f5",
                              color: colors.textSecondary,
                            }}
                          >
                            {t("checking") || "Checking..."}
                          </span>
                        );
                      } else if (invitationStatus.error === true) {
                        return (
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              backgroundColor:
                                theme === "dark" ? "#5d1a1a" : "#ffebee",
                              color: theme === "dark" ? "#f48fb1" : "#d32f2f",
                            }}
                            title={invitationStatus.message || t("error")}
                          >
                            {t("unknown") || "Unknown"}
                          </span>
                        );
                      } else if (invitationStatus.emailConfirmed === true) {
                        return (
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              backgroundColor:
                                theme === "dark" ? "#1b5e20" : "#e8f5e9",
                              color: theme === "dark" ? "#81c784" : "#388e3c",
                            }}
                          >
                            ✓ {t("confirmed") || "Confirmed"}
                          </span>
                        );
                      } else {
                        return (
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              backgroundColor:
                                theme === "dark" ? "#5d4037" : "#fff3e0",
                              color: theme === "dark" ? "#ffab91" : "#f57c00",
                            }}
                          >
                            ⏳ {t("pending") || "Pending"}
                          </span>
                        );
                      }
                    })()}
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    {member._count?.bookings || 0}
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => handleEdit(member)}
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
                      <button
                        onClick={() => fetchTransactions(member.id)}
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#ff9800",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                        }}
                      >
                        {t("viewHistory") || "History"}
                      </button>
                      <button
                        onClick={() => {
                          setRedeemPackageModal({
                            isOpen: true,
                            memberId: member.id,
                            memberName:
                              member.user?.name ||
                              member.user?.email ||
                              "Member",
                          });
                          setRedemptionFormData({
                            packageId: "",
                            couponCode: "",
                          });
                        }}
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#4caf50",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                        }}
                      >
                        {t("redeemPackage") || "Redeem Package"}
                      </button>
                      {member.userId && (
                        <button
                          onClick={() =>
                            handleResetPasswordClick(
                              member.userId,
                              member.user?.email || ""
                            )
                          }
                          disabled={resettingPasswords.has(member.userId)}
                          style={{
                            padding: "0.25rem 0.75rem",
                            backgroundColor: resettingPasswords.has(
                              member.userId
                            )
                              ? theme === "dark"
                                ? "#555"
                                : "#ccc"
                              : theme === "dark"
                              ? "#424242"
                              : "#616161",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: resettingPasswords.has(member.userId)
                              ? "not-allowed"
                              : "pointer",
                            fontSize: "0.875rem",
                            opacity: resettingPasswords.has(member.userId)
                              ? 0.6
                              : 1,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          {resettingPasswords.has(member.userId) ? (
                            <>
                              <Spinner size={14} color="#ffffff" />
                              <span>{t("resetting") || "Resetting..."}</span>
                            </>
                          ) : (
                            t("resetPassword") || "Reset Password"
                          )}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleDeleteClick(
                            member.id,
                            member.user?.name || member.user?.email || "Member"
                          )
                        }
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction History Modal */}
      {viewingTransactionsFor && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem",
          }}
          onClick={() => setViewingTransactionsFor(null)}
        >
          <div
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: "8px",
              padding: "1.5rem",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              border: `1px solid ${colors.border}`,
              boxShadow:
                theme === "light"
                  ? "0 4px 6px rgba(0,0,0,0.1)"
                  : "0 4px 6px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ margin: 0, color: colors.text }}>
                {t("creditTransactionHistory") || "Credit Transaction History"}
              </h3>
              <button
                onClick={() => setViewingTransactionsFor(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: colors.text,
                  padding: "0.25rem 0.5rem",
                }}
              >
                ×
              </button>
            </div>

            {loadingTransactions ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: colors.text,
                }}
              >
                <Spinner text={t("loading") || "Loading..."} />
              </div>
            ) : transactions.length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: colors.textSecondary,
                }}
              >
                {t("noTransactions") || "No transactions found"}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                          color: colors.text,
                          fontWeight: "600",
                        }}
                      >
                        {t("date") || "Date"}
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "left",
                          color: colors.text,
                          fontWeight: "600",
                        }}
                      >
                        {t("type") || "Type"}
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "right",
                          color: colors.text,
                          fontWeight: "600",
                        }}
                      >
                        {t("amount") || "Amount"}
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "right",
                          color: colors.text,
                          fontWeight: "600",
                        }}
                      >
                        {t("balanceBefore") || "Balance Before"}
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "right",
                          color: colors.text,
                          fontWeight: "600",
                        }}
                      >
                        {t("balanceAfter") || "Balance After"}
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "left",
                          color: colors.text,
                          fontWeight: "600",
                        }}
                      >
                        {t("description") || "Description"}
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "left",
                          color: colors.text,
                          fontWeight: "600",
                        }}
                      >
                        {t("performedBy") || "Performed By"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction: any, index: number) => (
                      <tr
                        key={transaction.id}
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                          backgroundColor:
                            index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                        }}
                      >
                        <td style={{ padding: "0.75rem", color: colors.text }}>
                          {new Date(transaction.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: "0.75rem", color: colors.text }}>
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              backgroundColor:
                                transaction.type === "MANUAL_ADD"
                                  ? theme === "dark"
                                    ? "#1b5e20"
                                    : "#e8f5e9"
                                  : transaction.type === "MANUAL_DEDUCT"
                                  ? theme === "dark"
                                    ? "#5d1a1a"
                                    : "#ffebee"
                                  : transaction.type === "BOOKING_PAYMENT"
                                  ? theme === "dark"
                                    ? "#424242"
                                    : "#f5f5f5"
                                  : transaction.type === "REFUND"
                                  ? theme === "dark"
                                    ? "#1e3a5f"
                                    : "#e3f2fd"
                                  : theme === "dark"
                                  ? "#5d4037"
                                  : "#fff3e0",
                              color:
                                transaction.type === "MANUAL_ADD"
                                  ? theme === "dark"
                                    ? "#81c784"
                                    : "#388e3c"
                                  : transaction.type === "MANUAL_DEDUCT"
                                  ? theme === "dark"
                                    ? "#f48fb1"
                                    : "#d32f2f"
                                  : transaction.type === "BOOKING_PAYMENT"
                                  ? theme === "dark"
                                    ? "#b0b0b0"
                                    : "#616161"
                                  : transaction.type === "REFUND"
                                  ? theme === "dark"
                                    ? "#90caf9"
                                    : "#1976d2"
                                  : theme === "dark"
                                  ? "#ffab91"
                                  : "#f57c00",
                            }}
                          >
                            {transaction.type?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            color:
                              transaction.amount > 0 ? "#4caf50" : "#f44336",
                            fontWeight: "600",
                          }}
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {Math.round(transaction.amount)}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            color: colors.text,
                          }}
                        >
                          {Math.round(transaction.balanceBefore)}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            color: colors.text,
                            fontWeight: "600",
                          }}
                        >
                          {Math.round(transaction.balanceAfter)}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            color: colors.textSecondary,
                          }}
                        >
                          {transaction.description || "-"}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            color: colors.textSecondary,
                          }}
                        >
                          {transaction.performedBy?.name ||
                            transaction.performedBy?.email ||
                            "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <Modal
          isOpen={resetPasswordModal.isOpen}
          onClose={() => setResetPasswordModal(null)}
          title={t("resetPassword") || "Reset Password"}
          onConfirm={handleResetPassword}
          confirmText={t("resetPassword") || "Reset Password"}
          cancelText={t("cancel") || "Cancel"}
          confirmButtonStyle={{ backgroundColor: "#ff9800" }}
        >
          <p>
            {t("resetPasswordConfirm")?.replace(
              "{email}",
              resetPasswordModal.email
            ) ||
              `Are you sure you want to reset the password for ${resetPasswordModal.email}?`}
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: colors.textSecondary,
              marginTop: "0.5rem",
            }}
          >
            {t("resetPasswordNote") ||
              "A password reset email will be sent to this user."}
          </p>
        </Modal>
      )}

      {/* Delete Member Modal */}
      {deleteModal && (
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(null)}
          title={t("deleteMember") || "Delete Member"}
          onConfirm={handleDelete}
          confirmText={t("delete") || "Delete"}
          cancelText={t("cancel") || "Cancel"}
          confirmButtonStyle={{ backgroundColor: "#f44336" }}
        >
          <p>
            {t("confirmDelete")?.replace("{name}", deleteModal.memberName) ||
              `Are you sure you want to delete ${deleteModal.memberName}?`}
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

      {/* Redeem Package Modal */}
      {redeemPackageModal && (
        <Modal
          isOpen={redeemPackageModal.isOpen}
          onClose={() => {
            setRedeemPackageModal(null);
            setRedemptionFormData({ packageId: "", couponCode: "" });
          }}
          title={t("redeemPackageForMember") || "Redeem Package for Member"}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !token ||
                !redeemPackageModal ||
                !redemptionFormData.packageId
              ) {
                return;
              }

              setSaving(true);
              try {
                const response = await fetch("/api/packages/redeem", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    memberId: redeemPackageModal.memberId,
                    packageId: redemptionFormData.packageId,
                    couponCode: redemptionFormData.couponCode || undefined,
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  throw new Error(errorData.error || `HTTP ${response.status}`);
                }

                await fetchMembers(token);
                setRedeemPackageModal(null);
                setRedemptionFormData({ packageId: "", couponCode: "" });
                showToast(
                  t("packageRedeemed") || "Package successfully redeemed",
                  "success"
                );
              } catch (err: unknown) {
                showToast(
                  err instanceof Error
                    ? err.message
                    : "Failed to redeem package",
                  "error"
                );
              } finally {
                setSaving(false);
              }
            }}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <p style={{ color: colors.text, marginBottom: "1rem" }}>
              {t("redeemPackageForMember") || "Redeem Package for"}:{" "}
              <strong>{redeemPackageModal.memberName}</strong>
            </p>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {t("selectPackage") || "Select Package"}{" "}
                <span style={{ color: colors.error }}>*</span>
              </label>
              <select
                value={redemptionFormData.packageId}
                onChange={(e) =>
                  setRedemptionFormData({
                    ...redemptionFormData,
                    packageId: e.target.value,
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
                <option value="">
                  {t("selectPackage") || "Select a package"}
                </option>
                {packages
                  .filter((pkg) => pkg.isActive)
                  .map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {language === "tr" && pkg.nameTr ? pkg.nameTr : pkg.name}{" "}
                      -{" "}
                      {new Intl.NumberFormat("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      }).format(pkg.price)}
                      {pkg.credits &&
                        ` (${pkg.credits} ${t("credits") || "credits"})`}
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
                {t("selectCoupon") || "Coupon Code"} (
                {t("optional") || "Optional"})
              </label>
              <input
                type="text"
                value={redemptionFormData.couponCode}
                onChange={(e) =>
                  setRedemptionFormData({
                    ...redemptionFormData,
                    couponCode: e.target.value.toUpperCase(),
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
                placeholder="e.g., SUMMER2024"
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
                marginTop: "1rem",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setRedeemPackageModal(null);
                  setRedemptionFormData({ packageId: "", couponCode: "" });
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
                disabled={saving || !redemptionFormData.packageId}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    saving || !redemptionFormData.packageId
                      ? "not-allowed"
                      : "pointer",
                  opacity: saving || !redemptionFormData.packageId ? 0.6 : 1,
                }}
              >
                {saving
                  ? t("processing") || "Processing..."
                  : t("redeemPackage") || "Redeem Package"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
