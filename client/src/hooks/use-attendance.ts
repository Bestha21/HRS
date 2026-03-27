import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useAttendance(employeeId?: number) {
  return useQuery({
    queryKey: [api.attendance.list.path, employeeId],
    queryFn: async () => {
      // For demo, we just fetch all or filter by ID if provided
      const url = new URL(api.attendance.list.path, window.location.origin);
      if (employeeId) url.searchParams.append("employeeId", employeeId.toString());
      
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return api.attendance.list.responses[200].parse(await res.json());
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: number) => {
      const res = await fetch(api.attendance.checkIn.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Check-in failed");
      return api.attendance.checkIn.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: number) => {
      const res = await fetch(api.attendance.checkOut.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Check-out failed");
      return api.attendance.checkOut.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
    },
  });
}
