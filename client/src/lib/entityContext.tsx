import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Entity } from "@shared/schema";

interface EntityContextType {
  entities: Entity[];
  selectedEntityId: number | null;
  selectedEntityIds: number[];
  setSelectedEntityId: (id: number | null) => void;
  setSelectedEntityIds: (ids: number[]) => void;
  selectedEntity: Entity | undefined;
  isLoading: boolean;
  entityFilterParam: string;
}

const EntityContext = createContext<EntityContextType>({
  entities: [],
  selectedEntityId: null,
  selectedEntityIds: [],
  setSelectedEntityId: () => {},
  setSelectedEntityIds: () => {},
  selectedEntity: undefined,
  isLoading: false,
  entityFilterParam: "",
});

export function EntityProvider({ children }: { children: ReactNode }) {
  const [selectedEntityIds, setSelectedEntityIdsState] = useState<number[]>(() => {
    const stored = localStorage.getItem("selectedEntityIds");
    if (stored) {
      try { return JSON.parse(stored); } catch { return []; }
    }
    const oldSingle = localStorage.getItem("selectedEntityId");
    if (oldSingle) return [Number(oldSingle)];
    return [];
  });

  const { data: entities = [], isLoading } = useQuery<Entity[]>({
    queryKey: ["/api/entities"],
  });

  const setSelectedEntityIds = (ids: number[]) => {
    setSelectedEntityIdsState(ids);
    if (ids.length === 0) {
      localStorage.removeItem("selectedEntityIds");
      localStorage.removeItem("selectedEntityId");
    } else {
      localStorage.setItem("selectedEntityIds", JSON.stringify(ids));
      localStorage.setItem("selectedEntityId", String(ids[0]));
    }
  };

  const setSelectedEntityId = (id: number | null) => {
    if (id === null) {
      setSelectedEntityIds([]);
    } else {
      setSelectedEntityIds([id]);
    }
  };

  const selectedEntityId = selectedEntityIds.length === 1 ? selectedEntityIds[0] : (selectedEntityIds.length === 0 ? null : selectedEntityIds[0]);
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  const entityFilterParam = selectedEntityIds.length > 0
    ? `entityId=${selectedEntityIds.join(',')}`
    : "";

  return (
    <EntityContext.Provider value={{
      entities,
      selectedEntityId,
      selectedEntityIds,
      setSelectedEntityId,
      setSelectedEntityIds,
      selectedEntity,
      isLoading,
      entityFilterParam,
    }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  return useContext(EntityContext);
}
