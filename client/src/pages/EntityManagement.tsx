import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Entity } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2, Globe, Phone, Mail } from "lucide-react";

export default function EntityManagement() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editEntity, setEditEntity] = useState<Entity | null>(null);
  const [formData, setFormData] = useState({
    name: "", code: "", legalName: "", address: "", city: "", state: "", country: "India",
    pincode: "", phone: "", email: "", website: "", gstin: "", pan: "", tan: "", cin: "",
    payslipHeader: "", payslipFooter: "", bankName: "", bankAccountNumber: "", bankIfsc: "",
    logoUrl: "", isActive: true,
  });

  const { data: entities = [], isLoading } = useQuery<Entity[]>({
    queryKey: ["/api/entities"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/entities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: "Entity created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) => apiRequest("PATCH", `/api/entities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      setEditEntity(null);
      resetForm();
      toast({ title: "Entity updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/entities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      toast({ title: "Entity deleted" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "", code: "", legalName: "", address: "", city: "", state: "", country: "India",
      pincode: "", phone: "", email: "", website: "", gstin: "", pan: "", tan: "", cin: "",
      payslipHeader: "", payslipFooter: "", bankName: "", bankAccountNumber: "", bankIfsc: "",
      logoUrl: "", isActive: true,
    });
  };

  const openEdit = (entity: Entity) => {
    setEditEntity(entity);
    setFormData({
      name: entity.name || "", code: entity.code || "", legalName: entity.legalName || "",
      address: entity.address || "", city: entity.city || "", state: entity.state || "",
      country: entity.country || "India", pincode: entity.pincode || "",
      phone: entity.phone || "", email: entity.email || "", website: entity.website || "",
      gstin: entity.gstin || "", pan: entity.pan || "", tan: entity.tan || "", cin: entity.cin || "",
      payslipHeader: entity.payslipHeader || "", payslipFooter: entity.payslipFooter || "",
      bankName: entity.bankName || "", bankAccountNumber: entity.bankAccountNumber || "",
      bankIfsc: entity.bankIfsc || "", logoUrl: entity.logoUrl || "", isActive: entity.isActive ?? true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editEntity) {
      updateMutation.mutate({ id: editEntity.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const EntityForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Entity Name *</Label>
          <Input data-testid="input-entity-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        </div>
        <div>
          <Label>Entity Code *</Label>
          <Input data-testid="input-entity-code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} required placeholder="e.g. FCT, ABC" />
        </div>
      </div>
      <div>
        <Label>Legal Name</Label>
        <Input data-testid="input-entity-legal-name" value={formData.legalName} onChange={e => setFormData({...formData, legalName: e.target.value})} placeholder="Full registered company name" />
      </div>
      <div>
        <Label>Logo URL</Label>
        <Input data-testid="input-entity-logo" value={formData.logoUrl} onChange={e => setFormData({...formData, logoUrl: e.target.value})} placeholder="https://..." />
      </div>
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Address</h4>
        <div>
          <Label>Address</Label>
          <Textarea data-testid="input-entity-address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <Label>City</Label>
            <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
          </div>
          <div>
            <Label>State</Label>
            <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
          </div>
          <div>
            <Label>Pincode</Label>
            <Input value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
          </div>
        </div>
      </div>
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Contact</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="col-span-2">
            <Label>Website</Label>
            <Input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
          </div>
        </div>
      </div>
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Statutory Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>GSTIN</Label>
            <Input value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} />
          </div>
          <div>
            <Label>PAN</Label>
            <Input value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value})} />
          </div>
          <div>
            <Label>TAN</Label>
            <Input value={formData.tan} onChange={e => setFormData({...formData, tan: e.target.value})} />
          </div>
          <div>
            <Label>CIN</Label>
            <Input value={formData.cin} onChange={e => setFormData({...formData, cin: e.target.value})} />
          </div>
        </div>
      </div>
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Bank Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Bank Name</Label>
            <Input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
          </div>
          <div>
            <Label>Account Number</Label>
            <Input value={formData.bankAccountNumber} onChange={e => setFormData({...formData, bankAccountNumber: e.target.value})} />
          </div>
          <div>
            <Label>IFSC Code</Label>
            <Input value={formData.bankIfsc} onChange={e => setFormData({...formData, bankIfsc: e.target.value})} />
          </div>
        </div>
      </div>
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Payslip Configuration</h4>
        <div>
          <Label>Payslip Header Text</Label>
          <Input value={formData.payslipHeader} onChange={e => setFormData({...formData, payslipHeader: e.target.value})} placeholder="Company name shown on payslips" />
        </div>
        <div className="mt-2">
          <Label>Payslip Footer Text</Label>
          <Input value={formData.payslipFooter} onChange={e => setFormData({...formData, payslipFooter: e.target.value})} placeholder="Footer note on payslips" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditEntity(null); resetForm(); }} data-testid="button-cancel-entity">Cancel</Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-entity">
          {createMutation.isPending || updateMutation.isPending ? "Saving..." : editEntity ? "Update Entity" : "Create Entity"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-entity-title">Entity Management</h1>
          <p className="text-muted-foreground">Manage companies/entities sharing this HRMS</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-entity"><Plus className="w-4 h-4 mr-2" /> Add Entity</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Entity</DialogTitle>
            </DialogHeader>
            <EntityForm />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">Loading...</div>
      ) : entities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No entities configured</h3>
            <p className="text-muted-foreground mt-1">Add your first entity to enable multi-company support</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map(entity => (
            <Card key={entity.id} data-testid={`card-entity-${entity.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {entity.logoUrl ? (
                      <img src={entity.logoUrl} alt={entity.name} className="w-10 h-10 rounded object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{entity.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">{entity.code}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(entity)} data-testid={`button-edit-entity-${entity.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                      if (confirm("Delete this entity? This cannot be undone.")) deleteMutation.mutate(entity.id);
                    }} data-testid={`button-delete-entity-${entity.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {entity.legalName && <p className="font-medium text-foreground">{entity.legalName}</p>}
                {entity.address && <p className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {entity.address}{entity.city ? `, ${entity.city}` : ""}</p>}
                {entity.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {entity.phone}</p>}
                {entity.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {entity.email}</p>}
                {entity.website && <p className="flex items-center gap-1"><Globe className="w-3 h-3" /> {entity.website}</p>}
                {entity.gstin && <p><span className="font-medium">GSTIN:</span> {entity.gstin}</p>}
                {entity.pan && <p><span className="font-medium">PAN:</span> {entity.pan}</p>}
                <Badge variant={entity.isActive ? "default" : "secondary"} className="mt-2">
                  {entity.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editEntity} onOpenChange={(open) => { if (!open) { setEditEntity(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Entity - {editEntity?.name}</DialogTitle>
          </DialogHeader>
          <EntityForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
