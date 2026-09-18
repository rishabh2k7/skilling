import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/* ---------- queries ---------- */

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: () => api("/profile") });
}

export function useSkills() {
  return useQuery({ queryKey: ["skills"], queryFn: () => api("/skills") });
}

export function useOpportunities() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: () => api("/opportunities"),
  });
}

export function useRoadmap() {
  return useQuery({ queryKey: ["roadmap"], queryFn: () => api("/roadmap") });
}

export function useNextAssessment() {
  return useQuery({
    queryKey: ["assessments", "next"],
    queryFn: () => api("/assessments/next"),
  });
}

export function useChatHistory(enabled) {
  return useQuery({
    queryKey: ["chat", "history"],
    queryFn: () => api("/ai/chat/history"),
    enabled,
  });
}

export function useAcademia() {
  return useQuery({ queryKey: ["academia"], queryFn: () => api("/academia") });
}

/* ---------- mutations ---------- */

export function useSaveOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/opportunities/${id}/save`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });
}

export function useApplyOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, applied }) =>
      api(`/opportunities/${id}/apply`, { method: "POST", body: { applied } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunities"] }),
  });
}

export function useToggleRoadmapStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, complete }) =>
      api(`/roadmap/${stepId}`, { method: "POST", body: { complete } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap"] }),
  });
}

export function useSubmitAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, selectedIndex }) =>
      api(`/assessments/${id}/attempt`, {
        method: "POST",
        body: { selectedIndex },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      qc.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}

export function useSendChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message) =>
      api("/ai/chat", { method: "POST", body: { message } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat"] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields) => api("/profile", { method: "PATCH", body: fields }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["auth"] }); // sidebar shows the user's name
    },
  });
}

export function useUpdateSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skills) => api("/skills", { method: "PATCH", body: { skills } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
