import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.error || `Request failed (${res.status})`);
    e.code = err.code;
    e.status = res.status;
    throw e;
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

export function useOpenings() {
  return useQuery({ queryKey: ["openings"], queryFn: () => api("/openings") });
}

export function useResources() {
  return useQuery({ queryKey: ["resources"], queryFn: () => api("/resources") });
}

export function useRoadmap() {
  return useQuery({ queryKey: ["roadmap"], queryFn: () => api("/roadmap") });
}

export function useNextCheckpoint() {
  return useQuery({
    queryKey: ["checkpoints", "next"],
    queryFn: () => api("/checkpoints/next"),
  });
}

export function useCheckpointStats() {
  return useQuery({
    queryKey: ["checkpoints", "stats"],
    queryFn: () => api("/checkpoints/stats"),
  });
}

export function useReadinessHistory() {
  return useQuery({
    queryKey: ["readiness", "history"],
    queryFn: () => api("/readiness/history"),
  });
}

export function useChatHistory(enabled) {
  return useQuery({
    queryKey: ["chat", "history"],
    queryFn: () => api("/ai/chat/history"),
    enabled,
  });
}

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: () => api("/stats") });
}

export function useAcademia() {
  return useQuery({ queryKey: ["academia"], queryFn: () => api("/academia") });
}

/* ---------- mutations ---------- */

export function useSaveOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug) => api(`/openings/${slug}/save`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["openings"] }),
  });
}

export function useMarkApplied() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, applied }) =>
      api(`/openings/${slug}/applied`, { method: "POST", body: { applied } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["openings"] }),
  });
}

export function useSetResourceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) =>
      api(`/resources/${id}/status`, { method: "POST", body: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resources"] });
      qc.invalidateQueries({ queryKey: ["skills"] });
    },
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

export function useSubmitCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skill, answers }) =>
      api(`/checkpoints/${encodeURIComponent(skill)}/submit`, {
        method: "POST",
        body: { answers },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkpoints"] });
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["readiness"] });
    },
  });
}

export function useSendChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message) => api("/ai/chat", { method: "POST", body: { message } }),
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
      qc.invalidateQueries({ queryKey: ["openings"] });
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
      qc.invalidateQueries({ queryKey: ["readiness"] });
    },
  });
}
