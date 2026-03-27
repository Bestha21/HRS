import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  User, FileText, Calendar, Receipt, Clock, Bell, 
  Download, ChevronRight, ChevronDown, ChevronUp, CalendarDays, Wallet, Loader2,
  CheckCircle2, AlertCircle, Upload, GraduationCap, Plus, Trash2, Pencil, Send, Eye, X as XIcon,
  Briefcase, FileCheck, Shield, Users, ClipboardList,
  IndianRupee, TrendingUp, Building2, Monitor, Gift,
  PartyPopper, Cake, Award, Target, BookOpen, Phone, Mail,
  Info, Lock, Banknote, LogIn, LogOut, CheckCircle, AlertTriangle, Edit2, UserPlus
} from "lucide-react";
import { Link } from "wouter";
import { format, addDays } from "date-fns";
import type { LeaveRequest, Expense, Announcement, Employee, Holiday, Asset, TaxDeclaration, Payroll, Document as DocType, Loan, LeaveBalance, OnboardingTask, LeaveType, Department } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { ESSPayslipView } from "@/components/ESSPayslipView";

export default function EmployeeSelfService() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedInvestmentType, setSelectedInvestmentType] = useState("");
  const [otherInvestmentDetail, setOtherInvestmentDetail] = useState("");
  const [declarationAmount, setDeclarationAmount] = useState("");
  const [npsPranNumber, setNpsPranNumber] = useState("");
  const [npsAmount, setNpsAmount] = useState("");
  const [employerNpsAmount, setEmployerNpsAmount] = useState("");
  const [activeSectionTab, setActiveSectionTab] = useState("investments");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [editingDeclaration, setEditingDeclaration] = useState<{ id: number; investmentType: string; amount: string; otherDetails: string | null } | null>(null);
  const [viewPayslip, setViewPayslip] = useState<Payroll | null>(null);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "", amount: "", expenseDate: format(new Date(), "yyyy-MM-dd"), description: "" });
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [newLoanRequest, setNewLoanRequest] = useState({ amount: "", repaymentMonths: "", reason: "" });
  const [loanMultiplier, setLoanMultiplier] = useState(3);
  const [showGreetDialog, setShowGreetDialog] = useState(false);
  const [greetTarget, setGreetTarget] = useState<{ id: number; name: string } | null>(null);
  const [greetMessage, setGreetMessage] = useState("");
  const [greetBanner, setGreetBanner] = useState("confetti");
  const [greetType, setGreetType] = useState<"birthday" | "anniversary">("birthday");
  const [taggedEmployees, setTaggedEmployees] = useState<{ id: number; name: string }[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [showBirthdayWall, setShowBirthdayWall] = useState(false);
  const [chatterFilter, setChatterFilter] = useState<"all" | "birthday" | "anniversary" | "new_joiner">("all");
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [resignReason, setResignReason] = useState("");
  const [resignLastDay, setResignLastDay] = useState("");
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState<Record<string, string>>({});

  const { entities } = useEntity();
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const currentEmployee = employees?.find(e => e.email?.toLowerCase() === user?.email?.toLowerCase());
  const currentEntity = currentEmployee?.entityId ? entities.find(e => e.id === currentEmployee.entityId) : null;

  const { data: attendanceLogs } = useQuery<any[]>({
    queryKey: ["/api/attendance"],
  });

  const todayDate = new Date().toISOString().split('T')[0];
  const todayLog = attendanceLogs?.find(l =>
    l.employeeId === currentEmployee?.id && l.date === todayDate
  );

  const getGeoLocationESS = useCallback((): Promise<{ latitude?: string; longitude?: string; locationLabel: string }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast({ title: "Location not supported", description: "Your browser does not support geolocation. Please enable location services.", variant: "destructive" });
        resolve({ locationLabel: "Unknown" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = String(pos.coords.latitude);
          const lng = String(pos.coords.longitude);
          let locationLabel = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
          try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
            if (resp.ok) {
              const data = await resp.json();
              const addr = data.address || {};
              locationLabel = [addr.suburb || addr.neighbourhood || addr.village || '', addr.city || addr.town || addr.state_district || '', addr.state || ''].filter(Boolean).join(', ') || data.display_name || locationLabel;
            }
          } catch (e) {}
          resolve({ latitude: lat, longitude: lng, locationLabel });
        },
        () => {
          toast({ title: "Location access denied", description: "Please turn on location services in your browser to capture your check-in location.", variant: "destructive" });
          resolve({ locationLabel: "Location denied" });
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }, [toast]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const locPerm = (currentEmployee?.locationPermission || "office").toLowerCase();
      const needsGeo = locPerm === "remote" || locPerm === "hybrid";
      if (needsGeo) {
        const geo = await getGeoLocationESS();
        return apiRequest("POST", "/api/attendance/check-in", {
          employeeId: currentEmployee!.id,
          location: geo.locationLabel,
          latitude: geo.latitude,
          longitude: geo.longitude
        });
      }
      return apiRequest("POST", "/api/attendance/check-in", {
        employeeId: currentEmployee!.id,
        location: "Office"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Checked in successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Check-in failed", description: err.message, variant: "destructive" });
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const locPerm = (currentEmployee?.locationPermission || "office").toLowerCase();
      const needsGeo = locPerm === "remote" || locPerm === "hybrid";
      if (needsGeo) {
        const geo = await getGeoLocationESS();
        return apiRequest("POST", "/api/attendance/check-out", {
          employeeId: currentEmployee!.id,
          location: geo.locationLabel,
          latitude: geo.latitude,
          longitude: geo.longitude
        });
      }
      return apiRequest("POST", "/api/attendance/check-out", {
        employeeId: currentEmployee!.id,
        location: "Office"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Checked out successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Check-out failed", description: err.message, variant: "destructive" });
    }
  });

  const resignationMutation = useMutation({
    mutationFn: async (data: { reason: string; lastWorkingDay: string }) => {
      return apiRequest("POST", "/api/exit-records", {
        employeeId: currentEmployee!.id,
        exitType: "resignation",
        resignationDate: format(new Date(), "yyyy-MM-dd"),
        reason: data.reason,
        lastWorkingDate: data.lastWorkingDay,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exit-records"] });
      toast({ title: "Resignation submitted", description: "HR and your reporting manager have been notified." });
      setShowResignDialog(false);
      setResignReason("");
      setResignLastDay("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit resignation", description: err.message, variant: "destructive" });
    }
  });

  const { data: myProfileRequests } = useQuery<any[]>({
    queryKey: ["/api/profile-change-requests", currentEmployee?.id],
    queryFn: async () => {
      const res = await fetch(`/api/profile-change-requests?employeeId=${currentEmployee?.id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!currentEmployee?.id,
  });

  const profileChangeMutation = useMutation({
    mutationFn: async (changes: { fieldName: string; oldValue: string; newValue: string }[]) => {
      return apiRequest("POST", "/api/profile-change-requests", {
        employeeId: currentEmployee!.id,
        changes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile-change-requests", currentEmployee?.id] });
      toast({ title: "Profile update request submitted", description: "HR will review and approve your changes." });
      setEditingPersonal(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit changes", description: err.message, variant: "destructive" });
    }
  });

  const { data: myExitRecord } = useQuery<any[]>({
    queryKey: ["/api/exit-records", currentEmployee?.id],
    queryFn: async () => {
      const res = await fetch(`/api/exit-records?employeeId=${currentEmployee?.id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!currentEmployee?.id,
  });

  const { data: leaves } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leaves", "employee", currentEmployee?.id],
    queryFn: async () => {
      const res = await fetch(`/api/leaves?employeeId=${currentEmployee?.id}`);
      if (!res.ok) throw new Error("Failed to fetch leaves");
      return res.json();
    },
    enabled: !!currentEmployee?.id,
  });

  const { data: expenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", "employee", currentEmployee?.id],
    queryFn: async () => {
      const res = await fetch(`/api/expenses?employeeId=${currentEmployee?.id}`);
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
    enabled: !!currentEmployee?.id,
  });

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: holidays } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: myDocuments } = useQuery<DocType[]>({
    queryKey: ["/api/documents", "employee", currentEmployee?.id],
    queryFn: async () => {
      const res = await fetch(`/api/documents?employeeId=${currentEmployee?.id}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    enabled: !!currentEmployee?.id,
  });

  const { data: leaveBalancesData } = useQuery<LeaveBalance[]>({
    queryKey: ["/api/leave-balances", currentEmployee?.id],
    queryFn: async () => {
      const res = await fetch(`/api/leave-balances?employeeId=${currentEmployee?.id}`);
      if (!res.ok) throw new Error("Failed to fetch leave balances");
      return res.json();
    },
    enabled: !!currentEmployee?.id,
  });

  const { data: leaveTypes } = useQuery<LeaveType[]>({
    queryKey: ["/api/leave-types"],
  });

  const { data: onboardingTasksData } = useQuery<OnboardingTask[]>({
    queryKey: ["/api/onboarding", currentEmployee?.id],
    queryFn: async () => {
      const res = await fetch(`/api/onboarding?employeeId=${currentEmployee?.id}`);
      if (!res.ok) throw new Error("Failed to fetch onboarding tasks");
      return res.json();
    },
    enabled: !!currentEmployee?.id,
  });

  const { data: birthdayWishes } = useQuery<any[]>({
    queryKey: ["/api/birthday-wishes"],
  });

  const myWishes = birthdayWishes?.filter(w => w.toEmployeeId === currentEmployee?.id) || [];

  const sendWishMutation = useMutation({
    mutationFn: async (data: { fromEmployeeId: number; toEmployeeId: number; message: string; bannerType: string; type: string; taggedEmployeeIds?: number[] }) => {
      return apiRequest("POST", "/api/birthday-wishes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/birthday-wishes"] });
      toast({ title: "Sent!", description: greetType === "anniversary" ? "Your anniversary greeting has been posted." : "Your birthday greeting has been posted." });
      setShowGreetDialog(false);
      setGreetMessage("");
      setGreetBanner("confetti");
      setGreetTarget(null);
      setGreetType("birthday");
      setTaggedEmployees([]);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send wish", description: err.message, variant: "destructive" });
    },
  });

  const [docPreviewFile, setDocPreviewFile] = useState<{ file: File; previewUrl: string; documentType: string; documentName: string } | null>(null);

  const docUploadMutation = useMutation({
    mutationFn: async ({ file, documentType, documentName }: { file: File; documentType: string; documentName: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employeeId', String(currentEmployee?.id));
      formData.append('documentType', documentType);
      formData.append('documentName', documentName);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message || 'Upload failed'); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "employee", currentEmployee?.id] });
      toast({ title: "Document Uploaded", description: "Your document has been uploaded successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleDocUpload = (file: File, documentType: string, documentName: string) => {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }
    const previewUrl = (file.type.startsWith('image/') || file.type === 'application/pdf') ? URL.createObjectURL(file) : '';
    setDocPreviewFile({ file, previewUrl, documentType, documentName });
  };

  const handleDocPreviewAccept = () => {
    if (!docPreviewFile) return;
    const { file, documentType, documentName, previewUrl } = docPreviewFile;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setDocPreviewFile(null);
    docUploadMutation.mutate({ file, documentType, documentName });
  };

  const handleDocPreviewReject = () => {
    if (docPreviewFile?.previewUrl) URL.revokeObjectURL(docPreviewFile.previewUrl);
    setDocPreviewFile(null);
    toast({ title: "Upload cancelled", description: "File was not uploaded." });
  };

  const getDocStatus = (documentType: string) => {
    const doc = myDocuments?.find(d => d.documentType === documentType);
    return doc ? doc.status || "pending" : "not_uploaded";
  };

  const getDocFile = (documentType: string) => {
    return myDocuments?.find(d => d.documentType === documentType);
  };

  const { data: myPayroll } = useQuery<Payroll[]>({
    queryKey: ["/api/payroll", "employee", currentEmployee?.id],
    queryFn: async () => {
      const res = await fetch(`/api/payroll?employeeId=${currentEmployee?.id}`);
      if (!res.ok) throw new Error("Failed to fetch payroll");
      return res.json();
    },
    enabled: !!currentEmployee?.id,
  });

  const taxRegimeMutation = useMutation({
    mutationFn: async (regime: string) => {
      if (!currentEmployee) throw new Error("Employee not found");
      await apiRequest("PATCH", `/api/employees/${currentEmployee.id}`, { taxRegime: regime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Tax Regime Updated", description: "Your tax regime preference has been saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tax regime. Please try again.", variant: "destructive" });
    },
  });

  const { data: myTaxDeclarations } = useQuery<TaxDeclaration[]>({
    queryKey: ["/api/tax-declarations", currentEmployee?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tax-declarations?employeeId=${currentEmployee?.id}`);
      return res.json();
    },
    enabled: !!currentEmployee,
  });

  const { data: payrollDeductions } = useQuery<{
    deductions: { id: string; section: string; investmentType: string; amount: string; status: string; source: string; monthsProcessed: number; taxDeductible?: boolean }[];
    monthlyBreakdown: { month: string; year: number; epf: number; professionalTax: number; esi: number }[];
    totalEpf: number; totalProfTax: number; totalEsi: number; totalEmployerNps: number; monthsProcessed: number;
  }>({
    queryKey: ["/api/tax-declarations/payroll-deductions", currentEmployee?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tax-declarations/payroll-deductions?employeeId=${currentEmployee?.id}&financialYear=2025-26`);
      return res.json();
    },
    enabled: !!currentEmployee?.id,
  });

  const submitDeclarationMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/tax-declarations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-declarations", currentEmployee?.id] });
      setSelectedSection("");
      setSelectedInvestmentType("");
      setOtherInvestmentDetail("");
      setDeclarationAmount("");
      toast({ title: "Declaration Submitted", description: "Your tax declaration has been submitted for review." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit declaration. Please try again.", variant: "destructive" });
    },
  });

  const submitNpsMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/tax-declarations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-declarations", currentEmployee?.id] });
      setNpsPranNumber("");
      setNpsAmount("");
      setEmployerNpsAmount("");
      toast({ title: "NPS Declaration Submitted", description: "Your NPS declaration has been submitted for review." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit NPS declaration. Please try again.", variant: "destructive" });
    },
  });

  const deleteDeclarationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tax-declarations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-declarations", currentEmployee?.id] });
      toast({ title: "Declaration Deleted", description: "Your declaration has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete declaration.", variant: "destructive" });
    },
  });

  const editDeclarationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { investmentType?: string; amount?: string; otherDetails?: string | null } }) => {
      await apiRequest("PATCH", `/api/tax-declarations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-declarations", currentEmployee?.id] });
      setEditingDeclaration(null);
      toast({ title: "Declaration Updated", description: "Your declaration has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update declaration.", variant: "destructive" });
    },
  });

  const submitToFinanceMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/tax-declarations/submit-to-finance", { employeeId: currentEmployee?.id, financialYear: "2025-26" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-declarations", currentEmployee?.id] });
      toast({ title: "Submitted to Finance", description: "All pending declarations have been submitted to the finance team for review." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit declarations.", variant: "destructive" });
    },
  });

  const { data: myLoans = [], isLoading: loansLoading } = useQuery<Loan[]>({
    queryKey: ["/api/my-loans"],
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setShowExpenseDialog(false);
      setExpenseForm({ category: "", amount: "", expenseDate: format(new Date(), "yyyy-MM-dd"), description: "" });
      toast({ title: "Expense Submitted", description: "Your expense claim has been submitted for approval." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to submit expense.", variant: "destructive" });
    },
  });

  const createLoanMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/my-loans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-loans"] });
      setShowLoanDialog(false);
      setNewLoanRequest({ amount: "", repaymentMonths: "", reason: "" });
      toast({ title: "Request Submitted", description: "Your loan request has been submitted for approval." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to submit request. Please try again.", variant: "destructive" });
    },
  });

  const handleSubmitDeclaration = () => {
    if (!currentEmployee || !selectedSection || !selectedInvestmentType || !declarationAmount) {
      toast({ title: "Missing Information", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    submitDeclarationMutation.mutate({
      employeeId: currentEmployee.id,
      financialYear: "2025-26",
      section: selectedSection,
      investmentType: selectedInvestmentType === "Other" ? (otherInvestmentDetail || "Other") : selectedInvestmentType,
      otherDetails: selectedInvestmentType === "Other" ? otherInvestmentDetail : null,
      amount: declarationAmount,
      status: "pending",
    });
  };

  const handleSubmitNps = () => {
    if (!currentEmployee || (!npsAmount && !employerNpsAmount)) {
      toast({ title: "Missing Information", description: "Please enter NPS contribution amount.", variant: "destructive" });
      return;
    }
    const totalNps = (parseFloat(npsAmount || "0") + parseFloat(employerNpsAmount || "0")).toString();
    submitNpsMutation.mutate({
      employeeId: currentEmployee.id,
      financialYear: "2025-26",
      section: "80CCD2",
      investmentType: "NPS Contribution",
      otherDetails: npsPranNumber ? `PRAN: ${npsPranNumber}` : null,
      amount: totalNps,
      status: "pending",
    });
  };

  const pendingLeaves = leaves?.filter(l => l.status === 'pending').length || 0;
  const approvedLeaves = leaves?.filter(l => l.status === 'approved').length || 0;


  const leaveColorMap: Record<string, string> = {
    "casual": "bg-blue-500",
    "sick": "bg-red-500",
    "earned": "bg-green-500",
    "maternity": "bg-pink-500",
    "paternity": "bg-indigo-500",
    "compensatory": "bg-yellow-500",
  };

  const currentYear = new Date().getFullYear();
  const myApprovedLeaves = leaves?.filter(l =>
    l.employeeId === currentEmployee?.id &&
    l.status === 'approved' &&
    new Date(l.startDate).getFullYear() === currentYear
  ) || [];

  const leaveBalance = (() => {
    if (leaveBalancesData && leaveBalancesData.length > 0 && leaveTypes) {
      return leaveBalancesData
        .filter(b => b.year === currentYear)
        .map(b => {
          const lt = leaveTypes.find(t => t.id === b.leaveTypeId);
          const name = lt?.name || "Leave";
          const code = (lt?.code || "").toLowerCase();
          const total = Number(b.opening || 0) + Number(b.accrued || 0);
          const used = Number(b.used || 0);
          return {
            type: name,
            used,
            total: total || lt?.annualAllowance || 12,
            color: leaveColorMap[code] || "bg-gray-500",
          };
        });
    }
    if (leaveTypes && leaveTypes.length > 0) {
      return leaveTypes.map(lt => {
        const code = (lt.code || "").toLowerCase();
        const used = myApprovedLeaves
          .filter(l => l.leaveType?.toLowerCase() === code || l.leaveTypeId === lt.id)
          .reduce((sum, l) => sum + (Number(l.days) || 1), 0);
        return {
          type: lt.name,
          used,
          total: lt.annualAllowance || 12,
          color: leaveColorMap[code] || "bg-gray-500",
        };
      });
    }
    return [];
  })();

  const educationDocDefs = [
    { docType: "10th_marksheet", name: "10th Marksheet", required: true },
    { docType: "12th_marksheet", name: "12th Marksheet", required: true },
    { docType: "graduation_degree", name: "Graduation Degree", required: true },
    { docType: "post_graduation", name: "Post Graduation Degree", required: false },
    { docType: "professional_cert", name: "Professional Certifications", required: false },
    { docType: "education", name: "Education Certificates", required: false },
  ];

  const employmentDocDefs = [
    { docType: "prev_offer_letter", name: "Previous Company Offer Letter", required: true },
    { docType: "relieving_letter", name: "Previous Company Relieving Letter", required: true },
    { docType: "experience", name: "Previous Company Experience Letter", required: true },
    { docType: "salary_slips", name: "Last 3 Months Salary Slips", required: true },
    { docType: "form16", name: "Form 16 (Previous Employer)", required: false },
  ];

  const idDocDefs = [
    { docType: "aadhar", name: "Aadhar Card" },
    { docType: "pan_card", name: "PAN Card" },
    { docType: "id_proof", name: "ID Proof (Passport/Driving License)" },
    { docType: "address_proof", name: "Address Proof" },
    { docType: "photo", name: "Passport Size Photo" },
    { docType: "bank_proof", name: "Bank Account Proof" },
  ];

  const statutoryForms = [
    { id: 1, name: "PF Nomination Form (Form 2)", description: "Provident Fund nomination for family members", status: "pending", required: true },
    { id: 2, name: "Gratuity Nomination Form (Form F)", description: "Gratuity nomination declaration", status: "pending", required: true },
    { id: 3, name: "Form 11 (PF Declaration)", description: "Declaration for EPF/EPS membership", status: "pending", required: true },
    { id: 4, name: "ESI Form 1", description: "ESI declaration form", status: "pending", required: false },
  ];

  const MONTHS: Record<string, string> = {
    "01": "January", "02": "February", "03": "March", "04": "April",
    "05": "May", "06": "June", "07": "July", "08": "August",
    "09": "September", "10": "October", "11": "November", "12": "December",
  };
  const getMonthName = (val: string) => MONTHS[val] || val;
  const formatCurrency = (val: number | string | null | undefined) => {
    const num = Number(val) || 0;
    if (num % 1 !== 0) return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num.toLocaleString("en-IN");
  };

  const sortedPayroll = myPayroll?.slice().sort((a, b) => {
    if ((a.year ?? 0) !== (b.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
    return (b.month ?? "").localeCompare(a.month ?? "");
  });

  const latestPayroll = sortedPayroll?.[0];

  const myAssets = assets?.filter(a => a.employeeId === currentEmployee?.id) || [];

  const allYearHolidays = holidays?.filter(h => new Date(h.date).getFullYear() === new Date().getFullYear()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

  const teamMembers = employees?.filter(e => e.reportingManagerId === currentEmployee?.employeeCode) || [];

  const reportingManager = currentEmployee?.reportingManagerId
    ? employees?.find(e => e.employeeCode === currentEmployee.reportingManagerId || String(e.id) === String(currentEmployee.reportingManagerId))
    : null;

  const currentDepartment = currentEmployee?.department || currentEmployee?.departmentId
    ? employees?.find(e => e.id === currentEmployee?.id)?.department
    : null;

  const upcomingBirthdays = employees
    ?.filter(e => {
      if (!e.dateOfBirth) return false;
      const today = new Date();
      const dob = new Date(e.dateOfBirth);
      const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      const diffDays = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    })
    .map(e => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName || ''}`.trim(),
      date: e.dateOfBirth ? format(new Date(new Date(e.dateOfBirth).getFullYear() === 1 ? e.dateOfBirth : e.dateOfBirth), "MMM dd") : "",
      sortDate: (() => {
        const today = new Date();
        const dob = new Date(e.dateOfBirth!);
        const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
        return thisYear.getTime();
      })(),
      department: e.department || "",
      isToday: (() => {
        const today = new Date();
        const dob = new Date(e.dateOfBirth!);
        return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
      })(),
    }))
    .sort((a, b) => {
      if (a.isToday && !b.isToday) return -1;
      if (!a.isToday && b.isToday) return 1;
      return a.sortDate - b.sortDate;
    })
    .slice(0, 10) || [];

  const workAnniversaries = employees
    ?.filter(e => {
      if (!e.joinDate) return false;
      const today = new Date();
      const jd = new Date(e.joinDate);
      const years = today.getFullYear() - jd.getFullYear();
      if (years <= 0) return false;
      const thisYearAnni = new Date(today.getFullYear(), jd.getMonth(), jd.getDate());
      const diffDays = Math.ceil((thisYearAnni.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    })
    .map(e => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName || ''}`.trim(),
      years: new Date().getFullYear() - new Date(e.joinDate!).getFullYear(),
      date: e.joinDate ? format(new Date(e.joinDate), "MMM dd") : "",
      department: e.department || "",
      isToday: (() => {
        const today = new Date();
        const jd = new Date(e.joinDate!);
        return jd.getMonth() === today.getMonth() && jd.getDate() === today.getDate();
      })(),
    }))
    .sort((a, b) => (a.isToday ? -1 : 0) - (b.isToday ? -1 : 0))
    .slice(0, 10) || [];

  const { data: companyPoliciesData } = useQuery<any[]>({
    queryKey: ["/api/company-policies"],
  });
  const { data: policyAcknowledgments } = useQuery<any[]>({
    queryKey: ["/api/policy-acknowledgments"],
  });

  const viewPolicyMutation = useMutation({
    mutationFn: async (data: { policyId: number }) => {
      return apiRequest("POST", "/api/policy-acknowledgments/view", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-acknowledgments"] });
      queryClient.refetchQueries({ queryKey: ["/api/policy-acknowledgments"] });
    },
  });

  const acknowledgePolicyMutation = useMutation({
    mutationFn: async (data: { policyId: number }) => {
      return apiRequest("POST", "/api/policy-acknowledgments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-acknowledgments"] });
      toast({ title: "Policy Acknowledged", description: "You have acknowledged this policy." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [essPolicyPreview, setEssPolicyPreview] = useState<any>(null);
  const [essPolicyBlobUrl, setEssPolicyBlobUrl] = useState<string | null>(null);
  const [essPolicyLoading, setEssPolicyLoading] = useState(false);

  useEffect(() => {
    if (!essPolicyPreview) {
      if (essPolicyBlobUrl) {
        URL.revokeObjectURL(essPolicyBlobUrl);
        setEssPolicyBlobUrl(null);
      }
      return;
    }
    setEssPolicyLoading(true);
    fetch(`/api/company-policies/${essPolicyPreview.id}/view`, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load");
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        setEssPolicyBlobUrl(url);
        setEssPolicyLoading(false);
      })
      .catch(() => {
        setEssPolicyLoading(false);
        toast({ title: "Error", description: "Could not load policy file", variant: "destructive" });
        setEssPolicyPreview(null);
      });
    return () => {
      if (essPolicyBlobUrl) URL.revokeObjectURL(essPolicyBlobUrl);
    };
  }, [essPolicyPreview?.id]);

  const investmentSections = [
    { value: "80C", label: "80C - Investments (PPF, ELSS, LIC, NSC, FD, Tuition)", limit: 150000 },
    { value: "80D", label: "80D - Health Insurance Premium", limit: 75000 },
    { value: "80G", label: "80G - Charitable Donations", limit: 0 },
    { value: "HRA", label: "HRA - House Rent Allowance", limit: 240000 },
    { value: "80E", label: "80E - Education Loan Interest", limit: 0 },
    { value: "80EE", label: "80EE/80EEA - Home Loan Interest (First Time)", limit: 150000 },
    { value: "24b", label: "24(b) - Home Loan Interest", limit: 200000 },
    { value: "80CCD1B", label: "80CCD(1B) - NPS Additional Contribution", limit: 50000 },
    { value: "80CCD2", label: "80CCD(2) - Employer NPS Contribution", limit: 0 },
    { value: "80TTA", label: "80TTA - Savings Account Interest", limit: 10000 },
    { value: "80U", label: "80U - Disability Deduction", limit: 125000 },
    { value: "80DD", label: "80DD - Disabled Dependent", limit: 125000 },
    { value: "80DDB", label: "80DDB - Medical Treatment", limit: 100000 },
  ];

  const investmentTypeOptions: Record<string, string[]> = {
    "80C": ["PPF (Public Provident Fund)", "ELSS (Equity Linked Savings Scheme)", "LIC Premium", "NSC (National Savings Certificate)", "Tax Saver Fixed Deposit (5 Year)", "Sukanya Samriddhi Yojana", "Senior Citizen Savings Scheme", "Tuition Fees (Children)", "Home Loan Principal Repayment", "Employee PF Contribution", "Unit Linked Insurance Plan (ULIP)", "National Pension Scheme (NPS) - 80CCD(1)", "Stamp Duty & Registration", "Other"],
    "80D": ["Self & Family Health Insurance Premium", "Parents Health Insurance Premium", "Preventive Health Checkup", "Senior Citizen Parents Premium", "Other"],
    "80G": ["PM National Relief Fund", "PM CARES Fund", "National Defence Fund", "Swachh Bharat Kosh", "Approved Charitable Trust / NGO", "Political Party Donation", "Other"],
    "HRA": ["Monthly Rent Receipt", "Rent Agreement", "Landlord PAN (Rent > 1L/year)", "Other"],
    "80E": ["Education Loan Interest Certificate", "Other"],
    "80EE": ["Home Loan Interest Certificate (First Time Buyer)", "Other"],
    "24b": ["Home Loan Interest Certificate", "Home Loan Statement from Bank", "Other"],
    "80CCD1B": ["NPS Tier-I Contribution Receipt", "NPS Transaction Statement", "Other"],
    "80CCD2": ["Employer NPS Contribution Proof", "NPS Contribution Statement", "Other"],
    "80TTA": ["Savings Account Interest Certificate", "Bank Statement (Interest)", "Other"],
    "80U": ["Disability Certificate (Form 10-IA)", "Medical Certificate", "Other"],
    "80DD": ["Dependent Disability Certificate", "Medical Expense Receipts", "Other"],
    "80DDB": ["Medical Treatment Certificate (Form 10-I)", "Hospital Bills & Receipts", "Prescription from Specialist", "Other"],
  };

  const getInvestmentTypes = () => {
    if (!selectedSection) return [];
    return investmentTypeOptions[selectedSection] || ["Other"];
  };

  const normalizeSectionKey = (section: string): string => {
    const map: Record<string, string> = {
      "80CCD(2)": "80CCD2", "80CCD(1B)": "80CCD1B", "24(b)": "24b",
      "80EE/80EEA": "80EE", "80CCD1B": "80CCD1B", "80CCD2": "80CCD2",
    };
    return map[section] || section;
  };

  const getDeclarationsForSection = (sectionValue: string) => {
    return myTaxDeclarations?.filter(d => normalizeSectionKey(d.section) === sectionValue) || [];
  };

  const taxDeclarations = investmentSections.map(sec => {
    const sectionDecs = getDeclarationsForSection(sec.value);
    const declared = sectionDecs.reduce((s, d) => s + parseFloat(d.amount), 0);
    const items = sectionDecs.map(d => d.investmentType);
    return { section: sec.value, limit: sec.limit, declared, items, description: sec.label.split(" - ")[1] || sec.label };
  });

  function calculateOldRegimeTax(taxableIncome: number): number {
    let tax = 0;
    if (taxableIncome <= 250000) return 0;
    if (taxableIncome <= 500000) return (taxableIncome - 250000) * 0.05;
    tax += 250000 * 0.05;
    if (taxableIncome <= 1000000) return tax + (taxableIncome - 500000) * 0.20;
    tax += 500000 * 0.20;
    tax += (taxableIncome - 1000000) * 0.30;
    return tax;
  }

  function calculateNewRegimeTax(taxableIncome: number): number {
    let tax = 0;
    if (taxableIncome <= 400000) return 0;
    if (taxableIncome <= 800000) return (taxableIncome - 400000) * 0.05;
    tax += 400000 * 0.05;
    if (taxableIncome <= 1200000) return tax + (taxableIncome - 800000) * 0.10;
    tax += 400000 * 0.10;
    if (taxableIncome <= 1600000) return tax + (taxableIncome - 1200000) * 0.15;
    tax += 400000 * 0.15;
    if (taxableIncome <= 2000000) return tax + (taxableIncome - 1600000) * 0.20;
    tax += 400000 * 0.20;
    if (taxableIncome <= 2400000) return tax + (taxableIncome - 2000000) * 0.25;
    tax += 400000 * 0.25;
    tax += (taxableIncome - 2400000) * 0.30;
    return tax;
  }

  const employeeCTC = currentEmployee?.ctc ? parseFloat(String(currentEmployee.ctc)) : 0;
  const oldStandardDeduction = 50000;
  const newStandardDeduction = 75000;
  const payrollEpfForTax = payrollDeductions?.totalEpf || 0;
  const payrollProfTaxForTax = payrollDeductions?.totalProfTax || 0;
  const payroll80CTotal = payrollEpfForTax;
  const manualPfDeclarations = myTaxDeclarations?.filter(d => 
    normalizeSectionKey(d.section) === "80C" && 
    (d.investmentType?.toLowerCase().includes("pf") || d.investmentType?.toLowerCase().includes("provident fund"))
  ).reduce((s, d) => s + parseFloat(d.amount), 0) || 0;
  const manualDeclarationsExPf = taxDeclarations.reduce((sum, d) => sum + d.declared, 0) - manualPfDeclarations;
  const totalOldDeductions = manualDeclarationsExPf + payroll80CTotal + payrollProfTaxForTax + oldStandardDeduction;
  const oldTaxableIncome = Math.max(0, employeeCTC - totalOldDeductions);
  const newTaxableIncome = Math.max(0, employeeCTC - newStandardDeduction - payrollProfTaxForTax);
  const oldRegimeTax = calculateOldRegimeTax(oldTaxableIncome);
  const newRegimeTax = calculateNewRegimeTax(newTaxableIncome);
  const oldTaxWithCess = oldRegimeTax + oldRegimeTax * 0.04;
  const newTaxWithCess = newRegimeTax + newRegimeTax * 0.04;
  const taxSavings = Math.abs(oldTaxWithCess - newTaxWithCess);
  const betterRegime = oldTaxWithCess <= newTaxWithCess ? "Old" : "New";

  const onboardingProgress = 35;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "uploaded": case "approved": case "submitted": case "paid": case "acknowledged": case "verified": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Self Service</h1>
          <p className="text-sm text-muted-foreground">Manage your HR activities and complete onboarding</p>
          <p className="text-muted-foreground mt-1">Welcome, {user?.firstName || 'Employee'}</p>
        </div>
        {currentEmployee && !currentEmployee.attendanceExempt && (
          <div className="flex gap-3 items-center">
            {(!todayLog || todayLog.checkOut) && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending}
                data-testid="button-ess-check-in-top"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
              </Button>
            )}
            {todayLog && todayLog.checkIn && !todayLog.checkOut && (
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => checkOutMutation.mutate()}
                disabled={checkOutMutation.isPending}
                data-testid="button-ess-check-out-top"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
              </Button>
            )}
          </div>
        )}
      </div>

      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
              {user?.firstName?.[0] || 'E'}{user?.lastName?.[0] || 'S'}
            </div>
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-xl font-bold">{user?.firstName} {user?.lastName || ''}</h2>
              <p className="text-primary-foreground/80">{user?.email}</p>
              {currentEmployee && (
                <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-primary-foreground/80">
                  <span className="flex items-center gap-1" data-testid="ess-emp-code">
                    <Badge variant="outline" className="border-white/30 text-primary-foreground text-xs">
                      {currentEmployee.employeeCode || 'Code N/A'}
                    </Badge>
                  </span>
                  <span className="flex items-center gap-1" data-testid="ess-phone">
                    <Phone className="w-3.5 h-3.5" />
                    {currentEmployee.phone || 'Phone not set'}
                  </span>
                  <span className="flex items-center gap-1" data-testid="ess-department">
                    <Building2 className="w-3.5 h-3.5" />
                    {(currentEmployee.departmentId && departments?.find(d => d.id === currentEmployee.departmentId)?.name) || 'Dept not set'}
                  </span>
                  <span className="flex items-center gap-1" data-testid="ess-designation">
                    <Briefcase className="w-3.5 h-3.5" />
                    {currentEmployee.designation || 'Designation not set'}
                  </span>
                  <span className="flex items-center gap-1" data-testid="ess-reporting-manager">
                    <Users className="w-3.5 h-3.5" />
                    RM: {currentEmployee.reportingManagerId ? (() => {
                      const rmId = String(currentEmployee.reportingManagerId).trim();
                      const mgr = employees?.find(e =>
                        e.employeeCode === rmId || String(e.id) === rmId ||
                        `${e.firstName} ${e.lastName || ''}`.trim().toLowerCase() === rmId.toLowerCase()
                      );
                      return mgr ? `${mgr.firstName} ${mgr.lastName || ''}`.trim() : rmId;
                    })() : 'Not assigned'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {currentEmployee?.status === 'active' && !onboardingTasksData?.length ? (
                  <Badge className="bg-white/20 text-primary-foreground">Active</Badge>
                ) : onboardingTasksData && onboardingTasksData.length > 0 ? (
                  <>
                    <Badge className="bg-white/20 text-primary-foreground">New Joiner</Badge>
                    <span className="text-sm text-primary-foreground/70">Onboarding: {onboardingProgress}% Complete</span>
                  </>
                ) : (
                  <Badge className="bg-white/20 text-primary-foreground">{currentEmployee?.status || 'Employee'}</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-foreground/70">Today</p>
              <p className="text-lg font-semibold">{format(new Date(), "EEEE, MMM dd")}</p>
            </div>
          </div>
          {onboardingTasksData && onboardingTasksData.length > 0 && (
            <div className="mt-4">
              <Progress value={onboardingProgress} className="h-2 bg-white/20" />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex overflow-x-auto overflow-y-hidden h-auto gap-1 w-full scrollbar-thin">
          <TabsTrigger value="dashboard" className="shrink-0" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="personal" className="shrink-0" data-testid="tab-personal">Personal Details</TabsTrigger>
          <TabsTrigger value="documents" className="shrink-0" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="forms" className="shrink-0" data-testid="tab-forms">Statutory Forms</TabsTrigger>
          <TabsTrigger value="payslips" className="shrink-0" data-testid="tab-payslips">Payslips</TabsTrigger>
          <TabsTrigger value="tax" className="shrink-0" data-testid="tab-tax">Tax Declaration</TabsTrigger>
          <TabsTrigger value="assets" className="shrink-0" data-testid="tab-assets">My Assets</TabsTrigger>
          <TabsTrigger value="insurance" className="shrink-0" data-testid="tab-insurance">Insurance</TabsTrigger>
          <TabsTrigger value="loans" className="shrink-0" data-testid="tab-loans">Loans</TabsTrigger>
          <TabsTrigger value="expenses" className="shrink-0" data-testid="tab-expenses">Expenses</TabsTrigger>
          <TabsTrigger value="team" className="shrink-0" data-testid="tab-team">My Team</TabsTrigger>
          <TabsTrigger value="policies" className="shrink-0" data-testid="tab-policies">Policies</TabsTrigger>
          <TabsTrigger value="exit" className="shrink-0" data-testid="tab-exit">Exit</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {currentEmployee && !currentEmployee.attendanceExempt && (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-muted-foreground">
                    {todayLog?.checkIn
                      ? `Checked in at ${format(new Date(todayLog.checkIn), 'hh:mm a')}${todayLog.checkOut ? ` · Out at ${format(new Date(todayLog.checkOut), 'hh:mm a')}` : ''}`
                      : 'You have not checked in today'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cake className="w-5 h-5 text-pink-500" />
                      Upcoming Birthdays
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={upcomingBirthdays.length > 4 ? "max-h-[280px] overflow-y-auto" : ""}>
                      <div className="space-y-2">
                        {upcomingBirthdays.map((person, idx) => (
                          <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-lg ${person.isToday ? 'bg-gradient-to-r from-pink-50 to-yellow-50 dark:from-pink-900/20 dark:to-yellow-900/20 border border-pink-200 dark:border-pink-800' : 'bg-muted/50'}`} data-testid={`birthday-row-${person.id}`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${person.isToday ? 'bg-pink-200 dark:bg-pink-800' : 'bg-pink-100 dark:bg-pink-900/30'}`}>
                              {person.isToday ? <PartyPopper className="w-4 h-4 text-pink-600 dark:text-pink-400" /> : <Gift className="w-4 h-4 text-pink-600 dark:text-pink-400" />}
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
                              {person.department && <p className="text-xs text-muted-foreground truncate">{person.department}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {person.isToday ? <Badge className="bg-pink-500 text-white text-[10px] px-1.5 py-0">Today!</Badge> : <Badge variant="outline" className="text-[10px] whitespace-nowrap">{person.date}</Badge>}
                              {currentEmployee && person.id !== currentEmployee.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-pink-600 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-900/30"
                                  data-testid={`greet-btn-${person.id}`}
                                  onClick={() => {
                                    setGreetTarget({ id: person.id, name: person.name });
                                    setGreetType("birthday");
                                    setShowGreetDialog(true);
                                  }}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {upcomingBirthdays.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No upcoming birthdays</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Work Anniversaries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={workAnniversaries.length > 4 ? "max-h-[280px] overflow-y-auto" : ""}>
                      <div className="space-y-2">
                        {workAnniversaries.map((person, idx) => (
                          <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-lg ${person.isToday ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800' : 'bg-muted/50'}`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${person.isToday ? 'bg-amber-200 dark:bg-amber-800' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                              <PartyPopper className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {person.years} {person.years === 1 ? 'yr' : 'yrs'}{person.department ? ` - ${person.department}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {person.isToday ? <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">Today!</Badge> : <Badge variant="outline" className="text-[10px] whitespace-nowrap">{person.date}</Badge>}
                              {currentEmployee && person.id !== currentEmployee.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30"
                                  data-testid={`greet-anniversary-btn-${person.id}`}
                                  onClick={() => {
                                    setGreetTarget({ id: person.id, name: person.name });
                                    setGreetType("anniversary");
                                    setShowGreetDialog(true);
                                  }}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {workAnniversaries.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No upcoming anniversaries</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Onboarding Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const eduDocTypes = ["10th_marksheet", "12th_marksheet", "graduation_degree", "post_graduation", "professional_cert", "education"];
                      const empDocTypes = ["prev_offer_letter", "relieving_letter", "experience", "salary_slips", "form16"];
                      const hasEduDocs = myDocuments?.some(d => eduDocTypes.includes(d.documentType || ""));
                      const hasEmpDocs = myDocuments?.some(d => empDocTypes.includes(d.documentType || ""));

                      const getTaskStatus = (taskName: string) => {
                        if (onboardingTasksData && onboardingTasksData.length > 0) {
                          const match = onboardingTasksData.find(t =>
                            t.taskName.toLowerCase().includes(taskName.toLowerCase())
                          );
                          if (match) return match.status || "pending";
                        }
                        return "pending";
                      };

                      const checklistItems = [
                        {
                          task: "Upload Education Documents",
                          status: hasEduDocs ? "completed" : getTaskStatus("education"),
                          action: () => setActiveTab("documents"),
                        },
                        {
                          task: "Upload Previous Employment Documents",
                          status: hasEmpDocs ? "completed" : getTaskStatus("employment"),
                          action: () => setActiveTab("documents"),
                        },
                        {
                          task: "Submit PF Nomination Form",
                          status: getTaskStatus("pf nomination"),
                          action: () => setActiveTab("forms"),
                        },
                        {
                          task: "Submit Gratuity Nomination Form",
                          status: getTaskStatus("gratuity"),
                          action: () => setActiveTab("forms"),
                        },
                        {
                          task: "Complete Tax Declaration",
                          status: getTaskStatus("tax"),
                          action: () => setActiveTab("tax"),
                        },
                        {
                          task: "Acknowledge Company Policies",
                          status: getTaskStatus("policies"),
                          action: () => setActiveTab("policies"),
                        },
                      ];

                      return checklistItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-2">
                          <div className="flex items-center gap-3">
                            {item.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-yellow-600" />
                            )}
                            <span className={`text-sm font-medium ${item.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {item.task}
                            </span>
                          </div>
                          {item.status !== 'completed' && item.action && (
                            <Button size="sm" variant="outline" onClick={item.action} data-testid={`button-onboarding-${idx}`}>
                              Complete
                            </Button>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Holidays {new Date().getFullYear()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={allYearHolidays.length > 5 ? "max-h-[280px] overflow-y-auto" : ""}>
                      <div className="space-y-2">
                        {allYearHolidays.length > 0 ? allYearHolidays.map((holiday: any, idx) => {
                          const isPast = new Date(holiday.date) < new Date();
                          return (
                            <div key={idx} className={`flex items-center justify-between p-2 rounded-lg ${isPast ? 'bg-muted/30 opacity-60' : 'bg-muted/50'}`}>
                              <div>
                                <p className="text-sm font-medium text-foreground">{holiday.name}</p>
                                <p className="text-xs text-muted-foreground">{holiday.type || 'National'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{format(new Date(holiday.date), "MMM dd")}</Badge>
                                {isPast && <Badge variant="secondary" className="text-[10px]">Passed</Badge>}
                              </div>
                            </div>
                          );
                        }) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No holidays added for this year</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" />
                      Recent Announcements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {announcements && announcements.length > 0 ? (
                      <div className="space-y-3">
                        {announcements.slice(0, 3).map((ann) => (
                          <div key={ann.id} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-medium text-foreground">{ann.title}</p>
                              <Badge className={`text-[10px] shrink-0 ${
                                ann.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                ann.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {ann.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{ann.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {ann.publishedAt ? format(new Date(ann.publishedAt), "MMM dd, yyyy") : "Draft"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4 text-sm">No announcements</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="border-purple-200/50 dark:border-purple-800/50 sticky top-4">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-t-lg pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    Chatter Notifications
                    {(birthdayWishes || []).length > 0 && (
                      <Badge className="bg-purple-500 text-white ml-auto text-[10px]">{(birthdayWishes || []).length}</Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-1 mt-2">
                    {[
                      { value: "all" as const, label: "All" },
                      { value: "birthday" as const, label: "Birthdays" },
                      { value: "anniversary" as const, label: "Anniversaries" },
                      { value: "new_joiner" as const, label: "New Joiners" },
                    ].map(tab => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setChatterFilter(tab.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${chatterFilter === tab.value ? 'bg-purple-500 text-white shadow-sm' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                        data-testid={`chatter-filter-${tab.value}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="pt-3 px-3">
                  {myWishes.length > 0 && (
                    <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 border border-purple-200 dark:border-purple-800">
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                        <PartyPopper className="w-3.5 h-3.5" />
                        Wishes for You ({myWishes.length})
                      </p>
                      <div className="space-y-2">
                        {myWishes.slice(0, 3).map((wish: any) => {
                          const bannerIcons: Record<string, string> = {
                            confetti: "🎊", balloons: "🎈", cake: "🎂", stars: "⭐", hearts: "❤️", simple: "🎁",
                          };
                          return (
                            <div key={wish.id} className="flex items-start gap-2" data-testid={`wish-card-${wish.id}`}>
                              <span className="text-sm shrink-0">{bannerIcons[wish.bannerType] || "🎊"}</span>
                              <div className="min-w-0">
                                <p className="text-xs"><span className="font-semibold">{wish.fromName}</span></p>
                                <p className="text-xs text-foreground/70 line-clamp-2">{wish.message}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2.5 pr-2">
                      {chatterFilter === "new_joiner" ? (() => {
                        const newJoinerAnnouncements = (announcements || []).filter((a: any) => a.type === "new_joiner" && a.isActive);
                        if (newJoinerAnnouncements.length === 0) return (
                          <div className="text-center py-12">
                            <UserPlus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No new joiner announcements</p>
                          </div>
                        );
                        return newJoinerAnnouncements.map((ann: any) => (
                          <div key={ann.id} className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800" data-testid={`new-joiner-${ann.id}`}>
                            <div className="flex items-start gap-3">
                              {ann.imageUrl ? (
                                <img src={ann.imageUrl} alt={ann.title} className="w-12 h-12 rounded-full object-cover border-2 border-green-200 shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                  <UserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">{ann.title}</span>
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[9px]">New Joiner</Badge>
                                </div>
                                <p className="text-xs text-foreground/70 mt-1 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                                <p className="text-[10px] text-muted-foreground/70 mt-1">
                                  {ann.publishedAt ? format(new Date(ann.publishedAt), "MMM dd, yyyy") : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        ));
                      })() : (() => {
                        const filtered = (birthdayWishes || []).filter((w: any) => {
                          if (chatterFilter === "all") return true;
                          return (w.type || "birthday") === chatterFilter;
                        });
                        if (filtered.length === 0) return (
                          <div className="text-center py-12">
                            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No messages yet</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Be the first to greet someone!</p>
                          </div>
                        );
                        return filtered.map((wish: any) => {
                          const bannerEmojis: Record<string, string> = {
                            confetti: "🎊", balloons: "🎈", cake: "🎂", stars: "⭐", hearts: "❤️", simple: "🎁",
                          };
                          const renderMessageWithMentions = (msg: string) => {
                            const parts = msg.split(/(@\w[\w\s]*?\w(?=\s|$|@)|@\w+)/g);
                            return parts.map((part, i) => {
                              if (part.startsWith("@")) {
                                return <span key={i} className="text-blue-600 dark:text-blue-400 font-semibold">{part}</span>;
                              }
                              return <span key={i}>{part}</span>;
                            });
                          };
                          const wishType = wish.type || "birthday";
                          return (
                            <div key={wish.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-border/80 transition-colors" data-testid={`wall-wish-${wish.id}`}>
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center shrink-0 text-sm">
                                  {bannerEmojis[wish.bannerType] || "🎊"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-foreground">{wish.fromName}</span>
                                    <span className="text-[10px] text-muted-foreground">→</span>
                                    <span className="text-xs font-semibold text-foreground">{wish.toName}</span>
                                    <Badge variant="outline" className={`text-[9px] px-1 py-0 leading-tight ${wishType === "anniversary" ? "border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400" : "border-pink-300 text-pink-600 dark:border-pink-700 dark:text-pink-400"}`}>
                                      {wishType === "anniversary" ? "Anniversary" : "Birthday"}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{renderMessageWithMentions(wish.message)}</p>
                                  {wish.taggedNames && wish.taggedNames.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {wish.taggedNames.map((name: string, i: number) => (
                                        <span key={i} className="text-[10px] text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full">@{name}</span>
                                      ))}
                                    </div>
                                  )}
                                  <p className="text-[10px] text-muted-foreground/70 mt-1">{wish.createdAt ? format(new Date(wish.createdAt), "MMM dd, h:mm a") : ""}</p>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Education Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {educationDocDefs.map((docDef) => {
                    const status = getDocStatus(docDef.docType);
                    const existingDoc = getDocFile(docDef.docType);
                    return (
                      <div key={docDef.docType} className="p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{docDef.name}</span>
                            {docDef.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                          </div>
                          <Badge className={getStatusColor(status)}>{status === "not_uploaded" ? "Not Uploaded" : status}</Badge>
                        </div>
                        {existingDoc && (
                          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>{existingDoc.documentName || existingDoc.filePath}</span>
                            {existingDoc.fileData && (
                              <Button variant="ghost" size="sm" className="h-6 px-2" data-testid={`button-download-edu-${docDef.docType}`}
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `data:${existingDoc.mimeType || 'application/octet-stream'};base64,${existingDoc.fileData}`;
                                  link.download = existingDoc.documentName || existingDoc.filePath || 'document';
                                  link.click();
                                }}>
                                <Download className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Input type="file" className="text-sm" accept=".pdf,.jpg,.jpeg,.png" data-testid={`input-file-edu-${docDef.docType}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDocUpload(file, docDef.docType, docDef.name);
                              e.target.value = '';
                            }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Previous Employment Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employmentDocDefs.map((docDef) => {
                    const status = getDocStatus(docDef.docType);
                    const existingDoc = getDocFile(docDef.docType);
                    return (
                      <div key={docDef.docType} className="p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{docDef.name}</span>
                            {docDef.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                          </div>
                          <Badge className={getStatusColor(status)}>{status === "not_uploaded" ? "Not Uploaded" : status}</Badge>
                        </div>
                        {existingDoc && (
                          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>{existingDoc.documentName || existingDoc.filePath}</span>
                            {existingDoc.fileData && (
                              <Button variant="ghost" size="sm" className="h-6 px-2" data-testid={`button-download-emp-${docDef.docType}`}
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `data:${existingDoc.mimeType || 'application/octet-stream'};base64,${existingDoc.fileData}`;
                                  link.download = existingDoc.documentName || existingDoc.filePath || 'document';
                                  link.click();
                                }}>
                                <Download className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Input type="file" className="text-sm" accept=".pdf,.jpg,.jpeg,.png" data-testid={`input-file-emp-${docDef.docType}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDocUpload(file, docDef.docType, docDef.name);
                              e.target.value = '';
                            }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                ID & Address Proof Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {idDocDefs.map((docDef) => {
                  const status = getDocStatus(docDef.docType);
                  const existingDoc = getDocFile(docDef.docType);
                  return (
                    <div key={docDef.docType} className="p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-foreground">{docDef.name}</span>
                        <Badge className={getStatusColor(status)}>{status === "not_uploaded" ? "Not Uploaded" : status}</Badge>
                      </div>
                      {existingDoc && (
                        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="truncate">{existingDoc.documentName || existingDoc.filePath}</span>
                          {existingDoc.fileData && (
                            <Button variant="ghost" size="sm" className="h-6 px-2" data-testid={`button-download-id-${docDef.docType}`}
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `data:${existingDoc.mimeType || 'application/octet-stream'};base64,${existingDoc.fileData}`;
                                link.download = existingDoc.documentName || existingDoc.filePath || 'document';
                                link.click();
                              }}>
                              <Download className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Input type="file" className="text-sm" accept=".pdf,.jpg,.jpeg,.png" data-testid={`input-file-id-${docDef.docType}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocUpload(file, docDef.docType, docDef.name);
                            e.target.value = '';
                          }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms">
          <div className="space-y-6">
            {statutoryForms.map((form) => (
              <Card key={form.id}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        form.status === 'submitted' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
                      }`}>
                        <Shield className={`w-5 h-5 ${form.status === 'submitted' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{form.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{form.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {form.required && <Badge variant="destructive">Required</Badge>}
                      <Badge className={getStatusColor(form.status)}>{form.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {form.name.includes("PF Nomination") && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label>Nominee Name</Label><Input placeholder="Enter nominee full name" data-testid="input-pf-nominee-name" /></div>
                        <div>
                          <Label>Relationship</Label>
                          <Select><SelectTrigger data-testid="select-pf-relationship"><SelectValue placeholder="Select relationship" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="spouse">Spouse</SelectItem><SelectItem value="father">Father</SelectItem>
                              <SelectItem value="mother">Mother</SelectItem><SelectItem value="son">Son</SelectItem><SelectItem value="daughter">Daughter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label>Nominee Date of Birth</Label><Input type="date" data-testid="input-pf-nominee-dob" /></div>
                        <div><Label>Share Percentage</Label><Input type="number" placeholder="100" max={100} data-testid="input-pf-share" /></div>
                        <div className="md:col-span-2"><Label>Nominee Address</Label><Input placeholder="Enter complete address" data-testid="input-pf-nominee-address" /></div>
                      </div>
                      <Button className="w-full" data-testid="button-submit-pf-form"><CheckCircle2 className="w-4 h-4 mr-2" />Submit PF Nomination Form</Button>
                    </div>
                  )}
                  {form.name.includes("Gratuity") && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label>Nominee Name</Label><Input placeholder="Enter nominee full name" data-testid="input-gratuity-nominee-name" /></div>
                        <div>
                          <Label>Relationship</Label>
                          <Select><SelectTrigger data-testid="select-gratuity-relationship"><SelectValue placeholder="Select relationship" /></SelectTrigger>
                            <SelectContent><SelectItem value="spouse">Spouse</SelectItem><SelectItem value="father">Father</SelectItem><SelectItem value="mother">Mother</SelectItem><SelectItem value="son">Son</SelectItem><SelectItem value="daughter">Daughter</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div><Label>Nominee Age</Label><Input type="number" placeholder="Enter age" data-testid="input-gratuity-age" /></div>
                        <div><Label>Share Percentage</Label><Input type="number" placeholder="100" max={100} data-testid="input-gratuity-share" /></div>
                        <div className="md:col-span-2"><Label>Nominee Address</Label><Input placeholder="Enter complete address" data-testid="input-gratuity-address" /></div>
                      </div>
                      <Button className="w-full" data-testid="button-submit-gratuity-form"><CheckCircle2 className="w-4 h-4 mr-2" />Submit Gratuity Nomination Form</Button>
                    </div>
                  )}
                  {form.name.includes("Form 11") && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label>Previous PF Account Number</Label><Input placeholder="Enter previous PF number (if any)" data-testid="input-prev-pf" /></div>
                        <div><Label>UAN (Universal Account Number)</Label><Input placeholder="Enter UAN if available" data-testid="input-uan" /></div>
                        <div><Label>Date of Exit from Previous Employer</Label><Input type="date" data-testid="input-exit-date" /></div>
                        <div><Label>Scheme Certificate Number (if any)</Label><Input placeholder="Enter certificate number" data-testid="input-scheme-cert" /></div>
                      </div>
                      <Button className="w-full" data-testid="button-submit-form11"><CheckCircle2 className="w-4 h-4 mr-2" />Submit Form 11 Declaration</Button>
                    </div>
                  )}
                  {form.name.includes("ESI") && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label>Family Member Name</Label><Input placeholder="Enter family member name" /></div>
                        <div><Label>Relationship</Label><Select><SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger><SelectContent><SelectItem value="spouse">Spouse</SelectItem><SelectItem value="father">Father</SelectItem><SelectItem value="mother">Mother</SelectItem><SelectItem value="son">Son</SelectItem><SelectItem value="daughter">Daughter</SelectItem></SelectContent></Select></div>
                        <div><Label>Bank Account Number</Label><Input placeholder="Enter bank account number" /></div>
                        <div><Label>IFSC Code</Label><Input placeholder="Enter IFSC code" /></div>
                      </div>
                      <Button className="w-full"><CheckCircle2 className="w-4 h-4 mr-2" />Submit ESI Form</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payslips">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  My Payslips
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!sortedPayroll || sortedPayroll.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No payslips available</p>
                    <p className="text-sm">Your payslips will appear here once payroll is processed.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedPayroll.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid={`payslip-row-${record.id}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{getMonthName(record.month)} {record.year}</p>
                            <p className="text-sm text-muted-foreground">Net: Rs. {formatCurrency(record.netSalary)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(record.status || "pending")}>{record.status}</Badge>
                          <Button size="icon" variant="ghost" onClick={() => setViewPayslip(record)} data-testid={`button-view-payslip-${record.id}`}>
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-primary" />
                  Latest Salary Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestPayroll ? (
                  <div className="space-y-4">
                    <div className="text-xs text-muted-foreground mb-2">{getMonthName(latestPayroll.month)} {latestPayroll.year}</div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Earnings</p>
                      <div className="space-y-2">
                        {Number(latestPayroll.basicSalary) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">Basic</span><span className="font-medium text-foreground text-sm">Rs. {formatCurrency(latestPayroll.basicSalary)}</span></div>}
                        {Number(latestPayroll.hra) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">HRA</span><span className="font-medium text-foreground text-sm">Rs. {formatCurrency(latestPayroll.hra)}</span></div>}
                        {Number(latestPayroll.da) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">DA</span><span className="font-medium text-foreground text-sm">Rs. {formatCurrency(latestPayroll.da)}</span></div>}
                        {Number(latestPayroll.conveyance) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">Conveyance</span><span className="font-medium text-foreground text-sm">Rs. {formatCurrency(latestPayroll.conveyance)}</span></div>}
                        {Number(latestPayroll.communicationAllowance) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">Communication</span><span className="font-medium text-foreground text-sm">Rs. {formatCurrency(latestPayroll.communicationAllowance)}</span></div>}
                        {Number(latestPayroll.medicalAllowance) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">Medical</span><span className="font-medium text-foreground text-sm">Rs. {formatCurrency(latestPayroll.medicalAllowance)}</span></div>}
                        {Number(latestPayroll.variablePay) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">Variable Pay</span><span className="font-medium text-foreground text-sm">Rs. {formatCurrency(latestPayroll.variablePay)}</span></div>}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Deductions</p>
                      <div className="space-y-2">
                        {Number(latestPayroll.epf) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">EPF</span><span className="font-medium text-red-600 text-sm">- Rs. {formatCurrency(latestPayroll.epf)}</span></div>}
                        {Number(latestPayroll.insurancePremium) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">Insurance</span><span className="font-medium text-red-600 text-sm">- Rs. {formatCurrency(latestPayroll.insurancePremium)}</span></div>}
                        {Number(latestPayroll.advance) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">Advance/Loan</span><span className="font-medium text-red-600 text-sm">- Rs. {formatCurrency(latestPayroll.advance)}</span></div>}
                        {Number(latestPayroll.otherDeductions) > 0 && <div className="flex justify-between"><span className="text-foreground text-sm">Other</span><span className="font-medium text-red-600 text-sm">- Rs. {formatCurrency(latestPayroll.otherDeductions)}</span></div>}
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span className="text-foreground">Gross Salary</span>
                      <span className="text-foreground">Rs. {formatCurrency(latestPayroll.grossSalary)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-foreground">Net Salary</span>
                      <span className="text-green-600">Rs. {formatCurrency(latestPayroll.netSalary)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No salary data available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-primary" />
                  Tax Regime Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Choose your preferred tax regime for the current financial year. The <strong>Old Regime</strong> allows deductions under sections 80C, 80D, HRA, etc. The <strong>New Regime</strong> offers lower tax rates but most deductions are not available.
                    </p>
                  </div>

                  <RadioGroup
                    value={currentEmployee?.taxRegime || undefined}
                    onValueChange={(value) => taxRegimeMutation.mutate(value)}
                    disabled={taxRegimeMutation.isPending || (myTaxDeclarations?.some(d => d.status === "approved" || d.status === "submitted") || false)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    data-testid="radio-tax-regime"
                  >
                    <label
                      className={`flex items-start gap-3 p-4 rounded-md border-2 cursor-pointer transition-colors ${
                        currentEmployee?.taxRegime === "old_regime"
                          ? "border-primary bg-primary/5"
                          : "border-border hover-elevate"
                      }`}
                    >
                      <RadioGroupItem value="old_regime" data-testid="radio-old-regime" className="mt-1" />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Old Tax Regime</p>
                        <p className="text-sm text-muted-foreground mt-1">Claim deductions under 80C, 80D, HRA, 80G, etc. Ideal if you have significant investments and home loan.</p>
                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs">
                          <span className="font-medium text-green-700 dark:text-green-400">Standard Deduction: Rs. 50,000</span>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xs font-medium text-foreground">Tax Slabs (FY 2025-26):</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Up to 2.5L</span><span>Nil</span>
                            <span>2.5L - 5L</span><span>5%</span>
                            <span>5L - 10L</span><span>20%</span>
                            <span>Above 10L</span><span>30%</span>
                          </div>
                        </div>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-3 p-4 rounded-md border-2 cursor-pointer transition-colors ${
                        currentEmployee?.taxRegime === "new_regime"
                          ? "border-primary bg-primary/5"
                          : "border-border hover-elevate"
                      }`}
                    >
                      <RadioGroupItem value="new_regime" data-testid="radio-new-regime" className="mt-1" />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">New Tax Regime</p>
                        <p className="text-sm text-muted-foreground mt-1">Lower tax rates with simplified filing. Most deductions and exemptions are not available.</p>
                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs">
                          <span className="font-medium text-green-700 dark:text-green-400">Standard Deduction: Rs. 75,000</span>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xs font-medium text-foreground">Tax Slabs (FY 2025-26):</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Up to 4L</span><span>Nil</span>
                            <span>4L - 8L</span><span>5%</span>
                            <span>8L - 12L</span><span>10%</span>
                            <span>12L - 16L</span><span>15%</span>
                            <span>16L - 20L</span><span>20%</span>
                            <span>20L - 24L</span><span>25%</span>
                            <span>Above 24L</span><span>30%</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  </RadioGroup>

                  {currentEmployee?.taxRegime && (
                    <div className={`flex items-center gap-2 p-3 rounded-md ${myTaxDeclarations?.some(d => d.status === "approved" || d.status === "submitted") ? "bg-blue-50 dark:bg-blue-950/30" : "bg-green-50 dark:bg-green-950/30"}`}>
                      {myTaxDeclarations?.some(d => d.status === "approved" || d.status === "submitted") ? (
                        <>
                          <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Your tax regime is locked to <strong>{currentEmployee.taxRegime === "old_regime" ? "Old" : "New"} Tax Regime</strong> because you have declarations that are submitted or approved. Contact the finance team if you need to make changes.
                          </p>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                          <p className="text-sm text-green-700 dark:text-green-300">
                            You have selected the <strong>{currentEmployee.taxRegime === "old_regime" ? "Old" : "New"} Tax Regime</strong> for the current financial year.
                            {" "}You may switch your regime once per financial year during the calculation period (April-January). Contact finance team for any changes.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {!currentEmployee?.taxRegime && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-md">
                      <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        You have not selected a tax regime yet. Please choose your preferred regime above.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {employeeCTC > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Tax Comparison - Old vs New Regime
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Based on your annual CTC of <strong>Rs. {employeeCTC.toLocaleString()}</strong> and declared deductions, here is a comparison of tax liability under both regimes. <strong>All amounts are subject to verification</strong> and final amounts will be determined after finance approval.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-md border-2 ${betterRegime === "Old" ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-border"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground">Old Regime</h4>
                          {betterRegime === "Old" && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Recommended</Badge>}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gross Income (CTC)</span>
                            <span className="font-medium text-foreground">Rs. {employeeCTC.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Standard Deduction (Old Regime)</span>
                            <span className="font-medium text-green-600">- Rs. {oldStandardDeduction.toLocaleString()}</span>
                          </div>
                          {payrollProfTaxForTax > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Professional Tax [16(iii)]</span>
                              <span className="font-medium text-green-600">- Rs. {payrollProfTaxForTax.toLocaleString()}</span>
                            </div>
                          )}
                          {payroll80CTotal > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">PF/ESI (Annual from Salary Structure)</span>
                              <span className="font-medium text-green-600">- Rs. {payroll80CTotal.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Chapter VI-A Deductions</span>
                            <span className="font-medium text-green-600">- Rs. {taxDeclarations.reduce((sum, d) => sum + d.declared, 0).toLocaleString()}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Taxable Income</span>
                            <span className="font-semibold text-foreground">Rs. {oldTaxableIncome.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Income Tax</span>
                            <span className="font-medium text-foreground">Rs. {Math.round(oldRegimeTax).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Health & Education Cess (4%)</span>
                            <span className="font-medium text-foreground">Rs. {Math.round(oldRegimeTax * 0.04).toLocaleString()}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between pt-1">
                            <span className="font-semibold text-foreground">Total Tax Payable</span>
                            <span className="font-bold text-lg text-red-600">Rs. {Math.round(oldTaxWithCess).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Monthly Tax</span>
                            <span className="font-medium text-foreground">Rs. {Math.round(oldTaxWithCess / 12).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 rounded-md border-2 ${betterRegime === "New" ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-border"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground">New Regime</h4>
                          {betterRegime === "New" && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Recommended</Badge>}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gross Income (CTC)</span>
                            <span className="font-medium text-foreground">Rs. {employeeCTC.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Standard Deduction (New Regime)</span>
                            <span className="font-medium text-green-600">- Rs. {newStandardDeduction.toLocaleString()}</span>
                          </div>
                          {payrollProfTaxForTax > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Professional Tax [16(iii)]</span>
                              <span className="font-medium text-green-600">- Rs. {payrollProfTaxForTax.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Chapter VI-A Deductions</span>
                            <span className="font-medium text-muted-foreground">Not Applicable</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Taxable Income</span>
                            <span className="font-semibold text-foreground">Rs. {newTaxableIncome.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Income Tax</span>
                            <span className="font-medium text-foreground">Rs. {Math.round(newRegimeTax).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Health & Education Cess (4%)</span>
                            <span className="font-medium text-foreground">Rs. {Math.round(newRegimeTax * 0.04).toLocaleString()}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between pt-1">
                            <span className="font-semibold text-foreground">Total Tax Payable</span>
                            <span className="font-bold text-lg text-red-600">Rs. {Math.round(newTaxWithCess).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Monthly Tax</span>
                            <span className="font-medium text-foreground">Rs. {Math.round(newTaxWithCess / 12).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-md ${betterRegime === "Old" ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-primary" />
                        <p className="font-semibold text-foreground">Tax Savings Summary</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        The <strong>{betterRegime} Regime</strong> saves you <strong className="text-green-600">Rs. {Math.round(taxSavings).toLocaleString()}</strong> annually
                        (Rs. {Math.round(taxSavings / 12).toLocaleString()}/month) compared to the {betterRegime === "Old" ? "New" : "Old"} Regime.
                        {betterRegime === "Old" && " This is after considering your declared deductions under 80C, 80D, HRA and other sections."}
                        {betterRegime === "New" && " Even without deductions, the lower slab rates under the New Regime result in less tax for your income level."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentEmployee?.taxRegime === "old_regime" && (
              <>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">Total Tax Saving Deductions (FY 2025-26)</p>
                    <p className="text-xs text-muted-foreground">Declared + Auto-captured from Payroll under Old Regime</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      Rs. {(manualDeclarationsExPf + payroll80CTotal + payrollProfTaxForTax).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {myTaxDeclarations?.length || 0} declarations + {payrollDeductions?.deductions?.filter(d => d.section !== "ESI")?.length || 0} auto-captured
                    </p>
                  </div>
                </div>

                {(payrollDeductions?.deductions?.length || 0) > 0 && (
                  <Card data-testid="card-payroll-auto-captured">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="w-5 h-5 text-blue-600" />
                        Annual Deductions (Salary Structure)
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        These deductions are projected annually based on your salary structure
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="border rounded-md overflow-hidden">
                        <div className="grid grid-cols-[1fr_80px_80px_120px] gap-0 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-xs font-medium border-b">
                          <span>Component</span>
                          <span className="text-center">Section</span>
                          <span className="text-center">Tax Saving</span>
                          <span className="text-right">Annual Amount</span>
                        </div>
                        {payrollDeductions?.deductions.map(ded => {
                          const isDeductible = ded.taxDeductible !== false;
                          return (
                            <div key={ded.id} className="grid grid-cols-[1fr_80px_80px_120px] gap-0 px-3 py-2.5 text-sm border-b last:border-0 items-center" data-testid={`payroll-ded-row-${ded.id}`}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{ded.investmentType}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">Payroll</Badge>
                              </div>
                              <span className="text-center text-xs text-muted-foreground">{ded.section}</span>
                              <span className={`text-center text-xs font-medium ${isDeductible ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {isDeductible ? 'Yes' : 'Info only'}
                              </span>
                              <span className="text-right font-medium text-blue-700 dark:text-blue-400">Rs. {parseFloat(ded.amount).toLocaleString()}</span>
                            </div>
                          );
                        })}
                        <div className="grid grid-cols-[1fr_80px_80px_120px] gap-0 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 font-semibold text-sm border-t">
                          <span className="text-foreground">Total Tax Saving (Annual Projection)</span>
                          <span></span>
                          <span></span>
                          <span className="text-right text-blue-700 dark:text-blue-400">
                            Rs. {(payroll80CTotal + payrollProfTaxForTax).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {payrollDeductions?.monthlyBreakdown && payrollDeductions.monthlyBreakdown.length > 0 && (
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" data-testid="toggle-monthly-breakdown">
                            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                            View monthly breakdown
                          </summary>
                          <div className="mt-2 border rounded-md overflow-hidden">
                            <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-0 bg-muted/50 px-3 py-1.5 text-[10px] font-medium border-b">
                              <span>Month</span>
                              <span className="text-right">EPF</span>
                              <span className="text-right">Prof. Tax</span>
                              <span className="text-right">ESI</span>
                            </div>
                            {payrollDeductions.monthlyBreakdown.map((mb: any, idx: number) => (
                              <div key={idx} className="grid grid-cols-[80px_1fr_1fr_1fr] gap-0 px-3 py-1.5 text-xs border-b last:border-0">
                                <span className="text-muted-foreground">{["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(mb.month)]} {mb.year}</span>
                                <span className="text-right font-medium">{mb.epf > 0 ? `Rs. ${mb.epf.toLocaleString()}` : '-'}</span>
                                <span className="text-right font-medium">{mb.professionalTax > 0 ? `Rs. ${mb.professionalTax.toLocaleString()}` : '-'}</span>
                                <span className="text-right font-medium">{mb.esi > 0 ? `Rs. ${mb.esi.toLocaleString()}` : '-'}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Amounts shown are annual projections based on your salary structure. EPF contributions qualify under Section 80C (limit Rs. 1,50,000). Professional Tax is deductible under Section 16(iii). ESI is shown for reference only and is not tax deductible.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(myTaxDeclarations?.some(d => d.status === "approved") || myTaxDeclarations?.some(d => d.status === "rejected")) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Approved Deductions Summary
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Deductions approved by the finance team for FY 2025-26</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-lg font-bold text-green-700 dark:text-green-400">
                            Rs. {(myTaxDeclarations?.filter(d => d.status === "approved").reduce((s, d) => s + parseFloat(d.amount), 0) || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Approved</p>
                          <p className="text-xs text-muted-foreground">{myTaxDeclarations?.filter(d => d.status === "approved").length || 0} declarations</p>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                            Rs. {(myTaxDeclarations?.filter(d => d.status === "pending" || d.status === "submitted").reduce((s, d) => s + parseFloat(d.amount), 0) || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Pending Review</p>
                          <p className="text-xs text-muted-foreground">{myTaxDeclarations?.filter(d => d.status === "pending" || d.status === "submitted").length || 0} declarations</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                          <p className="text-lg font-bold text-red-700 dark:text-red-400">
                            Rs. {(myTaxDeclarations?.filter(d => d.status === "rejected").reduce((s, d) => s + parseFloat(d.amount), 0) || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">Rejected</p>
                          <p className="text-xs text-muted-foreground">{myTaxDeclarations?.filter(d => d.status === "rejected").length || 0} declarations</p>
                        </div>
                      </div>

                      {(myTaxDeclarations?.filter(d => d.status === "approved").length || 0) > 0 && (
                        <div className="border rounded-md overflow-hidden">
                          <div className="grid grid-cols-[1fr_100px_120px] gap-0 bg-green-50 dark:bg-green-950/20 px-3 py-2 text-xs font-medium border-b">
                            <span>Approved Investment</span>
                            <span className="text-center">Section</span>
                            <span className="text-right">Approved Amount</span>
                          </div>
                          {myTaxDeclarations?.filter(d => d.status === "approved").map(dec => (
                            <div key={dec.id} className="grid grid-cols-[1fr_100px_120px] gap-0 px-3 py-2 text-sm border-b last:border-0 items-center" data-testid={`approved-row-${dec.id}`}>
                              <div>
                                <span className="font-medium text-foreground">{dec.investmentType}</span>
                                {dec.reviewRemarks && (
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Remarks: {dec.reviewRemarks}</p>
                                )}
                              </div>
                              <span className="text-center text-xs text-muted-foreground">{normalizeSectionKey(dec.section)}</span>
                              <span className="text-right font-medium text-green-700 dark:text-green-400">Rs. {parseFloat(dec.amount).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="grid grid-cols-[1fr_100px_120px] gap-0 px-3 py-2 bg-green-50 dark:bg-green-950/20 font-semibold text-sm border-t">
                            <span className="text-foreground">Total Approved Deductions</span>
                            <span></span>
                            <span className="text-right text-green-700 dark:text-green-400">
                              Rs. {(myTaxDeclarations?.filter(d => d.status === "approved").reduce((s, d) => s + parseFloat(d.amount), 0) || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Only approved deductions will be considered for final tax computation. Standard deduction of Rs. {oldStandardDeduction.toLocaleString()} is applied automatically in addition to these.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Tabs value={activeSectionTab} onValueChange={setActiveSectionTab}>
                  <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                    <TabsTrigger value="investments" className="text-xs flex-1 min-w-[100px]" data-testid="tab-investments">Investments</TabsTrigger>
                    <TabsTrigger value="insurance" className="text-xs flex-1 min-w-[100px]" data-testid="tab-insurance">Insurance & Medical</TabsTrigger>
                    <TabsTrigger value="housing" className="text-xs flex-1 min-w-[100px]" data-testid="tab-housing">Housing</TabsTrigger>
                    <TabsTrigger value="nps_other" className="text-xs flex-1 min-w-[100px]" data-testid="tab-nps-other">NPS & Others</TabsTrigger>
                  </TabsList>

                  <TabsContent value="investments" className="space-y-4 mt-4">
                    {[
                      investmentSections.find(s => s.value === "80C")!,
                      investmentSections.find(s => s.value === "80G")!,
                      investmentSections.find(s => s.value === "80E")!,
                    ].map(section => {
                      const sectionDecs = getDeclarationsForSection(section.value);
                      const sectionTotal = sectionDecs.reduce((s, d) => s + parseFloat(d.amount), 0);
                      const isExpanded = expandedSection === section.value;
                      return (
                        <Card key={section.value} data-testid={`section-card-${section.value}`}>
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedSection(isExpanded ? null : section.value)}
                            data-testid={`section-header-${section.value}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">{section.label}</span>
                                {sectionDecs.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">{sectionDecs.length} declaration{sectionDecs.length > 1 ? 's' : ''}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  Declared: <span className="font-medium text-foreground">Rs. {sectionTotal.toLocaleString()}</span>
                                </span>
                                {section.limit > 0 && (
                                  <span className="text-xs text-muted-foreground">/ Limit: Rs. {section.limit.toLocaleString()}</span>
                                )}
                              </div>
                              {section.limit > 0 && (
                                <Progress value={Math.min((sectionTotal / section.limit) * 100, 100)} className="h-1.5 mt-2 w-60" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {sectionDecs.some(d => d.status === "pending") && <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>}
                              {sectionDecs.some(d => d.status === "approved") && <Badge className="bg-green-100 text-green-700 text-xs">Approved</Badge>}
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <CardContent className="pt-0 space-y-4">
                              <Separator />
                              {sectionDecs.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted Declarations</p>
                                  {sectionDecs.map((dec) => (
                                    <>
                                    <div key={dec.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border text-sm" data-testid={`declaration-item-${dec.id}`}>
                                      <div>
                                        <span className="font-medium text-foreground">{dec.investmentType}</span>
                                        {dec.otherDetails && <span className="text-xs text-muted-foreground ml-2">({dec.otherDetails})</span>}
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          Rs. {parseFloat(dec.amount).toLocaleString()}
                                          {dec.submittedAt && ` • ${format(new Date(dec.submittedAt), "dd MMM yyyy")}`}
                                        </p>
                                        {(dec.status === "approved" || dec.status === "rejected") && dec.reviewRemarks && (
                                          <p className={`text-xs mt-1 ${dec.status === "approved" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            <span className="font-medium">Remarks:</span> {dec.reviewRemarks}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className={
                                          dec.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                          dec.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                          dec.status === "submitted" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        }>{dec.status === "approved" ? "Approved" : dec.status === "rejected" ? "Rejected" : dec.status === "submitted" ? "Submitted" : "Pending"}</Badge>
                                        {dec.status === "pending" && (
                                          <>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => setEditingDeclaration({ id: dec.id, investmentType: dec.investmentType, amount: dec.amount, otherDetails: dec.otherDetails })} data-testid={`button-edit-${dec.id}`}>
                                              <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteDeclarationMutation.mutate(dec.id)} data-testid={`button-delete-${dec.id}`}>
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {editingDeclaration?.id === dec.id && (
                                      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-xs">Investment Type</Label>
                                            <Input className="h-8 text-sm" value={editingDeclaration.investmentType} onChange={(e) => setEditingDeclaration({ ...editingDeclaration, investmentType: e.target.value })} />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Amount (Rs.)</Label>
                                            <Input type="number" className="h-8 text-sm" value={editingDeclaration.amount} onChange={(e) => setEditingDeclaration({ ...editingDeclaration, amount: e.target.value })} />
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-7 text-xs" onClick={() => editDeclarationMutation.mutate({ id: editingDeclaration.id, data: { investmentType: editingDeclaration.investmentType, amount: editingDeclaration.amount, otherDetails: editingDeclaration.otherDetails } })} disabled={editDeclarationMutation.isPending}>
                                            {editDeclarationMutation.isPending ? "Saving..." : "Save"}
                                          </Button>
                                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingDeclaration(null)}>Cancel</Button>
                                        </div>
                                      </div>
                                    )}
                                    </>
                                  ))}
                                </div>
                              )}
                              <div className="p-4 bg-muted/20 rounded-lg border border-dashed">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Add New Declaration</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Investment Type</Label>
                                    <Select value={selectedSection === section.value ? selectedInvestmentType : ""} onValueChange={(val) => { setSelectedSection(section.value); setSelectedInvestmentType(val); if (val !== "Other") setOtherInvestmentDetail(""); }}>
                                      <SelectTrigger className="h-9 text-sm" data-testid={`select-type-${section.value}`}>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(investmentTypeOptions[section.value] || ["Other"]).map(type => (
                                          <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Amount (Rs.)</Label>
                                    <Input type="number" placeholder="Enter amount" className="h-9 text-sm" value={selectedSection === section.value ? declarationAmount : ""} onChange={(e) => { setSelectedSection(section.value); setDeclarationAmount(e.target.value); }} data-testid={`input-amount-${section.value}`} />
                                  </div>
                                  {selectedSection === section.value && selectedInvestmentType === "Other" && (
                                    <div className="sm:col-span-2">
                                      <Label className="text-xs">Specify Details</Label>
                                      <Input placeholder="Enter details" className="h-9 text-sm" value={otherInvestmentDetail} onChange={(e) => setOtherInvestmentDetail(e.target.value)} data-testid={`input-other-${section.value}`} />
                                    </div>
                                  )}
                                  <div className="sm:col-span-2">
                                    <Label className="text-xs">Upload Proof</Label>
                                    <Input type="file" className="h-9 text-sm" accept=".pdf,.jpg,.jpeg,.png" data-testid={`input-proof-${section.value}`} />
                                  </div>
                                </div>
                                <Button size="sm" className="mt-3 w-full" onClick={() => { setSelectedSection(section.value); handleSubmitDeclaration(); }} disabled={submitDeclarationMutation.isPending || selectedSection !== section.value || !selectedInvestmentType || !declarationAmount} data-testid={`button-submit-${section.value}`}>
                                  <Plus className="w-4 h-4 mr-1" />{submitDeclarationMutation.isPending && selectedSection === section.value ? "Submitting..." : "Add Declaration"}
                                </Button>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="insurance" className="space-y-4 mt-4">
                    {[
                      investmentSections.find(s => s.value === "80D")!,
                      investmentSections.find(s => s.value === "80U")!,
                      investmentSections.find(s => s.value === "80DD")!,
                      investmentSections.find(s => s.value === "80DDB")!,
                    ].map(section => {
                      const sectionDecs = getDeclarationsForSection(section.value);
                      const sectionTotal = sectionDecs.reduce((s, d) => s + parseFloat(d.amount), 0);
                      const isExpanded = expandedSection === section.value;
                      return (
                        <Card key={section.value} data-testid={`section-card-${section.value}`}>
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedSection(isExpanded ? null : section.value)}
                            data-testid={`section-header-${section.value}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">{section.label}</span>
                                {sectionDecs.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">{sectionDecs.length} declaration{sectionDecs.length > 1 ? 's' : ''}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  Declared: <span className="font-medium text-foreground">Rs. {sectionTotal.toLocaleString()}</span>
                                </span>
                                {section.limit > 0 && (
                                  <span className="text-xs text-muted-foreground">/ Limit: Rs. {section.limit.toLocaleString()}</span>
                                )}
                              </div>
                              {section.limit > 0 && (
                                <Progress value={Math.min((sectionTotal / section.limit) * 100, 100)} className="h-1.5 mt-2 w-60" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {sectionDecs.some(d => d.status === "pending") && <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>}
                              {sectionDecs.some(d => d.status === "approved") && <Badge className="bg-green-100 text-green-700 text-xs">Approved</Badge>}
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <CardContent className="pt-0 space-y-4">
                              <Separator />
                              {sectionDecs.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted Declarations</p>
                                  {sectionDecs.map((dec) => (
                                    <>
                                    <div key={dec.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border text-sm" data-testid={`declaration-item-${dec.id}`}>
                                      <div>
                                        <span className="font-medium text-foreground">{dec.investmentType}</span>
                                        {dec.otherDetails && <span className="text-xs text-muted-foreground ml-2">({dec.otherDetails})</span>}
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          Rs. {parseFloat(dec.amount).toLocaleString()}
                                          {dec.submittedAt && ` • ${format(new Date(dec.submittedAt), "dd MMM yyyy")}`}
                                        </p>
                                        {(dec.status === "approved" || dec.status === "rejected") && dec.reviewRemarks && (
                                          <p className={`text-xs mt-1 ${dec.status === "approved" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            <span className="font-medium">Remarks:</span> {dec.reviewRemarks}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className={
                                          dec.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                          dec.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                          dec.status === "submitted" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        }>{dec.status === "approved" ? "Approved" : dec.status === "rejected" ? "Rejected" : dec.status === "submitted" ? "Submitted" : "Pending"}</Badge>
                                        {dec.status === "pending" && (
                                          <>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => setEditingDeclaration({ id: dec.id, investmentType: dec.investmentType, amount: dec.amount, otherDetails: dec.otherDetails })} data-testid={`button-edit-${dec.id}`}>
                                              <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteDeclarationMutation.mutate(dec.id)} data-testid={`button-delete-${dec.id}`}>
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {editingDeclaration?.id === dec.id && (
                                      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-xs">Investment Type</Label>
                                            <Input className="h-8 text-sm" value={editingDeclaration.investmentType} onChange={(e) => setEditingDeclaration({ ...editingDeclaration, investmentType: e.target.value })} />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Amount (Rs.)</Label>
                                            <Input type="number" className="h-8 text-sm" value={editingDeclaration.amount} onChange={(e) => setEditingDeclaration({ ...editingDeclaration, amount: e.target.value })} />
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-7 text-xs" onClick={() => editDeclarationMutation.mutate({ id: editingDeclaration.id, data: { investmentType: editingDeclaration.investmentType, amount: editingDeclaration.amount, otherDetails: editingDeclaration.otherDetails } })} disabled={editDeclarationMutation.isPending}>
                                            {editDeclarationMutation.isPending ? "Saving..." : "Save"}
                                          </Button>
                                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingDeclaration(null)}>Cancel</Button>
                                        </div>
                                      </div>
                                    )}
                                    </>
                                  ))}
                                </div>
                              )}
                              <div className="p-4 bg-muted/20 rounded-lg border border-dashed">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Add New Declaration</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Type</Label>
                                    <Select value={selectedSection === section.value ? selectedInvestmentType : ""} onValueChange={(val) => { setSelectedSection(section.value); setSelectedInvestmentType(val); if (val !== "Other") setOtherInvestmentDetail(""); }}>
                                      <SelectTrigger className="h-9 text-sm" data-testid={`select-type-${section.value}`}>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(investmentTypeOptions[section.value] || ["Other"]).map(type => (
                                          <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Amount (Rs.)</Label>
                                    <Input type="number" placeholder="Enter amount" className="h-9 text-sm" value={selectedSection === section.value ? declarationAmount : ""} onChange={(e) => { setSelectedSection(section.value); setDeclarationAmount(e.target.value); }} data-testid={`input-amount-${section.value}`} />
                                  </div>
                                  {selectedSection === section.value && selectedInvestmentType === "Other" && (
                                    <div className="sm:col-span-2">
                                      <Label className="text-xs">Specify Details</Label>
                                      <Input placeholder="Enter details" className="h-9 text-sm" value={otherInvestmentDetail} onChange={(e) => setOtherInvestmentDetail(e.target.value)} data-testid={`input-other-${section.value}`} />
                                    </div>
                                  )}
                                  <div className="sm:col-span-2">
                                    <Label className="text-xs">Upload Proof</Label>
                                    <Input type="file" className="h-9 text-sm" accept=".pdf,.jpg,.jpeg,.png" data-testid={`input-proof-${section.value}`} />
                                  </div>
                                </div>
                                <Button size="sm" className="mt-3 w-full" onClick={() => { setSelectedSection(section.value); handleSubmitDeclaration(); }} disabled={submitDeclarationMutation.isPending || selectedSection !== section.value || !selectedInvestmentType || !declarationAmount} data-testid={`button-submit-${section.value}`}>
                                  <Plus className="w-4 h-4 mr-1" />{submitDeclarationMutation.isPending && selectedSection === section.value ? "Submitting..." : "Add Declaration"}
                                </Button>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="housing" className="space-y-4 mt-4">
                    {[
                      investmentSections.find(s => s.value === "HRA")!,
                      investmentSections.find(s => s.value === "80EE")!,
                      investmentSections.find(s => s.value === "24b")!,
                    ].map(section => {
                      const sectionDecs = getDeclarationsForSection(section.value);
                      const sectionTotal = sectionDecs.reduce((s, d) => s + parseFloat(d.amount), 0);
                      const isExpanded = expandedSection === section.value;
                      return (
                        <Card key={section.value} data-testid={`section-card-${section.value}`}>
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedSection(isExpanded ? null : section.value)}
                            data-testid={`section-header-${section.value}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">{section.label}</span>
                                {sectionDecs.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">{sectionDecs.length} declaration{sectionDecs.length > 1 ? 's' : ''}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  Declared: <span className="font-medium text-foreground">Rs. {sectionTotal.toLocaleString()}</span>
                                </span>
                                {section.limit > 0 && (
                                  <span className="text-xs text-muted-foreground">/ Limit: Rs. {section.limit.toLocaleString()}</span>
                                )}
                              </div>
                              {section.limit > 0 && (
                                <Progress value={Math.min((sectionTotal / section.limit) * 100, 100)} className="h-1.5 mt-2 w-60" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {sectionDecs.some(d => d.status === "pending") && <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>}
                              {sectionDecs.some(d => d.status === "approved") && <Badge className="bg-green-100 text-green-700 text-xs">Approved</Badge>}
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <CardContent className="pt-0 space-y-4">
                              <Separator />
                              {sectionDecs.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted Declarations</p>
                                  {sectionDecs.map((dec) => (
                                    <>
                                    <div key={dec.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border text-sm" data-testid={`declaration-item-${dec.id}`}>
                                      <div>
                                        <span className="font-medium text-foreground">{dec.investmentType}</span>
                                        {dec.otherDetails && <span className="text-xs text-muted-foreground ml-2">({dec.otherDetails})</span>}
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          Rs. {parseFloat(dec.amount).toLocaleString()}
                                          {dec.submittedAt && ` • ${format(new Date(dec.submittedAt), "dd MMM yyyy")}`}
                                        </p>
                                        {(dec.status === "approved" || dec.status === "rejected") && dec.reviewRemarks && (
                                          <p className={`text-xs mt-1 ${dec.status === "approved" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            <span className="font-medium">Remarks:</span> {dec.reviewRemarks}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className={
                                          dec.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                          dec.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                          dec.status === "submitted" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        }>{dec.status === "approved" ? "Approved" : dec.status === "rejected" ? "Rejected" : dec.status === "submitted" ? "Submitted" : "Pending"}</Badge>
                                        {dec.status === "pending" && (
                                          <>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => setEditingDeclaration({ id: dec.id, investmentType: dec.investmentType, amount: dec.amount, otherDetails: dec.otherDetails })} data-testid={`button-edit-${dec.id}`}>
                                              <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteDeclarationMutation.mutate(dec.id)} data-testid={`button-delete-${dec.id}`}>
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {editingDeclaration?.id === dec.id && (
                                      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-xs">Investment Type</Label>
                                            <Input className="h-8 text-sm" value={editingDeclaration.investmentType} onChange={(e) => setEditingDeclaration({ ...editingDeclaration, investmentType: e.target.value })} />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Amount (Rs.)</Label>
                                            <Input type="number" className="h-8 text-sm" value={editingDeclaration.amount} onChange={(e) => setEditingDeclaration({ ...editingDeclaration, amount: e.target.value })} />
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-7 text-xs" onClick={() => editDeclarationMutation.mutate({ id: editingDeclaration.id, data: { investmentType: editingDeclaration.investmentType, amount: editingDeclaration.amount, otherDetails: editingDeclaration.otherDetails } })} disabled={editDeclarationMutation.isPending}>
                                            {editDeclarationMutation.isPending ? "Saving..." : "Save"}
                                          </Button>
                                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingDeclaration(null)}>Cancel</Button>
                                        </div>
                                      </div>
                                    )}
                                    </>
                                  ))}
                                </div>
                              )}
                              <div className="p-4 bg-muted/20 rounded-lg border border-dashed">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Add New Declaration</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Type</Label>
                                    <Select value={selectedSection === section.value ? selectedInvestmentType : ""} onValueChange={(val) => { setSelectedSection(section.value); setSelectedInvestmentType(val); if (val !== "Other") setOtherInvestmentDetail(""); }}>
                                      <SelectTrigger className="h-9 text-sm" data-testid={`select-type-${section.value}`}>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(investmentTypeOptions[section.value] || ["Other"]).map(type => (
                                          <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Amount (Rs.)</Label>
                                    <Input type="number" placeholder="Enter amount" className="h-9 text-sm" value={selectedSection === section.value ? declarationAmount : ""} onChange={(e) => { setSelectedSection(section.value); setDeclarationAmount(e.target.value); }} data-testid={`input-amount-${section.value}`} />
                                  </div>
                                  {selectedSection === section.value && selectedInvestmentType === "Other" && (
                                    <div className="sm:col-span-2">
                                      <Label className="text-xs">Specify Details</Label>
                                      <Input placeholder="Enter details" className="h-9 text-sm" value={otherInvestmentDetail} onChange={(e) => setOtherInvestmentDetail(e.target.value)} data-testid={`input-other-${section.value}`} />
                                    </div>
                                  )}
                                  <div className="sm:col-span-2">
                                    <Label className="text-xs">Upload Proof</Label>
                                    <Input type="file" className="h-9 text-sm" accept=".pdf,.jpg,.jpeg,.png" data-testid={`input-proof-${section.value}`} />
                                  </div>
                                </div>
                                <Button size="sm" className="mt-3 w-full" onClick={() => { setSelectedSection(section.value); handleSubmitDeclaration(); }} disabled={submitDeclarationMutation.isPending || selectedSection !== section.value || !selectedInvestmentType || !declarationAmount} data-testid={`button-submit-${section.value}`}>
                                  <Plus className="w-4 h-4 mr-1" />{submitDeclarationMutation.isPending && selectedSection === section.value ? "Submitting..." : "Add Declaration"}
                                </Button>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="nps_other" className="space-y-4 mt-4">
                    {[
                      investmentSections.find(s => s.value === "80CCD1B")!,
                      investmentSections.find(s => s.value === "80CCD2")!,
                      investmentSections.find(s => s.value === "80TTA")!,
                    ].map(section => {
                      const sectionDecs = getDeclarationsForSection(section.value);
                      const sectionTotal = sectionDecs.reduce((s, d) => s + parseFloat(d.amount), 0);
                      const isExpanded = expandedSection === section.value;
                      return (
                        <Card key={section.value} data-testid={`section-card-${section.value}`}>
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedSection(isExpanded ? null : section.value)}
                            data-testid={`section-header-${section.value}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">{section.label}</span>
                                {sectionDecs.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">{sectionDecs.length} declaration{sectionDecs.length > 1 ? 's' : ''}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  Declared: <span className="font-medium text-foreground">Rs. {sectionTotal.toLocaleString()}</span>
                                </span>
                                {section.limit > 0 && (
                                  <span className="text-xs text-muted-foreground">/ Limit: Rs. {section.limit.toLocaleString()}</span>
                                )}
                              </div>
                              {section.limit > 0 && (
                                <Progress value={Math.min((sectionTotal / section.limit) * 100, 100)} className="h-1.5 mt-2 w-60" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {sectionDecs.some(d => d.status === "pending") && <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>}
                              {sectionDecs.some(d => d.status === "approved") && <Badge className="bg-green-100 text-green-700 text-xs">Approved</Badge>}
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <CardContent className="pt-0 space-y-4">
                              <Separator />
                              {sectionDecs.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted Declarations</p>
                                  {sectionDecs.map((dec) => (
                                    <>
                                    <div key={dec.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border text-sm" data-testid={`declaration-item-${dec.id}`}>
                                      <div>
                                        <span className="font-medium text-foreground">{dec.investmentType}</span>
                                        {dec.otherDetails && <span className="text-xs text-muted-foreground ml-2">({dec.otherDetails})</span>}
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          Rs. {parseFloat(dec.amount).toLocaleString()}
                                          {dec.submittedAt && ` • ${format(new Date(dec.submittedAt), "dd MMM yyyy")}`}
                                        </p>
                                        {(dec.status === "approved" || dec.status === "rejected") && dec.reviewRemarks && (
                                          <p className={`text-xs mt-1 ${dec.status === "approved" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            <span className="font-medium">Remarks:</span> {dec.reviewRemarks}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className={
                                          dec.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                          dec.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                          dec.status === "submitted" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        }>{dec.status === "approved" ? "Approved" : dec.status === "rejected" ? "Rejected" : dec.status === "submitted" ? "Submitted" : "Pending"}</Badge>
                                        {dec.status === "pending" && (
                                          <>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => setEditingDeclaration({ id: dec.id, investmentType: dec.investmentType, amount: dec.amount, otherDetails: dec.otherDetails })} data-testid={`button-edit-${dec.id}`}>
                                              <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteDeclarationMutation.mutate(dec.id)} data-testid={`button-delete-${dec.id}`}>
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {editingDeclaration?.id === dec.id && (
                                      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-xs">Investment Type</Label>
                                            <Input className="h-8 text-sm" value={editingDeclaration.investmentType} onChange={(e) => setEditingDeclaration({ ...editingDeclaration, investmentType: e.target.value })} />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Amount (Rs.)</Label>
                                            <Input type="number" className="h-8 text-sm" value={editingDeclaration.amount} onChange={(e) => setEditingDeclaration({ ...editingDeclaration, amount: e.target.value })} />
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-7 text-xs" onClick={() => editDeclarationMutation.mutate({ id: editingDeclaration.id, data: { investmentType: editingDeclaration.investmentType, amount: editingDeclaration.amount, otherDetails: editingDeclaration.otherDetails } })} disabled={editDeclarationMutation.isPending}>
                                            {editDeclarationMutation.isPending ? "Saving..." : "Save"}
                                          </Button>
                                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingDeclaration(null)}>Cancel</Button>
                                        </div>
                                      </div>
                                    )}
                                    </>
                                  ))}
                                </div>
                              )}
                              <div className="p-4 bg-muted/20 rounded-lg border border-dashed">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Add New Declaration</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Type</Label>
                                    <Select value={selectedSection === section.value ? selectedInvestmentType : ""} onValueChange={(val) => { setSelectedSection(section.value); setSelectedInvestmentType(val); if (val !== "Other") setOtherInvestmentDetail(""); }}>
                                      <SelectTrigger className="h-9 text-sm" data-testid={`select-type-${section.value}`}>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(investmentTypeOptions[section.value] || ["Other"]).map(type => (
                                          <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Amount (Rs.)</Label>
                                    <Input type="number" placeholder="Enter amount" className="h-9 text-sm" value={selectedSection === section.value ? declarationAmount : ""} onChange={(e) => { setSelectedSection(section.value); setDeclarationAmount(e.target.value); }} data-testid={`input-amount-${section.value}`} />
                                  </div>
                                  {selectedSection === section.value && selectedInvestmentType === "Other" && (
                                    <div className="sm:col-span-2">
                                      <Label className="text-xs">Specify Details</Label>
                                      <Input placeholder="Enter details" className="h-9 text-sm" value={otherInvestmentDetail} onChange={(e) => setOtherInvestmentDetail(e.target.value)} data-testid={`input-other-${section.value}`} />
                                    </div>
                                  )}
                                  <div className="sm:col-span-2">
                                    <Label className="text-xs">Upload Proof</Label>
                                    <Input type="file" className="h-9 text-sm" accept=".pdf,.jpg,.jpeg,.png" data-testid={`input-proof-${section.value}`} />
                                  </div>
                                </div>
                                <Button size="sm" className="mt-3 w-full" onClick={() => { setSelectedSection(section.value); handleSubmitDeclaration(); }} disabled={submitDeclarationMutation.isPending || selectedSection !== section.value || !selectedInvestmentType || !declarationAmount} data-testid={`button-submit-${section.value}`}>
                                  <Plus className="w-4 h-4 mr-1" />{submitDeclarationMutation.isPending && selectedSection === section.value ? "Submitting..." : "Add Declaration"}
                                </Button>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </TabsContent>
                </Tabs>

                {(myTaxDeclarations?.length || 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-primary" />
                        Consolidated Declaration Review
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Review all your declarations before final submission to finance team</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border rounded-md overflow-hidden">
                        <div className="grid grid-cols-[1fr_120px_80px_80px] gap-0 bg-muted px-3 py-2 text-xs font-medium border-b">
                          <span>Investment / Declaration</span>
                          <span className="text-right">Amount</span>
                          <span className="text-center">Status</span>
                          <span className="text-center">Action</span>
                        </div>
                        {myTaxDeclarations?.map(dec => (
                          <div key={dec.id} className="border-b last:border-0" data-testid={`review-row-${dec.id}`}>
                            <div className="grid grid-cols-[1fr_120px_80px_80px] gap-0 px-3 py-2 text-sm items-center">
                              <div>
                                <span className="font-medium text-foreground">{dec.investmentType}</span>
                                <span className="text-xs text-muted-foreground ml-1">({normalizeSectionKey(dec.section)})</span>
                                {dec.otherDetails && <span className="text-xs text-muted-foreground ml-1">- {dec.otherDetails}</span>}
                              </div>
                              <span className="text-right font-medium text-foreground">Rs. {parseFloat(dec.amount).toLocaleString()}</span>
                              <div className="text-center">
                                <Badge className={`text-xs ${dec.status === "approved" ? "bg-green-100 text-green-700" : dec.status === "rejected" ? "bg-red-100 text-red-700" : dec.status === "submitted" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                                  {dec.status === "approved" ? "Approved" : dec.status === "rejected" ? "Rejected" : dec.status === "submitted" ? "Submitted" : "Pending"}
                                </Badge>
                              </div>
                              <div className="text-center flex items-center justify-center gap-1">
                                {dec.status === "pending" && (
                                  <>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => setEditingDeclaration({ id: dec.id, investmentType: dec.investmentType, amount: dec.amount, otherDetails: dec.otherDetails })} data-testid={`button-review-edit-${dec.id}`}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => deleteDeclarationMutation.mutate(dec.id)} data-testid={`button-review-delete-${dec.id}`}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {(dec.status === "approved" || dec.status === "rejected") && dec.reviewRemarks && (
                              <div className={`mx-3 mb-2 px-3 py-1.5 rounded text-xs ${dec.status === "approved" ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"}`} data-testid={`review-remarks-${dec.id}`}>
                                <span className="font-medium">Finance Remarks:</span> {dec.reviewRemarks}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">Total Declarations: Rs. {(myTaxDeclarations?.reduce((s, d) => s + parseFloat(d.amount), 0) || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{myTaxDeclarations?.filter(d => d.status === "pending").length || 0} pending • {myTaxDeclarations?.filter(d => d.status === "submitted").length || 0} submitted • {myTaxDeclarations?.filter(d => d.status === "approved").length || 0} approved</p>
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => submitToFinanceMutation.mutate()} 
                          disabled={submitToFinanceMutation.isPending || !myTaxDeclarations?.some(d => d.status === "pending")}
                          data-testid="button-submit-to-finance"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {submitToFinanceMutation.isPending ? "Submitting..." : "Submit All Declarations to Finance"}
                        </Button>
                        <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            All declarations are subject to verification. Final tax adjustments will be made in January after document verification by the finance team.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {currentEmployee?.taxRegime === "new_regime" && (payrollDeductions?.deductions?.length || 0) > 0 && (
              <Card data-testid="card-payroll-auto-captured-new-regime">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Annual Deductions (Salary Structure)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Annual deductions projected from your salary structure. Under New Regime, Professional Tax [16(iii)] is still deductible.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-hidden">
                    <div className="grid grid-cols-[1fr_100px_100px_120px] gap-0 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-xs font-medium border-b">
                      <span>Component</span>
                      <span className="text-center">Section</span>
                      <span className="text-center">Deductible?</span>
                      <span className="text-right">Annual Amount</span>
                    </div>
                    {payrollDeductions?.deductions.map(ded => {
                      const isDeductible = ded.section === "16(iii)";
                      return (
                        <div key={ded.id} className="grid grid-cols-[1fr_100px_100px_120px] gap-0 px-3 py-2.5 text-sm border-b last:border-0 items-center" data-testid={`payroll-ded-nr-row-${ded.id}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{ded.investmentType}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">Payroll</Badge>
                          </div>
                          <span className="text-center text-xs text-muted-foreground">{ded.section}</span>
                          <span className={`text-center text-xs font-medium ${isDeductible ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {isDeductible ? 'Yes' : 'No'}
                          </span>
                          <span className="text-right font-medium text-blue-700 dark:text-blue-400">Rs. {parseFloat(ded.amount).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {currentEmployee?.taxRegime === "new_regime" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    NPS Contribution - Section 80CCD(2)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Under the <strong>New Tax Regime</strong>, most deductions are not available. However, <strong>employer's contribution to NPS under Section 80CCD(2)</strong> (up to 10% of basic salary) is still allowed as a deduction.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-semibold text-foreground mb-2">NPS Tier-I Account</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">PRAN Number</span>
                            <Input placeholder="Enter PRAN No." className="w-40 h-8 text-xs" value={npsPranNumber} onChange={(e) => setNpsPranNumber(e.target.value)} data-testid="input-pran-number" />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Annual Contribution</span>
                            <Input type="number" placeholder="Amount" className="w-40 h-8 text-xs" value={npsAmount} onChange={(e) => setNpsAmount(e.target.value)} data-testid="input-nps-amount" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-semibold text-foreground mb-2">Employer NPS Contribution</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Employer contribution up to 10% of Basic + DA is deductible under Sec 80CCD(2) even in New Regime.
                        </p>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Employer's Contribution</span>
                          <Input type="number" placeholder="Amount" className="w-40 h-8 text-xs" value={employerNpsAmount} onChange={(e) => setEmployerNpsAmount(e.target.value)} data-testid="input-employer-nps" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Upload NPS Statement / Proof</Label>
                      <Input type="file" data-testid="input-nps-proof" accept=".pdf,.jpg,.jpeg,.png" className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">Upload your NPS statement or contribution receipt (PDF, JPG, PNG - max 5MB)</p>
                    </div>
                    <Button className="w-full" onClick={handleSubmitNps} disabled={submitNpsMutation.isPending} data-testid="button-submit-nps">
                      <CheckCircle2 className="w-4 h-4 mr-2" />{submitNpsMutation.isPending ? "Submitting..." : "Submit NPS Declaration"}
                    </Button>

                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>Note:</strong> Under the New Regime, only Section 80CCD(2) - Employer's NPS contribution is eligible for deduction. Employee's own NPS contribution under 80CCD(1B) is NOT deductible in the New Regime.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!currentEmployee?.taxRegime && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Tax Declaration Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Please select a tax regime above to view your tax declaration options and submit investment proofs.</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Declare Investments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Select a tax regime first to declare investments and upload documents.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                Assets Assigned to Me
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myAssets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAssets.map((asset) => (
                    <div key={asset.id} className="p-4 bg-muted/50 rounded-lg border" data-testid={`card-asset-${asset.id}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Monitor className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{asset.name}</p>
                          <p className="text-sm text-muted-foreground">{asset.category}</p>
                          {asset.brand && <p className="text-xs text-muted-foreground">{asset.brand} {asset.model || ''}</p>}
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground">Asset Code: <span className="font-medium text-foreground">{asset.assetCode}</span></p>
                            {asset.serialNumber && <p className="text-xs text-muted-foreground">Serial: <span className="font-medium text-foreground">{asset.serialNumber}</span></p>}
                            {asset.assignedDate && <p className="text-xs text-muted-foreground">Assigned: <span className="font-medium text-foreground">{format(new Date(asset.assignedDate), "MMM dd, yyyy")}</span></p>}
                            {asset.warrantyEndDate && <p className="text-xs text-muted-foreground">Warranty Till: <span className="font-medium text-foreground">{format(new Date(asset.warrantyEndDate), "MMM dd, yyyy")}</span></p>}
                          </div>
                          <Badge className={`mt-2 ${asset.condition === 'new' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : asset.condition === 'good' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{asset.condition || 'good'}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Monitor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No assets assigned to you yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Contact your IT department if you need any equipment.</p>
                </div>
              )}
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Please report any issues with your assigned assets to the IT department. All assets must be returned upon separation from the company.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance">
          {(() => {
            const hasHealthInsurance = currentEmployee?.healthInsuranceProvider || currentEmployee?.healthInsurancePolicyNumber;
            const hasLifeInsurance = currentEmployee?.lifeInsuranceProvider || currentEmployee?.lifeInsurancePolicyNumber;
            const hasInsurancePremium = currentEmployee?.insuranceAnnualPremium && Number(currentEmployee.insuranceAnnualPremium) > 0;
            const hasAnyInsurance = hasHealthInsurance || hasLifeInsurance || hasInsurancePremium;

            if (!hasAnyInsurance) {
              return (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No insurance details available.</p>
                      <p className="text-sm text-muted-foreground mt-1">Contact HR to update your insurance information.</p>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {hasHealthInsurance && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-green-600" />
                          Group Health Insurance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{currentEmployee?.healthInsuranceProvider || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">Provider</p>
                              </div>
                            </div>
                            <Separator className="my-3" />
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Policy Number</p>
                                <p className="font-medium text-foreground">{currentEmployee?.healthInsurancePolicyNumber || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Sum Insured</p>
                                <p className="font-medium text-foreground">{currentEmployee?.healthInsuranceSumInsured ? `₹${Number(currentEmployee.healthInsuranceSumInsured).toLocaleString('en-IN')}` : 'N/A'}</p>
                              </div>
                              {currentEmployee?.healthInsuranceStartDate && (
                                <div>
                                  <p className="text-muted-foreground">Start Date</p>
                                  <p className="font-medium text-foreground">{format(new Date(currentEmployee.healthInsuranceStartDate), "MMM dd, yyyy")}</p>
                                </div>
                              )}
                              {currentEmployee?.healthInsuranceEndDate && (
                                <div>
                                  <p className="text-muted-foreground">End Date</p>
                                  <p className="font-medium text-foreground">{format(new Date(currentEmployee.healthInsuranceEndDate), "MMM dd, yyyy")}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {hasLifeInsurance && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-600" />
                          Life Insurance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{currentEmployee?.lifeInsuranceProvider || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">Provider</p>
                              </div>
                            </div>
                            <Separator className="my-3" />
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Policy Number</p>
                                <p className="font-medium text-foreground">{currentEmployee?.lifeInsurancePolicyNumber || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Sum Insured</p>
                                <p className="font-medium text-foreground">{currentEmployee?.lifeInsuranceSumInsured ? `₹${Number(currentEmployee.lifeInsuranceSumInsured).toLocaleString('en-IN')}` : 'N/A'}</p>
                              </div>
                              {currentEmployee?.lifeInsuranceNomineeName && (
                                <div>
                                  <p className="text-muted-foreground">Nominee</p>
                                  <p className="font-medium text-foreground">{currentEmployee.lifeInsuranceNomineeName}</p>
                                </div>
                              )}
                              {currentEmployee?.lifeInsuranceNomineeRelation && (
                                <div>
                                  <p className="text-muted-foreground">Relation</p>
                                  <p className="font-medium text-foreground">{currentEmployee.lifeInsuranceNomineeRelation}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {hasInsurancePremium && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <IndianRupee className="w-5 h-5 text-orange-600" />
                          Insurance Premium
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="grid grid-cols-1 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Annual Premium</p>
                              <p className="font-medium text-foreground text-lg">₹{Number(currentEmployee?.insuranceAnnualPremium || 0).toLocaleString('en-IN')}</p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-muted-foreground">Employee Share ({currentEmployee?.insuranceEmployeeSharePercent || 40}%)</p>
                                <p className="font-medium text-foreground">₹{Math.round(Number(currentEmployee?.insuranceAnnualPremium || 0) * Number(currentEmployee?.insuranceEmployeeSharePercent || 40) / 100).toLocaleString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Employer Share ({currentEmployee?.insuranceEmployerSharePercent || 60}%)</p>
                                <p className="font-medium text-foreground">₹{Math.round(Number(currentEmployee?.insuranceAnnualPremium || 0) * Number(currentEmployee?.insuranceEmployerSharePercent || 60) / 100).toLocaleString('en-IN')}</p>
                              </div>
                            </div>
                            {currentEmployee?.insuranceCycleStartDate && currentEmployee?.insuranceCycleEndDate && (
                              <>
                                <Separator />
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-muted-foreground">Cycle Start</p>
                                    <p className="font-medium text-foreground">{format(new Date(currentEmployee.insuranceCycleStartDate), "MMM dd, yyyy")}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Cycle End</p>
                                    <p className="font-medium text-foreground">{format(new Date(currentEmployee.insuranceCycleEndDate), "MMM dd, yyyy")}</p>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Insurance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Insurance Type</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Provider</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Policy Number</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Sum Insured</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hasHealthInsurance && (
                            <tr className="border-b">
                              <td className="py-3 px-4 font-medium">Group Health Insurance</td>
                              <td className="py-3 px-4">{currentEmployee?.healthInsuranceProvider || 'N/A'}</td>
                              <td className="py-3 px-4">{currentEmployee?.healthInsurancePolicyNumber || 'N/A'}</td>
                              <td className="py-3 px-4">{currentEmployee?.healthInsuranceSumInsured ? `₹${Number(currentEmployee.healthInsuranceSumInsured).toLocaleString('en-IN')}` : 'N/A'}</td>
                              <td className="py-3 px-4">
                                {currentEmployee?.healthInsuranceEndDate && new Date(currentEmployee.healthInsuranceEndDate) > new Date()
                                  ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                                  : <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>}
                              </td>
                            </tr>
                          )}
                          {hasLifeInsurance && (
                            <tr className="border-b">
                              <td className="py-3 px-4 font-medium">Life Insurance</td>
                              <td className="py-3 px-4">{currentEmployee?.lifeInsuranceProvider || 'N/A'}</td>
                              <td className="py-3 px-4">{currentEmployee?.lifeInsurancePolicyNumber || 'N/A'}</td>
                              <td className="py-3 px-4">{currentEmployee?.lifeInsuranceSumInsured ? `₹${Number(currentEmployee.lifeInsuranceSumInsured).toLocaleString('en-IN')}` : 'N/A'}</td>
                              <td className="py-3 px-4"><Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge></td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="loans">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary" />
                  My Loans
                </h3>
                <p className="text-sm text-muted-foreground">Request and track your loans</p>
              </div>
              {(() => {
                const hasActiveLoan = myLoans.some(l => l.status === 'approved' || l.status === 'pending');
                return (
                  <Dialog open={showLoanDialog} onOpenChange={(open) => {
                    if (open && hasActiveLoan) {
                      toast({ title: "Cannot apply", description: "You already have an active or pending loan. Please wait until it is completed.", variant: "destructive" });
                      return;
                    }
                    setShowLoanDialog(open);
                    if (open) setNewLoanRequest({ amount: "", repaymentMonths: "", reason: "" });
                  }}>
                    <DialogTrigger asChild>
                      <Button disabled={hasActiveLoan} data-testid="button-request-loan"><Plus className="w-4 h-4 mr-2" /> New Loan Request</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Request Loan</DialogTitle>
                        <DialogDescription>Submit a new loan request. Maximum repayment: 12 months.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {(() => {
                          const monthlySalary = latestPayroll ? Number(latestPayroll.grossSalary) : 0;
                          const maxLoan = monthlySalary * loanMultiplier;
                          const currentAmount = parseFloat(newLoanRequest.amount) || 0;
                          return (
                            <>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Eligible Loan Amount ({loanMultiplier}x salary)
                                  </span>
                                  <div className="flex items-center gap-1 border rounded-md px-3 py-1.5">
                                    <span className="text-sm text-muted-foreground">₹</span>
                                    <Input
                                      type="number"
                                      value={newLoanRequest.amount}
                                      onChange={e => {
                                        const val = e.target.value;
                                        if (maxLoan > 0 && parseFloat(val) > maxLoan) {
                                          setNewLoanRequest(p => ({ ...p, amount: String(maxLoan) }));
                                        } else {
                                          setNewLoanRequest(p => ({ ...p, amount: val }));
                                        }
                                      }}
                                      className="border-0 p-0 h-auto text-lg font-bold w-28 text-right focus-visible:ring-0"
                                      data-testid="input-loan-amount"
                                    />
                                  </div>
                                </div>
                                {maxLoan > 0 && (
                                  <>
                                    <Slider
                                      value={[currentAmount]}
                                      onValueChange={([val]) => setNewLoanRequest(p => ({ ...p, amount: String(val) }))}
                                      min={0}
                                      max={maxLoan}
                                      step={1000}
                                      className="w-full"
                                      data-testid="slider-loan-amount"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>₹0</span>
                                      <span>₹{maxLoan.toLocaleString("en-IN")}</span>
                                    </div>
                                  </>
                                )}
                                {monthlySalary > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Monthly Salary: ₹{monthlySalary.toLocaleString("en-IN")} · Limit: {loanMultiplier}x salary
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label>Repayment Months * (max 12)</Label>
                                <Input
                                  type="number"
                                  max={12}
                                  min={1}
                                  value={newLoanRequest.repaymentMonths}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (parseInt(val) > 12) return;
                                    setNewLoanRequest(p => ({ ...p, repaymentMonths: val }));
                                  }}
                                  placeholder="e.g. 12"
                                  data-testid="input-loan-months"
                                />
                              </div>
                              {currentAmount > 0 && newLoanRequest.repaymentMonths && parseInt(newLoanRequest.repaymentMonths) > 0 && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md text-sm">
                                  <span className="text-muted-foreground">Estimated EMI: </span>
                                  <span className="font-semibold text-foreground">₹{Math.round(currentAmount / parseInt(newLoanRequest.repaymentMonths)).toLocaleString("en-IN")}/month</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                        <div>
                          <Label>Reason</Label>
                          <Textarea value={newLoanRequest.reason} onChange={e => setNewLoanRequest(p => ({ ...p, reason: e.target.value }))} placeholder="Briefly describe why you need this loan" data-testid="input-loan-reason" />
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                          <strong>Approval Flow:</strong> Reporting Manager (validates) → VP (approves) → Finance (processes)
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLoanDialog(false)}>Cancel</Button>
                        <Button
                          onClick={() => {
                            const monthlySalary = latestPayroll ? Number(latestPayroll.grossSalary) : 0;
                            const submitAmount = newLoanRequest.amount;
                            const repMonths = parseInt(newLoanRequest.repaymentMonths);
                            if (!submitAmount || !repMonths) {
                              toast({ title: "Please fill all required fields", variant: "destructive" });
                              return;
                            }
                            if (repMonths > 12) {
                              toast({ title: "Maximum repayment term is 12 months", variant: "destructive" });
                              return;
                            }
                            const maxAllowed = monthlySalary * loanMultiplier;
                            if (maxAllowed > 0 && parseFloat(submitAmount) > maxAllowed) {
                              toast({ title: "Amount exceeds limit", description: `Maximum allowed: ₹${maxAllowed.toLocaleString("en-IN")}`, variant: "destructive" });
                              return;
                            }
                            createLoanMutation.mutate({
                              type: "loan",
                              amount: submitAmount,
                              repaymentMonths: repMonths,
                              reason: newLoanRequest.reason || null,
                            });
                          }}
                          disabled={createLoanMutation.isPending}
                          data-testid="button-submit-loan"
                        >
                          {createLoanMutation.isPending ? "Submitting..." : "Submit Request"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                );
              })()}
            </div>

            {myLoans.some(l => l.status === 'approved' || l.status === 'pending') && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                You have an active/pending loan. New loan requests are not allowed until the current one is completed or closed.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-loans">{myLoans.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600" data-testid="text-pending-loans">{myLoans.filter(l => l.status === "pending").length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Active Loans</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-active-loans">{myLoans.filter(l => l.status === "approved").length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Outstanding</p>
                    <p className="text-2xl font-bold text-primary" data-testid="text-outstanding-amount">
                      ₹{myLoans.filter(l => l.status === "approved").reduce((sum, l) => sum + parseFloat(l.remainingBalance || "0"), 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {loansLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Loading your loans...</p>
                </CardContent>
              </Card>
            ) : myLoans.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Banknote className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No loan requests yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Click "New Loan Request" to apply for a loan.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myLoans.map((loan) => (
                  <Card key={loan.id} data-testid={`card-loan-${loan.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-foreground">Loan</h4>
                            <Badge className={
                              loan.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                              loan.status === "approved" ? "bg-green-100 text-green-800" :
                              loan.status === "rejected" ? "bg-red-100 text-red-800" :
                              loan.status === "completed" ? "bg-blue-100 text-blue-800" :
                              loan.status === "foreclosed" ? "bg-purple-100 text-purple-800" :
                              "bg-gray-100 text-gray-800"
                            } data-testid={`badge-loan-status-${loan.id}`}>
                              {(loan.status || "pending").charAt(0).toUpperCase() + (loan.status || "pending").slice(1)}
                            </Badge>
                          </div>
                          {loan.status === "pending" && (
                            <div className="flex items-center gap-1 mb-2">
                              {[
                                { label: "RM", key: "level1Status" },
                                { label: "VP", key: "level2Status" },
                                { label: "Finance", key: "level3Status" },
                              ].map((level, i) => {
                                const st = (loan as any)[level.key] || 'pending';
                                return (
                                  <div key={i} className="flex items-center gap-1">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      st === 'approved' ? 'bg-green-100 text-green-700' :
                                      st === 'rejected' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-500'
                                    }`}>{level.label}: {st === 'approved' ? '✓' : st === 'rejected' ? '✗' : '...'}</span>
                                    {i < 2 && <span className="text-muted-foreground text-xs">→</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {loan.reason && <p className="text-sm text-muted-foreground mb-2">{loan.reason}</p>}
                          {loan.remarks && (
                            <p className="text-xs text-muted-foreground italic">Remarks: {loan.remarks}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Amount</p>
                            <p className="font-semibold text-foreground">₹{parseFloat(loan.amount).toLocaleString("en-IN")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">EMI</p>
                            <p className="font-semibold text-foreground">₹{parseFloat(loan.emiAmount || "0").toLocaleString("en-IN")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tenure</p>
                            <p className="font-semibold text-foreground">{loan.repaymentMonths} months</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Outstanding</p>
                            <p className="font-semibold text-foreground">₹{parseFloat(loan.remainingBalance || "0").toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      </div>
                      {loan.status === "approved" && parseFloat(loan.totalRepaid || "0") > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Repayment Progress</span>
                            <span className="font-medium text-foreground">
                              ₹{parseFloat(loan.totalRepaid || "0").toLocaleString("en-IN")} / ₹{parseFloat(loan.amount).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <Progress value={(parseFloat(loan.totalRepaid || "0") / parseFloat(loan.amount)) * 100} className="h-2" />
                        </div>
                      )}
                      {loan.createdAt && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Requested on {format(new Date(loan.createdAt), "dd MMM yyyy")}
                          {loan.approvedAt && ` · Approved on ${format(new Date(loan.approvedAt), "dd MMM yyyy")}`}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">My Expense Claims</h3>
                <p className="text-sm text-muted-foreground">Submit and track your expense reimbursement requests</p>
              </div>
              <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-expense-ess">
                    <Plus className="w-4 h-4 mr-2" />
                    New Claim
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit Expense Claim</DialogTitle>
                    <DialogDescription>Fill in the details of your expense for reimbursement</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger data-testid="select-expense-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="food">Food & Meals</SelectItem>
                          <SelectItem value="accommodation">Accommodation</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="communication">Communication</SelectItem>
                          <SelectItem value="office_supplies">Office Supplies</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount (₹)</Label>
                      <Input type="number" placeholder="Enter amount" value={expenseForm.amount} onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} data-testid="input-expense-amount" />
                    </div>
                    <div>
                      <Label>Expense Date</Label>
                      <Input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm(prev => ({ ...prev, expenseDate: e.target.value }))} data-testid="input-expense-date" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea placeholder="Describe the expense" value={expenseForm.description} onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} data-testid="input-expense-description" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>Cancel</Button>
                    <Button
                      data-testid="button-submit-expense"
                      disabled={!expenseForm.category || !expenseForm.amount || createExpenseMutation.isPending}
                      onClick={() => {
                        if (!currentEmployee) return;
                        createExpenseMutation.mutate({
                          employeeId: currentEmployee.id,
                          category: expenseForm.category,
                          amount: expenseForm.amount,
                          expenseDate: expenseForm.expenseDate,
                          description: expenseForm.description,
                        });
                      }}
                    >
                      {createExpenseMutation.isPending ? "Submitting..." : "Submit Claim"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Claims</p>
                      <p className="text-2xl font-bold text-foreground">{expenses?.length || 0}</p>
                    </div>
                    <Receipt className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{expenses?.filter(e => e.status === "pending").length || 0}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Approved Total</p>
                      <p className="text-2xl font-bold text-green-600">₹{(expenses?.filter(e => e.status === "approved" || e.status === "reimbursed").reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {expenses && expenses.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border" data-testid={`expense-row-${expense.id}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground capitalize">{expense.category?.replace(/_/g, " ") || "General"}</p>
                            <p className="text-sm text-muted-foreground">{expense.expenseDate ? format(new Date(expense.expenseDate), "dd MMM yyyy") : "N/A"}</p>
                            {expense.description && <p className="text-xs text-muted-foreground mt-1">{expense.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-semibold text-foreground">₹{parseFloat(expense.amount).toLocaleString("en-IN")}</p>
                          <Badge className={
                            expense.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            expense.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            expense.status === "reimbursed" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }>
                            {expense.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No expense claims yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Click "New Claim" to submit your first expense</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  My Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamMembers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamMembers.map((member: any) => (
                      <div key={member.id} className="p-4 bg-muted/50 rounded-lg border" data-testid={`card-team-member-${member.id}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{member.firstName} {member.lastName}</p>
                            <p className="text-sm text-muted-foreground">{member.designation || 'Employee'}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {member.email && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs">
                                  <Mail className="w-3 h-3 mr-1" />{member.email?.split('@')[0]}
                                </Button>
                              )}
                              {member.phone && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs">
                                  <Phone className="w-3 h-3 mr-1" />Call
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No direct reports found.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Organization Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-semibold text-foreground">{currentEmployee?.department || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-sm text-muted-foreground">Reporting Manager</p>
                    {reportingManager ? (
                      <>
                        <p className="font-semibold text-foreground">{reportingManager.firstName} {reportingManager.lastName || ''}</p>
                        <div className="space-y-1.5 text-xs mt-2">
                          {reportingManager.designation && (
                            <div className="flex gap-1">
                              <span className="text-muted-foreground shrink-0">Designation:</span>
                              <span className="text-foreground">{reportingManager.designation}</span>
                            </div>
                          )}
                          {reportingManager.employeeCode && (
                            <div className="flex gap-1">
                              <span className="text-muted-foreground shrink-0">Emp Code:</span>
                              <span className="text-foreground">{reportingManager.employeeCode}</span>
                            </div>
                          )}
                          {reportingManager.email && (
                            <div className="flex gap-1">
                              <span className="text-muted-foreground shrink-0">Email:</span>
                              <span className="text-foreground break-all">{reportingManager.email}</span>
                            </div>
                          )}
                          {reportingManager.phone && (
                            <div className="flex gap-1">
                              <span className="text-muted-foreground shrink-0">Contact:</span>
                              <span className="text-foreground">{reportingManager.phone}</span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="font-semibold text-foreground">N/A</p>
                    )}
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Team Size</p>
                    <p className="font-semibold text-foreground">{teamMembers.length} {teamMembers.length === 1 ? 'Member' : 'Members'}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-semibold text-foreground">{currentEmployee?.location || currentEmployee?.city || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Company Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!companyPoliciesData || companyPoliciesData.length === 0) ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No company policies available yet.</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Policies will appear here once uploaded by your HR team.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {companyPoliciesData.filter((p: any) => p.isActive !== false).map((policy: any) => {
                    const myAck = (policyAcknowledgments || []).find(
                      (a: any) => a.policyId === policy.id && a.employeeId === currentEmployee?.id
                    );
                    const hasViewed = !!myAck?.viewedAt;
                    const isAcknowledged = !!myAck?.acknowledgedAt;
                    const canDownload = (policy.downloadAllowedEmployees || []).includes(String(currentEmployee?.id));
                    const categoryColors: Record<string, string> = {
                      general: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      hr: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                      compliance: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                      safety: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                      it: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
                    };
                    const formatSize = (bytes: number) => {
                      if (!bytes) return "";
                      if (bytes < 1024) return `${bytes} B`;
                      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                    };
                    return (
                      <div key={policy.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid={`policy-row-${policy.id}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isAcknowledged ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
                          }`}>
                            <FileText className={`w-5 h-5 ${isAcknowledged ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{policy.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {policy.description && <p className="text-sm text-muted-foreground line-clamp-1">{policy.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`text-[10px] ${categoryColors[policy.category] || categoryColors.general}`}>{policy.category}</Badge>
                              {policy.version && <span className="text-[10px] text-muted-foreground">v{policy.version}</span>}
                              {policy.fileSize && <span className="text-[10px] text-muted-foreground">{formatSize(policy.fileSize)}</span>}
                              {policy.updatedAt && <span className="text-[10px] text-muted-foreground">Updated: {format(new Date(policy.updatedAt), "MMM dd, yyyy")}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={isAcknowledged ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}>
                            {isAcknowledged ? "Acknowledged" : hasViewed ? "Viewed" : "Pending"}
                          </Badge>
                          {policy.fileName && (
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-view-policy-${policy.id}`}
                              onClick={() => {
                                viewPolicyMutation.mutate({ policyId: policy.id });
                                setEssPolicyPreview(policy);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          )}
                          {canDownload && policy.fileName && (
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-download-policy-${policy.id}`}
                              onClick={() => {
                                window.open(`/api/company-policies/${policy.id}/download`, '_blank');
                              }}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          )}
                          {!isAcknowledged && hasViewed && currentEmployee && (
                            <Button
                              size="sm"
                              disabled={acknowledgePolicyMutation.isPending}
                              data-testid={`button-acknowledge-policy-${policy.id}`}
                              onClick={() => {
                                acknowledgePolicyMutation.mutate({ policyId: policy.id });
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              {acknowledgePolicyMutation.isPending ? "..." : "Acknowledge"}
                            </Button>
                          )}
                          {!isAcknowledged && !hasViewed && (
                            <span className="text-xs text-muted-foreground italic">View to acknowledge</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Details
              </CardTitle>
              {!editingPersonal ? (
                <Button size="sm" variant="outline" onClick={() => {
                  if (currentEmployee) {
                    setPersonalForm({
                      phone: currentEmployee.phone || '',
                      personalEmail: currentEmployee.personalEmail || '',
                      emergencyContactName: currentEmployee.emergencyContactName || '',
                      emergencyContactPhone: currentEmployee.emergencyContactPhone || '',
                      emergencyContactRelation: currentEmployee.emergencyContactRelation || '',
                      address: currentEmployee.address || '',
                      permanentAddress: currentEmployee.permanentAddress || '',
                      bloodGroup: currentEmployee.bloodGroup || '',
                      maritalStatus: currentEmployee.maritalStatus || '',
                      bankName: currentEmployee.bankName || '',
                      bankAccountNumber: currentEmployee.bankAccountNumber || '',
                      ifscCode: currentEmployee.ifscCode || '',
                      panNumber: currentEmployee.panNumber || '',
                      aadharNumber: currentEmployee.aadharNumber || '',
                      uanNumber: currentEmployee.uanNumber || '',
                    });
                    setEditingPersonal(true);
                  }
                }} data-testid="button-edit-personal">
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingPersonal(false)} data-testid="button-cancel-personal">Cancel</Button>
                  <Button size="sm" onClick={() => {
                    if (!currentEmployee) return;
                    const changes: { fieldName: string; oldValue: string; newValue: string }[] = [];
                    const fieldLabels: Record<string, string> = {
                      phone: 'Phone', personalEmail: 'Personal Email',
                      emergencyContactName: 'Contact Name', emergencyContactPhone: 'Contact Phone',
                      emergencyContactRelation: 'Emergency Relation',
                      address: 'Current Address', permanentAddress: 'Permanent Address',
                      bloodGroup: 'Blood Group', maritalStatus: 'Marital Status',
                      bankName: 'Bank Name', bankAccountNumber: 'Bank Account Number',
                      ifscCode: 'IFSC Code', panNumber: 'PAN Number',
                      aadharNumber: 'Aadhar Number', uanNumber: 'UAN Number',
                    };
                    for (const [key, label] of Object.entries(fieldLabels)) {
                      const oldVal = (currentEmployee as any)[key] || '';
                      const newVal = personalForm[key] || '';
                      if (oldVal !== newVal) {
                        changes.push({ fieldName: label, oldValue: oldVal, newValue: newVal });
                      }
                    }
                    if (changes.length === 0) {
                      toast({ title: "No changes detected" });
                      setEditingPersonal(false);
                      return;
                    }
                    profileChangeMutation.mutate(changes);
                  }} disabled={profileChangeMutation.isPending} data-testid="button-submit-personal">
                    {profileChangeMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {currentEmployee && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Employee Code</label>
                        <p className="text-sm font-medium">{currentEmployee.employeeCode || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Full Name</label>
                        <p className="text-sm font-medium">{currentEmployee.firstName} {currentEmployee.lastName || ''}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Email</label>
                        <p className="text-sm font-medium">{currentEmployee.email || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Date of Birth</label>
                        <p className="text-sm font-medium">{currentEmployee.dateOfBirth ? format(new Date(currentEmployee.dateOfBirth), 'dd MMM yyyy') : '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Department</label>
                        <p className="text-sm font-medium">{currentEmployee.department || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Designation</label>
                        <p className="text-sm font-medium">{currentEmployee.designation || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Date of Joining</label>
                        <p className="text-sm font-medium">{currentEmployee.joinDate ? format(new Date(currentEmployee.joinDate), 'dd MMM yyyy') : '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Gender</label>
                        <p className="text-sm font-medium">{currentEmployee.gender || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Contact & Personal (Editable)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { key: 'phone', label: 'Phone' },
                        { key: 'personalEmail', label: 'Personal Email' },
                        { key: 'bloodGroup', label: 'Blood Group' },
                        { key: 'maritalStatus', label: 'Marital Status' },
                        { key: 'address', label: 'Current Address' },
                        { key: 'permanentAddress', label: 'Permanent Address' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <label className="text-xs text-muted-foreground">{label}</label>
                          {editingPersonal ? (
                            <Input
                              value={personalForm[key] || ''}
                              onChange={e => setPersonalForm(prev => ({ ...prev, [key]: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-personal-${key}`}
                            />
                          ) : (
                            <p className="text-sm font-medium">{(currentEmployee as any)[key] || '-'}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Emergency Contact (Editable)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { key: 'emergencyContactName', label: 'Contact Name' },
                        { key: 'emergencyContactPhone', label: 'Contact Phone' },
                        { key: 'emergencyContactRelation', label: 'Relation' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <label className="text-xs text-muted-foreground">{label}</label>
                          {editingPersonal ? (
                            <Input
                              value={personalForm[key] || ''}
                              onChange={e => setPersonalForm(prev => ({ ...prev, [key]: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-personal-${key}`}
                            />
                          ) : (
                            <p className="text-sm font-medium">{(currentEmployee as any)[key] || '-'}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Bank & ID Details (Editable)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { key: 'bankName', label: 'Bank Name' },
                        { key: 'bankAccountNumber', label: 'Account Number' },
                        { key: 'ifscCode', label: 'IFSC Code' },
                        { key: 'panNumber', label: 'PAN Number' },
                        { key: 'aadharNumber', label: 'Aadhar Number' },
                        { key: 'uanNumber', label: 'UAN Number' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <label className="text-xs text-muted-foreground">{label}</label>
                          {editingPersonal ? (
                            <Input
                              value={personalForm[key] || ''}
                              onChange={e => setPersonalForm(prev => ({ ...prev, [key]: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-personal-${key}`}
                            />
                          ) : (
                            <p className="text-sm font-medium">{(currentEmployee as any)[key] || '-'}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {myProfileRequests && myProfileRequests.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent Change Requests</h3>
                      <div className="space-y-2">
                        {myProfileRequests.slice(0, 10).map((req: any) => (
                          <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                            <div>
                              <span className="font-medium">{req.fieldName}</span>
                              <span className="text-muted-foreground ml-2">{req.oldValue || '(empty)'} → {req.newValue}</span>
                            </div>
                            <Badge className={req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                              {req.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-500" />
                Exit / Resignation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myExitRecord && myExitRecord.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-700 dark:text-yellow-400">Resignation Submitted</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <p className="text-muted-foreground">Resignation Date</p>
                        <p className="font-medium">{myExitRecord[0].resignationDate ? format(new Date(myExitRecord[0].resignationDate), "MMM dd, yyyy") : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Working Day</p>
                        <p className="font-medium">{myExitRecord[0].lastWorkingDate ? format(new Date(myExitRecord[0].lastWorkingDate), "MMM dd, yyyy") : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge className={myExitRecord[0].status === 'approved' ? 'bg-green-100 text-green-700' : myExitRecord[0].status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                          {myExitRecord[0].status || 'Pending'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reason</p>
                        <p className="font-medium">{myExitRecord[0].reason || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <LogOut className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Initiate Exit Process</h3>
                  <p className="text-sm text-muted-foreground mb-6">If you wish to resign, click the button below to submit your resignation. HR and your reporting manager will be notified.</p>
                  <Dialog open={showResignDialog} onOpenChange={setShowResignDialog}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" data-testid="button-submit-resignation">
                        <LogOut className="w-4 h-4 mr-2" />
                        Submit Resignation
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Submit Resignation</DialogTitle>
                        <DialogDescription>Please provide your reason and preferred last working day. This will be sent to HR and your reporting manager for processing.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Reason for Resignation</Label>
                          <Textarea
                            value={resignReason}
                            onChange={(e) => setResignReason(e.target.value)}
                            placeholder="Please provide your reason..."
                            rows={4}
                            data-testid="input-resign-reason"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Preferred Last Working Day</Label>
                          <Input
                            type="date"
                            value={resignLastDay}
                            onChange={(e) => setResignLastDay(e.target.value)}
                            min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                            data-testid="input-resign-last-day"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResignDialog(false)}>Cancel</Button>
                        <Button
                          variant="destructive"
                          onClick={() => resignationMutation.mutate({ reason: resignReason, lastWorkingDay: resignLastDay })}
                          disabled={!resignReason || !resignLastDay || resignationMutation.isPending}
                          data-testid="button-confirm-resignation"
                        >
                          {resignationMutation.isPending ? 'Submitting...' : 'Confirm Resignation'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {viewPayslip && (
        <ESSPayslipView
          record={viewPayslip}
          employee={currentEmployee}
          onClose={() => setViewPayslip(null)}
          getMonthName={getMonthName}
          formatCurrency={formatCurrency}
          entityName={currentEntity ? (currentEntity.payslipHeader || currentEntity.legalName || "") : undefined}
          entityAddress={currentEntity ? `${currentEntity.address || ''}${currentEntity.city ? `, ${currentEntity.city}` : ''}${currentEntity.state ? ` - ${currentEntity.pincode || ''} ${currentEntity.state}` : ''}` : undefined}
          entityDetails={currentEntity ? `${currentEntity.phone ? `Tel: ${currentEntity.phone}` : ''}${currentEntity.email ? `, Email: ${currentEntity.email}` : ''}${currentEntity.website ? ` | ${currentEntity.website}` : ''}` : undefined}
        />
      )}

      <Dialog open={showGreetDialog} onOpenChange={(open) => {
        setShowGreetDialog(open);
        if (!open) { setGreetMessage(""); setGreetBanner("confetti"); setGreetTarget(null); setGreetType("birthday"); setTaggedEmployees([]); setShowMentionDropdown(false); setMentionQuery(""); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className={`w-5 h-5 ${greetType === "anniversary" ? "text-amber-500" : "text-pink-500"}`} />
              {greetType === "anniversary" ? `Congratulate ${greetTarget?.name} on Work Anniversary` : `Send Birthday Wishes to ${greetTarget?.name}`}
            </DialogTitle>
            <DialogDescription>{greetType === "anniversary" ? "Write a congratulatory message and pick a banner style." : "Write a birthday message and pick a banner style."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium mb-2 block">Choose Banner Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "confetti", label: "Confetti", emoji: "🎊", bg: "from-yellow-100 to-pink-100 dark:from-yellow-900/30 dark:to-pink-900/30" },
                  { value: "balloons", label: "Balloons", emoji: "🎈", bg: "from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30" },
                  { value: "cake", label: "Cake", emoji: "🎂", bg: "from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30" },
                  { value: "stars", label: "Stars", emoji: "⭐", bg: "from-indigo-100 to-cyan-100 dark:from-indigo-900/30 dark:to-cyan-900/30" },
                  { value: "hearts", label: "Hearts", emoji: "❤️", bg: "from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30" },
                  { value: "simple", label: "Gift", emoji: "🎁", bg: "from-gray-100 to-white dark:from-gray-900/30 dark:to-gray-800/30" },
                ].map(banner => (
                  <button
                    key={banner.value}
                    type="button"
                    onClick={() => setGreetBanner(banner.value)}
                    className={`p-3 rounded-lg border-2 text-center transition-all bg-gradient-to-br ${banner.bg} ${greetBanner === banner.value ? (greetType === "anniversary" ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-800 scale-105' : 'border-pink-500 ring-2 ring-pink-200 dark:ring-pink-800 scale-105') : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}
                    data-testid={`banner-${banner.value}`}
                  >
                    <div className="text-2xl mb-1">{banner.emoji}</div>
                    <div className="text-xs font-medium text-foreground">{banner.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <Label className="text-sm font-medium mb-2 block">Your Message <span className="text-muted-foreground font-normal">(Type @ to tag employees)</span></Label>
              <Textarea
                value={greetMessage}
                onChange={(e) => {
                  const val = e.target.value;
                  setGreetMessage(val);
                  const cursorPos = e.target.selectionStart || 0;
                  setMentionCursorPos(cursorPos);
                  const textBeforeCursor = val.slice(0, cursorPos);
                  const atMatch = textBeforeCursor.match(/@(\w*)$/);
                  if (atMatch) {
                    setMentionQuery(atMatch[1].toLowerCase());
                    setShowMentionDropdown(true);
                  } else {
                    setShowMentionDropdown(false);
                    setMentionQuery("");
                  }
                }}
                placeholder={greetType === "anniversary" ? "Congratulations on your work anniversary! ..." : "Happy Birthday! Wishing you a wonderful year ahead..."}
                className="min-h-[100px] resize-none"
                data-testid="input-greet-message"
              />
              {showMentionDropdown && (() => {
                const filtered = (employees || [])
                  .filter(e => {
                    const name = `${e.firstName} ${e.lastName || ''}`.trim().toLowerCase();
                    return name.includes(mentionQuery) && e.id !== currentEmployee?.id;
                  })
                  .slice(0, 6);
                if (filtered.length === 0) return null;
                return (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-[180px] overflow-auto" data-testid="mention-dropdown">
                    {filtered.map(emp => {
                      const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm"
                          data-testid={`mention-option-${emp.id}`}
                          onClick={() => {
                            const textBeforeCursor = greetMessage.slice(0, mentionCursorPos);
                            const textAfterCursor = greetMessage.slice(mentionCursorPos);
                            const atStart = textBeforeCursor.lastIndexOf("@");
                            const newText = textBeforeCursor.slice(0, atStart) + `@${empName} ` + textAfterCursor;
                            setGreetMessage(newText);
                            if (!taggedEmployees.find(t => t.id === emp.id)) {
                              setTaggedEmployees([...taggedEmployees, { id: emp.id, name: empName }]);
                            }
                            setShowMentionDropdown(false);
                            setMentionQuery("");
                          }}
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
                            {emp.firstName[0]}
                          </div>
                          <div>
                            <span className="font-medium">{empName}</span>
                            {emp.department && <span className="text-muted-foreground ml-1">- {emp.department}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            {taggedEmployees.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground mr-1">Tagged:</span>
                {taggedEmployees.map(t => (
                  <Badge key={t.id} variant="secondary" className="text-xs gap-1" data-testid={`tagged-${t.id}`}>
                    @{t.name}
                    <button type="button" className="ml-0.5 hover:text-destructive" onClick={() => setTaggedEmployees(taggedEmployees.filter(x => x.id !== t.id))}>x</button>
                  </Badge>
                ))}
              </div>
            )}
            <div className={`p-4 rounded-lg border bg-gradient-to-r ${
              greetBanner === "confetti" ? "from-yellow-50 to-pink-50 dark:from-yellow-900/10 dark:to-pink-900/10 border-yellow-200 dark:border-yellow-800" :
              greetBanner === "balloons" ? "from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border-blue-200 dark:border-blue-800" :
              greetBanner === "cake" ? "from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 border-orange-200 dark:border-orange-800" :
              greetBanner === "stars" ? "from-indigo-50 to-cyan-50 dark:from-indigo-900/10 dark:to-cyan-900/10 border-indigo-200 dark:border-indigo-800" :
              greetBanner === "hearts" ? "from-rose-50 to-pink-50 dark:from-rose-900/10 dark:to-pink-900/10 border-rose-200 dark:border-rose-800" :
              "from-gray-50 to-white dark:from-gray-900/10 dark:to-gray-800/10 border-gray-200 dark:border-gray-700"
            }`}>
              <p className="text-xs text-muted-foreground mb-1">Preview</p>
              <div className="flex items-start gap-2">
                <span className="text-xl">{greetBanner === "confetti" ? "🎊" : greetBanner === "balloons" ? "🎈" : greetBanner === "cake" ? "🎂" : greetBanner === "stars" ? "⭐" : greetBanner === "hearts" ? "❤️" : "🎁"}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">You {greetType === "anniversary" ? "congratulated" : "wished"} {greetTarget?.name}</p>
                  <p className="text-sm text-foreground/70 mt-0.5">{greetMessage || "Your message will appear here..."}</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGreetDialog(false)} data-testid="button-cancel-greet">Cancel</Button>
            <Button
              className={greetType === "anniversary" ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-pink-500 hover:bg-pink-600 text-white"}
              disabled={!greetMessage.trim() || sendWishMutation.isPending}
              onClick={() => {
                if (currentEmployee && greetTarget) {
                  sendWishMutation.mutate({
                    fromEmployeeId: currentEmployee.id,
                    toEmployeeId: greetTarget.id,
                    message: greetMessage.trim(),
                    bannerType: greetBanner,
                    type: greetType,
                    taggedEmployeeIds: taggedEmployees.map(t => t.id),
                  });
                }
              }}
              data-testid="button-send-wish"
            >
              {sendWishMutation.isPending ? "Sending..." : "Send Wish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!docPreviewFile} onOpenChange={(open) => { if (!open) handleDocPreviewReject(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Preview Document
            </DialogTitle>
            <DialogDescription>
              Review the file before uploading. Make sure the document is clear and correct.
            </DialogDescription>
          </DialogHeader>
          {docPreviewFile && (
            <div className="space-y-4">
              <div className="border rounded-lg p-3 bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-foreground mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{docPreviewFile.file.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Size: {(docPreviewFile.file.size / 1024).toFixed(1)} KB &bull; Type: {docPreviewFile.file.type.split('/')[1]?.toUpperCase() || 'File'}
                  &bull; Document: {docPreviewFile.documentName}
                </p>
              </div>

              {docPreviewFile.previewUrl ? (
                docPreviewFile.file.type === 'application/pdf' ? (
                  <div className="border rounded-lg overflow-hidden bg-background" style={{ height: '400px' }}>
                    <iframe
                      src={docPreviewFile.previewUrl}
                      className="w-full h-full"
                      title="PDF Preview"
                      data-testid="iframe-doc-preview"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden bg-background flex items-center justify-center max-h-[400px]">
                    <img
                      src={docPreviewFile.previewUrl}
                      alt="Document preview"
                      className="max-w-full max-h-[400px] object-contain"
                      data-testid="img-doc-preview"
                    />
                  </div>
                )
              ) : (
                <div className="border rounded-lg p-8 bg-background flex flex-col items-center justify-center text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">No preview available</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDocPreviewReject} data-testid="button-doc-preview-reject">
              <XIcon className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleDocPreviewAccept} data-testid="button-doc-preview-accept">
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!essPolicyPreview} onOpenChange={(open) => { if (!open) setEssPolicyPreview(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {essPolicyPreview?.name}
            </DialogTitle>
            {essPolicyPreview?.description && (
              <DialogDescription>{essPolicyPreview.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="px-4 pb-4" style={{ height: "70vh" }}>
            {essPolicyLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading document...</span>
              </div>
            ) : essPolicyBlobUrl ? (
              <iframe
                src={`${essPolicyBlobUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full rounded border"
                title={essPolicyPreview?.name || "Policy Preview"}
                style={{ pointerEvents: "auto" }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Unable to load preview
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

