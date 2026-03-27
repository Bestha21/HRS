import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Fingerprint, Radio, Wifi, CheckCircle, XCircle, Settings,
  RefreshCw, Plus, Link2, Key, Code, FileText, Download,
  Upload, Database, Server, Globe, Shield, Copy, Eye,
  Building2, Calculator, BarChart3, ArrowRight, Loader2, Trash2, Pencil, BookOpen
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import type { Employee } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Integrations() {
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [deviceForm, setDeviceForm] = useState({ name: '', type: 'Fingerprint', location: '', ip: '', macAddress: '', make: '', status: 'offline', employees: 0, apiPort: 80, apiProtocol: 'http' });

  const [erpDialogOpen, setErpDialogOpen] = useState(false);
  const [editingErp, setEditingErp] = useState<any>(null);
  const [erpForm, setErpForm] = useState({ name: '', category: 'Accounting', status: 'available', features: '', connectionUrl: '' });
  const [glDialogOpen, setGlDialogOpen] = useState(false);
  const [glForm, setGlForm] = useState({ component: '', accountNo: '', balAccountNo: '', description: '', type: 'earning', lineNoBase: 10000 });

  const [punchForm, setPunchForm] = useState({ employeeCode: '', timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"), punchType: '0', deviceId: 'MANUAL' });
  const [punchLog, setPunchLog] = useState<Array<{ time: string, code: string, type: string, status: string, message: string }>>([]);

  const { data: apiKeyData } = useQuery<{ apiKey: string }>({
    queryKey: ["/api/admin/api-key"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery<any[]>({
    queryKey: ["/api/biometric-devices"],
  });

  const { data: admsPunchLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/biometric-punch-logs"],
    refetchInterval: 30000,
  });

  const punchMutation = useMutation({
    mutationFn: async (data: { employeeCode: string, timestamp: string, punch_type: string, device_id: string }) => {
      const res = await apiRequest("POST", "/api/admin/manual-punch", data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      setPunchLog(prev => [{
        time: format(new Date(), 'HH:mm:ss'),
        code: variables.employeeCode,
        type: variables.punch_type === '0' ? 'Check In' : 'Check Out',
        status: 'success',
        message: 'Punch recorded successfully'
      }, ...prev].slice(0, 20));
      toast({ title: "Punch recorded", description: `${variables.employeeCode} - ${variables.punch_type === '0' ? 'Check In' : 'Check Out'}` });
    },
    onError: (error: any, variables) => {
      setPunchLog(prev => [{
        time: format(new Date(), 'HH:mm:ss'),
        code: variables.employeeCode,
        type: variables.punch_type === '0' ? 'Check In' : 'Check Out',
        status: 'error',
        message: error?.message || 'Failed to record punch'
      }, ...prev].slice(0, 20));
      toast({ title: "Punch failed", description: error?.message || "Failed to record punch", variant: "destructive" });
    },
  });

  const { data: erpList = [], isLoading: erpLoading } = useQuery<any[]>({
    queryKey: ["/api/erp-integrations"],
  });

  const { data: glMappings = [] } = useQuery<any[]>({
    queryKey: ["/api/gl-account-mappings"],
  });

  const saveGlMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/gl-account-mappings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gl-account-mappings"] });
      setGlDialogOpen(false);
      toast({ title: "GL mapping saved" });
    },
  });

  const deleteGlMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gl-account-mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gl-account-mappings"] });
      toast({ title: "GL mapping removed" });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/api-key/regenerate", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-key"] });
      toast({ title: "API key regenerated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to regenerate", description: error.message, variant: "destructive" });
    }
  });

  const createDeviceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/biometric-devices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/biometric-devices"] });
      setDeviceDialogOpen(false);
      toast({ title: "Device added successfully" });
    },
  });

  const updateDeviceMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/biometric-devices/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/biometric-devices"] });
      setDeviceDialogOpen(false);
      setEditingDevice(null);
      toast({ title: "Device updated" });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/biometric-devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/biometric-devices"] });
      toast({ title: "Device removed" });
    },
  });

  const syncDeviceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/biometric-devices/${id}/sync`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/biometric-devices"] });
      if (data.synced > 0) {
        toast({ title: "Sync complete", description: `${data.synced} punch records synced from device` });
      } else if (data.success === false) {
        toast({ title: "Sync issue", description: data.message || "Could not reach device", variant: "destructive" });
      } else {
        toast({ title: "Sync complete", description: "No new records found" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Sync failed", description: error?.message || "Failed to sync device", variant: "destructive" });
    },
  });

  const toggleAutoSyncMutation = useMutation({
    mutationFn: async ({ id, enabled, interval }: { id: number, enabled: boolean, interval?: number }) => {
      const body: any = { autoSyncEnabled: enabled };
      if (interval) body.syncIntervalMinutes = interval;
      const res = await apiRequest("PATCH", `/api/biometric-devices/${id}`, body);
      return res.json();
    },
    onSuccess: (_data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/biometric-devices"] });
      toast({ title: variables.enabled ? "Auto-sync enabled" : "Auto-sync disabled" });
    },
  });

  const createErpMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/erp-integrations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp-integrations"] });
      setErpDialogOpen(false);
      toast({ title: "Integration added" });
    },
  });

  const updateErpMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/erp-integrations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp-integrations"] });
      setErpDialogOpen(false);
      setEditingErp(null);
      toast({ title: "Integration updated" });
    },
  });

  const deleteErpMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/erp-integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp-integrations"] });
      toast({ title: "Integration removed" });
    },
  });

  const copyApiKey = () => {
    if (apiKeyData?.apiKey) {
      navigator.clipboard.writeText(apiKeyData.apiKey);
      toast({ title: "API key copied to clipboard" });
    }
  };

  const openAddDevice = () => {
    setEditingDevice(null);
    setDeviceForm({ name: '', type: 'Fingerprint', location: '', ip: '', macAddress: '', make: '', status: 'offline', employees: 0 });
    setDeviceDialogOpen(true);
  };

  const openEditDevice = (device: any) => {
    setEditingDevice(device);
    setDeviceForm({ name: device.name, type: device.type, location: device.location || '', ip: device.ip || '', macAddress: device.mac_address || '', make: device.make || '', status: device.status, employees: device.employees || 0, apiPort: device.api_port || 80, apiProtocol: device.api_protocol || 'http' });
    setDeviceDialogOpen(true);
  };

  const handleDeviceSubmit = () => {
    if (editingDevice) {
      updateDeviceMutation.mutate({ id: editingDevice.id, ...deviceForm });
    } else {
      createDeviceMutation.mutate(deviceForm);
    }
  };

  const openAddErp = () => {
    setEditingErp(null);
    setErpForm({ name: '', category: 'Accounting', status: 'available', features: '', connectionUrl: '' });
    setErpDialogOpen(true);
  };

  const openEditErp = (erp: any) => {
    setEditingErp(erp);
    setErpForm({ name: erp.name, category: erp.category, status: erp.status, features: (erp.features || []).join(', '), connectionUrl: erp.connection_url || '' });
    setErpDialogOpen(true);
  };

  const handleErpSubmit = () => {
    const data = {
      ...erpForm,
      features: erpForm.features.split(',').map(f => f.trim()).filter(Boolean),
    };
    if (editingErp) {
      updateErpMutation.mutate({ id: editingErp.id, ...data });
    } else {
      createErpMutation.mutate(data);
    }
  };

  const apiEndpoints = [
    { method: "GET", path: "/api/external/projects", description: "List all projects" },
    { method: "POST", path: "/api/external/projects", description: "Create a project" },
    { method: "POST", path: "/api/external/projects/bulk", description: "Create projects in bulk" },
    { method: "PATCH", path: "/api/external/projects/:id", description: "Update a project" },
    { method: "DELETE", path: "/api/external/projects/:id", description: "Delete a project" },
    { method: "GET", path: "/api/external/payroll?month=&year=", description: "Get payroll by month/year" },
    { method: "GET", path: "/api/external/payroll/:id", description: "Get payroll record" },
    { method: "GET", path: "/api/external/employees", description: "List all employees" },
    { method: "GET", path: "/api/external/employees/:id", description: "Get employee details" },
    { method: "GET", path: "/api/external/salary-structures", description: "List salary structures" },
    { method: "GET", path: "/api/external/attendance?date=", description: "Get attendance by date" },
    { method: "GET", path: "/api/external/departments", description: "List departments" },
    { method: "GET", path: "/api/external/loans", description: "List loans" },
    { method: "GET", path: "/api/external/journal-entries?month=&year=", description: "Get journal entries" },
  ];

  const webhooks = [
    { event: "employee.created", url: "https://yourapp.com/webhook/employee", status: "active" },
    { event: "attendance.punch", url: "https://yourapp.com/webhook/attendance", status: "active" },
    { event: "leave.approved", url: "https://yourapp.com/webhook/leave", status: "inactive" },
  ];

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastSync), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Integrations & Add-ons</h1>
          <p className="text-slate-500">Connect biometric devices, ERP systems, and external APIs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Biometric Devices</p>
                <p className="text-2xl font-bold text-slate-800">{devices.length}</p>
                <p className="text-xs text-green-600 mt-1">{devices.filter((d: any) => d.status === 'online').length} online</p>
              </div>
              <Fingerprint className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">ERP Connections</p>
                <p className="text-2xl font-bold text-green-600">{erpList.filter((e: any) => e.status === 'connected').length}</p>
                <p className="text-xs text-slate-400 mt-1">of {erpList.length} available</p>
              </div>
              <Database className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">API Endpoints</p>
                <p className="text-2xl font-bold text-blue-600">{apiEndpoints.length}</p>
                <p className="text-xs text-slate-400 mt-1">Available for use</p>
              </div>
              <Code className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Webhooks</p>
                <p className="text-2xl font-bold text-purple-600">{webhooks.filter(w => w.status === 'active').length}</p>
                <p className="text-xs text-slate-400 mt-1">Real-time events</p>
              </div>
              <Globe className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="biometric" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="biometric" data-testid="tab-biometric">Biometric</TabsTrigger>
          <TabsTrigger value="erp" data-testid="tab-erp">Tally/ERP</TabsTrigger>
          <TabsTrigger value="gl" data-testid="tab-gl">GL Mapping</TabsTrigger>
          <TabsTrigger value="api" data-testid="tab-api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="biometric">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-primary" />
                  Biometric Device Management
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" data-testid="button-sync-all" onClick={() => {
                    devices.forEach((d: any) => syncDeviceMutation.mutate(d.id));
                  }}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync All
                  </Button>
                  <Button data-testid="button-add-device" onClick={openAddDevice}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Device
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Fingerprint className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No biometric devices configured</p>
                  <p className="text-sm">Click "Add Device" to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {devices.map((device: any) => (
                    <div key={device.id} className="p-4 bg-slate-50 rounded-lg border" data-testid={`device-card-${device.id}`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            device.status === 'online' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {device.type?.includes('Face') ? (
                              <Radio className={`w-6 h-6 ${device.status === 'online' ? 'text-green-600' : 'text-red-600'}`} />
                            ) : (
                              <Fingerprint className={`w-6 h-6 ${device.status === 'online' ? 'text-green-600' : 'text-red-600'}`} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">{device.name}</p>
                              <Badge className={device.status === 'online' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                                {device.status}
                              </Badge>
                              {device.auto_sync_enabled && (
                                <Badge className="bg-blue-100 text-blue-700">Auto-Sync</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{device.make ? `${device.make} - ` : ''}{device.type}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400 flex-wrap">
                              {device.ip && (
                                <span className="flex items-center gap-1">
                                  <Wifi className="w-3 h-3" />
                                  {device.ip}
                                </span>
                              )}
                              {device.mac_address && <span>MAC: {device.mac_address}</span>}
                              {device.location && <span>{device.location}</span>}
                              <span>{device.employees || 0} employees registered</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Last Sync</p>
                            <p className="text-sm font-medium text-slate-700">{formatLastSync(device.last_sync)}</p>
                            {device.last_sync_status && (
                              <div className="flex items-center gap-1 justify-end mt-0.5">
                                {device.last_sync_status === 'success' ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : device.last_sync_status === 'error' ? (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                ) : (
                                  <RefreshCw className="w-3 h-3 text-yellow-500" />
                                )}
                                <span className={`text-xs ${device.last_sync_status === 'success' ? 'text-green-600' : device.last_sync_status === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                                  {device.last_sync_status === 'success' ? `${device.last_sync_records || 0} records` : device.last_sync_status === 'error' ? 'Failed' : `${device.last_sync_records || 0} partial`}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => syncDeviceMutation.mutate(device.id)} disabled={syncDeviceMutation.isPending} data-testid={`button-sync-device-${device.id}`}>
                              <RefreshCw className={`w-4 h-4 ${syncDeviceMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEditDevice(device)} data-testid={`button-edit-device-${device.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => {
                              if (confirm('Remove this device?')) deleteDeviceMutation.mutate(device.id);
                            }} data-testid={`button-delete-device-${device.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!!device.auto_sync_enabled}
                              onCheckedChange={(checked) => toggleAutoSyncMutation.mutate({ id: device.id, enabled: checked })}
                              data-testid={`switch-auto-sync-${device.id}`}
                            />
                            <Label className="text-sm text-slate-600">Auto-Sync</Label>
                          </div>
                          {device.auto_sync_enabled && (
                            <Select
                              value={String(device.sync_interval_minutes || 5)}
                              onValueChange={(val) => toggleAutoSyncMutation.mutate({ id: device.id, enabled: true, interval: Number(val) })}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-sync-interval-${device.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Every 1 min</SelectItem>
                                <SelectItem value="2">Every 2 min</SelectItem>
                                <SelectItem value="5">Every 5 min</SelectItem>
                                <SelectItem value="10">Every 10 min</SelectItem>
                                <SelectItem value="15">Every 15 min</SelectItem>
                                <SelectItem value="30">Every 30 min</SelectItem>
                                <SelectItem value="60">Every 1 hour</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        {device.last_sync_error && (
                          <p className="text-xs text-red-500">{device.last_sync_error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-green-600" />
                Manual Biometric Punch
              </CardTitle>
              <p className="text-sm text-slate-500">Send attendance punches manually — works the same as the biometric device or Postman</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee Code</Label>
                    <Select value={punchForm.employeeCode} onValueChange={(val) => setPunchForm(prev => ({ ...prev, employeeCode: val }))}>
                      <SelectTrigger data-testid="select-punch-employee">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.status === 'active' && e.employeeCode).map(emp => (
                          <SelectItem key={emp.id} value={emp.employeeCode!}>
                            {emp.employeeCode} - {emp.firstName} {emp.lastName || ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={punchForm.timestamp}
                      onChange={(e) => setPunchForm(prev => ({ ...prev, timestamp: e.target.value }))}
                      data-testid="input-punch-timestamp"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Punch Type</Label>
                      <Select value={punchForm.punchType} onValueChange={(val) => setPunchForm(prev => ({ ...prev, punchType: val }))}>
                        <SelectTrigger data-testid="select-punch-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Check In</SelectItem>
                          <SelectItem value="1">Check Out</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Device ID</Label>
                      <Input
                        value={punchForm.deviceId}
                        onChange={(e) => setPunchForm(prev => ({ ...prev, deviceId: e.target.value }))}
                        placeholder="MANUAL"
                        data-testid="input-punch-device"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={!punchForm.employeeCode || punchMutation.isPending}
                    onClick={() => {
                      const ts = punchForm.timestamp.replace('T', ' ') + ':00';
                      punchMutation.mutate({
                        employeeCode: punchForm.employeeCode,
                        timestamp: ts,
                        punch_type: punchForm.punchType,
                        device_id: punchForm.deviceId
                      });
                    }}
                    data-testid="button-send-punch"
                  >
                    {punchMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Send Punch</>
                    )}
                  </Button>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3">Punch Log</p>
                  {punchLog.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 border rounded-lg">
                      <Radio className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No punches sent yet</p>
                      <p className="text-xs">Send a punch to see results here</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Time</TableHead>
                            <TableHead className="whitespace-nowrap">Code</TableHead>
                            <TableHead className="whitespace-nowrap">Type</TableHead>
                            <TableHead className="whitespace-nowrap">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {punchLog.map((log, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs">{log.time}</TableCell>
                              <TableCell className="text-xs font-medium">{log.code}</TableCell>
                              <TableCell>
                                <Badge className={log.type === 'Check In' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                                  {log.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                  {log.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    ADMS Punch Log
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Live log of attendance punches received via ADMS push from biometric devices</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ['/api/biometric-punch-logs'] }); queryClient.refetchQueries({ queryKey: ['/api/biometric-punch-logs'] }); }} data-testid="button-refresh-adms-log">
                  <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {admsPunchLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border rounded-lg">
                  <Globe className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No ADMS punches received yet</p>
                  <p className="text-xs">When biometric devices push data via ADMS, it will appear here</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Punch Time</TableHead>
                        <TableHead className="whitespace-nowrap">Employee</TableHead>
                        <TableHead className="whitespace-nowrap">Code</TableHead>
                        <TableHead className="whitespace-nowrap">Biometric ID</TableHead>
                        <TableHead className="whitespace-nowrap">Device</TableHead>
                        <TableHead className="whitespace-nowrap">Type</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admsPunchLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{log.punch_time ? format(new Date(log.punch_time), 'dd MMM yyyy, hh:mm:ss a') : '-'}</TableCell>
                          <TableCell className="text-xs font-medium">{log.first_name ? `${log.first_name} ${log.last_name || ''}` : '-'}</TableCell>
                          <TableCell className="text-xs">{log.employee_code || '-'}</TableCell>
                          <TableCell className="text-xs">{log.biometric_device_id || '-'}</TableCell>
                          <TableCell className="text-xs">{log.device_id || '-'}</TableCell>
                          <TableCell>
                            <Badge className={log.punch_type === '0' || log.punch_type === 'check_in' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                              {log.punch_type === '0' || log.punch_type === 'check_in' ? 'Check In' : 'Check Out'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.error ? (
                              <Badge className="bg-red-100 text-red-700">{log.error}</Badge>
                            ) : log.processed ? (
                              <Badge className="bg-green-100 text-green-700">Processed</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="erp">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Tally/ERP Integrations
                  </CardTitle>
                  <Button onClick={openAddErp} data-testid="button-add-erp">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Integration
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {erpLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : erpList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Database className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No ERP integrations configured</p>
                    <p className="text-sm">Click "Add Integration" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {erpList.map((erp: any) => (
                      <div key={erp.id} className="p-4 bg-slate-50 rounded-lg border" data-testid={`erp-card-${erp.id}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              erp.status === 'connected' ? 'bg-green-100' : 'bg-slate-200'
                            }`}>
                              {erp.category === 'Accounting' ? (
                                <Calculator className={`w-6 h-6 ${erp.status === 'connected' ? 'text-green-600' : 'text-slate-500'}`} />
                              ) : (
                                <Server className={`w-6 h-6 ${erp.status === 'connected' ? 'text-green-600' : 'text-slate-500'}`} />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{erp.name}</p>
                              <Badge variant="secondary">{erp.category}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {erp.status === 'connected' ? (
                              <>
                                <div className="text-right">
                                  <p className="text-xs text-slate-400">Last Sync</p>
                                  <p className="text-sm font-medium text-slate-700">{formatLastSync(erp.last_sync)}</p>
                                </div>
                                <Badge className="bg-green-100 text-green-700">Connected</Badge>
                              </>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600">Available</Badge>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => openEditErp(erp)} data-testid={`button-edit-erp-${erp.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => {
                              if (confirm('Remove this integration?')) deleteErpMutation.mutate(erp.id);
                            }} data-testid={`button-delete-erp-${erp.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {erp.features && erp.features.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {erp.features.map((feature: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-slate-600">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Sync Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Auto-sync Payroll</p>
                      <p className="text-xs text-slate-500">Monthly payroll export</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Expense Sync</p>
                      <p className="text-xs text-slate-500">Real-time expense push</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Employee Sync</p>
                      <p className="text-xs text-slate-500">Sync employee master</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Cost Center Mapping</p>
                      <p className="text-xs text-slate-500">Map departments</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="pt-4 border-t">
                    <Button className="w-full" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export to Tally
                    </Button>
                    <Button className="w-full mt-2" variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Import from ERP
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  GL Account Mappings
                </CardTitle>
                <Button onClick={() => {
                  setGlForm({ component: '', accountNo: '', balAccountNo: '', description: '', type: 'earning', lineNoBase: 10000 });
                  setGlDialogOpen(true);
                }} data-testid="button-add-gl-mapping">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Mapping
                </Button>
              </div>
              <p className="text-sm text-slate-500">Configure how payroll components map to GL accounts for journal entries</p>
            </CardHeader>
            <CardContent>
              {glMappings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No GL mappings configured</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-2 font-medium">Component</th>
                        <th className="pb-2 font-medium">GL Account</th>
                        <th className="pb-2 font-medium">Bal. Account</th>
                        <th className="pb-2 font-medium">Description</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Line No.</th>
                        <th className="pb-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {glMappings.map((m: any) => (
                        <tr key={m.id} className="border-b hover:bg-slate-50" data-testid={`gl-row-${m.id}`}>
                          <td className="py-2 font-mono text-xs">{m.component}</td>
                          <td className="py-2">{m.account_no}</td>
                          <td className="py-2">{m.bal_account_no}</td>
                          <td className="py-2">{m.description}</td>
                          <td className="py-2">
                            <Badge className={m.type === 'earning' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {m.type}
                            </Badge>
                          </td>
                          <td className="py-2">{m.line_no_base}</td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => {
                                setGlForm({ component: m.component, accountNo: m.account_no, balAccountNo: m.bal_account_no, description: m.description, type: m.type, lineNoBase: m.line_no_base });
                                setGlDialogOpen(true);
                              }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-500" onClick={() => {
                                if (confirm('Remove this mapping?')) deleteGlMutation.mutate(m.id);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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

        <TabsContent value="api">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  API Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {apiEndpoints.map((endpoint, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <Badge className={
                          endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                          endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                          endpoint.method === 'PATCH' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono text-slate-700">{endpoint.path}</code>
                      </div>
                      <span className="text-sm text-slate-500">{endpoint.description}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Webhooks
                  </h4>
                  <div className="space-y-2">
                    {webhooks.map((webhook, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">{webhook.event}</Badge>
                          <code className="text-xs text-slate-500">{webhook.url}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={webhook.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                            {webhook.status}
                          </Badge>
                          <Button size="icon" variant="ghost">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-3">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  API Key
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">External API Key</label>
                    <div className="flex gap-2">
                      <Input 
                        type={showApiKey ? "text" : "password"}
                        value={apiKeyData?.apiKey || ''}
                        readOnly
                        className="font-mono text-xs"
                        data-testid="input-api-key"
                      />
                      <Button size="icon" variant="outline" onClick={() => setShowApiKey(!showApiKey)} data-testid="button-toggle-api-key">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={copyApiKey} data-testid="button-copy-api-key">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Header</label>
                    <div className="flex gap-2">
                      <Input 
                        type="text"
                        value="X-API-Key"
                        readOnly
                        className="font-mono text-sm bg-slate-50"
                      />
                      <Button size="icon" variant="outline" onClick={() => {
                        navigator.clipboard.writeText('X-API-Key');
                        toast({ title: "Header name copied" });
                      }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Security Notice</p>
                        <p className="text-xs text-yellow-700">Keep your API key secure. Do not share it in public repositories. Regenerating will invalidate the old key.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => {
                        if (confirm('Are you sure? The old API key will stop working immediately.')) {
                          regenerateMutation.mutate();
                        }
                      }}
                      disabled={regenerateMutation.isPending}
                      data-testid="button-regenerate-api-key"
                    >
                      {regenerateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Reset API Key
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Base URL</h4>
                    <div className="flex gap-2">
                      <Input 
                        type="text"
                        value="https://aai-nextgen.in/api/external/"
                        readOnly
                        className="font-mono text-xs bg-slate-50"
                      />
                      <Button size="icon" variant="outline" onClick={() => {
                        navigator.clipboard.writeText('https://aai-nextgen.in/api/external/');
                        toast({ title: "Base URL copied" });
                      }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDevice ? 'Edit Device' : 'Add Biometric Device'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Device Name</Label>
              <Input value={deviceForm.name} onChange={e => setDeviceForm({...deviceForm, name: e.target.value})} placeholder="e.g. ZKTeco K40" data-testid="input-device-name" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={deviceForm.type} onValueChange={v => setDeviceForm({...deviceForm, type: v})}>
                <SelectTrigger data-testid="select-device-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fingerprint">Fingerprint</SelectItem>
                  <SelectItem value="Face Recognition">Face Recognition</SelectItem>
                  <SelectItem value="Fingerprint + Card">Fingerprint + Card</SelectItem>
                  <SelectItem value="Multi-Biometric">Multi-Biometric</SelectItem>
                  <SelectItem value="RFID Card">RFID Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={deviceForm.location} onChange={e => setDeviceForm({...deviceForm, location: e.target.value})} placeholder="e.g. Main Entrance" data-testid="input-device-location" />
            </div>
            <div>
              <Label>IP Address</Label>
              <Input value={deviceForm.ip} onChange={e => setDeviceForm({...deviceForm, ip: e.target.value})} placeholder="e.g. 192.168.1.101" data-testid="input-device-ip" />
            </div>
            <div>
              <Label>MAC Address</Label>
              <Input value={deviceForm.macAddress} onChange={e => setDeviceForm({...deviceForm, macAddress: e.target.value})} placeholder="e.g. 00:17:61:11:38:A0" data-testid="input-device-mac" />
            </div>
            <div>
              <Label>Make / Brand</Label>
              <Input value={deviceForm.make} onChange={e => setDeviceForm({...deviceForm, make: e.target.value})} placeholder="e.g. IDENTIX, ZKTeco" data-testid="input-device-make" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={deviceForm.status} onValueChange={v => setDeviceForm({...deviceForm, status: v})}>
                <SelectTrigger data-testid="select-device-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Registered Employees</Label>
              <Input type="number" value={deviceForm.employees} onChange={e => setDeviceForm({...deviceForm, employees: parseInt(e.target.value) || 0})} data-testid="input-device-employees" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>API Protocol</Label>
                <Select value={deviceForm.apiProtocol} onValueChange={v => setDeviceForm({...deviceForm, apiProtocol: v})}>
                  <SelectTrigger data-testid="select-device-protocol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>API Port</Label>
                <Input type="number" value={deviceForm.apiPort} onChange={e => setDeviceForm({...deviceForm, apiPort: parseInt(e.target.value) || 80})} placeholder="80" data-testid="input-device-api-port" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeviceSubmit} disabled={!deviceForm.name || createDeviceMutation.isPending || updateDeviceMutation.isPending} data-testid="button-save-device">
              {(createDeviceMutation.isPending || updateDeviceMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingDevice ? 'Update' : 'Add'} Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={erpDialogOpen} onOpenChange={setErpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingErp ? 'Edit Integration' : 'Add ERP Integration'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={erpForm.name} onChange={e => setErpForm({...erpForm, name: e.target.value})} placeholder="e.g. Tally Prime" data-testid="input-erp-name" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={erpForm.category} onValueChange={v => setErpForm({...erpForm, category: v})}>
                <SelectTrigger data-testid="select-erp-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Accounting">Accounting</SelectItem>
                  <SelectItem value="ERP">ERP</SelectItem>
                  <SelectItem value="CRM">CRM</SelectItem>
                  <SelectItem value="HRIS">HRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={erpForm.status} onValueChange={v => setErpForm({...erpForm, status: v})}>
                <SelectTrigger data-testid="select-erp-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="disconnected">Disconnected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Features (comma-separated)</Label>
              <Input value={erpForm.features} onChange={e => setErpForm({...erpForm, features: e.target.value})} placeholder="e.g. Payroll Export, Expense Sync" data-testid="input-erp-features" />
            </div>
            <div>
              <Label>Connection URL</Label>
              <Input value={erpForm.connectionUrl} onChange={e => setErpForm({...erpForm, connectionUrl: e.target.value})} placeholder="e.g. https://..." data-testid="input-erp-url" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErpDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleErpSubmit} disabled={!erpForm.name || createErpMutation.isPending || updateErpMutation.isPending} data-testid="button-save-erp">
              {(createErpMutation.isPending || updateErpMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingErp ? 'Update' : 'Add'} Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={glDialogOpen} onOpenChange={setGlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>GL Account Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Payroll Component</Label>
              <Select value={glForm.component} onValueChange={v => setGlForm({...glForm, component: v})}>
                <SelectTrigger data-testid="select-gl-component">
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {['basic_salary','da','hra','conveyance','communication_allowance','medical_allowance','insurance_premium','tds','epf','other_allowances','advance','high_altitude_allowance','other_deductions','variable_pay','professional_tax','lwf','special_allowance','arrear','bonus','overtime_pay','birthday_allowance','lop_deduction','pf','esi','income_tax','other_earnings'].map(c => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>GL Account No.</Label>
              <Input value={glForm.accountNo} onChange={e => setGlForm({...glForm, accountNo: e.target.value})} placeholder="e.g. 43401" data-testid="input-gl-account" />
            </div>
            <div>
              <Label>Bal. Account No.</Label>
              <Input value={glForm.balAccountNo} onChange={e => setGlForm({...glForm, balAccountNo: e.target.value})} placeholder="e.g. 24025" data-testid="input-gl-bal-account" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={glForm.description} onChange={e => setGlForm({...glForm, description: e.target.value})} placeholder="e.g. Basic Salary" data-testid="input-gl-description" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={glForm.type} onValueChange={v => setGlForm({...glForm, type: v})}>
                <SelectTrigger data-testid="select-gl-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="earning">Earning (Debit)</SelectItem>
                  <SelectItem value="deduction">Deduction (Credit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Line No. Base</Label>
              <Input type="number" value={glForm.lineNoBase} onChange={e => setGlForm({...glForm, lineNoBase: parseInt(e.target.value) || 10000})} data-testid="input-gl-line-no" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGlDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveGlMutation.mutate(glForm)} disabled={!glForm.component || !glForm.accountNo || saveGlMutation.isPending} data-testid="button-save-gl">
              {saveGlMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
