import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, Plus, Pencil, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Employee } from "@shared/schema";

type Shift = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number | null;
  workingHours: string | null;
  isDefault: boolean | null;
};

type ShiftForm = {
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  workingHours: string;
  isDefault: boolean;
};

const defaultForm: ShiftForm = {
  name: "",
  startTime: "09:30",
  endTime: "18:30",
  graceMinutes: 15,
  workingHours: "9",
  isDefault: false,
};

export default function ShiftManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [form, setForm] = useState<ShiftForm>(defaultForm);

  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
  });

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ShiftForm) => {
      return apiRequest("POST", "/api/shifts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "Shift created successfully" });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Failed to create shift", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ShiftForm> }) => {
      return apiRequest("PATCH", `/api/shifts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "Shift updated successfully" });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Failed to update shift", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "Shift deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete shift", description: err.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingShift(null);
    setForm(defaultForm);
  };

  const openCreate = () => {
    setEditingShift(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (shift: Shift) => {
    setEditingShift(shift);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutes: shift.graceMinutes ?? 15,
      workingHours: shift.workingHours ?? "9",
      isDefault: shift.isDefault ?? false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.startTime || !form.endTime) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const getAssignedCount = (shiftId: number) => {
    return employees?.filter(e => e.shiftId === shiftId && e.status === 'active').length || 0;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading shifts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-shifts-title">Shift Management</h1>
          <p className="text-muted-foreground">Create and manage work shift timings for employees</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-shift">
          <Plus className="w-4 h-4 mr-2" />
          Add Shift
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts?.map(shift => {
          const assignedCount = getAssignedCount(shift.id);
          return (
            <Card key={shift.id} className={`relative ${shift.isDefault ? 'border-primary/50 shadow-sm' : ''}`} data-testid={`card-shift-${shift.id}`}>
              {shift.isDefault && (
                <Badge className="absolute top-3 right-3 bg-primary/10 text-primary text-[10px]">Default</Badge>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  {shift.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Start Time</p>
                    <p className="text-sm font-semibold">{shift.startTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End Time</p>
                    <p className="text-sm font-semibold">{shift.endTime}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Grace Period</p>
                    <p className="text-sm font-medium">{shift.graceMinutes ?? 15} min</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Working Hours</p>
                    <p className="text-sm font-medium">{shift.workingHours ?? '9'} hrs</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground pt-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs">{assignedCount} employee{assignedCount !== 1 ? 's' : ''} assigned</span>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={() => openEdit(shift)} data-testid={`button-edit-shift-${shift.id}`}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (assignedCount > 0) {
                        toast({ title: "Cannot delete", description: `${assignedCount} employee(s) are assigned to this shift. Reassign them first.`, variant: "destructive" });
                        return;
                      }
                      if (confirm("Delete this shift?")) deleteMutation.mutate(shift.id);
                    }}
                    data-testid={`button-delete-shift-${shift.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(!shifts || shifts.length === 0) && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No shifts configured</p>
            <p className="text-sm">Create your first shift to assign employees to work timings</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingShift ? "Edit Shift" : "Create New Shift"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Shift Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., General Shift, Night Shift"
                data-testid="input-shift-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time <span className="text-destructive">*</span></Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                  data-testid="input-shift-start"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time <span className="text-destructive">*</span></Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                  data-testid="input-shift-end"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grace Period (minutes)</Label>
                <Input
                  type="number"
                  value={form.graceMinutes}
                  onChange={(e) => setForm(prev => ({ ...prev, graceMinutes: parseInt(e.target.value) || 0 }))}
                  data-testid="input-shift-grace"
                />
              </div>
              <div className="space-y-2">
                <Label>Working Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.workingHours}
                  onChange={(e) => setForm(prev => ({ ...prev, workingHours: e.target.value }))}
                  data-testid="input-shift-hours"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isDefault}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, isDefault: checked }))}
                data-testid="switch-shift-default"
              />
              <Label>Set as default shift</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-shift"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingShift ? "Update Shift" : "Create Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
