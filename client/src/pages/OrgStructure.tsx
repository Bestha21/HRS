import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Network, Plus, UserPlus, Edit, Trash2, ChevronDown, ChevronRight, Users, Building2, Minus, Maximize2 } from "lucide-react";
import type { Employee } from "@shared/schema";
import { useState, useMemo, useCallback } from "react";

interface OrgPosition {
  id: number;
  title: string;
  level: number;
  parentId: number | null;
  employeeId: number | null;
  sortOrder: number | null;
  createdAt: string | null;
}

interface OrgTreeNode {
  position: OrgPosition;
  children: OrgTreeNode[];
}

function buildOrgTree(positions: OrgPosition[]): OrgTreeNode[] {
  const map = new Map<number, OrgTreeNode>();
  const roots: OrgTreeNode[] = [];

  positions.forEach(pos => {
    map.set(pos.id, { position: pos, children: [] });
  });

  positions.forEach(pos => {
    const node = map.get(pos.id)!;
    if (pos.parentId && map.has(pos.parentId)) {
      map.get(pos.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  map.forEach(node => {
    node.children.sort((a, b) => (a.position.sortOrder || 0) - (b.position.sortOrder || 0));
  });

  return roots;
}

function getDescendantCount(node: OrgTreeNode): number {
  let count = node.children.length;
  node.children.forEach(child => {
    count += getDescendantCount(child);
  });
  return count;
}

function OrgNodeCard({
  node,
  employees,
  onAssign,
  onEdit,
  onDelete,
  onAdd,
  collapsed,
  onToggle,
}: {
  node: OrgTreeNode;
  employees: Employee[];
  onAssign: (positionId: number, employeeId: number | null) => void;
  onEdit: (position: OrgPosition) => void;
  onDelete: (id: number) => void;
  onAdd: (parentId: number) => void;
  collapsed: Set<number>;
  onToggle: (id: number) => void;
}) {
  const isCollapsed = collapsed.has(node.position.id);
  const hasChildren = node.children.length > 0;
  const assignedEmployee = node.position.employeeId
    ? employees.find(e => e.id === node.position.employeeId)
    : null;
  const descendantCount = getDescendantCount(node);

  return (
    <div className="flex flex-col items-center" data-testid={`org-node-${node.position.id}`}>
      <div className="relative group">
        <div className={`
          min-w-[180px] max-w-[220px] rounded-lg border-2 shadow-sm transition-all
          ${node.position.level === 0 ? 'border-teal-600 bg-teal-700 text-white' : ''}
          ${node.position.level === 1 ? 'border-teal-500 bg-teal-600 text-white' : ''}
          ${node.position.level >= 2 && node.position.level <= 3 ? 'border-teal-400 bg-teal-500 text-white' : ''}
          ${node.position.level >= 4 ? 'border-teal-300 bg-teal-400 text-white' : ''}
          hover:shadow-md
        `}>
          <div className="p-3 text-center">
            <div className="font-bold text-sm leading-tight">{node.position.title}</div>
            {assignedEmployee ? (
              <div className="mt-1.5 text-xs opacity-90 font-medium">
                {assignedEmployee.firstName} {assignedEmployee.lastName}
              </div>
            ) : (
              <div className="mt-1.5 text-xs opacity-70 italic">Unassigned</div>
            )}
            {hasChildren && (
              <div className="mt-1 text-xs opacity-60">{descendantCount} report{descendantCount !== 1 ? 's' : ''}</div>
            )}
          </div>

          <div className="absolute -top-2 -right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onAdd(node.position.id)}
              className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 shadow"
              title="Add child position"
              data-testid={`btn-add-child-${node.position.id}`}
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={() => onEdit(node.position)}
              className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 shadow"
              title="Edit position"
              data-testid={`btn-edit-pos-${node.position.id}`}
            >
              <Edit className="w-3 h-3" />
            </button>
            {node.position.level > 0 && (
              <button
                onClick={() => onDelete(node.position.id)}
                className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow"
                title="Delete position"
                data-testid={`btn-delete-pos-${node.position.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {hasChildren && (
          <button
            onClick={() => onToggle(node.position.id)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center hover:bg-slate-50 z-10 shadow-sm"
            data-testid={`btn-toggle-${node.position.id}`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3 text-slate-600" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-600" />
            )}
          </button>
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <div className="flex flex-col items-center mt-5">
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex items-start gap-0">
            {node.children.length > 1 && (
              <div className="absolute" style={{ display: 'none' }} />
            )}
            <div className="flex items-start relative">
              {node.children.length > 1 && (
                <div
                  className="absolute top-0 bg-slate-300"
                  style={{
                    height: '2px',
                    left: `calc(${100 / (2 * node.children.length)}%)`,
                    right: `calc(${100 / (2 * node.children.length)}%)`,
                  }}
                />
              )}
              <div className="flex gap-4">
                {node.children.map((child) => (
                  <div key={child.position.id} className="flex flex-col items-center">
                    <div className="w-px h-4 bg-slate-300" />
                    <OrgNodeCard
                      node={child}
                      employees={employees}
                      onAssign={onAssign}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAdd={onAdd}
                      collapsed={collapsed}
                      onToggle={onToggle}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgStructure() {
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [zoom, setZoom] = useState(100);
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null);
  const [addParentId, setAddParentId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [assignDialogPos, setAssignDialogPos] = useState<OrgPosition | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [editTitle, setEditTitle] = useState("");

  const { data: positions = [], isLoading: posLoading } = useQuery<OrgPosition[]>({
    queryKey: ["/api/org-positions"],
  });

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const tree = useMemo(() => buildOrgTree(positions), [positions]);

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/org-positions/seed-default"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-positions"] });
      toast({ title: "Org structure created successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: { title: string; parentId: number | null; level: number }) =>
      apiRequest("POST", "/api/org-positions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-positions"] });
      setAddParentId(null);
      setNewTitle("");
      toast({ title: "Position added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Record<string, any> }) =>
      apiRequest("PATCH", `/api/org-positions/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-positions"] });
      setEditingPosition(null);
      setAssignDialogPos(null);
      toast({ title: "Position updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/org-positions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-positions"] });
      toast({ title: "Position deleted" });
    },
  });

  const handleToggle = useCallback((id: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAssign = useCallback((positionId: number, employeeId: number | null) => {
    updateMutation.mutate({ id: positionId, updates: { employeeId } });
  }, []);

  const handleEdit = useCallback((position: OrgPosition) => {
    setEditingPosition(position);
    setEditTitle(position.title);
  }, []);

  const handleDelete = useCallback((id: number) => {
    if (confirm("Delete this position? Child positions will be unlinked.")) {
      deleteMutation.mutate(id);
    }
  }, []);

  const handleAdd = useCallback((parentId: number) => {
    setAddParentId(parentId);
    setNewTitle("");
  }, []);

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const ids = new Set(positions.filter(p => positions.some(c => c.parentId === p.id)).map(p => p.id));
    setCollapsed(ids);
  };

  const totalPositions = positions.length;
  const assignedPositions = positions.filter(p => p.employeeId).length;
  const vacantPositions = totalPositions - assignedPositions;

  if (posLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white animate-pulse">
            <Network className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-sm">Loading org structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Organization Structure</h1>
          <p className="text-slate-500 text-sm mt-1">Hierarchy-based organizational chart with employee assignment</p>
        </div>
        <div className="flex items-center gap-2">
          {positions.length === 0 && (
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="btn-seed-structure"
            >
              <Building2 className="w-4 h-4 mr-2" />
              {seedMutation.isPending ? "Creating..." : "Load Default Structure"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Network className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900" data-testid="text-total-positions">{totalPositions}</p>
              <p className="text-xs text-slate-500">Total Positions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900" data-testid="text-assigned-positions">{assignedPositions}</p>
              <p className="text-xs text-slate-500">Assigned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900" data-testid="text-vacant-positions">{vacantPositions}</p>
              <p className="text-xs text-slate-500">Vacant</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {positions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Organization Hierarchy</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={expandAll} data-testid="btn-expand-all">
                  <Maximize2 className="w-3.5 h-3.5 mr-1" /> Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll} data-testid="btn-collapse-all">
                  <Minus className="w-3.5 h-3.5 mr-1" /> Collapse All
                </Button>
                <div className="flex items-center gap-1 ml-2 border rounded-md px-2 py-1">
                  <button onClick={() => setZoom(z => Math.max(40, z - 10))} className="text-slate-500 hover:text-slate-700" data-testid="btn-zoom-out">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-slate-600 w-10 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="text-slate-500 hover:text-slate-700" data-testid="btn-zoom-in">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto pb-8 pt-4" style={{ maxHeight: '70vh' }}>
              <div
                className="flex justify-center min-w-fit"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                {tree.map((root) => (
                  <OrgNodeCard
                    key={root.position.id}
                    node={root}
                    employees={employees}
                    onAssign={handleAssign}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAdd={handleAdd}
                    collapsed={collapsed}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Position List & Employee Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-600">Position</th>
                    <th className="text-left p-3 font-medium text-slate-600">Level</th>
                    <th className="text-left p-3 font-medium text-slate-600">Reports To</th>
                    <th className="text-left p-3 font-medium text-slate-600">Assigned Employee</th>
                    <th className="text-right p-3 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => {
                    const parent = positions.find(p => p.id === pos.parentId);
                    const emp = pos.employeeId ? employees.find(e => e.id === pos.employeeId) : null;
                    return (
                      <tr key={pos.id} className="border-t hover:bg-slate-50" data-testid={`row-position-${pos.id}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div style={{ paddingLeft: `${pos.level * 16}px` }} />
                            <span className="font-medium text-slate-900">{pos.title}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{pos.level}</Badge>
                        </td>
                        <td className="p-3 text-slate-600">{parent?.title || '-'}</td>
                        <td className="p-3">
                          {emp ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">
                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                              </div>
                              <span className="text-slate-900">{emp.firstName} {emp.lastName}</span>
                              <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">Assigned</Badge>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Vacant</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAssignDialogPos(pos);
                              setSelectedEmployeeId(pos.employeeId?.toString() || "none");
                            }}
                            data-testid={`btn-assign-${pos.id}`}
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                            {emp ? "Reassign" : "Assign"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {editingPosition && (
        <Dialog open={true} onOpenChange={() => setEditingPosition(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Position</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Title</Label>
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  data-testid="input-edit-title"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingPosition(null)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (editTitle.trim()) {
                      updateMutation.mutate({ id: editingPosition.id, updates: { title: editTitle.trim() } });
                    }
                  }}
                  disabled={updateMutation.isPending}
                  data-testid="btn-save-edit"
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {addParentId !== null && (
        <Dialog open={true} onOpenChange={() => setAddParentId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Child Position</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Parent: {positions.find(p => p.id === addParentId)?.title}</Label>
              </div>
              <div>
                <Label>Position Title</Label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Manager, Sr. Engineer"
                  data-testid="input-new-title"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddParentId(null)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (newTitle.trim()) {
                      const parent = positions.find(p => p.id === addParentId);
                      addMutation.mutate({
                        title: newTitle.trim(),
                        parentId: addParentId,
                        level: (parent?.level || 0) + 1,
                      });
                    }
                  }}
                  disabled={addMutation.isPending}
                  data-testid="btn-add-position"
                >
                  Add Position
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {assignDialogPos && (
        <Dialog open={true} onOpenChange={() => setAssignDialogPos(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Employee to: {assignDialogPos.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Select Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger data-testid="select-employee">
                    <SelectValue placeholder="Choose an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Unassign --</SelectItem>
                    {employees
                      .filter(e => e.status === 'active')
                      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                      .map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.firstName} {emp.lastName} - {emp.designation || 'No designation'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignDialogPos(null)}>Cancel</Button>
                <Button
                  onClick={() => {
                    const empId = selectedEmployeeId === "none" ? null : parseInt(selectedEmployeeId);
                    updateMutation.mutate({
                      id: assignDialogPos.id,
                      updates: { employeeId: empId },
                    });
                  }}
                  disabled={updateMutation.isPending}
                  data-testid="btn-confirm-assign"
                >
                  {updateMutation.isPending ? "Saving..." : "Confirm"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
