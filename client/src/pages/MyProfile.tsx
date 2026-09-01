import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function MyProfile() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (user?.id) {
      setLocation(`/members/${user.id}`);
    } else {
      setLocation("/signin");
    }
  }, [user, loading, setLocation]);

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
