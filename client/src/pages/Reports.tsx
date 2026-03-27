import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileText, Download, Plus, Calendar, BarChart3,
  Users, DollarSign, Clock, ClipboardCheck, UserMinus, Gift,
  TrendingUp, Eye, Settings, RefreshCw, Search,
  FileSpreadsheet, Printer, Mail, LayoutDashboard, Layers,
  CheckSquare, Square, AlertTriangle, UserCheck, Fingerprint
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area 
} from "recharts";
import { differenceInYears, format, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import type { Employee, Department } from "@shared/schema";

interface ColumnDef {
  key: string;
  label: string;
  category?: string;
}

const KNOWN_LABELS: Record<string, { label: string; category: string }> = {
  id: { label: "ID", category: "System" },
  employeeId: { label: "Employee ID", category: "Basic" },
  employeeCode: { label: "Employee Code", category: "Basic" },
  employeeName: { label: "Employee Name", category: "Basic" },
  firstName: { label: "First Name", category: "Basic" },
  middleName: { label: "Middle Name", category: "Basic" },
  lastName: { label: "Last Name", category: "Basic" },
  email: { label: "Email", category: "Basic" },
  phone: { label: "Phone", category: "Basic" },
  alternateContactNumber: { label: "Alternate Contact", category: "Basic" },
  personalEmail: { label: "Personal Email", category: "Basic" },
  dateOfBirth: { label: "Date of Birth", category: "Personal" },
  actualDateOfBirth: { label: "Actual DOB", category: "Personal" },
  gender: { label: "Gender", category: "Personal" },
  bloodGroup: { label: "Blood Group", category: "Personal" },
  maritalStatus: { label: "Marital Status", category: "Personal" },
  spouseName: { label: "Spouse Name", category: "Personal" },
  dateOfMarriage: { label: "Date of Marriage", category: "Personal" },
  fatherName: { label: "Father Name", category: "Personal" },
  motherName: { label: "Mother Name", category: "Personal" },
  address: { label: "Address", category: "Address" },
  permanentAddress: { label: "Permanent Address", category: "Address" },
  city: { label: "City", category: "Address" },
  state: { label: "State", category: "Address" },
  country: { label: "Country", category: "Address" },
  pincode: { label: "Pincode", category: "Address" },
  location: { label: "Location", category: "Address" },
  emergencyContactName: { label: "Emergency Contact Name", category: "Emergency" },
  emergencyContactPhone: { label: "Emergency Contact Phone", category: "Emergency" },
  emergencyContactRelation: { label: "Emergency Contact Relation", category: "Emergency" },
  emergencyContact1Name: { label: "Emergency Contact 1 Name", category: "Emergency" },
  emergencyContact1Phone: { label: "Emergency Contact 1 Phone", category: "Emergency" },
  emergencyContact1Relation: { label: "Emergency Contact 1 Relation", category: "Emergency" },
  emergencyContact2Name: { label: "Emergency Contact 2 Name", category: "Emergency" },
  emergencyContact2Phone: { label: "Emergency Contact 2 Phone", category: "Emergency" },
  emergencyContact2Relation: { label: "Emergency Contact 2 Relation", category: "Emergency" },
  departmentId: { label: "Department", category: "Work" },
  designation: { label: "Designation", category: "Work" },
  hodId: { label: "HOD", category: "Work" },
  reportingManagerId: { label: "Reporting Manager", category: "Work" },
  employmentType: { label: "Employment Type", category: "Work" },
  positionType: { label: "Position Type", category: "Work" },
  replacedEmployeeName: { label: "Replaced Employee", category: "Work" },
  employmentStatus: { label: "Employment Status", category: "Work" },
  joinDate: { label: "Join Date", category: "Work" },
  confirmationDate: { label: "Confirmation Date", category: "Work" },
  probationEndDate: { label: "Probation End Date", category: "Work" },
  status: { label: "Status", category: "Status" },
  bgvStatus: { label: "BGV Status", category: "Work" },
  entity: { label: "Entity", category: "Work" },
  accessRole: { label: "Access Role", category: "Work" },
  highestQualification: { label: "Highest Qualification", category: "Education" },
  specialization: { label: "Specialization", category: "Education" },
  instituteName: { label: "Institute Name", category: "Education" },
  qualificationScore: { label: "Qualification Score", category: "Education" },
  secondHighestQualification: { label: "2nd Qualification", category: "Education" },
  secondSpecialization: { label: "2nd Specialization", category: "Education" },
  secondInstituteName: { label: "2nd Institute", category: "Education" },
  secondQualificationScore: { label: "2nd Score", category: "Education" },
  bankName: { label: "Bank Name", category: "Bank & Statutory" },
  branchName: { label: "Branch Name", category: "Bank & Statutory" },
  bankAccountNumber: { label: "Bank Account No", category: "Bank & Statutory" },
  ifscCode: { label: "IFSC Code", category: "Bank & Statutory" },
  panNumber: { label: "PAN Number", category: "Bank & Statutory" },
  aadharNumber: { label: "Aadhar Number", category: "Bank & Statutory" },
  pfStatus: { label: "PF Status", category: "Bank & Statutory" },
  pfNumber: { label: "PF Number", category: "Bank & Statutory" },
  esiNumber: { label: "ESI Number", category: "Bank & Statutory" },
  uanNumber: { label: "UAN Number", category: "Bank & Statutory" },
  taxRegime: { label: "Tax Regime", category: "Bank & Statutory" },
  ctc: { label: "CTC", category: "Compensation" },
  variablePay: { label: "Variable Pay", category: "Compensation" },
  birthdayAllowance: { label: "Birthday Allowance", category: "Compensation" },
  retentionBonus: { label: "Retention Bonus", category: "Compensation" },
  retentionBonusDuration: { label: "Retention Bonus Duration", category: "Compensation" },
  retentionBonusStartDate: { label: "Retention Bonus Start", category: "Compensation" },
  noticeBuyout: { label: "Notice Buyout", category: "Compensation" },
  noticeBuyoutDuration: { label: "Notice Buyout Duration", category: "Compensation" },
  salaryStructureId: { label: "Salary Structure ID", category: "Compensation" },
  sourcingChannel: { label: "Sourcing Channel", category: "Recruitment" },
  sourcingName: { label: "Sourcing Name", category: "Recruitment" },
  insuranceAnnualPremium: { label: "Insurance Annual Premium", category: "Insurance" },
  insuranceEmployeeSharePercent: { label: "Insurance Employee Share %", category: "Insurance" },
  insuranceEmployerSharePercent: { label: "Insurance Employer Share %", category: "Insurance" },
  insuranceCycleStartDate: { label: "Insurance Cycle Start", category: "Insurance" },
  insuranceCycleEndDate: { label: "Insurance Cycle End", category: "Insurance" },
  healthInsuranceProvider: { label: "Health Insurance Provider", category: "Insurance" },
  healthInsurancePolicyNumber: { label: "Health Insurance Policy No", category: "Insurance" },
  healthInsuranceSumInsured: { label: "Health Insurance Sum", category: "Insurance" },
  healthInsuranceStartDate: { label: "Health Insurance Start", category: "Insurance" },
  healthInsuranceEndDate: { label: "Health Insurance End", category: "Insurance" },
  lifeInsuranceProvider: { label: "Life Insurance Provider", category: "Insurance" },
  lifeInsurancePolicyNumber: { label: "Life Insurance Policy No", category: "Insurance" },
  lifeInsuranceSumInsured: { label: "Life Insurance Sum", category: "Insurance" },
  lifeInsuranceNomineeName: { label: "Life Insurance Nominee", category: "Insurance" },
  lifeInsuranceNomineeRelation: { label: "Nominee Relation", category: "Insurance" },
  personalAccidentProvider: { label: "PA Insurance Provider", category: "Insurance" },
  personalAccidentPolicyNumber: { label: "PA Insurance Policy No", category: "Insurance" },
  personalAccidentSumInsured: { label: "PA Insurance Sum", category: "Insurance" },
  onboardingStatus: { label: "Onboarding Status", category: "Other" },
  createdAt: { label: "Created At", category: "Other" },
  updatedAt: { label: "Updated At", category: "Other" },
  authUserId: { label: "Auth User ID", category: "System" },
  profileImageUrl: { label: "Profile Image URL", category: "Other" },
  vicePresidentId: { label: "Vice President ID", category: "Work" },
  projectId: { label: "Project ID", category: "Work" },
  noticeBuyoutPayments: { label: "Notice Buyout Payments", category: "Compensation" },
  date: { label: "Date", category: "Date" },
  checkIn: { label: "Check In", category: "Time" },
  checkOut: { label: "Check Out", category: "Time" },
  workHours: { label: "Work Hours", category: "Time" },
  overtime: { label: "Overtime", category: "Time" },
  checkInLocation: { label: "Check-in Location", category: "Location" },
  checkOutLocation: { label: "Check-out Location", category: "Location" },
  regularizationStatus: { label: "Regularization Status", category: "Regularization" },
  regularizationReason: { label: "Regularization Reason", category: "Regularization" },
  leaveType: { label: "Leave Type", category: "Leave Details" },
  leaveTypeId: { label: "Leave Type ID", category: "Leave Details" },
  startDate: { label: "Start Date", category: "Leave Details" },
  endDate: { label: "End Date", category: "Leave Details" },
  days: { label: "Days", category: "Leave Details" },
  reason: { label: "Reason", category: "Details" },
  approvedBy: { label: "Approved By", category: "Approval" },
  approvedAt: { label: "Approved At", category: "Approval" },
  remarks: { label: "Remarks", category: "Details" },
  month: { label: "Month", category: "Period" },
  year: { label: "Year", category: "Period" },
  basicSalary: { label: "Basic Salary", category: "Earnings" },
  hra: { label: "HRA", category: "Earnings" },
  conveyance: { label: "Conveyance", category: "Earnings" },
  da: { label: "DA", category: "Earnings" },
  communicationAllowance: { label: "Communication Allowance", category: "Earnings" },
  medicalAllowance: { label: "Medical Allowance", category: "Earnings" },
  highAltitudeAllowance: { label: "High Altitude Allowance", category: "Earnings" },
  arrear: { label: "Arrear", category: "Earnings" },
  bonus: { label: "Bonus", category: "Earnings" },
  otherEarnings: { label: "Other Earnings", category: "Earnings" },
  specialAllowance: { label: "Special Allowance", category: "Earnings" },
  otherAllowances: { label: "Other Allowances", category: "Earnings" },
  allowances: { label: "Total Allowances", category: "Earnings" },
  earningsRemarks: { label: "Earnings Remarks", category: "Earnings" },
  overtimePay: { label: "Overtime Pay", category: "Earnings" },
  grossSalary: { label: "Gross Salary", category: "Summary" },
  insurancePremium: { label: "Insurance Premium", category: "Deductions" },
  tds: { label: "TDS", category: "Deductions" },
  incomeTax: { label: "Income Tax", category: "Deductions" },
  advance: { label: "Advance/Loan EMI", category: "Deductions" },
  epf: { label: "EPF", category: "Deductions" },
  pf: { label: "PF", category: "Deductions" },
  esi: { label: "ESI", category: "Deductions" },
  professionalTax: { label: "Professional Tax", category: "Deductions" },
  lwf: { label: "LWF", category: "Deductions" },
  otherDeductions: { label: "Other Deductions", category: "Deductions" },
  deductions: { label: "Total Deductions", category: "Deductions" },
  deductionsRemarks: { label: "Deductions Remarks", category: "Deductions" },
  lopDeduction: { label: "LOP Deduction", category: "Deductions" },
  netSalary: { label: "Net Salary", category: "Summary" },
  totalDays: { label: "Total Days", category: "Summary" },
  lop: { label: "LOP Days", category: "Summary" },
  workingDays: { label: "Working Days", category: "Summary" },
  modeOfPayment: { label: "Mode of Payment", category: "Summary" },
  paidAt: { label: "Paid At", category: "Summary" },
  category: { label: "Category", category: "Details" },
  amount: { label: "Amount", category: "Financial" },
  currency: { label: "Currency", category: "Financial" },
  expenseDate: { label: "Expense Date", category: "Date" },
  description: { label: "Description", category: "Details" },
  receiptUrl: { label: "Receipt URL", category: "Details" },
  reimbursedAt: { label: "Reimbursed At", category: "Financial" },
  assetCode: { label: "Asset Code", category: "Basic" },
  name: { label: "Name", category: "Basic" },
  brand: { label: "Brand", category: "Details" },
  model: { label: "Model", category: "Details" },
  serialNumber: { label: "Serial Number", category: "Details" },
  purchaseDate: { label: "Purchase Date", category: "Purchase" },
  purchasePrice: { label: "Purchase Price", category: "Purchase" },
  warrantyEndDate: { label: "Warranty End Date", category: "Purchase" },
  assignedDate: { label: "Assigned Date", category: "Assignment" },
  returnedDate: { label: "Returned Date", category: "Assignment" },
  condition: { label: "Condition", category: "Status" },
  notes: { label: "Notes", category: "Details" },
};

const SKIP_KEYS = new Set(["authUserId", "profileImageUrl", "password", "passwordHash"]);

function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function buildColumnsFromData(records: any[]): ColumnDef[] {
  const keySet = new Set<string>();
  for (const rec of records) {
    if (rec && typeof rec === 'object') {
      for (const key of Object.keys(rec)) {
        keySet.add(key);
      }
    }
  }

  const columns: ColumnDef[] = [];
  for (const key of keySet) {
    if (SKIP_KEYS.has(key)) continue;
    const known = KNOWN_LABELS[key];
    columns.push({
      key,
      label: known?.label || camelToTitle(key),
      category: known?.category || "Other",
    });
  }

  const catOrder = ["Basic", "Personal", "Work", "Period", "Date", "Time", "Location", "Earnings", "Deductions", "Summary", "Financial", "Leave Details", "Approval", "Details", "Regularization", "Address", "Emergency", "Education", "Bank & Statutory", "Compensation", "Recruitment", "Insurance", "Assignment", "Purchase", "Status", "System", "Other"];
  columns.sort((a, b) => {
    const ai = catOrder.indexOf(a.category || "Other");
    const bi = catOrder.indexOf(b.category || "Other");
    if (ai !== bi) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return (a.label).localeCompare(b.label);
  });

  return columns;
}

const DATA_SOURCE_LABELS: Record<string, string> = {
  employees: "Employees",
  attendance: "Attendance",
  leaves: "Leave Requests",
  payroll: "Payroll",
  expenses: "Expenses",
  assets: "Assets",
};

const COLORS = ['#0066FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

export default function Reports() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees, isLoading: loadingEmp } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: departments, isLoading: loadingDept } = useQuery<Department[]>({
    queryKey: ["/api/departments", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/departments${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const currentYear = new Date().getFullYear();

  const { data: leaveRequests } = useQuery<any[]>({
    queryKey: ["/api/leaves"],
  });

  const { data: payrollRecords } = useQuery<any[]>({
    queryKey: ["/api/payroll", "year", currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/payroll?year=${currentYear}`);
      if (!res.ok) throw new Error("Failed to fetch payroll");
      return res.json();
    },
  });

  const { data: expenses } = useQuery<any[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: assetsData } = useQuery<any[]>({
    queryKey: ["/api/assets"],
  });

  const { data: attendanceData } = useQuery<any[]>({
    queryKey: ["/api/attendance"],
  });

  const { data: exitRecords } = useQuery<any[]>({
    queryKey: ["/api/exit-records"],
  });

  const { data: loansData } = useQuery<any[]>({
    queryKey: ["/api/loans"],
  });

  const { data: holidaysData } = useQuery<any[]>({
    queryKey: ["/api/holidays"],
  });

  const { data: onboardingTasks } = useQuery<any[]>({
    queryKey: ["/api/onboarding-tasks"],
  });

  const { data: leaveBalancesData } = useQuery<any[]>({
    queryKey: ["/api/leave-balances"],
  });

  const { data: leaveTypesData } = useQuery<any[]>({
    queryKey: ["/api/leave-types"],
  });

  const [customDataSource, setCustomDataSource] = useState("employees");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [columnSearch, setColumnSearch] = useState("");

  const rawSourceData = useMemo(() => {
    switch (customDataSource) {
      case "employees": return employees || [];
      case "attendance": return attendanceData || [];
      case "leaves": return leaveRequests || [];
      case "payroll": return payrollRecords || [];
      case "expenses": return expenses || [];
      case "assets": return assetsData || [];
      default: return [];
    }
  }, [customDataSource, employees, attendanceData, leaveRequests, payrollRecords, expenses, assetsData]);

  const availableColumns = useMemo(() => buildColumnsFromData(rawSourceData), [rawSourceData]);

  const filteredColumns = useMemo(() => {
    if (columnSearch === "") return availableColumns;
    return availableColumns.filter(col =>
      col.label.toLowerCase().includes(columnSearch.toLowerCase()) ||
      (col.category || "").toLowerCase().includes(columnSearch.toLowerCase())
    );
  }, [availableColumns, columnSearch]);

  const handleDataSourceChange = useCallback((val: string) => {
    setCustomDataSource(val);
    setSelectedColumns(new Set());
    setColumnSearch("");
  }, []);

  const toggleColumn = useCallback((key: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      filteredColumns.forEach(col => next.add(col.key));
      return next;
    });
  }, [filteredColumns]);

  const deselectAllVisible = useCallback(() => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      filteredColumns.forEach(col => next.delete(col.key));
      return next;
    });
  }, [filteredColumns]);

  const getDataSourceRecords = useCallback(() => {
    const empMap = new Map<number, any>();
    employees?.forEach(e => empMap.set(e.id, e));
    const deptMap = new Map<number, string>();
    departments?.forEach(d => deptMap.set(d.id, d.name));

    const resolveEmployee = (rec: any) => {
      const emp = empMap.get(rec.employeeId);
      return {
        ...rec,
        employeeName: emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : '',
        employeeCode: emp?.employeeCode || rec.employeeCode || '',
      };
    };

    switch (customDataSource) {
      case "employees":
        return (employees || []).map(emp => ({
          ...emp,
          departmentId: deptMap.get(emp.departmentId!) || emp.departmentId || '',
        }));
      case "attendance":
        return (attendanceData || []).map(resolveEmployee);
      case "leaves":
        return (leaveRequests || []).map(resolveEmployee);
      case "payroll":
        return (payrollRecords || []).map(resolveEmployee);
      case "expenses":
        return (expenses || []).map(resolveEmployee);
      case "assets":
        return (assetsData || []).map(a => {
          const emp = a.employeeId ? empMap.get(a.employeeId) : null;
          return {
            ...a,
            employeeName: emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : '',
            employeeCode: emp?.employeeCode || '',
          };
        });
      default:
        return [];
    }
  }, [customDataSource, employees, departments, attendanceData, leaveRequests, payrollRecords, expenses, assetsData]);

  const PRIMARY_DATE_FIELD: Record<string, string> = {
    employees: "joinDate",
    attendance: "date",
    leaves: "startDate",
    payroll: "createdAt",
    expenses: "expenseDate",
    assets: "purchaseDate",
  };

  const exportRecords = useCallback((
    records: any[],
    cols: ColumnDef[],
    source: string,
    dateFrom?: string,
    dateTo?: string,
    filePrefix = "Custom"
  ) => {
    let filtered = records;

    if (dateFrom || dateTo) {
      const dateField = PRIMARY_DATE_FIELD[source] || "createdAt";
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      if (to) to.setHours(23, 59, 59);

      filtered = filtered.filter(rec => {
        const val = rec[dateField];
        if (!val) return false;
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    if (filtered.length === 0) {
      toast({ title: "No data", description: "No records found for the selected criteria", variant: "destructive" });
      return;
    }

    const DATE_KEYS = /date|dob|birth|join|exit|expiry|created|updated|from|to|start|end|check/i;
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const formatDateVal = (val: any): string => {
      if (!val) return '';
      const str = String(val);
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      if (/^\d{4}-\d{2}-\d{2}/.test(str) || /^\d{2}\/\d{2}\/\d{4}/.test(str) || d.getFullYear() > 1970) {
        const day = String(d.getDate()).padStart(2, '0');
        const mon = MONTHS[d.getMonth()];
        const year = d.getFullYear();
        if (/T\d{2}:\d{2}/.test(str)) {
          const hrs = String(d.getHours()).padStart(2, '0');
          const mins = String(d.getMinutes()).padStart(2, '0');
          return `${day}-${mon}-${year} ${hrs}:${mins}`;
        }
        return `${day}-${mon}-${year}`;
      }
      return str;
    };

    const resolveManagerName = (code: any) => {
      if (!code) return '';
      const mgr = employees?.find(x => x.employeeCode === String(code));
      return mgr ? `${mgr.firstName} ${mgr.lastName || ''}`.trim() : String(code);
    };

    const data = filtered.map(rec => {
      const row: Record<string, any> = {};
      cols.forEach(col => {
        let val = rec[col.key];
        if (val === null || val === undefined) val = '';
        else if (col.key === 'reportingManagerId' || col.key === 'hodId') val = resolveManagerName(val);
        else if (col.key === 'departmentId') { const dept = departments?.find((d: any) => d.id === val); val = dept ? dept.name : val; }
        else if (DATE_KEYS.test(col.key)) val = formatDateVal(val);
        row[col.label] = val;
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    const sheetName = DATA_SOURCE_LABELS[source] || source;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    ws['!cols'] = cols.map(() => ({ wch: 20 }));
    const now = new Date();
    const fileDate = `${String(now.getDate()).padStart(2,'0')}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
    XLSX.writeFile(wb, `${filePrefix}_${sheetName.replace(/\s/g, '_')}_Report_${fileDate}.xlsx`);
    toast({
      title: "Report generated",
      description: `${data.length} records with ${cols.length} columns exported`,
    });
  }, [toast]);

  const generateCustomReport = useCallback(() => {
    if (selectedColumns.size === 0) {
      toast({ title: "No columns selected", description: "Please select at least one column to export", variant: "destructive" });
      return;
    }

    const cols = availableColumns.filter(c => selectedColumns.has(c.key));
    const records = getDataSourceRecords();
    exportRecords(records, cols, customDataSource, customDateFrom, customDateTo, "Custom");
  }, [selectedColumns, availableColumns, getDataSourceRecords, customDataSource, customDateFrom, customDateTo, exportRecords, toast]);

  const activeEmployees = useMemo(() => 
    employees?.filter(e => e.status === 'active') || [], [employees]);

  const terminatedEmployees = useMemo(() => 
    employees?.filter(e => e.status === 'terminated' || e.status === 'resigned') || [], [employees]);

  const exitCount = useMemo(() => exitRecords?.length || terminatedEmployees.length, [exitRecords, terminatedEmployees]);

  const avgTenure = useMemo(() => {
    const now = new Date();
    const tenures = activeEmployees
      .filter(e => e.joinDate)
      .map(e => differenceInYears(now, new Date(e.joinDate!)));
    if (tenures.length === 0) return "0";
    const avg = tenures.reduce((a, b) => a + b, 0) / tenures.length;
    return avg.toFixed(1);
  }, [activeEmployees]);

  const attritionRate = useMemo(() => {
    const total = employees?.length || 0;
    if (total === 0) return "0";
    return ((exitCount / total) * 100).toFixed(1);
  }, [employees, exitCount]);

  const pendingLeaves = useMemo(() => 
    leaveRequests?.filter(l => l.status === 'pending').length || 0, [leaveRequests]);

  const totalPayroll = useMemo(() => {
    if (!payrollRecords?.length) return "₹0";
    const total = payrollRecords.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
    if (total >= 10000000) return `₹${(total / 10000000).toFixed(1)}Cr`;
    if (total >= 100000) return `₹${(total / 100000).toFixed(1)}L`;
    if (total >= 1000) return `₹${(total / 1000).toFixed(1)}K`;
    return `₹${total}`;
  }, [payrollRecords]);

  const pendingExpenses = useMemo(() => {
    if (!expenses?.length) return "₹0";
    const pending = expenses.filter(e => e.status === 'pending');
    const total = pending.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    if (total >= 100000) return `₹${(total / 100000).toFixed(1)}L`;
    if (total >= 1000) return `₹${(total / 1000).toFixed(1)}K`;
    return `₹${total}`;
  }, [expenses]);

  const currentMonthHires = useMemo(() => {
    const now = new Date();
    return activeEmployees.filter(e => {
      if (!e.joinDate) return false;
      const d = new Date(e.joinDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [activeEmployees]);

  const currentMonthExits = useMemo(() => {
    const now = new Date();
    if (exitRecords?.length) {
      return exitRecords.filter(e => {
        const exitDate = e.lastWorkingDay || e.createdAt;
        if (!exitDate) return false;
        const d = new Date(exitDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
    }
    return terminatedEmployees.filter(e => {
      if (!e.joinDate) return false;
      const d = new Date(e.joinDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [terminatedEmployees, exitRecords]);

  const dashboardWidgets = useMemo(() => [
    { name: "Headcount", value: employees?.length || 0, change: `${activeEmployees.length} active`, trend: "up" as const },
    { name: "Avg Tenure", value: `${avgTenure} yrs`, change: `${activeEmployees.length} employees`, trend: "up" as const },
    { name: "Attrition Rate", value: `${attritionRate}%`, change: `${exitCount} exits`, trend: exitCount > 0 ? "down" as const : "up" as const },
    { name: "Pending Leaves", value: pendingLeaves, change: `${leaveRequests?.length || 0} total`, trend: pendingLeaves > 5 ? "down" as const : "up" as const },
  ], [employees, activeEmployees, avgTenure, attritionRate, exitCount, pendingLeaves, leaveRequests]);

  const deptData = useMemo(() => 
    departments?.map(d => ({
      name: d.name,
      count: employees?.filter(e => e.departmentId === d.id && e.status === 'active').length || 0
    })).filter(d => d.count > 0) || [], [departments, employees]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; hires: number; exits: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const monthName = format(d, 'MMM');
      const monthNum = d.getMonth();
      const yearNum = d.getFullYear();
      
      const hires = employees?.filter(e => {
        if (!e.joinDate) return false;
        const jd = new Date(e.joinDate);
        return jd.getMonth() === monthNum && jd.getFullYear() === yearNum;
      }).length || 0;
      
      let exits = 0;
      if (exitRecords?.length) {
        exits = exitRecords.filter(e => {
          const exitDate = e.lastWorkingDay || e.createdAt;
          if (!exitDate) return false;
          const ed = new Date(exitDate);
          return ed.getMonth() === monthNum && ed.getFullYear() === yearNum;
        }).length;
      } else {
        exits = terminatedEmployees.filter(e => {
          if (!e.joinDate) return false;
          const jd = new Date(e.joinDate);
          return jd.getMonth() === monthNum && jd.getFullYear() === yearNum;
        }).length;
      }
      
      months.push({ month: monthName, hires, exits });
    }
    
    return months;
  }, [employees, terminatedEmployees, exitRecords]);

  const preBuiltReports = useMemo(() => [
    { id: 1, name: "Employee Master Report", module: "HR Database", icon: Users, description: "Complete employee details — personal, professional, bank, PF, ESI info", format: "Excel", dataKey: "employees", count: employees?.length || 0 },
    { id: 2, name: "New Joinees Report", module: "HR Database", icon: Plus, description: "Employees who joined in the last 3 months", format: "Excel", dataKey: "newjoinees", count: (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return activeEmployees.filter(e => e.joinDate && new Date(e.joinDate) >= d).length; })() },
    { id: 3, name: "Employee Bank Details", module: "HR Database", icon: DollarSign, description: "Bank account details for salary transfer", format: "Excel", dataKey: "bankdetails", count: activeEmployees.length },
    { id: 4, name: "Birthday Report", module: "HR Database", icon: Gift, description: "Employee birthday calendar sorted by month", format: "Excel", dataKey: "birthday", count: activeEmployees.filter(e => e.dateOfBirth).length },
    { id: 5, name: "Work Anniversary Report", module: "HR Database", icon: Calendar, description: "Employee work anniversaries with tenure", format: "Excel", dataKey: "anniversary", count: activeEmployees.filter(e => e.joinDate).length },
    { id: 6, name: "Monthly Attendance Summary", module: "Time & Attendance", icon: ClipboardCheck, description: "Per-employee monthly summary — present, absent, half-day, leave, late, overtime, work hours", format: "Excel", dataKey: "attendance", count: activeEmployees.length },
    { id: 7, name: "Leave Requests Report", module: "Time & Attendance", icon: Calendar, description: "All leave requests with type, dates, days, status, remarks", format: "Excel", dataKey: "leaves", count: leaveRequests?.length || 0 },
    { id: 8, name: "Holiday Calendar Report", module: "Time & Attendance", icon: Calendar, description: "List of all holidays for the organization", format: "Excel", dataKey: "holidays", count: holidaysData?.length || 0 },
    { id: 9, name: "Payroll Register", module: "Payroll", icon: DollarSign, description: "Full salary breakdown — earnings, deductions, net salary, CTC", format: "Excel", dataKey: "payroll", count: payrollRecords?.length || 0 },
    { id: 10, name: "PF/ESI Statutory Report", module: "Statutory", icon: FileSpreadsheet, description: "PF, ESI, PT, LWF contributions from processed payrolls", format: "Excel", dataKey: "statutory", count: payrollRecords?.filter(p => p.status === 'completed' || p.status === 'paid').length || 0 },
    { id: 11, name: "Expense Reimbursement Report", module: "Expenses", icon: Gift, description: "All expense claims — category, amount, date, approval status", format: "Excel", dataKey: "expenses", count: expenses?.length || 0 },
    { id: 12, name: "Loans & Advances Report", module: "Payroll", icon: DollarSign, description: "Employee loans, advances — amount, EMI, tenure, balance", format: "Excel", dataKey: "loans", count: loansData?.length || 0 },
    { id: 13, name: "Attrition Analysis Report", module: "Analytics", icon: UserMinus, description: "Exit details — type, reason, notice period, FnF, clearance", format: "Excel", dataKey: "attrition", count: exitRecords?.length || terminatedEmployees.length },
    { id: 14, name: "Headcount Report", module: "Analytics", icon: TrendingUp, description: "Department-wise headcount — active, probation, confirmed, exits", format: "Excel", dataKey: "headcount", count: deptData.length },
    { id: 15, name: "Asset Allocation Report", module: "Assets", icon: Layers, description: "All assets — assignment, purchase, warranty, condition tracking", format: "Excel", dataKey: "assets", count: assetsData?.length || 0 },
    { id: 16, name: "Leave Balance Report", module: "Time & Attendance", icon: Calendar, description: "Employee-wise leave balance — opening, accrued, used, remaining by leave type", format: "Excel", dataKey: "leavebalance", count: leaveBalancesData?.length || 0 },
    { id: 17, name: "Late Arrival & Early Departure", module: "Time & Attendance", icon: AlertTriangle, description: "Employees arriving after 09:30 AM or leaving before 06:30 PM", format: "Excel", dataKey: "lateearly", count: (() => { const att = attendanceData || []; return att.filter(a => { if (!a.checkIn) return false; const ci = new Date(a.checkIn); const h = ci.getHours(); const m = ci.getMinutes(); const isLate = h > 9 || (h === 9 && m > 30); const isEarly = a.checkOut ? (() => { const co = new Date(a.checkOut); return co.getHours() < 18 || (co.getHours() === 18 && co.getMinutes() < 30); })() : false; return isLate || isEarly; }).length; })() },
    { id: 18, name: "Present/Absent Tracking", module: "Time & Attendance", icon: UserCheck, description: "Daily present/absent status for all employees with summary", format: "Excel", dataKey: "presentabsent", count: attendanceData?.length || 0 },
    { id: 19, name: "Daily Punching Data", module: "Time & Attendance", icon: Fingerprint, description: "Raw punch-in and punch-out times with work hours per day", format: "Excel", dataKey: "punching", count: attendanceData?.filter(a => a.checkIn).length || 0 },
  ], [employees, activeEmployees, attendanceData, leaveRequests, payrollRecords, expenses, assetsData, exitRecords, terminatedEmployees, loansData, holidaysData, deptData, leaveBalancesData]);

  const filteredReports = useMemo(() => {
    return preBuiltReports.filter(report => {
      const matchesSearch = searchTerm === "" || 
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesModule = moduleFilter === "all" || 
        report.module.toLowerCase().includes(moduleFilter.toLowerCase());
      
      return matchesSearch && matchesModule;
    });
  }, [searchTerm, moduleFilter]);

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDate = (val: any): string => {
    if (!val) return '';
    const d = new Date(String(val));
    if (isNaN(d.getTime())) return String(val);
    return `${String(d.getDate()).padStart(2,'0')}-${MONTHS_SHORT[d.getMonth()]}-${d.getFullYear()}`;
  };
  const fmtDateTime = (val: any): string => {
    if (!val) return '';
    const d = new Date(String(val));
    if (isNaN(d.getTime())) return String(val);
    return `${String(d.getDate()).padStart(2,'0')}-${MONTHS_SHORT[d.getMonth()]}-${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const fileDate = () => { const n = new Date(); return `${String(n.getDate()).padStart(2,'0')}-${MONTHS_SHORT[n.getMonth()]}-${n.getFullYear()}`; };
  const num = (v: any) => Number(v) || 0;
  const empName = (empId: number) => { const e = employees?.find(x => x.id === empId); return e ? `${e.firstName} ${e.lastName || ''}`.trim() : ''; };
  const empCode = (empId: number) => employees?.find(x => x.id === empId)?.employeeCode || '';
  const deptName = (deptId: number | null | undefined) => departments?.find(d => d.id === deptId)?.name || '';
  const empDesignation = (empId: number) => employees?.find(x => x.id === empId)?.designation || '';
  const empDept = (empId: number) => { const e = employees?.find(x => x.id === empId); return e ? deptName(e.departmentId) : ''; };

  const writeReport = (data: any[], sheetName: string, fileName: string) => {
    if (!data.length) {
      toast({ title: "No data", description: "No records found to export", variant: "destructive" });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    ws['!cols'] = Object.keys(data[0]).map(() => ({ wch: 20 }));
    XLSX.writeFile(wb, `${fileName}_${fileDate()}.xlsx`);
    toast({ title: "Export successful", description: `${data.length} records exported` });
  };

  const handleReportDownload = (dataKey: string) => {
    switch (dataKey) {
      case 'employees': {
        const vpLookup = (id: any) => { if (!id) return ''; const v = employees?.find(x => x.id === Number(id)); return v ? `${v.firstName} ${v.lastName || ''}`.trim() : ''; };
        const rmLookup = (code: any) => { if (!code) return ''; const rm = employees?.find(x => x.employeeCode === code); return rm ? `${rm.firstName} ${rm.lastName || ''}`.trim() : (code || ''); };
        const data = (employees || []).map(emp => ({
          'Employee Code': emp.employeeCode || '',
          'First Name': emp.firstName,
          'Middle Name': emp.middleName || '',
          'Last Name': emp.lastName || '',
          'Email': emp.email,
          'Personal Email': emp.personalEmail || '',
          'Phone': emp.phone || '',
          'Alternate Contact': emp.alternateContactNumber || '',
          'Date of Birth': fmtDate(emp.dateOfBirth),
          'Actual Date of Birth': fmtDate(emp.actualDateOfBirth),
          'Gender': emp.gender || '',
          'Blood Group': emp.bloodGroup || '',
          'Marital Status': emp.maritalStatus || '',
          'Spouse Name': emp.spouseName || '',
          'Date of Marriage': fmtDate(emp.dateOfMarriage),
          'Father Name': emp.fatherName || '',
          'Mother Name': emp.motherName || '',
          'Address': emp.address || '',
          'Permanent Address': emp.permanentAddress || '',
          'City': emp.city || '',
          'State': emp.state || '',
          'Country': emp.country || '',
          'Pincode': emp.pincode || '',
          'Location': emp.location || '',
          'Emergency Contact 1 Name': emp.emergencyContactName || '',
          'Emergency Contact 1 Phone': emp.emergencyContactPhone || '',
          'Emergency Contact 1 Relation': emp.emergencyContactRelation || '',
          'Emergency Contact 2 Name': emp.emergencyContact1Name || '',
          'Emergency Contact 2 Phone': emp.emergencyContact1Phone || '',
          'Emergency Contact 2 Relation': emp.emergencyContact1Relation || '',
          'Emergency Contact 3 Name': emp.emergencyContact2Name || '',
          'Emergency Contact 3 Phone': emp.emergencyContact2Phone || '',
          'Emergency Contact 3 Relation': emp.emergencyContact2Relation || '',
          'Department': deptName(emp.departmentId),
          'Designation': emp.designation || '',
          'Entity': emp.entity || '',
          'Employment Type': emp.employmentType || '',
          'Position Type': emp.positionType || '',
          'Replaced Employee Name': emp.replacedEmployeeName || '',
          'Employment Status': emp.employmentStatus || '',
          'Status': emp.status || '',
          'Join Date': fmtDate(emp.joinDate),
          'Confirmation Date': fmtDate(emp.confirmationDate),
          'Probation End Date': fmtDate(emp.probationEndDate),
          'BGV Status': emp.bgvStatus || '',
          'Reporting Manager': rmLookup(emp.reportingManagerId),
          'HOD': rmLookup(emp.hodId),
          'Vice President': vpLookup(emp.vicePresidentId),
          'Highest Qualification': emp.highestQualification || '',
          'Specialization': emp.specialization || '',
          'Institute Name': emp.instituteName || '',
          'Qualification Score': emp.qualificationScore || '',
          '2nd Highest Qualification': emp.secondHighestQualification || '',
          '2nd Specialization': emp.secondSpecialization || '',
          '2nd Institute Name': emp.secondInstituteName || '',
          '2nd Qualification Score': emp.secondQualificationScore || '',
          'Bank Name': emp.bankName || '',
          'Branch Name': emp.branchName || '',
          'Account No': emp.bankAccountNumber || '',
          'IFSC': emp.ifscCode || '',
          'PAN': emp.panNumber || '',
          'Aadhar': emp.aadharNumber || '',
          'PF Status': emp.pfStatus || '',
          'PF Number': emp.pfNumber || '',
          'UAN': emp.uanNumber || '',
          'ESI Number': emp.esiNumber || '',
          'Tax Regime': emp.taxRegime || '',
          'CTC': num(emp.ctc),
          'Variable Pay': num(emp.variablePay),
          'Birthday Allowance': num(emp.birthdayAllowance),
          'Retention Bonus': num(emp.retentionBonus),
          'Retention Bonus Duration': emp.retentionBonusDuration || '',
          'Retention Bonus Start Date': fmtDate(emp.retentionBonusStartDate),
          'Notice Buyout': num(emp.noticeBuyout),
          'Notice Buyout Duration': emp.noticeBuyoutDuration || '',
          'Notice Buyout Payments': emp.noticeBuyoutPayments ?? '',
          'Sourcing Channel': emp.sourcingChannel || '',
          'Sourcing Name': emp.sourcingName || '',
          'Location Permission': emp.locationPermission || '',
          'Attendance Exempt': emp.attendanceExempt ? 'Yes' : 'No',
          'Access Role': emp.accessRole || '',
          'Onboarding Status': emp.onboardingStatus || '',
          'Insurance Annual Premium': num(emp.insuranceAnnualPremium),
          'Insurance Employee Share %': emp.insuranceEmployeeSharePercent || '',
          'Insurance Employer Share %': emp.insuranceEmployerSharePercent || '',
          'Insurance Cycle Start': fmtDate(emp.insuranceCycleStartDate),
          'Insurance Cycle End': fmtDate(emp.insuranceCycleEndDate),
          'Health Insurance Provider': emp.healthInsuranceProvider || '',
          'Health Insurance Policy No': emp.healthInsurancePolicyNumber || '',
          'Health Insurance Sum Insured': emp.healthInsuranceSumInsured || '',
          'Health Insurance Start': fmtDate(emp.healthInsuranceStartDate),
          'Health Insurance End': fmtDate(emp.healthInsuranceEndDate),
          'Life Insurance Provider': emp.lifeInsuranceProvider || '',
          'Life Insurance Policy No': emp.lifeInsurancePolicyNumber || '',
          'Life Insurance Sum Insured': emp.lifeInsuranceSumInsured || '',
          'Life Insurance Nominee': emp.lifeInsuranceNomineeName || '',
          'Life Insurance Nominee Relation': emp.lifeInsuranceNomineeRelation || '',
          'Personal Accident Provider': emp.personalAccidentProvider || '',
          'Personal Accident Policy No': emp.personalAccidentPolicyNumber || '',
          'Personal Accident Sum Insured': emp.personalAccidentSumInsured || '',
        }));
        return writeReport(data, 'Employee Master', 'Employee_Master_Report');
      }
      case 'attendance': {
        const now = new Date();
        const cycleMonth = now.getMonth();
        const cycleYear = now.getFullYear();
        const prevMonth = cycleMonth === 0 ? 11 : cycleMonth - 1;
        const prevYear = cycleMonth === 0 ? cycleYear - 1 : cycleYear;
        const cycleStart = new Date(prevYear, prevMonth, 26);
        const cycleEnd = new Date(cycleYear, cycleMonth, 25);
        const allAtt = attendanceData || [];
        const empSummaryMap = new Map<number, {
          present: number; absent: number; halfDay: number; leave: number;
          weekend: number; holiday: number; late: number; totalWorkHours: number;
          totalOvertime: number; regularized: number; workingDays: number;
        }>();
        activeEmployees.forEach(emp => {
          empSummaryMap.set(emp.id, {
            present: 0, absent: 0, halfDay: 0, leave: 0,
            weekend: 0, holiday: 0, late: 0, totalWorkHours: 0,
            totalOvertime: 0, regularized: 0, workingDays: 0,
          });
        });
        allAtt.forEach(a => {
          const d = new Date(a.date);
          if (d < cycleStart || d > cycleEnd) return;
          const s = empSummaryMap.get(a.employeeId);
          if (!s) return;
          const status = (a.status || '').toLowerCase();
          if (status === 'present') { s.present++; s.workingDays++; }
          else if (status === 'absent') s.absent++;
          else if (status === 'half_day' || status === 'half-day' || status === 'halfday') { s.halfDay++; s.workingDays += 0.5; }
          else if (status === 'leave') s.leave++;
          else if (status === 'weekend') s.weekend++;
          else if (status === 'holiday') s.holiday++;
          if (a.checkIn) {
            const ci = new Date(a.checkIn);
            const h = ci.getHours();
            const m = ci.getMinutes();
            if (h > 9 || (h === 9 && m > 30)) s.late++;
          }
          s.totalWorkHours += parseFloat(a.workHours || '0');
          s.totalOvertime += parseFloat(a.overtime || '0');
          if (a.regularizationStatus === 'approved') s.regularized++;
        });
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const cycleLabel = `${monthNames[cycleMonth]} ${cycleYear}`;
        const cycleDateRange = `26 ${monthNames[prevMonth].substring(0,3)} ${prevYear} – 25 ${monthNames[cycleMonth].substring(0,3)} ${cycleYear}`;
        const data = activeEmployees.map(emp => {
          const s = empSummaryMap.get(emp.id)!;
          return {
            'Employee Code': emp.employeeCode || '',
            'Employee Name': `${emp.firstName} ${emp.lastName || ''}`.trim(),
            'Department': deptName(emp.departmentId),
            'Designation': emp.designation || '',
            'Cycle': cycleLabel,
            'Cycle Period': cycleDateRange,
            'Present Days': s.present,
            'Half Days': s.halfDay,
            'Absent Days': s.absent,
            'Leave Days': s.leave,
            'Weekends': s.weekend,
            'Holidays': s.holiday,
            'Effective Working Days': s.workingDays,
            'Late Arrivals': s.late,
            'Total Work Hours': s.totalWorkHours.toFixed(1),
            'Total Overtime Hours': s.totalOvertime.toFixed(1),
            'Regularized': s.regularized,
          };
        });
        return writeReport(data, 'Monthly Attendance Summary', `Monthly_Attendance_Summary_${monthNames[cycleMonth]}_${cycleYear}`);
      }
      case 'leaves': {
        const data = (leaveRequests || []).map(l => ({
          'Employee Code': empCode(l.employeeId),
          'Employee Name': empName(l.employeeId),
          'Department': empDept(l.employeeId),
          'Leave Type': l.leaveType || '',
          'Start Date': fmtDate(l.startDate),
          'End Date': fmtDate(l.endDate),
          'Days': l.days || '',
          'Reason': l.reason || '',
          'Status': l.status || '',
          'Applied On': fmtDate(l.createdAt),
          'Remarks': l.remarks || '',
        }));
        return writeReport(data, 'Leave Requests', 'Leave_Report');
      }
      case 'payroll': {
        const data = (payrollRecords || []).map(p => ({
          'Employee Code': empCode(p.employeeId),
          'Employee Name': empName(p.employeeId) || p.employeeName || '',
          'Department': empDept(p.employeeId),
          'Designation': empDesignation(p.employeeId),
          'Month': p.month || '',
          'Year': p.year || '',
          'Basic': num(p.basicSalary),
          'HRA': num(p.hra),
          'DA': num(p.da),
          'Conveyance': num(p.conveyance),
          'Communication': num(p.communicationAllowance),
          'Medical': num(p.medicalAllowance),
          'Special Allowance': num(p.specialAllowance),
          'Variable Pay': num(p.variablePay),
          'Birthday Allowance': num(p.birthdayAllowance),
          'Arrear': num(p.arrear),
          'Bonus': num(p.bonus),
          'Other Earnings': num(p.otherEarnings),
          'Overtime Pay': num(p.overtimePay),
          'Gross Salary': num(p.grossSalary),
          'EPF': num(p.epf),
          'ESI': num(p.esi),
          'Professional Tax': num(p.professionalTax),
          'TDS': num(p.tds),
          'Income Tax': num(p.incomeTax),
          'Insurance': num(p.insurancePremium),
          'Advance/Loan': num(p.advance),
          'LWF': num(p.lwf),
          'LOP Days': num(p.lop),
          'LOP Deduction': num(p.lopDeduction),
          'Other Deductions': num(p.otherDeductions),
          'Net Salary': num(p.netSalary),
          'CTC': num(p.ctc),
          'Payment Mode': p.modeOfPayment || '',
          'Status': p.status || '',
          'Paid Date': fmtDate(p.paidAt),
        }));
        return writeReport(data, 'Payroll Register', 'Payroll_Register');
      }
      case 'statutory': {
        const data = (payrollRecords || []).filter(p => p.status === 'completed' || p.status === 'paid').map(p => {
          const emp = employees?.find(x => x.id === p.employeeId);
          return {
            'Employee Code': emp?.employeeCode || '',
            'Employee Name': empName(p.employeeId),
            'PF Number': emp?.pfNumber || '',
            'UAN': emp?.uanNumber || '',
            'ESI Number': emp?.esiNumber || '',
            'Month': p.month || '',
            'Year': p.year || '',
            'Basic + DA': num(p.basicSalary) + num(p.da),
            'Gross Salary': num(p.grossSalary),
            'EPF (Employee)': num(p.epf),
            'EPF (Employer)': num(p.epf),
            'ESI (Employee)': num(p.esi),
            'Professional Tax': num(p.professionalTax),
            'LWF': num(p.lwf),
          };
        });
        return writeReport(data, 'PF ESI Statutory', 'Statutory_Compliance_Report');
      }
      case 'expenses': {
        const data = (expenses || []).map(e => ({
          'Employee Code': empCode(e.employeeId),
          'Employee Name': empName(e.employeeId),
          'Department': empDept(e.employeeId),
          'Category': e.category || '',
          'Amount (₹)': num(e.amount),
          'Expense Date': fmtDate(e.expenseDate || e.date),
          'Description': e.description || '',
          'Status': e.status || '',
          'Approved Date': fmtDate(e.approvedAt),
          'Created On': fmtDate(e.createdAt),
        }));
        return writeReport(data, 'Expenses', 'Expense_Reimbursement_Report');
      }
      case 'attrition': {
        const exitData = (exitRecords || []).map(ex => {
          const emp = employees?.find(x => x.id === ex.employeeId);
          return {
            'Employee Code': emp?.employeeCode || '',
            'Employee Name': empName(ex.employeeId),
            'Department': empDept(ex.employeeId),
            'Designation': empDesignation(ex.employeeId),
            'Join Date': fmtDate(emp?.joinDate),
            'Exit Type': ex.exitType || '',
            'Resignation Date': fmtDate(ex.resignationDate),
            'Last Working Date': fmtDate(ex.lastWorkingDate),
            'Reason': ex.reason || '',
            'Notice Period Days': ex.noticePeriodDays || '',
            'Exit Interview Done': ex.exitInterviewDone ? 'Yes' : 'No',
            'Clearance Status': ex.clearanceStatus || '',
            'FnF Status': ex.fnfStatus || '',
            'FnF Amount': num(ex.fnfAmount),
          };
        });
        if (exitData.length === 0) {
          const data = terminatedEmployees.map(emp => ({
            'Employee Code': emp.employeeCode || '',
            'Name': `${emp.firstName} ${emp.lastName || ''}`.trim(),
            'Department': deptName(emp.departmentId),
            'Designation': emp.designation || '',
            'Join Date': fmtDate(emp.joinDate),
            'Status': emp.status || '',
          }));
          return writeReport(data, 'Attrition', 'Attrition_Analysis_Report');
        }
        return writeReport(exitData, 'Attrition', 'Attrition_Analysis_Report');
      }
      case 'headcount': {
        const data = (departments || []).map(d => {
          const deptEmps = employees?.filter(e => e.departmentId === d.id) || [];
          const active = deptEmps.filter(e => e.status === 'active').length;
          const probation = deptEmps.filter(e => e.employmentStatus === 'probation' && e.status === 'active').length;
          const confirmed = deptEmps.filter(e => e.employmentStatus === 'confirmed' && e.status === 'active').length;
          const terminated = deptEmps.filter(e => e.status === 'terminated' || e.status === 'resigned').length;
          return {
            'Department': d.name,
            'Total Active': active,
            'Probation': probation,
            'Confirmed': confirmed,
            'Terminated/Resigned': terminated,
            'Total': deptEmps.length,
          };
        }).filter(d => d['Total'] > 0);
        return writeReport(data, 'Headcount', 'Headcount_Report');
      }
      case 'assets': {
        const data = (assetsData || []).map(a => ({
          'Asset Code': a.assetCode || '',
          'Asset Name': a.name || '',
          'Category': a.category || '',
          'Brand': a.brand || '',
          'Model': a.model || '',
          'Serial Number': a.serialNumber || '',
          'Assigned To (Code)': a.employeeId ? empCode(a.employeeId) : '',
          'Assigned To (Name)': a.employeeId ? empName(a.employeeId) : '',
          'Department': a.employeeId ? empDept(a.employeeId) : '',
          'Purchase Date': fmtDate(a.purchaseDate),
          'Purchase Price': num(a.purchasePrice),
          'Warranty End': fmtDate(a.warrantyEndDate),
          'Assigned Date': fmtDate(a.assignedDate),
          'Returned Date': fmtDate(a.returnedDate),
          'Status': a.status || '',
          'Condition': a.condition || '',
        }));
        return writeReport(data, 'Assets', 'Asset_Allocation_Report');
      }
      case 'loans': {
        const data = (loansData || []).map(l => ({
          'Employee Code': empCode(l.employeeId),
          'Employee Name': empName(l.employeeId),
          'Department': empDept(l.employeeId),
          'Loan Type': l.loanType || l.type || '',
          'Amount (₹)': num(l.amount),
          'EMI (₹)': num(l.emiAmount || l.emi),
          'Tenure (Months)': l.tenure || '',
          'Remaining Balance': num(l.remainingBalance || l.balance),
          'Applied Date': fmtDate(l.appliedDate || l.createdAt),
          'Approved Date': fmtDate(l.approvedDate || l.approvedAt),
          'Status': l.status || '',
          'Remarks': l.remarks || '',
        }));
        return writeReport(data, 'Loans & Advances', 'Loans_Advances_Report');
      }
      case 'holidays': {
        const data = (holidaysData || []).map(h => ({
          'Holiday Name': h.name || '',
          'Date': fmtDate(h.date),
          'Type': h.type || '',
          'Year': h.year || '',
          'Description': h.description || '',
        }));
        return writeReport(data, 'Holidays', 'Holiday_Calendar_Report');
      }
      case 'birthday': {
        const data = activeEmployees
          .filter(e => e.dateOfBirth)
          .map(e => {
            const dob = new Date(e.dateOfBirth!);
            return {
              'Employee Code': e.employeeCode || '',
              'Name': `${e.firstName} ${e.lastName || ''}`.trim(),
              'Department': deptName(e.departmentId),
              'Designation': e.designation || '',
              'Date of Birth': fmtDate(e.dateOfBirth),
              'Birthday Month': MONTHS_SHORT[dob.getMonth()],
              'Birthday Day': dob.getDate(),
            };
          })
          .sort((a, b) => {
            const mA = MONTHS_SHORT.indexOf(a['Birthday Month']);
            const mB = MONTHS_SHORT.indexOf(b['Birthday Month']);
            return mA !== mB ? mA - mB : a['Birthday Day'] - b['Birthday Day'];
          });
        return writeReport(data, 'Birthdays', 'Birthday_Report');
      }
      case 'anniversary': {
        const data = activeEmployees
          .filter(e => e.joinDate)
          .map(e => {
            const jd = new Date(e.joinDate!);
            const years = differenceInYears(new Date(), jd);
            return {
              'Employee Code': e.employeeCode || '',
              'Name': `${e.firstName} ${e.lastName || ''}`.trim(),
              'Department': deptName(e.departmentId),
              'Designation': e.designation || '',
              'Join Date': fmtDate(e.joinDate),
              'Anniversary Month': MONTHS_SHORT[jd.getMonth()],
              'Years Completed': years,
            };
          })
          .sort((a, b) => {
            const mA = MONTHS_SHORT.indexOf(a['Anniversary Month']);
            const mB = MONTHS_SHORT.indexOf(b['Anniversary Month']);
            return mA !== mB ? mA - mB : a['Years Completed'] - b['Years Completed'];
          });
        return writeReport(data, 'Work Anniversaries', 'Work_Anniversary_Report');
      }
      case 'bankdetails': {
        const data = activeEmployees.map(e => ({
          'Employee Code': e.employeeCode || '',
          'Name': `${e.firstName} ${e.lastName || ''}`.trim(),
          'Department': deptName(e.departmentId),
          'Bank Name': e.bankName || '',
          'Branch': e.branchName || '',
          'Account Number': e.bankAccountNumber || '',
          'IFSC Code': e.ifscCode || '',
          'PAN': e.panNumber || '',
          'Net Salary': (() => {
            const latest = payrollRecords?.filter(p => p.employeeId === e.id).sort((a: any, b: any) => (b.year || 0) - (a.year || 0))[0];
            return latest ? num(latest.netSalary) : '';
          })(),
        }));
        return writeReport(data, 'Bank Details', 'Employee_Bank_Details');
      }
      case 'newjoinees': {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const data = activeEmployees
          .filter(e => e.joinDate && new Date(e.joinDate) >= threeMonthsAgo)
          .map(e => ({
            'Employee Code': e.employeeCode || '',
            'Name': `${e.firstName} ${e.lastName || ''}`.trim(),
            'Department': deptName(e.departmentId),
            'Designation': e.designation || '',
            'Join Date': fmtDate(e.joinDate),
            'Employment Type': e.employmentType || '',
            'Employment Status': e.employmentStatus || '',
            'Location': e.location || '',
            'Reporting Manager': (() => { const rm = employees?.find(x => x.employeeCode === e.reportingManagerId); return rm ? `${rm.firstName} ${rm.lastName || ''}`.trim() : (e.reportingManagerId || ''); })(),
          }));
        return writeReport(data, 'New Joinees', 'New_Joinees_Report');
      }
      case 'leavebalance': {
        const ltMap = new Map((leaveTypesData || []).map((lt: any) => [lt.id, lt.name || lt.leaveType || '']));
        const data = (leaveBalancesData || []).map((lb: any) => ({
          'Employee Code': empCode(lb.employeeId),
          'Employee Name': empName(lb.employeeId),
          'Department': empDept(lb.employeeId),
          'Leave Type': ltMap.get(lb.leaveTypeId) || lb.leaveTypeId || '',
          'Year': lb.year || '',
          'Opening': num(lb.opening),
          'Accrued': num(lb.accrued),
          'Used': num(lb.used),
          'Balance': num(lb.balance),
        }));
        return writeReport(data, 'Leave Balances', 'Leave_Balance_Report');
      }
      case 'lateearly': {
        const att = (attendanceData || []).filter(a => {
          if (!a.checkIn) return false;
          const ci = new Date(a.checkIn);
          const h = ci.getHours();
          const m = ci.getMinutes();
          const isLate = h > 9 || (h === 9 && m > 30);
          const isEarly = a.checkOut ? (() => { const co = new Date(a.checkOut); return co.getHours() < 18 || (co.getHours() === 18 && co.getMinutes() < 30); })() : false;
          return isLate || isEarly;
        });
        const data = att.map(a => {
          const ci = new Date(a.checkIn);
          const ciTime = fmtDateTime(a.checkIn);
          const coTime = a.checkOut ? fmtDateTime(a.checkOut) : '';
          const isLate = ci.getHours() > 9 || (ci.getHours() === 9 && ci.getMinutes() > 30);
          const isEarly = a.checkOut ? (() => { const co = new Date(a.checkOut); return co.getHours() < 18 || (co.getHours() === 18 && co.getMinutes() < 30); })() : false;
          return {
            'Employee Code': empCode(a.employeeId),
            'Employee Name': empName(a.employeeId),
            'Department': empDept(a.employeeId),
            'Date': fmtDate(a.date),
            'Check In': ciTime,
            'Check Out': coTime,
            'Late Arrival': isLate ? 'Yes' : 'No',
            'Early Departure': isEarly ? 'Yes' : 'No',
            'Work Hours': a.workHours || '',
            'Status': a.status || '',
          };
        });
        return writeReport(data, 'Late & Early', 'Late_Arrival_Early_Departure_Report');
      }
      case 'presentabsent': {
        const data = (attendanceData || []).map(a => ({
          'Employee Code': empCode(a.employeeId),
          'Employee Name': empName(a.employeeId),
          'Department': empDept(a.employeeId),
          'Designation': empDesignation(a.employeeId),
          'Date': fmtDate(a.date),
          'Status': a.status || 'Absent',
          'Check In': a.checkIn ? fmtDateTime(a.checkIn) : '-',
          'Check Out': a.checkOut ? fmtDateTime(a.checkOut) : '-',
          'Work Hours': a.workHours || '0',
          'Location': a.location || '',
        }));
        return writeReport(data, 'Present Absent', 'Present_Absent_Tracking_Report');
      }
      case 'punching': {
        const data = (attendanceData || []).filter(a => a.checkIn).map(a => ({
          'Employee Code': empCode(a.employeeId),
          'Employee Name': empName(a.employeeId),
          'Department': empDept(a.employeeId),
          'Date': fmtDate(a.date),
          'Punch In': fmtDateTime(a.checkIn),
          'Punch Out': a.checkOut ? fmtDateTime(a.checkOut) : '-',
          'Work Hours': a.workHours || '',
          'Overtime': a.overtime || '0',
          'Status': a.status || '',
          'Location': a.location || '',
        }));
        return writeReport(data, 'Punching Data', 'Daily_Punching_Data_Report');
      }
      default:
        toast({ title: "Coming soon", description: "This report type will be available soon" });
    }
  };

  if (loadingEmp || loadingDept) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading reports data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-reports-title">Workforce Analytics & Reports</h1>
          <p className="text-muted-foreground">Real-time reports, analytics, and dashboards</p>
        </div>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="reports" data-testid="tab-reports">Pre-built Reports</TabsTrigger>
          <TabsTrigger value="custom" data-testid="tab-custom">Custom Reports</TabsTrigger>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboards</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Pre-built Reports from All Modules
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Search reports..." 
                      className="pl-9 w-64" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search-reports" 
                    />
                  </div>
                  <Select value={moduleFilter} onValueChange={setModuleFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Module" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      <SelectItem value="hr">HR Database</SelectItem>
                      <SelectItem value="attendance">Time & Attendance</SelectItem>
                      <SelectItem value="payroll">Payroll</SelectItem>
                      <SelectItem value="expenses">Expenses</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="statutory">Statutory</SelectItem>
                      <SelectItem value="assets">Assets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReports.map((report) => (
                  <div key={report.id} className="p-4 bg-muted/50 rounded-lg border hover:shadow-md transition-shadow" data-testid={`report-card-${report.id}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <report.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">{report.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">{report.module}</Badge>
                              <Badge variant="outline" className="text-xs">{report.count} records</Badge>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 shrink-0">{report.format}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{report.description}</p>
                        <div className="flex items-center justify-end mt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleReportDownload(report.dataKey)}
                            data-testid={`button-download-report-${report.id}`}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredReports.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No reports match your search criteria
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Report Builder
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" data-testid="badge-selected-count">
                      {selectedColumns.size > 0 ? `${selectedColumns.size} of ${availableColumns.length} columns` : "No columns selected"}
                    </Badge>
                    <Badge variant="secondary">
                      {rawSourceData.length} records
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex-1 min-w-[160px]">
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Data Source</label>
                      <Select value={customDataSource} onValueChange={handleDataSourceChange}>
                        <SelectTrigger data-testid="select-data-source">
                          <SelectValue placeholder="Select data source" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DATA_SOURCE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-sm font-medium text-foreground mb-1.5 block">From Date</label>
                      <Input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        data-testid="input-custom-date-from"
                      />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-sm font-medium text-foreground mb-1.5 block">To Date</label>
                      <Input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        data-testid="input-custom-date-to"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[2fr_3fr] gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Columns</div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={selectAllVisible} data-testid="button-select-all">
                            <CheckSquare className="w-3 h-3 mr-1" />
                            All
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={deselectAllVisible} data-testid="button-deselect-all">
                            <Square className="w-3 h-3 mr-1" />
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="border rounded-lg overflow-hidden flex flex-col">
                        <div className="px-2 py-1.5 border-b bg-muted/30 shrink-0">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Search columns..."
                              className="pl-7 h-7 text-sm border-0 bg-transparent focus-visible:ring-0 shadow-none"
                              value={columnSearch}
                              onChange={(e) => setColumnSearch(e.target.value)}
                              data-testid="input-column-search"
                            />
                          </div>
                        </div>
                        <div className="max-h-[320px] overflow-y-auto">
                          {filteredColumns.filter(col => !selectedColumns.has(col.key)).length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              {filteredColumns.length === 0 ? "No columns match your search" : "All matching columns selected"}
                            </p>
                          ) : (
                            filteredColumns.filter(col => !selectedColumns.has(col.key)).map(col => (
                              <label
                                key={col.key}
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 text-sm"
                                data-testid={`column-${col.key}`}
                              >
                                <Checkbox
                                  checked={false}
                                  onCheckedChange={() => toggleColumn(col.key)}
                                />
                                <span className="flex-1 truncate">{col.label}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Selected Columns ({selectedColumns.size})
                      </div>
                      <div className="border rounded-lg max-h-[356px] overflow-y-auto bg-muted/20">
                        {selectedColumns.size === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">No columns selected yet</p>
                        ) : (
                          availableColumns.filter(col => selectedColumns.has(col.key)).map(col => (
                            <label
                              key={col.key}
                              className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 text-sm"
                              data-testid={`selected-column-${col.key}`}
                            >
                              <Checkbox
                                checked={true}
                                onCheckedChange={() => toggleColumn(col.key)}
                              />
                              <span className="flex-1 truncate">{col.label}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button className="w-full" size="lg" onClick={generateCustomReport} disabled={selectedColumns.size === 0} data-testid="button-generate-custom-report">
                      <Download className="w-4 h-4 mr-2" />
                      {selectedColumns.size > 0 ? `Generate & Download (${selectedColumns.size} columns)` : 'Select columns to export'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="w-5 h-5 text-primary" />
                  Quick Export — Download All Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(DATA_SOURCE_LABELS).map(([key, label]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const empMap = new Map<number, any>();
                        employees?.forEach(e => empMap.set(e.id, e));
                        const deptMap = new Map<number, string>();
                        departments?.forEach(d => deptMap.set(d.id, d.name));
                        const resolve = (rec: any) => {
                          const emp = empMap.get(rec.employeeId);
                          return { ...rec, employeeName: emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : '', employeeCode: emp?.employeeCode || '' };
                        };
                        let records: any[] = [];
                        switch (key) {
                          case "employees": records = (employees || []).map(e => ({ ...e, departmentId: deptMap.get(e.departmentId!) || e.departmentId || '' })); break;
                          case "attendance": records = (attendanceData || []).map(resolve); break;
                          case "leaves": records = (leaveRequests || []).map(resolve); break;
                          case "payroll": records = (payrollRecords || []).map(resolve); break;
                          case "expenses": records = (expenses || []).map(resolve); break;
                          case "assets": records = (assetsData || []).map(a => { const emp = a.employeeId ? empMap.get(a.employeeId) : null; return { ...a, employeeName: emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : '', employeeCode: emp?.employeeCode || '' }; }); break;
                        }
                        exportRecords(records, buildColumnsFromData(records), key, undefined, undefined, "Full");
                      }}
                      data-testid={`button-quick-export-${key}`}
                    >
                      <Download className="w-3.5 h-3.5 mr-2" />
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-semibold text-foreground">HR Analytics Dashboard</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {dashboardWidgets.map((widget, idx) => (
                <Card key={idx} data-testid={`dashboard-widget-${idx}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{widget.name}</p>
                        <p className="text-2xl font-bold text-foreground">{widget.value}</p>
                        <p className={`text-xs mt-1 ${widget.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                          {widget.change}
                        </p>
                      </div>
                      <TrendingUp className={`w-8 h-8 ${widget.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Department Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deptData.length > 0 ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-muted-foreground" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                          <YAxis axisLine={false} tickLine={false} className="text-muted-foreground" tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0066FF" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No department data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Hiring vs Attrition (Last 6 Months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="reportColorHires" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="reportColorExits" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-muted-foreground" tick={{ fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} className="text-muted-foreground" tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="hires" name="Hires" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#reportColorHires)" />
                        <Area type="monotone" dataKey="exits" name="Exits" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#reportColorExits)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: "Total Payroll", value: totalPayroll, icon: DollarSign, color: "text-green-600" },
                    { label: "Pending Leaves", value: pendingLeaves, icon: Calendar, color: "text-yellow-600" },
                    { label: "Expense Claims", value: pendingExpenses, icon: Gift, color: "text-blue-600" },
                    { label: "New Hires (MTD)", value: currentMonthHires, icon: Users, color: "text-purple-600" },
                    { label: "Exits (MTD)", value: currentMonthExits, icon: UserMinus, color: "text-red-600" },
                  ].map((stat, idx) => (
                    <div key={idx} className="p-4 bg-muted/50 rounded-lg text-center" data-testid={`quick-stat-${idx}`}>
                      <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
