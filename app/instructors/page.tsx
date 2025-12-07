"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InstructorsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get auth token from localStorage
    const token = localStorage.getItem("supabase_auth_token");

    if (!token) {
      setError("Not authenticated. Please log in.");
      setLoading(false);
      router.push("/");
      return;
    }

    // Verify user is instructor
    fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((userData) => {
        if (userData.role !== "INSTRUCTOR") {
          // Redirect if not instructor
          router.push("/");
          return;
        }

        // Fetch organization data
        return fetch("/api/organization", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      })
      .then((res) => {
        if (!res) return;
        if (!res.ok) {
          throw new Error("Failed to fetch organization data");
        }
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading instructor dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Instructor Dashboard</h1>
      <div style={{ marginTop: "2rem" }}>
        <h2>Organization</h2>
        <pre
          style={{
            backgroundColor: "#f5f5f5",
            padding: "1rem",
            borderRadius: "4px",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
