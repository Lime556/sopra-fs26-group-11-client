"use client";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { value: token } = useLocalStorage<string>("token", "");

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Redirect if not logged in
  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace("/login");
  }, [hydrated, token, router]);

  // While not hydrated, render nothing (server + first client render match)
  if (!hydrated) return null;

  // If no token, also render nothing (redirect will happen)
  if (!token) return null;

  return (
    <div className="page-shell">
      <div className="page-content">{children}</div>
    </div>
  );
}