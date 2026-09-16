import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const AuthContext = createContext(null);

async function authApi(path, body) {
  const res = await fetch(`/api/auth${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi("/me"),
    staleTime: 60_000,
  });

  const user = data?.user ?? null;

  const invalidateAll = () => {
    queryClient.invalidateQueries(); // every data query is user-scoped
  };

  const register = async (payload) => {
    const result = await authApi("/register", payload);
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
    invalidateAll();
    return result;
  };

  const login = async (payload) => {
    const result = await authApi("/login", payload);
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
    invalidateAll();
    return result;
  };

  const logout = async () => {
    await authApi("/logout", {});
    queryClient.clear(); // drop all cached user data
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
