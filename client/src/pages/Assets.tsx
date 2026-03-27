import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, Laptop, Monitor, Smartphone, Headphones, CreditCard, Package,
  ArrowRightLeft, Wrench, RotateCcw, Users, Calendar, CheckCircle2,
  AlertTriangle, Clock, FileText, Building2, Eye, Search
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Asset, Employee, Department } from "@shared/schema";
import { useState } from "react";

const assetSchema = z.object({
  assetCode: z.string().min(1, "Asset code is required"),
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  location: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

export default function Assets() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: assets, isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
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

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/departments${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      assetCode: "",
      name: "",
      category: "",
      brand: "",
      model: "",
      serialNumber: "",
      location: "",
    },
  });

  const assignForm = useForm({
    defaultValues: {
      employeeId: "",
      assignedDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: AssetFormData) => 
      apiRequest("POST", "/api/assets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Asset added successfully" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add asset", variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: { assetId: number; employeeId: number; assignedDate: string }) =>
      apiRequest(`/api/assets/${data.assetId}/assign`, "POST", {
        employeeId: data.employeeId,
        assignedDate: data.assignedDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Asset assigned successfully" });
      setAssignOpen(false);
      setSelectedAsset(null);
    },
  });

  const returnMutation = useMutation({
    mutationFn: (assetId: number) =>
      apiRequest(`/api/assets/${assetId}/return`, "POST", {
        returnedDate: format(new Date(), "yyyy-MM-dd"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Asset returned successfully" });
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "laptop": return <Laptop className="w-6 h-6" />;
      case "monitor": return <Monitor className="w-6 h-6" />;
      case "phone": return <Smartphone className="w-6 h-6" />;
      case "headphones": return <Headphones className="w-6 h-6" />;
      case "id_card":
      case "access_card": return <CreditCard className="w-6 h-6" />;
      default: return <Package className="w-6 h-6" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-700";
      case "assigned": return "bg-blue-100 text-blue-700";
      case "maintenance": return "bg-yellow-100 text-yellow-700";
      case "retired": return "bg-slate-100 text-slate-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getEmployeeName = (employeeId: number | null) => {
    if (!employeeId) return "-";
    const emp = employees?.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };

  const availableCount = assets?.filter(a => a.status === "available").length || 0;
  const assignedCount = assets?.filter(a => a.status === "assigned").length || 0;
  const maintenanceCount = assets?.filter(a => a.status === "maintenance").length || 0;

  const transfers = [
    { id: 1, asset: "MacBook Pro 16", assetCode: "LAPTOP-001", from: "Rahul Sharma", to: "Priya Patel", date: "Dec 15, 2024", reason: "Project change", status: "completed" },
    { id: 2, asset: "Dell Monitor 27", assetCode: "MON-012", from: "Amit Kumar", to: "Vikram Singh", date: "Dec 18, 2024", reason: "Department transfer", status: "pending" },
    { id: 3, asset: "iPhone 14 Pro", assetCode: "PHN-005", from: "Sneha Reddy", to: "Kavita Nair", date: "Dec 10, 2024", reason: "Role change", status: "completed" },
  ];

  const maintenanceRecords = [
    { id: 1, asset: "MacBook Pro 14", assetCode: "LAPTOP-003", type: "Repair", description: "Screen replacement", vendor: "Apple Service Center", cost: 15000, startDate: "Dec 10, 2024", endDate: "Dec 15, 2024", status: "completed" },
    { id: 2, asset: "HP Printer", assetCode: "PRN-001", type: "Service", description: "Annual maintenance", vendor: "HP Support", cost: 3500, startDate: "Dec 18, 2024", endDate: null, status: "in_progress" },
    { id: 3, asset: "Dell Server", assetCode: "SRV-002", type: "Upgrade", description: "RAM upgrade to 64GB", vendor: "Dell Enterprise", cost: 25000, startDate: "Dec 20, 2024", endDate: null, status: "scheduled" },
  ];

  const handoverRecords = [
    { id: 1, employee: "Kavita Nair", type: "Exit", assets: ["LAPTOP-005", "MON-015", "PHN-008"], handoverDate: "Dec 20, 2024", receivedBy: "IT Admin", status: "pending", condition: null },
    { id: 2, employee: "Suresh Iyer", type: "Transfer", assets: ["LAPTOP-012", "HEADPHONE-003"], handoverDate: "Dec 18, 2024", receivedBy: "Amit Kumar", status: "completed", condition: "Good" },
    { id: 3, employee: "New Employee", type: "Onboarding", assets: ["LAPTOP-NEW", "MON-NEW"], handoverDate: "Dec 22, 2024", receivedBy: null, status: "scheduled", condition: null },
  ];

  const filteredAssets = assets?.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Management</h1>
          <p className="text-slate-500">Complete asset lifecycle management</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-asset">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assetCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Code</FormLabel>
                        <FormControl>
                          <Input placeholder="LAPTOP-003" {...field} data-testid="input-asset-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="laptop">Laptop</SelectItem>
                            <SelectItem value="monitor">Monitor</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="headphones">Headphones</SelectItem>
                            <SelectItem value="keyboard">Keyboard</SelectItem>
                            <SelectItem value="mouse">Mouse</SelectItem>
                            <SelectItem value="printer">Printer</SelectItem>
                            <SelectItem value="server">Server</SelectItem>
                            <SelectItem value="id_card">ID Card</SelectItem>
                            <SelectItem value="access_card">Access Card</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="MacBook Pro 16" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <FormControl>
                          <Input placeholder="Apple" {...field} data-testid="input-brand" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="MBP 2023" {...field} data-testid="input-model" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input placeholder="C02YX1ZVMD6N" {...field} data-testid="input-serial" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Office Floor 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="warrantyExpiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Expiry</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="150000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-asset">
                  {createMutation.isPending ? "Adding..." : "Add Asset"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Assets</p>
                <p className="text-2xl font-bold text-slate-800">{assets?.length || 0}</p>
              </div>
              <Package className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Available</p>
                <p className="text-2xl font-bold text-green-600">{availableCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Assigned</p>
                <p className="text-2xl font-bold text-blue-600">{assignedCount}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">In Maintenance</p>
                <p className="text-2xl font-bold text-yellow-600">{maintenanceCount}</p>
              </div>
              <Wrench className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="repository" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="repository" data-testid="tab-repository">Asset Repository</TabsTrigger>
          <TabsTrigger value="assignment" data-testid="tab-assignment">Assignment</TabsTrigger>
          <TabsTrigger value="transfer" data-testid="tab-transfer">Transfer</TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="handover" data-testid="tab-handover">Handover</TabsTrigger>
        </TabsList>

        <TabsContent value="repository">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Asset Repository
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search assets..." 
                      className="pl-9 w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-assets"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!filteredAssets?.length ? (
                <p className="text-slate-400 text-center py-8">No assets found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-slate-500">
                        <th className="pb-3 font-medium">Asset</th>
                        <th className="pb-3 font-medium">Code</th>
                        <th className="pb-3 font-medium">Brand/Model</th>
                        <th className="pb-3 font-medium">Serial No.</th>
                        <th className="pb-3 font-medium">Assigned To</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((asset) => (
                        <tr key={asset.id} data-testid={`asset-row-${asset.id}`} className="border-b last:border-0">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                {getCategoryIcon(asset.category)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{asset.name}</p>
                                <p className="text-xs text-slate-400 capitalize">{asset.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <code className="text-sm bg-slate-100 px-2 py-1 rounded">{asset.assetCode}</code>
                          </td>
                          <td className="py-4 text-sm text-slate-600">
                            {asset.brand} {asset.model}
                          </td>
                          <td className="py-4 text-sm text-slate-500 font-mono">
                            {asset.serialNumber || "-"}
                          </td>
                          <td className="py-4 text-sm text-slate-600">
                            {getEmployeeName(asset.employeeId)}
                          </td>
                          <td className="py-4">
                            <Badge className={getStatusColor(asset.status || "available")}>
                              {asset.status}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <Button size="icon" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignment">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Asset Assignment
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assets?.filter(a => a.status === "available" || a.status === "assigned").map((asset) => (
                  <div key={asset.id} className="p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center text-slate-600">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{asset.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-slate-200 px-2 py-0.5 rounded">{asset.assetCode}</code>
                            <span className="text-sm text-slate-500">{asset.brand} {asset.model}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {asset.status === "assigned" && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">{getEmployeeName(asset.employeeId)}</p>
                            <p className="text-xs text-slate-400">Assigned: {asset.assignedDate || "-"}</p>
                          </div>
                        )}
                        <Badge className={getStatusColor(asset.status || "available")}>{asset.status}</Badge>
                        {asset.status === "available" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAsset(asset);
                              setAssignOpen(true);
                            }}
                            data-testid={`button-assign-${asset.id}`}
                          >
                            Assign
                          </Button>
                        )}
                        {asset.status === "assigned" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => returnMutation.mutate(asset.id)}
                            data-testid={`button-return-${asset.id}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Return
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary" />
                  Transfer / Reallocation
                </CardTitle>
                <Button data-testid="button-new-transfer">
                  <Plus className="w-4 h-4 mr-2" />
                  New Transfer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{transfer.asset}</p>
                          <code className="text-xs bg-slate-200 px-2 py-0.5 rounded">{transfer.assetCode}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">{transfer.from}</p>
                            <p className="text-xs text-slate-400">From</p>
                          </div>
                          <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">{transfer.to}</p>
                            <p className="text-xs text-slate-400">To</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">{transfer.date}</p>
                          <p className="text-xs text-slate-400">{transfer.reason}</p>
                        </div>
                        <Badge className={transfer.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {transfer.status}
                        </Badge>
                        {transfer.status === 'pending' && (
                          <Button size="sm">Approve</Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" />
                  Maintenance & Service Records
                </CardTitle>
                <Button data-testid="button-add-maintenance">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Record
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maintenanceRecords.map((record) => (
                  <div key={record.id} className="p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          record.status === 'completed' ? 'bg-green-100' : 
                          record.status === 'in_progress' ? 'bg-yellow-100' : 'bg-blue-100'
                        }`}>
                          <Wrench className={`w-6 h-6 ${
                            record.status === 'completed' ? 'text-green-600' : 
                            record.status === 'in_progress' ? 'text-yellow-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{record.asset}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-slate-200 px-2 py-0.5 rounded">{record.assetCode}</code>
                            <Badge variant="secondary">{record.type}</Badge>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{record.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          record.status === 'completed' ? 'bg-green-100 text-green-700' : 
                          record.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                        }>
                          {record.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-sm text-slate-600 mt-2">{record.vendor}</p>
                        <p className="text-sm font-medium text-slate-800">Cost: Rs. {record.cost.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {record.startDate} {record.endDate ? `- ${record.endDate}` : '- Ongoing'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="handover">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-primary" />
                  Return & Handover
                </CardTitle>
                <Button data-testid="button-initiate-handover">
                  <Plus className="w-4 h-4 mr-2" />
                  Initiate Handover
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {handoverRecords.map((record) => (
                  <div key={record.id} className="p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          record.type === 'Exit' ? 'bg-red-100' : 
                          record.type === 'Transfer' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {record.type === 'Exit' ? (
                            <RotateCcw className="w-6 h-6 text-red-600" />
                          ) : record.type === 'Transfer' ? (
                            <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                          ) : (
                            <Package className="w-6 h-6 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{record.employee}</p>
                          <Badge variant="secondary" className="mt-1">{record.type}</Badge>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {record.assets.map((asset, idx) => (
                              <code key={idx} className="text-xs bg-slate-200 px-2 py-0.5 rounded">{asset}</code>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          record.status === 'completed' ? 'bg-green-100 text-green-700' : 
                          record.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                        }>
                          {record.status}
                        </Badge>
                        <p className="text-sm text-slate-600 mt-2">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {record.handoverDate}
                        </p>
                        {record.receivedBy && (
                          <p className="text-xs text-slate-400">Received by: {record.receivedBy}</p>
                        )}
                        {record.condition && (
                          <p className="text-xs text-green-600 mt-1">Condition: {record.condition}</p>
                        )}
                        {record.status === 'pending' && (
                          <Button size="sm" className="mt-2">Complete Handover</Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
          </DialogHeader>
          <form 
            onSubmit={assignForm.handleSubmit((data) => {
              if (selectedAsset) {
                assignMutation.mutate({
                  assetId: selectedAsset.id,
                  employeeId: parseInt(data.employeeId),
                  assignedDate: data.assignedDate,
                });
              }
            })}
            className="space-y-4"
          >
            {selectedAsset && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedAsset.name}</p>
                <p className="text-sm text-slate-500">{selectedAsset.assetCode}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Employee</label>
              <Select 
                onValueChange={(value) => assignForm.setValue("employeeId", value)}
                value={assignForm.watch("employeeId")}
              >
                <SelectTrigger data-testid="select-assign-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Assigned Date</label>
              <Input 
                type="date" 
                {...assignForm.register("assignedDate")} 
                data-testid="input-assign-date"
              />
            </div>
            <Button type="submit" className="w-full" disabled={assignMutation.isPending} data-testid="button-confirm-assign">
              {assignMutation.isPending ? "Assigning..." : "Assign Asset"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
