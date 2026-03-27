import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface SalaryStructure {
  id: number;
  name: string;
  description: string | null;
  basicPercent: string;
  hraPercent: string;
  conveyancePercent: string;
  daPercent: string;
  communicationPercent: string;
  medicalPercent: string;
  isActive: boolean;
  createdAt: string;
}

interface FormValues {
  name: string;
  description: string;
  basicPercent: string;
  hraPercent: string;
  conveyancePercent: string;
  daPercent: string;
  communicationPercent: string;
  medicalPercent: string;
}

export default function SalaryStructures() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);

  const { data: structures = [], isLoading } = useQuery<SalaryStructure[]>({
    queryKey: ["/api/salary-structures"],
  });

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      basicPercent: "",
      hraPercent: "",
      conveyancePercent: "",
      daPercent: "",
      communicationPercent: "",
      medicalPercent: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest("POST", "/api/salary-structures", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-structures"] });
      setIsOpen(false);
      form.reset();
      toast({ title: "Salary structure created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create salary structure", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
      return apiRequest("PATCH", `/api/salary-structures/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-structures"] });
      setIsOpen(false);
      setEditingStructure(null);
      form.reset();
      toast({ title: "Salary structure updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update salary structure", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/salary-structures/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-structures"] });
      toast({ title: "Salary structure deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete salary structure", variant: "destructive" });
    },
  });

  const handleEdit = (structure: SalaryStructure) => {
    setEditingStructure(structure);
    form.reset({
      name: structure.name,
      description: structure.description || "",
      basicPercent: structure.basicPercent,
      hraPercent: structure.hraPercent,
      conveyancePercent: structure.conveyancePercent,
      daPercent: structure.daPercent,
      communicationPercent: structure.communicationPercent,
      medicalPercent: structure.medicalPercent,
    });
    setIsOpen(true);
  };

  const handleSubmit = (data: FormValues) => {
    const total = 
      parseFloat(data.basicPercent || "0") +
      parseFloat(data.hraPercent || "0") +
      parseFloat(data.conveyancePercent || "0") +
      parseFloat(data.daPercent || "0") +
      parseFloat(data.communicationPercent || "0") +
      parseFloat(data.medicalPercent || "0");

    if (Math.abs(total - 100) > 0.01) {
      toast({ 
        title: "Invalid percentages", 
        description: `Total must equal 100%. Current total: ${total}%`,
        variant: "destructive" 
      });
      return;
    }

    if (editingStructure) {
      updateMutation.mutate({ id: editingStructure.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingStructure(null);
    form.reset();
  };

  const calculateCTCBreakdown = (structure: SalaryStructure, ctc: number) => {
    return {
      basic: (ctc * parseFloat(structure.basicPercent)) / 100,
      hra: (ctc * parseFloat(structure.hraPercent)) / 100,
      conveyance: (ctc * parseFloat(structure.conveyancePercent)) / 100,
      da: (ctc * parseFloat(structure.daPercent)) / 100,
      communication: (ctc * parseFloat(structure.communicationPercent)) / 100,
      medical: (ctc * parseFloat(structure.medicalPercent)) / 100,
    };
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">Salary Structures</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage salary component structures for employees</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-structure">
              <Plus className="w-4 h-4 mr-2" />
              Add Structure
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingStructure ? "Edit Salary Structure" : "Add Salary Structure"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input {...form.register("name", { required: true })} placeholder="e.g., Structure 1 - Common" data-testid="input-name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input {...form.register("description")} placeholder="Brief description" data-testid="input-description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Basic %</label>
                  <Input type="number" step="0.01" {...form.register("basicPercent", { required: true })} placeholder="35" data-testid="input-basicPercent" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">HRA %</label>
                  <Input type="number" step="0.01" {...form.register("hraPercent", { required: true })} placeholder="19" data-testid="input-hraPercent" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Conveyance %</label>
                  <Input type="number" step="0.01" {...form.register("conveyancePercent", { required: true })} placeholder="4" data-testid="input-conveyancePercent" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">DA %</label>
                  <Input type="number" step="0.01" {...form.register("daPercent", { required: true })} placeholder="33" data-testid="input-daPercent" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Communication %</label>
                  <Input type="number" step="0.01" {...form.register("communicationPercent", { required: true })} placeholder="3" data-testid="input-communicationPercent" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Medical %</label>
                  <Input type="number" step="0.01" {...form.register("medicalPercent", { required: true })} placeholder="6" data-testid="input-medicalPercent" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Total must equal 100%
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save">
                  {editingStructure ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {structures.map((structure) => {
          const breakdown = calculateCTCBreakdown(structure, 1200000);
          return (
            <Card key={structure.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-structure-name-${structure.id}`}>{structure.name}</CardTitle>
                      {structure.description && (
                        <p className="text-sm text-muted-foreground">{structure.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={structure.isActive ? "default" : "secondary"}>
                      {structure.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(structure)} data-testid={`button-edit-${structure.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-destructive" 
                      onClick={() => deleteMutation.mutate(structure.id)}
                      data-testid={`button-delete-${structure.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{structure.basicPercent}%</div>
                    <div className="text-xs text-muted-foreground">Basic</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{structure.hraPercent}%</div>
                    <div className="text-xs text-muted-foreground">HRA</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{structure.conveyancePercent}%</div>
                    <div className="text-xs text-muted-foreground">Conveyance</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{structure.daPercent}%</div>
                    <div className="text-xs text-muted-foreground">DA</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{structure.communicationPercent}%</div>
                    <div className="text-xs text-muted-foreground">Communication</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{structure.medicalPercent}%</div>
                    <div className="text-xs text-muted-foreground">Medical</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm font-medium mb-2">Sample breakdown for CTC Rs. 12,00,000/year:</div>
                  <div className="grid grid-cols-6 gap-2 text-xs">
                    <div>Basic: Rs. {breakdown.basic.toLocaleString()}</div>
                    <div>HRA: Rs. {breakdown.hra.toLocaleString()}</div>
                    <div>Conv: Rs. {breakdown.conveyance.toLocaleString()}</div>
                    <div>DA: Rs. {breakdown.da.toLocaleString()}</div>
                    <div>Comm: Rs. {breakdown.communication.toLocaleString()}</div>
                    <div>Medical: Rs. {breakdown.medical.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {structures.length === 0 && (
          <Card className="p-8 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Salary Structures</h3>
            <p className="text-muted-foreground text-sm mb-4">Create salary structures to assign to employees</p>
            <Button onClick={() => setIsOpen(true)} data-testid="button-create-first">
              <Plus className="w-4 h-4 mr-2" />
              Create First Structure
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
