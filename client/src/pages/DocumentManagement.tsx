import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, FileText, Upload, FolderOpen, CheckCircle2, Clock, XCircle, HardDrive, ChevronRight, Folder, User, ArrowLeft, Download, Eye, ChevronLeft, ChevronsLeft, ChevronsRight, Mail, Search } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Document, Employee } from "@shared/schema";
import { useState, useMemo, useRef } from "react";

const MAX_STORAGE_MB = 50;

const documentSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  documentType: z.string().min(1, "Document type is required"),
  documentName: z.string().min(1, "Document name is required"),
  filePath: z.string().optional(),
  fileSize: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

const documentTypes = [
  { value: "resume", label: "Resume/CV", folder: "Personal" },
  { value: "id_proof", label: "ID Proof (Aadhar/PAN)", folder: "Identity" },
  { value: "address_proof", label: "Address Proof", folder: "Identity" },
  { value: "education", label: "Education Certificates", folder: "Education" },
  { value: "experience", label: "Experience Letters", folder: "Experience" },
  { value: "offer_letter", label: "Offer Letter", folder: "Employment" },
  { value: "nda", label: "NDA/Agreements", folder: "Legal" },
  { value: "payslip", label: "Payslips", folder: "Payroll" },
  { value: "tax", label: "Tax Documents", folder: "Tax" },
  { value: "other", label: "Other Documents", folder: "Miscellaneous" },
];

const folderColors: Record<string, string> = {
  "Personal": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  "Identity": "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  "Education": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  "Experience": "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  "Employment": "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
  "Legal": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  "Payroll": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  "Tax": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  "Miscellaneous": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const requiredDocTypes = [
  "10th_marksheet", "12th_marksheet", "graduation_degree",
  "prev_offer_letter", "relieving_letter", "experience", "salary_slips",
  "aadhar", "pan_card", "id_proof", "address_proof", "photo", "bank_proof",
];

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function DocumentManagement() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [docEmployeeSearch, setDocEmployeeSearch] = useState("");
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<number>>(new Set());
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionComments, setRejectionComments] = useState("");

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
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

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      employeeId: "",
      documentType: "",
      documentName: "",
      filePath: "",
      fileSize: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      if (!selectedFile) {
        throw new Error("No file selected");
      }
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('employeeId', data.employeeId);
      formData.append('documentType', data.documentType);
      formData.append('documentName', data.documentName);
      
      const res = await fetch("/api/documents/upload", {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document uploaded successfully" });
      setOpen(false);
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upload document", description: error.message, variant: "destructive" });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status, rejectionComments }: { ids: number[]; status: string; rejectionComments?: string }) => {
      return apiRequest("PATCH", "/api/documents/bulk-status", { ids, status, rejectionComments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setSelectedDocs(new Set());
      setRejectDialogOpen(false);
      setRejectionComments("");
      toast({ title: "Document statuses updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update statuses", description: error.message, variant: "destructive" });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return apiRequest("POST", "/api/documents/send-pending-reminder", { ids });
    },
    onSuccess: () => {
      toast({ title: "Reminder emails sent successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send reminders", description: error.message, variant: "destructive" });
    },
  });

  const sendEmployeeReminderMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      return apiRequest("POST", "/api/documents/send-employee-reminder", { employeeId });
    },
    onSuccess: () => {
      toast({ title: "Reminder email sent successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send reminder", description: error.message, variant: "destructive" });
    },
  });

  const getEmployeeMissingOrPending = (empId: number) => {
    const empDocs = documents?.filter(d => d.employeeId === empId) || [];
    const submittedTypes = new Set(empDocs.map(d => d.documentType));
    const missingCount = requiredDocTypes.filter(t => !submittedTypes.has(t)).length;
    const pendingCount = empDocs.filter(d => d.status === "pending" || !d.status).length;
    return missingCount + pendingCount;
  };

  const getEmployeeName = (empId: number) => {
    const emp = employees?.find(e => e.id === empId);
    return emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : "Unknown";
  };

  const getEmployeeCode = (empId: number) => {
    const emp = employees?.find(e => e.id === empId);
    return emp?.employeeCode || `EMP${empId.toString().padStart(3, '0')}`;
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "verified": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "rejected": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400";
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400";
      default: return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400";
    }
  };

  const getDocTypeName = (type: string) => {
    return documentTypes.find(t => t.value === type)?.label || type;
  };

  const getDocFolder = (type: string) => {
    return documentTypes.find(t => t.value === type)?.folder || "Miscellaneous";
  };

  const formatFileSize = (sizeInBytes: number | null | undefined) => {
    if (!sizeInBytes) return "—";
    const sizeInKB = sizeInBytes / 1024;
    if (sizeInKB < 1024) return `${sizeInKB.toFixed(0)} KB`;
    return `${(sizeInKB / 1024).toFixed(2)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      form.setValue("filePath", file.name);
      const sizeInMB = file.size / (1024 * 1024);
      form.setValue("fileSize", sizeInMB.toFixed(2));
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const storageByEmployee = useMemo(() => {
    const storage: Record<number, number> = {};
    documents?.forEach(doc => {
      const sizeInBytes = (doc as any).fileSize || 0;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      storage[doc.employeeId] = (storage[doc.employeeId] || 0) + sizeInMB;
    });
    return storage;
  }, [documents]);

  const totalStorageUsed = useMemo(() => {
    return Object.values(storageByEmployee).reduce((sum, size) => sum + size, 0);
  }, [storageByEmployee]);

  const employeesWithDocs = useMemo(() => {
    const empIds = new Set(documents?.map(d => d.employeeId) || []);
    return employees?.filter(e => empIds.has(e.id)) || [];
  }, [documents, employees]);

  const filteredDocuments = useMemo(() => {
    let docs = documents || [];
    if (selectedEmployee !== "all") {
      docs = docs.filter(d => d.employeeId === parseInt(selectedEmployee));
    }
    if (docEmployeeSearch.trim()) {
      const searchLower = docEmployeeSearch.toLowerCase();
      const matchingEmpIds = new Set(
        employees?.filter(emp => 
          `${emp.firstName} ${emp.lastName || ''}`.toLowerCase().includes(searchLower) ||
          emp.employeeCode?.toLowerCase().includes(searchLower)
        ).map(emp => emp.id) || []
      );
      docs = docs.filter(d => matchingEmpIds.has(d.employeeId));
    }
    return docs;
  }, [documents, employees, selectedEmployee, docEmployeeSearch]);

  const documentsByFolder = useMemo(() => {
    const byFolder: Record<string, Document[]> = {};
    filteredDocuments.forEach(doc => {
      const folder = getDocFolder(doc.documentType);
      if (!byFolder[folder]) byFolder[folder] = [];
      byFolder[folder].push(doc);
    });
    return byFolder;
  }, [filteredDocuments]);

  const currentFolderDocs = currentPath.length > 0 
    ? documentsByFolder[currentPath[currentPath.length - 1]] || []
    : [];

  const totalPages = Math.max(1, Math.ceil(currentFolderDocs.length / pageSize));
  const paginatedDocs = currentFolderDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalDocs = documents?.length || 0;
  const verifiedDocs = documents?.filter(d => d.status === "verified").length || 0;
  const pendingDocs = documents?.filter(d => d.status === "pending").length || 0;

  const navigateToFolder = (folder: string) => {
    setCurrentPath([...currentPath, folder]);
    setCurrentPage(1);
    setSelectedDocs(new Set());
  };

  const navigateBack = () => {
    setCurrentPath(currentPath.slice(0, -1));
    setCurrentPage(1);
    setSelectedDocs(new Set());
  };

  const navigateToRoot = () => {
    setCurrentPath([]);
    setCurrentPage(1);
    setSelectedDocs(new Set());
  };

  const toggleDocSelection = (docId: number) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const currentPageIds = new Set(paginatedDocs.map(d => d.id));
  const selectedOnCurrentPage = new Set([...selectedDocs].filter(id => currentPageIds.has(id)));
  const allCurrentPageSelected = paginatedDocs.length > 0 && selectedOnCurrentPage.size === paginatedDocs.length;

  const toggleSelectAll = () => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (allCurrentPageSelected) {
        paginatedDocs.forEach(d => next.delete(d.id));
      } else {
        paginatedDocs.forEach(d => next.add(d.id));
      }
      return next;
    });
  };

  const handleBulkStatusChange = (status: string, comments?: string) => {
    const ids = Array.from(selectedDocs);
    if (ids.length === 0) return;
    bulkStatusMutation.mutate({ ids, status, rejectionComments: comments });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Management</h1>
          <p className="text-muted-foreground">Digital storage of employee documents (50MB limit per employee)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-document">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employee">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map(emp => {
                            const used = storageByEmployee[emp.id] || 0;
                            const remaining = MAX_STORAGE_MB - used;
                            return (
                              <SelectItem key={emp.id} value={emp.id.toString()} disabled={remaining <= 0}>
                                {emp.firstName} {emp.lastName || ''} ({remaining.toFixed(1)} MB free)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-doc-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {documentTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.folder} / {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="documentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Aadhar Card Copy" {...field} data-testid="input-doc-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel>Select File</FormLabel>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                    data-testid="input-file-browse"
                  />
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={handleBrowseClick} data-testid="button-browse-file">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Browse
                    </Button>
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {selectedFile ? selectedFile.name : "No file selected"}
                    </span>
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      Size: {formatFileSize(selectedFile.size)}
                    </p>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="filePath"
                  render={({ field }) => (
                    <input type="hidden" {...field} />
                  )}
                />
                <FormField
                  control={form.control}
                  name="fileSize"
                  render={({ field }) => (
                    <input type="hidden" {...field} />
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-doc">
                  {createMutation.isPending ? "Uploading..." : "Upload Document"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-foreground">{totalDocs}</p>
              </div>
              <FileText className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold text-green-600">{verifiedDocs}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingDocs}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Storage</p>
                <p className="text-2xl font-bold text-foreground">{totalStorageUsed.toFixed(1)} MB</p>
              </div>
              <HardDrive className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedEmployee !== "all" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{getEmployeeName(parseInt(selectedEmployee))}</span>
                <Badge variant="outline">{getEmployeeCode(parseInt(selectedEmployee))}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {(storageByEmployee[parseInt(selectedEmployee)] || 0).toFixed(2)} MB of {MAX_STORAGE_MB} MB used
              </span>
            </div>
            <Progress 
              value={((storageByEmployee[parseInt(selectedEmployee)] || 0) / MAX_STORAGE_MB) * 100} 
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              {currentPath.length > 0 && (
                <Button size="icon" variant="ghost" onClick={navigateBack} data-testid="button-navigate-back">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                <button onClick={navigateToRoot} className="hover:underline" data-testid="button-root">
                  Documents
                </button>
                {currentPath.map((folder, index) => (
                  <span key={folder} className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <span>{folder}</span>
                  </span>
                ))}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee by name..."
                  value={docEmployeeSearch}
                  onChange={(e) => { setDocEmployeeSearch(e.target.value); setCurrentPage(1); setCurrentPath([]); }}
                  className="pl-9 w-56"
                  data-testid="input-doc-employee-search"
                />
              </div>
              <Select value={selectedEmployee} onValueChange={(val) => { setSelectedEmployee(val); setCurrentPage(1); setSelectedDocs(new Set()); }}>
                <SelectTrigger className="w-48" data-testid="filter-employee">
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {(docEmployeeSearch
                    ? employees?.filter(emp => `${emp.firstName} ${emp.lastName || ''}`.toLowerCase().includes(docEmployeeSearch.toLowerCase()) || emp.employeeCode?.toLowerCase().includes(docEmployeeSearch.toLowerCase()))
                    : employees
                  )?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName || ''} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentPath.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Object.entries(documentsByFolder).map(([folder, docs]) => {
                const pending = docs.filter(d => d.status === "pending" || !d.status).length;
                const verified = docs.filter(d => d.status === "verified").length;
                return (
                  <button
                    key={folder}
                    onClick={() => navigateToFolder(folder)}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    data-testid={`folder-${folder}`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${folderColors[folder] || folderColors['Miscellaneous']}`}>
                      <Folder className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-sm text-center">{folder}</span>
                    <span className="text-xs text-muted-foreground">{docs.length} files</span>
                    <div className="flex items-center gap-2 text-xs">
                      {pending > 0 && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Clock className="w-3 h-3" /> {pending}
                        </span>
                      )}
                      {verified > 0 && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-3 h-3" /> {verified}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {Object.keys(documentsByFolder).length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No documents uploaded yet</p>
                  <p className="text-sm">Upload employee documents to get started</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDocs.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                  <span className="text-sm font-medium">{selectedDocs.size} document{selectedDocs.size > 1 ? 's' : ''} selected</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkStatusChange("verified")}
                      disabled={bulkStatusMutation.isPending}
                      className="text-green-700 border-green-300 hover:bg-green-50"
                      data-testid="button-bulk-verify"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkStatusChange("pending")}
                      disabled={bulkStatusMutation.isPending}
                      className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                      data-testid="button-bulk-pending"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Mark Pending
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={bulkStatusMutation.isPending}
                      className="text-red-700 border-red-300 hover:bg-red-50"
                      data-testid="button-bulk-reject"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendReminderMutation.mutate(Array.from(selectedDocs))}
                      disabled={sendReminderMutation.isPending}
                      className="text-blue-700 border-blue-300 hover:bg-blue-50"
                      data-testid="button-send-reminder"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      {sendReminderMutation.isPending ? "Sending..." : "Send Reminder"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedDocs(new Set())}
                      data-testid="button-clear-selection"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {currentFolderDocs.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No documents in this folder</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm text-muted-foreground">
                          <th className="pb-3 font-medium pr-2 w-10">
                            <Checkbox
                              checked={allCurrentPageSelected}
                              onCheckedChange={toggleSelectAll}
                              data-testid="checkbox-select-all"
                            />
                          </th>
                          <th className="pb-3 font-medium">Document</th>
                          <th className="pb-3 font-medium">Employee</th>
                          <th className="pb-3 font-medium">Path</th>
                          <th className="pb-3 font-medium">Size</th>
                          <th className="pb-3 font-medium">Uploaded</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDocs.map((doc) => (
                          <tr key={doc.id} data-testid={`document-row-${doc.id}`} className={`border-b last:border-0 ${selectedDocs.has(doc.id) ? 'bg-primary/5' : ''}`}>
                            <td className="py-4 pr-2">
                              <Checkbox
                                checked={selectedDocs.has(doc.id)}
                                onCheckedChange={() => toggleDocSelection(doc.id)}
                                data-testid={`checkbox-doc-${doc.id}`}
                              />
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="font-medium text-foreground">{doc.documentName}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex flex-col">
                                <span className="text-foreground">{getEmployeeName(doc.employeeId)}</span>
                                <span className="text-xs text-muted-foreground">{getEmployeeCode(doc.employeeId)}</span>
                              </div>
                            </td>
                            <td className="py-4 text-sm text-muted-foreground font-mono">
                              {(doc as any).filePath || `/${getDocFolder(doc.documentType)}/${doc.documentName}`}
                            </td>
                            <td className="py-4 text-sm text-muted-foreground">
                              {formatFileSize((doc as any).fileSize)}
                            </td>
                            <td className="py-4 text-sm text-muted-foreground">
                              {doc.uploadedAt ? format(new Date(doc.uploadedAt), "MMM dd, yyyy") : "—"}
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(doc.status)}
                                <Badge className={getStatusColor(doc.status)}>{doc.status || "pending"}</Badge>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => window.open(`/api/documents/${doc.id}/file`, '_blank')}
                                  data-testid={`button-view-${doc.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = `/api/documents/${doc.id}/file?download=true`;
                                    a.download = (doc as any).filePath || doc.documentName || 'document';
                                    a.click();
                                  }}
                                  data-testid={`button-download-${doc.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-4 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Rows per page:</span>
                      <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-20 h-8" data-testid="select-page-size">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map(size => (
                            <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="ml-2">
                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, currentFolderDocs.length)} of {currentFolderDocs.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        data-testid="button-first-page"
                        className="h-8 w-8"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm px-3">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                        className="h-8 w-8"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        data-testid="button-last-page"
                        className="h-8 w-8"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEmployee === "all" && (employees?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Employee Document Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(employees || []).filter(e => {
                if (e.status !== "active") return false;
                if (docEmployeeSearch.trim()) {
                  const s = docEmployeeSearch.toLowerCase();
                  return `${e.firstName} ${e.lastName || ''}`.toLowerCase().includes(s) || (e.employeeCode || '').toLowerCase().includes(s);
                }
                return true;
              }).map(emp => {
                const used = storageByEmployee[emp.id] || 0;
                const percentage = (used / MAX_STORAGE_MB) * 100;
                const pendingOrMissing = getEmployeeMissingOrPending(emp.id);
                return (
                  <div key={emp.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{emp.firstName} {emp.lastName || ''}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{emp.employeeCode}</Badge>
                        {pendingOrMissing > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-700 text-xs shrink-0">
                            {pendingOrMissing} pending
                          </Badge>
                        )}
                        {pendingOrMissing === 0 && (
                          <Badge className="bg-green-100 text-green-700 text-xs shrink-0">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground">
                          {used.toFixed(1)} / {MAX_STORAGE_MB} MB
                        </span>
                        {pendingOrMissing > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendEmployeeReminderMutation.mutate(emp.id)}
                            disabled={sendEmployeeReminderMutation.isPending}
                            className="text-blue-700 border-blue-300 hover:bg-blue-50 h-7 text-xs"
                            data-testid={`button-reminder-${emp.id}`}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Send Reminder
                          </Button>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${percentage > 80 ? '[&>div]:bg-red-500' : percentage > 50 ? '[&>div]:bg-yellow-500' : ''}`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) { setRejectDialogOpen(false); setRejectionComments(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Reject Documents
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are rejecting <strong>{selectedDocs.size}</strong> document{selectedDocs.size > 1 ? 's' : ''}. The employee will be notified via email with your comments.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Comments <span className="text-red-500">*</span></label>
              <Textarea
                placeholder="Please provide the reason for rejection (e.g., document is blurry, incorrect document uploaded, expired document...)"
                value={rejectionComments}
                onChange={(e) => setRejectionComments(e.target.value)}
                rows={4}
                data-testid="textarea-rejection-comments"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setRejectDialogOpen(false); setRejectionComments(""); }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleBulkStatusChange("rejected", rejectionComments)}
              disabled={!rejectionComments.trim() || bulkStatusMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {bulkStatusMutation.isPending ? "Rejecting..." : "Reject & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}