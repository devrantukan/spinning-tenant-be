'use client'

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in by checking localStorage
    const token = localStorage.getItem('supabase_auth_token');
    setIsLoggedIn(!!token);
    
    // If logged in, fetch user role
    if (token) {
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.role) {
            setUserRole(data.role);
          }
        })
        .catch(err => {
          console.error('Error fetching user role:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear localStorage
      localStorage.removeItem('supabase_auth_token');
      localStorage.removeItem('supabase_session');
      
      // Redirect to login
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if there's an error, clear local storage and redirect
      localStorage.removeItem('supabase_auth_token');
      localStorage.removeItem('supabase_session');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="w-full flex justify-between items-start mb-8">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
          {isLoggedIn && (
            <div className="flex gap-4">
              <a
                href={userRole === 'INSTRUCTOR' ? '/instructor' : '/admin'}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                {userRole === 'INSTRUCTOR' ? 'Dashboard' : 'Admin'}
              </a>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Spinning Tenant Backend
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {isLoggedIn 
              ? "You are logged in. Visit the dashboard to see your organization data."
              : "Please log in to access the tenant backend."}
          </p>
        </div>
        
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          {!isLoggedIn ? (
            <a
              className="flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-5 text-white transition-colors hover:bg-blue-700 md:w-[158px]"
              href="/login"
            >
              Login
            </a>
          ) : (
            <a
              className="flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-5 text-white transition-colors hover:bg-blue-700 md:w-[158px]"
              href={userRole === 'INSTRUCTOR' ? '/instructor' : '/admin'}
            >
              {userRole === 'INSTRUCTOR' ? 'Go to Dashboard' : 'Go to Admin'}
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
