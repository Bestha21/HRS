import { useState, useRef, useEffect } from "react";
import { useEmployees, useDepartments } from "@/hooks/use-employees";
import { useQuery } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Mail, Phone, Building2, MapPin, Users, UserCheck, Clock, Eye, MoreVertical, Hash, User, LayoutGrid, List, ArrowUpDown, Calendar, Send, Loader2, Copy, Check, Link, Upload, FileSpreadsheet, X, Download, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInYears, differenceInMonths } from "date-fns";

export default function Employees() {
  const { data: employees, isLoading, refetch } = useEmployees();
  const { data: departments } = useDepartments();
  const { entities } = useEntity();
  const { data: salaryStructures } = useQuery<{id: number; name: string; description: string | null; basicPercent: string; hraPercent: string; conveyancePercent: string; daPercent: string; communicationPercent: string; medicalPercent: string}[]>({
    queryKey: ["/api/salary-structures"],
  });
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState<string[]>([]);
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);
  const entityDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (entityDropRef.current && !entityDropRef.current.contains(e.target as Node)) {
        setEntityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "code" | "joinDate" | "tenure">("code");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sendingOnboarding, setSendingOnboarding] = useState<number | null>(null);
  const [onboardingLink, setOnboardingLink] = useState<{ url: string; employeeName: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<"upload" | "select" | "preview" | "result">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [matchField, setMatchField] = useState<string>("employeeCode");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ updated: number; skipped: number; errors: string[]; total: number } | null>(null);

  const handleSendOnboarding = async (employeeId: number) => {
    setSendingOnboarding(employeeId);
    try {
      const res = await fetch("/api/onboarding/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, sendEmail: false }),
      });
      const data = await res.json();
      if (res.ok) {
        const employee = employees?.find(e => e.id === employeeId);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName || ''}`.trim() : 'Employee';
        setOnboardingLink({ url: data.signupUrl, employeeName });
        setLinkCopied(false);
        refetch();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate onboarding link", variant: "destructive" });
    }
    setSendingOnboarding(null);
  };

  const handleCopyLink = async () => {
    if (onboardingLink) {
      await navigator.clipboard.writeText(onboardingLink.url);
      setLinkCopied(true);
      toast({ title: "Copied!", description: "Link copied to clipboard" });
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const locations = Array.from(new Set(employees?.map(e => e.location).filter(Boolean) || []));

  const getTenure = (joinDate: string) => {
    const join = new Date(joinDate);
    const now = new Date();
    const years = differenceInYears(now, join);
    const months = differenceInMonths(now, join) % 12;
    if (years > 0) {
      return `${years}y ${months}m`;
    }
    return `${months}m`;
  };
  
  const filteredEmployees = employees?.filter(e => {
    const fullName = `${e.firstName} ${e.middleName || ''} ${e.lastName || ''}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(search.toLowerCase()) ||
      e.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.designation?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const matchesDept = deptFilter === "all" || e.departmentId?.toString() === deptFilter;
    const matchesLocation = locationFilter === "all" || e.location === locationFilter;
    const matchesEntity = entityFilter.length === 0 || entityFilter.includes(String(e.entityId || "none"));
    
    return matchesSearch && matchesStatus && matchesDept && matchesLocation && matchesEntity;
  })?.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = `${a.firstName} ${a.lastName || ''}`.localeCompare(`${b.firstName} ${b.lastName || ''}`);
        break;
      case "code":
        comparison = (a.employeeCode || '').localeCompare(b.employeeCode || '', undefined, { numeric: true });
        break;
      case "joinDate":
        comparison = new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
        break;
      case "tenure":
        comparison = new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
        break;
      default:
        comparison = (a.employeeCode || '').localeCompare(b.employeeCode || '', undefined, { numeric: true });
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const activeCount = employees?.filter(e => e.status === 'active').length || 0;
  const probationCount = employees?.filter(e => e.employmentStatus === 'probation').length || 0;
  const confirmedCount = employees?.filter(e => e.employmentStatus === 'confirmed').length || 0;

  const getDepartmentName = (deptId: number | null | undefined) => {
    if (!deptId) return "Unassigned";
    return departments?.find(d => d.id === deptId)?.name || "Unknown";
  };

  const getReportingManagerName = (managerCode: string | number | null | undefined) => {
    if (!managerCode) return null;
    const manager = employees?.find(e => e.employeeCode === String(managerCode) || String(e.id) === String(managerCode));
    if (!manager) return null;
    return `${manager.firstName} ${manager.lastName || ''}`.trim();
  };

  const getEmployeeDisplayName = (emp: any) => {
    const parts = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean);
    return parts.join(' ');
  };

  const BULK_UPDATABLE_FIELDS: Record<string, string> = {
    employeeCode: "Employee Code",
    email: "Email",
    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    phone: "Phone",
    gender: "Gender",
    dateOfBirth: "Date of Birth",
    bloodGroup: "Blood Group",
    maritalStatus: "Marital Status",
    designation: "Designation",
    location: "Location",
    employmentType: "Employment Type",
    employmentStatus: "Employment Status",
    status: "Status",
    joinDate: "Join Date",
    actualJoinDate: "Actual Join Date",
    confirmationDate: "Confirmation Date",
    probationEndDate: "Probation End Date",
    departmentId: "Department ID",
    entityId: "Entity ID",
    salaryStructureId: "Salary Structure ID",
    shiftId: "Shift ID",
    projectId: "Project ID",
    reportingManagerId: "Reporting Manager ID",
    vicePresidentId: "Vice President ID",
    hodId: "HOD ID",
    bankName: "Bank Name",
    branchName: "Branch Name",
    bankAccountNumber: "Bank Account Number",
    ifscCode: "IFSC Code",
    panNumber: "PAN Number",
    aadharNumber: "Aadhar Number",
    pfStatus: "PF Status",
    pfNumber: "PF Number",
    esiNumber: "ESI Number",
    uanNumber: "UAN Number",
    taxRegime: "Tax Regime",
    ctc: "CTC",
    variablePay: "Variable Pay",
    retentionBonus: "Retention Bonus",
    retentionBonusDuration: "Retention Bonus Duration",
    locationPermission: "Location Permission",
    biometricDeviceId: "Biometric Device ID",
    attendanceExempt: "Attendance Exempt",
    locationCode: "Location Code",
    accessRole: "Access Role",
    bgvStatus: "BGV Status",
    highestQualification: "Highest Qualification",
    specialization: "Specialization",
    instituteName: "Institute Name",
    currentAddress: "Current Address",
    permanentAddress: "Permanent Address",
    city: "City",
    state: "State",
    pincode: "Pincode",
    emergencyContactName: "Emergency Contact Name",
    emergencyContactPhone: "Emergency Contact Phone",
    emergencyContactRelation: "Emergency Contact Relation",
    sourcingChannel: "Sourcing Channel",
    sourcingName: "Sourcing Name",
    positionType: "Position Type",
    insuranceAnnualPremium: "Insurance Annual Premium",
    healthInsuranceProvider: "Health Insurance Provider",
    healthInsurancePolicyNumber: "Health Insurance Policy Number",
    healthInsuranceSumInsured: "Health Insurance Sum Insured",
    healthInsuranceStartDate: "Health Insurance Start Date",
    healthInsuranceEndDate: "Health Insurance End Date",
    lifeInsuranceProvider: "Life Insurance Provider",
    lifeInsurancePolicyNumber: "Life Insurance Policy Number",
    lifeInsuranceSumInsured: "Life Insurance Sum Insured",
    lifeInsuranceNomineeName: "Life Insurance Nominee Name",
    lifeInsuranceNomineeRelation: "Life Insurance Nominee Relation",
  };

  const CSV_HEADER_ALIASES: Record<string, string> = {
    "emp code": "employeeCode", "employee code": "employeeCode", "empcode": "employeeCode", "emp_code": "employeeCode", "employee_code": "employeeCode", "employeecode": "employeeCode", "code": "employeeCode",
    "email": "email", "email address": "email", "email id": "email", "emailid": "email", "e-mail": "email",
    "first name": "firstName", "firstname": "firstName", "first_name": "firstName", "fname": "firstName",
    "middle name": "middleName", "middlename": "middleName", "middle_name": "middleName", "mname": "middleName",
    "last name": "lastName", "lastname": "lastName", "last_name": "lastName", "lname": "lastName", "surname": "lastName",
    "name": "firstName",
    "phone": "phone", "mobile": "phone", "phone number": "phone", "mobile number": "phone", "contact": "phone", "phone no": "phone", "mobile no": "phone", "contact number": "phone",
    "gender": "gender", "sex": "gender",
    "dob": "dateOfBirth", "date of birth": "dateOfBirth", "dateofbirth": "dateOfBirth", "birth date": "dateOfBirth", "birthday": "dateOfBirth",
    "blood group": "bloodGroup", "bloodgroup": "bloodGroup",
    "marital status": "maritalStatus", "maritalstatus": "maritalStatus",
    "designation": "designation", "title": "designation", "job title": "designation", "position": "designation", "role": "designation",
    "location": "location", "work location": "location", "office location": "location", "branch": "location",
    "department": "departmentId", "dept": "departmentId", "department id": "departmentId",
    "employment type": "employmentType", "emp type": "employmentType", "type": "employmentType",
    "employment status": "employmentStatus", "emp status": "employmentStatus",
    "status": "status",
    "doj": "joinDate", "date of joining": "joinDate", "join date": "joinDate", "joining date": "joinDate", "joindate": "joinDate",
    "actual doj": "actualJoinDate", "actual date of joining": "actualJoinDate", "actual join date": "actualJoinDate", "actual joining date": "actualJoinDate",
    "confirmation date": "confirmationDate", "confirmed date": "confirmationDate",
    "probation end": "probationEndDate", "probation end date": "probationEndDate",
    "entity": "entityId", "company": "entityId", "entity id": "entityId",
    "salary structure": "salaryStructureId", "salary structure id": "salaryStructureId",
    "shift": "shiftId", "shift id": "shiftId",
    "project": "projectId", "project id": "projectId",
    "rm": "reportingManagerId", "reporting manager": "reportingManagerId", "manager": "reportingManagerId", "reporting manager id": "reportingManagerId",
    "vp": "vicePresidentId", "vice president": "vicePresidentId", "vice president id": "vicePresidentId",
    "hod": "hodId", "hod id": "hodId", "head of department": "hodId",
    "bank name": "bankName", "bank": "bankName",
    "branch name": "branchName",
    "bank account": "bankAccountNumber", "account number": "bankAccountNumber", "bank account number": "bankAccountNumber", "account no": "bankAccountNumber",
    "ifsc": "ifscCode", "ifsc code": "ifscCode",
    "pan": "panNumber", "pan number": "panNumber", "pan no": "panNumber",
    "aadhar": "aadharNumber", "aadhaar": "aadharNumber", "aadhar number": "aadharNumber", "aadhaar number": "aadharNumber", "aadhar no": "aadharNumber",
    "pf status": "pfStatus",
    "pf number": "pfNumber", "pf no": "pfNumber", "epf number": "pfNumber",
    "esi": "esiNumber", "esi number": "esiNumber", "esi no": "esiNumber",
    "uan": "uanNumber", "uan number": "uanNumber", "uan no": "uanNumber",
    "tax regime": "taxRegime",
    "ctc": "ctc", "cost to company": "ctc",
    "variable pay": "variablePay",
    "retention bonus": "retentionBonus",
    "location permission": "locationPermission",
    "attendance exempt": "attendanceExempt",
    "biometric device id": "biometricDeviceId", "biometric id": "biometricDeviceId", "device id": "biometricDeviceId", "id (test device)": "biometricDeviceId",
    "location code": "locationCode",
    "bgv": "bgvStatus", "bgv status": "bgvStatus", "background verification": "bgvStatus",
    "qualification": "highestQualification", "highest qualification": "highestQualification", "education": "highestQualification",
    "specialization": "specialization",
    "institute": "instituteName", "institute name": "instituteName", "college": "instituteName", "university": "instituteName",
    "current address": "currentAddress", "address": "currentAddress",
    "permanent address": "permanentAddress",
    "city": "city",
    "state": "state",
    "pincode": "pincode", "pin code": "pincode", "zip": "pincode", "zip code": "pincode", "postal code": "pincode",
    "emergency contact": "emergencyContactName", "emergency contact name": "emergencyContactName",
    "emergency phone": "emergencyContactPhone", "emergency contact phone": "emergencyContactPhone",
    "emergency relation": "emergencyContactRelation", "emergency contact relation": "emergencyContactRelation",
    "sourcing channel": "sourcingChannel", "source": "sourcingChannel",
    "sourcing name": "sourcingName",
    "position type": "positionType", "replacement": "replacedEmployeeName",
    "tenure": "_skip",
    "s.no": "_skip", "s no": "_skip", "sno": "_skip", "sl no": "_skip", "sr no": "_skip", "serial": "_skip", "#": "_skip",
  };

  const autoMapHeaders = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    for (const header of headers) {
      const lower = header.toLowerCase().trim();
      if (CSV_HEADER_ALIASES[lower]) {
        mapping[header] = CSV_HEADER_ALIASES[lower];
      } else if (BULK_UPDATABLE_FIELDS[header]) {
        mapping[header] = header;
      } else {
        mapping[header] = "";
      }
    }
    return mapping;
  };

  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const parseCSV = (text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(",").map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes; }
        else if (line[i] === ',' && !inQuotes) { values.push(current.trim()); current = ""; }
        else { current += line[i]; }
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
      return row;
    });
    return { headers, rows };
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0) {
        toast({ title: "Invalid CSV", description: "CSV must have headers and at least one data row", variant: "destructive" });
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      setSelectedFields([]);
      const mapping = autoMapHeaders(headers);
      setColumnMapping(mapping);
      const mappedValues = Object.values(mapping);
      const hasCode = mappedValues.includes("employeeCode");
      const hasEmail = mappedValues.includes("email");
      setMatchField(hasCode ? "employeeCode" : hasEmail ? "email" : "employeeCode");
      setBulkStep("select");
    };
    reader.readAsText(file);
  };

  const handleBulkApply = async () => {
    setBulkUpdating(true);
    try {
      const mappedRows = csvRows.map(row => {
        const mapped: Record<string, string> = {};
        for (const [csvCol, sysField] of Object.entries(columnMapping)) {
          if (sysField && sysField !== "_skip" && row[csvCol] !== undefined) {
            mapped[sysField] = row[csvCol];
          }
        }
        return mapped;
      });
      const mappedFields = selectedFields.map(csvCol => columnMapping[csvCol]).filter(f => f && f !== "_skip");
      const res = await apiRequest("POST", "/api/employees/bulk-update", {
        rows: mappedRows,
        fields: mappedFields,
        matchField,
      });
      const data = await res.json();
      setBulkResult(data);
      setBulkStep("result");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Bulk update failed", variant: "destructive" });
    }
    setBulkUpdating(false);
  };

  const resetBulkUpdate = () => {
    setBulkStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setSelectedFields([]);
    setBulkResult(null);
    setColumnMapping({});
  };

  const downloadTemplate = () => {
    const templateFields = ["employeeCode", "email", "designation", "departmentId", "phone", "location", "status"];
    const csv = templateFields.join(",") + "\nFCTE001,john@example.com,Engineer,1,9876543210,Bangalore,active";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_update_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Employees</h1>
          <p className="text-muted-foreground mt-1">Manage your team members and roles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetBulkUpdate(); setBulkUpdateOpen(true); }} data-testid="button-bulk-update">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Update
          </Button>
          <Button onClick={() => setLocation("/employees/new")} data-testid="button-add-employee">
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{confirmedCount}</p>
              <p className="text-sm text-muted-foreground">Confirmed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{probationCount}</p>
              <p className="text-sm text-muted-foreground">On Probation</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search by name, code, email, designation..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                </SelectContent>
              </Select>

              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[150px]" data-testid="filter-department">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {locations.length > 0 && (
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-[130px]" data-testid="filter-location">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc} value={loc!}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {entities.length > 0 && (
                <div className="relative" ref={entityDropRef}>
                  <button
                    type="button"
                    onClick={() => setEntityDropdownOpen(!entityDropdownOpen)}
                    className="flex items-center justify-between gap-2 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm min-w-[150px]"
                    data-testid="filter-entity"
                  >
                    <span className="truncate">
                      {entityFilter.length === 0 ? 'All Entities' :
                       entityFilter.length === 1 ? (entities.find(e => String(e.id) === entityFilter[0])?.name || (entityFilter[0] === 'none' ? 'No Entity' : 'Entity')) :
                       `${entityFilter.length} Entities`}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${entityDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {entityDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-56 rounded-md border bg-popover shadow-lg p-1">
                      <label className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                        <input
                          type="checkbox"
                          checked={entityFilter.length === 0}
                          onChange={() => setEntityFilter([])}
                          className="rounded border-gray-300"
                        />
                        All Entities
                      </label>
                      <label className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                        <input
                          type="checkbox"
                          checked={entityFilter.includes("none")}
                          onChange={(ev) => {
                            if (ev.target.checked) setEntityFilter(prev => [...prev, "none"]);
                            else setEntityFilter(prev => prev.filter(v => v !== "none"));
                          }}
                          className="rounded border-gray-300"
                        />
                        No Entity
                      </label>
                      {entities.map(entity => (
                        <label key={entity.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                          <input
                            type="checkbox"
                            checked={entityFilter.includes(String(entity.id))}
                            onChange={(ev) => {
                              if (ev.target.checked) setEntityFilter(prev => [...prev, String(entity.id)]);
                              else setEntityFilter(prev => prev.filter(v => v !== String(entity.id)));
                            }}
                            className="rounded border-gray-300"
                          />
                          {entity.name} ({entity.code})
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[130px]" data-testid="sort-by">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">Employee Code</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="joinDate">Join Date</SelectItem>
                  <SelectItem value="tenure">Tenure</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                data-testid="sort-order"
              >
                <ArrowUpDown className={`w-4 h-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
              </Button>
              
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  data-testid="view-grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  data-testid="view-list"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredEmployees?.length || 0} of {employees?.length || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEmployees?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-1">No employees found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees?.map((employee) => (
            <Card 
              key={employee.id} 
              className="group hover-elevate cursor-pointer" 
              data-testid={`card-employee-${employee.id}`}
              onClick={() => setLocation(`/employees/${employee.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-11 h-11">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {employee.firstName[0]}{(employee.lastName || employee.firstName)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {getEmployeeDisplayName(employee)}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {employee.designation || 'Employee'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Badge variant={employee.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {employee.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocation(`/employees/${employee.id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleSendOnboarding(employee.id)}
                          disabled={sendingOnboarding === employee.id || employee.onboardingStatus === 'completed'}
                          data-testid={`button-send-onboarding-${employee.id}`}
                        >
                          {sendingOnboarding === employee.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Send for Onboarding
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-4 h-4 mr-2" /> Send Email
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {employee.employeeCode && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="w-4 h-4 shrink-0" />
                      <span className="font-medium text-foreground">{employee.employeeCode}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{getDepartmentName(employee.departmentId)}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.reportingManagerId && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4 shrink-0" />
                      <span>Reports to: {getReportingManagerName(employee.reportingManagerId)}</span>
                    </div>
                  )}
                  {employee.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>{employee.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Tenure: {getTenure(employee.joinDate)}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t flex flex-wrap gap-1.5">
                  {employee.employmentStatus && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        employee.employmentStatus === 'confirmed' 
                          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400' 
                          : employee.employmentStatus === 'probation'
                          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400'
                          : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400'
                      }`}
                    >
                      {employee.employmentStatus === 'probation_extension' ? 'Ext. Probation' : employee.employmentStatus}
                    </Badge>
                  )}
                  {employee.employmentType && (
                    <Badge variant="outline" className="text-xs">
                      {employee.employmentType}
                    </Badge>
                  )}
                  {employee.bgvStatus && (
                    <Badge 
                      variant="outline"
                      className={`text-xs ${
                        employee.bgvStatus === 'successful' 
                          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
                          : employee.bgvStatus === 'in_progress'
                          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400'
                          : employee.bgvStatus === 'fail'
                          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400'
                          : ''
                      }`}
                    >
                      BGV: {employee.bgvStatus === 'in_progress' ? 'Pending' : employee.bgvStatus}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Tenure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees?.map((employee) => (
                  <TableRow 
                    key={employee.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/employees/${employee.id}`)}
                    data-testid={`row-employee-${employee.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {employee.firstName[0]}{(employee.lastName || employee.firstName)[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getEmployeeDisplayName(employee)}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{employee.employeeCode || '—'}</TableCell>
                    <TableCell>{getDepartmentName(employee.departmentId)}</TableCell>
                    <TableCell>{employee.designation || '—'}</TableCell>
                    <TableCell>{getTenure(employee.joinDate)}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/employees/${employee.id}`)}>
                            <Eye className="w-4 h-4 mr-2" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleSendOnboarding(employee.id)}
                            disabled={sendingOnboarding === employee.id || employee.onboardingStatus === 'completed'}
                          >
                            {sendingOnboarding === employee.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            Send for Onboarding
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="w-4 h-4 mr-2" /> Send Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={!!onboardingLink} onOpenChange={(open) => !open && setOnboardingLink(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-onboarding-link">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              Onboarding Link Generated
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with <strong>{onboardingLink?.employeeName}</strong> to complete their onboarding process.
            </p>
            <div className="flex gap-2">
              <Input 
                value={onboardingLink?.url || ''} 
                readOnly 
                className="flex-1 text-xs"
                data-testid="input-onboarding-link"
              />
              <Button 
                onClick={handleCopyLink} 
                variant={linkCopied ? "default" : "outline"}
                className="shrink-0"
                data-testid="button-copy-link"
              >
                {linkCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link is valid for 7 days. The employee can use it to set up their account and submit their documents.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkUpdateOpen} onOpenChange={(open) => { if (!open) { setBulkUpdateOpen(false); resetBulkUpdate(); } }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Bulk Update Employees via CSV
            </DialogTitle>
          </DialogHeader>

          {bulkStep === "upload" && (
            <div className="space-y-6 py-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium text-blue-800 dark:text-blue-300">How it works:</p>
                <ol className="list-decimal list-inside text-blue-700 dark:text-blue-400 space-y-1">
                  <li>Upload a CSV file with employee data</li>
                  <li>Choose which field to match employees (Employee Code or Email)</li>
                  <li>Select which fields you want to update</li>
                  <li>Preview changes and apply</li>
                </ol>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={downloadTemplate} data-testid="button-download-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <span className="text-xs text-muted-foreground">Sample CSV with common fields</span>
              </div>
              <div className="border-2 border-dashed rounded-lg p-10 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Drop your CSV file here or click to browse</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="max-w-xs mx-auto"
                  data-testid="input-csv-upload"
                />
              </div>
            </div>
          )}

          {bulkStep === "select" && (
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label className="font-medium">Step 1: How should we identify each employee?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMatchField("employeeCode")}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${matchField === "employeeCode" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <span className="font-medium text-sm">Employee Code</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Match by code (e.g., FCTE001)</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchField("email")}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${matchField === "email" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium text-sm">Email Address</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Match by employee email</p>
                  </button>
                </div>
                {(() => {
                  const matchCsvCol = Object.entries(columnMapping).find(([, sys]) => sys === matchField)?.[0];
                  return matchCsvCol ? (
                    <p className="text-sm text-green-600">CSV column "<strong>{matchCsvCol}</strong>" is mapped to {matchField === "employeeCode" ? "Employee Code" : "Email"}</p>
                  ) : (
                    <p className="text-sm text-red-500">No CSV column is mapped to {matchField === "employeeCode" ? "Employee Code" : "Email"}. Please map one below.</p>
                  );
                })()}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Step 2: Map CSV columns to employee fields</Label>
                  <p className="text-xs text-muted-foreground">{Object.values(columnMapping).filter(v => v && v !== "_skip").length} of {csvHeaders.length} columns mapped</p>
                </div>
                <div className="border rounded-lg overflow-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 sticky top-0 bg-background"></TableHead>
                        <TableHead className="sticky top-0 bg-background font-semibold">CSV Column</TableHead>
                        <TableHead className="sticky top-0 bg-background font-semibold">Maps To</TableHead>
                        <TableHead className="sticky top-0 bg-background font-semibold">Sample Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvHeaders.map(header => {
                        const mapped = columnMapping[header] || "";
                        const isMapped = mapped && mapped !== "_skip" && mapped !== matchField;
                        const isMatchCol = mapped === matchField;
                        const isSkip = mapped === "_skip";
                        return (
                          <TableRow key={header} className={isMatchCol ? "bg-primary/5" : isSkip ? "opacity-50" : ""}>
                            <TableCell className="w-10 p-2">
                              {!isMatchCol && !isSkip && isMapped && (
                                <Checkbox
                                  checked={selectedFields.includes(header)}
                                  onCheckedChange={(checked) => {
                                    if (checked) setSelectedFields(prev => [...prev, header]);
                                    else setSelectedFields(prev => prev.filter(f => f !== header));
                                  }}
                                  data-testid={`checkbox-field-${header}`}
                                />
                              )}
                              {isMatchCol && <span className="text-xs font-medium text-primary">KEY</span>}
                            </TableCell>
                            <TableCell className="font-medium text-sm">{header}</TableCell>
                            <TableCell>
                              <select
                                className="w-full text-sm border rounded px-2 py-1.5 bg-background"
                                value={mapped}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setColumnMapping(prev => ({ ...prev, [header]: newVal }));
                                  if (newVal && newVal !== "_skip" && newVal !== matchField) {
                                    if (!selectedFields.includes(header)) {
                                      setSelectedFields(prev => [...prev, header]);
                                    }
                                  } else {
                                    setSelectedFields(prev => prev.filter(f => f !== header));
                                  }
                                }}
                                data-testid={`select-mapping-${header}`}
                              >
                                <option value="">-- Skip (don't import) --</option>
                                <option value="_skip">Skip</option>
                                {Object.entries(BULK_UPDATABLE_FIELDS).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                              {csvRows[0]?.[header] || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => setBulkStep("upload")}>Back</Button>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{selectedFields.length} field(s) selected for update</span>
                  <Button
                    onClick={() => setBulkStep("preview")}
                    disabled={selectedFields.length === 0 || !Object.values(columnMapping).includes(matchField)}
                    data-testid="button-preview-changes"
                  >
                    Preview Changes ({csvRows.length} rows)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {bulkStep === "preview" && (
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                <p className="text-amber-800 dark:text-amber-300">
                  <strong>{csvRows.length}</strong> rows will be processed. Matching by <strong>{BULK_UPDATABLE_FIELDS[matchField] || matchField}</strong> (CSV column: "{Object.entries(columnMapping).find(([, sys]) => sys === matchField)?.[0] || ""}"). Updating <strong>{selectedFields.length}</strong> field(s): {selectedFields.map(csvCol => BULK_UPDATABLE_FIELDS[columnMapping[csvCol]] || columnMapping[csvCol] || csvCol).join(", ")}.
                </p>
              </div>

              <div className="border rounded-lg overflow-auto max-h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold sticky top-0 bg-background">{BULK_UPDATABLE_FIELDS[matchField] || matchField}</TableHead>
                      {selectedFields.map(csvCol => (
                        <TableHead key={csvCol} className="font-semibold sticky top-0 bg-background">{BULK_UPDATABLE_FIELDS[columnMapping[csvCol]] || csvCol}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.slice(0, 20).map((row, idx) => {
                      const matchCsvCol = Object.entries(columnMapping).find(([, sys]) => sys === matchField)?.[0] || "";
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row[matchCsvCol]}</TableCell>
                          {selectedFields.map(csvCol => (
                            <TableCell key={csvCol}>{row[csvCol] || <span className="text-muted-foreground italic">empty</span>}</TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {csvRows.length > 20 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">Showing first 20 of {csvRows.length} rows</p>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setBulkStep("select")}>Back</Button>
                <Button onClick={handleBulkApply} disabled={bulkUpdating} data-testid="button-apply-bulk-update">
                  {bulkUpdating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : <>Apply Updates</>}
                </Button>
              </div>
            </div>
          )}

          {bulkStep === "result" && bulkResult && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{bulkResult.updated}</p>
                    <p className="text-sm text-muted-foreground">Updated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{bulkResult.skipped}</p>
                    <p className="text-sm text-muted-foreground">Skipped</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-muted-foreground">{bulkResult.total}</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </CardContent>
                </Card>
              </div>

              {bulkResult.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Errors:</p>
                  <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                    {bulkResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => { setBulkUpdateOpen(false); resetBulkUpdate(); }} data-testid="button-close-bulk-result">
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

