import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertEmployee } from "@shared/schema";
import { useEntity } from "@/lib/entityContext";

export function useEmployees() {
  const { entityFilterParam, selectedEntityIds } = useEntity();
  const queryPath = entityFilterParam 
    ? `${api.employees.list.path}?${entityFilterParam}` 
    : api.employees.list.path;
  
  return useQuery({
    queryKey: [api.employees.list.path, selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(queryPath, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return api.employees.list.responses[200].parse(await res.json());
    },
  });
}

export function useAllEmployees() {
  return useQuery({
    queryKey: [api.employees.list.path, "all"],
    queryFn: async () => {
      const res = await fetch(api.employees.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return api.employees.list.responses[200].parse(await res.json());
    },
  });
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: [api.employees.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.employees.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employee");
      return api.employees.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const res = await fetch(api.employees.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create employee");
      return api.employees.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.employees.list.path] });
    },
  });
}

export function useDepartments() {
  const { entityFilterParam, selectedEntityIds } = useEntity();
  const queryPath = entityFilterParam 
    ? `${api.departments.list.path}?${entityFilterParam}` 
    : api.departments.list.path;

  return useQuery({
    queryKey: [api.departments.list.path, selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(queryPath, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch departments");
      return api.departments.list.responses[200].parse(await res.json());
    },
  });
}
