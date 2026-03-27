import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDepartments, useEmployees } from "@/hooks/use-employees";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import type { Employee } from "@shared/schema";
import { useEntity } from "@/lib/entityContext";

type EditFormData = Partial<Employee>;

export default function EditEmployee() {
  const params = useParams();
  const employeeId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("personal");
  const [formData, setFormData] = useState<EditFormData>({});
  const [replacementSearch, setReplacementSearch] = useState("");

  const { entities } = useEntity();
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: salaryStructures } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/salary-structures"],
  });
  const { data: shiftsData } = useQuery<{ id: number; name: string; startTime: string; endTime: string }[]>({
    queryKey: ["/api/shifts"],
  });

  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: ["/api/employees", employeeId],
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName,
        middleName: employee.middleName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        alternateContactNumber: employee.alternateContactNumber,
        personalEmail: employee.personalEmail,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        bloodGroup: employee.bloodGroup,
        maritalStatus: employee.maritalStatus,
        spouseName: employee.spouseName,
        dateOfMarriage: employee.dateOfMarriage,
        fatherName: employee.fatherName,
        motherName: employee.motherName,
        address: employee.address,
        permanentAddress: employee.permanentAddress,
        city: employee.city,
        state: employee.state,
        country: employee.country,
        pincode: employee.pincode,
        location: employee.location,
        emergencyContactName: employee.emergencyContactName,
        emergencyContactPhone: employee.emergencyContactPhone,
        emergencyContactRelation: employee.emergencyContactRelation,
        departmentId: employee.departmentId,
        designation: employee.designation,
        reportingManagerId: employee.reportingManagerId,
        employmentType: employee.employmentType,
        employmentStatus: employee.employmentStatus,
        joinDate: employee.joinDate,
        confirmationDate: employee.confirmationDate,
        probationEndDate: employee.probationEndDate,
        status: employee.status,
        ctc: employee.ctc,
        bankName: employee.bankName,
        branchName: employee.branchName,
        bankAccountNumber: employee.bankAccountNumber,
        ifscCode: employee.ifscCode,
        panNumber: employee.panNumber,
        aadharNumber: employee.aadharNumber,
        uanNumber: employee.uanNumber,
        pfNumber: employee.pfNumber,
        esiNumber: employee.esiNumber,
        pfStatus: employee.pfStatus,
        highestQualification: employee.highestQualification,
        specialization: employee.specialization,
        instituteName: employee.instituteName,
        qualificationScore: employee.qualificationScore,
        secondHighestQualification: employee.secondHighestQualification,
        secondSpecialization: employee.secondSpecialization,
        secondInstituteName: employee.secondInstituteName,
        secondQualificationScore: employee.secondQualificationScore,
        entity: employee.entity,
        entityId: employee.entityId,
        bgvStatus: employee.bgvStatus,
        healthInsuranceProvider: employee.healthInsuranceProvider,
        healthInsurancePolicyNumber: employee.healthInsurancePolicyNumber,
        healthInsuranceSumInsured: employee.healthInsuranceSumInsured,
        healthInsuranceStartDate: employee.healthInsuranceStartDate,
        healthInsuranceEndDate: employee.healthInsuranceEndDate,
        lifeInsuranceProvider: employee.lifeInsuranceProvider,
        lifeInsurancePolicyNumber: employee.lifeInsurancePolicyNumber,
        lifeInsuranceSumInsured: employee.lifeInsuranceSumInsured,
        lifeInsuranceStartDate: employee.lifeInsuranceStartDate,
        lifeInsuranceEndDate: employee.lifeInsuranceEndDate,
        personalAccidentProvider: employee.personalAccidentProvider,
        personalAccidentPolicyNumber: employee.personalAccidentPolicyNumber,
        personalAccidentSumInsured: employee.personalAccidentSumInsured,
        employeeCode: employee.employeeCode,
        hodId: employee.hodId,
        accessRole: employee.accessRole,
        actualDateOfBirth: employee.actualDateOfBirth,
        emergencyContact1Name: employee.emergencyContact1Name,
        emergencyContact1Phone: employee.emergencyContact1Phone,
        emergencyContact1Relation: employee.emergencyContact1Relation,
        emergencyContact2Name: employee.emergencyContact2Name,
        emergencyContact2Phone: employee.emergencyContact2Phone,
        emergencyContact2Relation: employee.emergencyContact2Relation,
        vicePresidentId: employee.vicePresidentId,
        positionType: employee.positionType,
        replacedEmployeeName: employee.replacedEmployeeName,
        sourcingChannel: employee.sourcingChannel,
        sourcingName: employee.sourcingName,
        taxRegime: employee.taxRegime,
        salaryStructureId: employee.salaryStructureId,
        insuranceAnnualPremium: employee.insuranceAnnualPremium,
        insuranceEmployeeSharePercent: employee.insuranceEmployeeSharePercent,
        insuranceEmployerSharePercent: employee.insuranceEmployerSharePercent,
        insuranceCycleStartDate: employee.insuranceCycleStartDate,
        insuranceCycleEndDate: employee.insuranceCycleEndDate,
        birthdayAllowance: employee.birthdayAllowance,
        variablePay: employee.variablePay,
        retentionBonus: employee.retentionBonus,
        retentionBonusDuration: employee.retentionBonusDuration,
        retentionBonusStartDate: employee.retentionBonusStartDate,
        noticeBuyout: employee.noticeBuyout,
        noticeBuyoutDuration: employee.noticeBuyoutDuration,
        noticeBuyoutPayments: employee.noticeBuyoutPayments,
        shiftId: employee.shiftId,
        locationPermission: employee.locationPermission || "office",
        biometricDeviceId: employee.biometricDeviceId || "",
        attendanceExempt: employee.attendanceExempt || false,
      });
    }
  }, [employee]);

  const [originalShiftId, setOriginalShiftId] = useState<number | null>(null);
  const [shiftEffectiveDate, setShiftEffectiveDate] = useState<string>("");

  useEffect(() => {
    if (employee) {
      setOriginalShiftId(employee.shiftId ?? null);
    }
  }, [employee]);

  const shiftChanged = formData.shiftId !== originalShiftId;

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'shiftId') {
      if (value === originalShiftId) {
        setShiftEffectiveDate("");
      } else if (!shiftEffectiveDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setShiftEffectiveDate(tomorrow.toISOString().split('T')[0]);
      }
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      const payload = { ...data } as any;
      if (shiftChanged && shiftEffectiveDate) {
        payload.shiftEffectiveDate = shiftEffectiveDate;
        payload.pendingShiftId = data.shiftId;
        payload.shiftId = originalShiftId;
      }
      await apiRequest("PATCH", `/api/employees/${employeeId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
      toast({ title: "Success", description: "Employee updated successfully" });
      setLocation(`/employees/${employeeId}`);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const tabs = [
    { id: "personal", label: "Personal" },
    { id: "contact", label: "Contact" },
    { id: "employment", label: "Employment" },
    { id: "education", label: "Education" },
    { id: "financial", label: "Financial" },
    { id: "insurance", label: "Insurance" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Employee not found</p>
        <Button variant="link" onClick={() => setLocation("/employees")}>Back to Employees</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setLocation(`/employees/${employeeId}`)} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Employee</h1>
            <p className="text-sm text-muted-foreground">{employee.firstName} {employee.lastName} ({employee.employeeCode})</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 bg-muted/30 p-2 rounded-lg border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {activeTab === "personal" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input value={formData.firstName || ""} onChange={(e) => updateField("firstName", e.target.value)} data-testid="input-firstName" />
                </div>
                <div className="space-y-2">
                  <Label>Middle Name</Label>
                  <Input value={formData.middleName || ""} onChange={(e) => updateField("middleName", e.target.value)} data-testid="input-middleName" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={formData.lastName || ""} onChange={(e) => updateField("lastName", e.target.value)} data-testid="input-lastName" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={formData.dateOfBirth || ""} onChange={(e) => updateField("dateOfBirth", e.target.value)} data-testid="input-dateOfBirth" />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={formData.gender || ""} onValueChange={(v) => updateField("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select value={formData.bloodGroup || ""} onValueChange={(v) => updateField("bloodGroup", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select value={formData.maritalStatus || ""} onValueChange={(v) => updateField("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Spouse Name</Label>
                  <Input value={formData.spouseName || ""} onChange={(e) => updateField("spouseName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date of Marriage</Label>
                  <Input type="date" value={formData.dateOfMarriage || ""} onChange={(e) => updateField("dateOfMarriage", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Father Name</Label>
                  <Input value={formData.fatherName || ""} onChange={(e) => updateField("fatherName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mother Name</Label>
                  <Input value={formData.motherName || ""} onChange={(e) => updateField("motherName", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Actual Date of Birth</Label>
                <Input type="date" value={formData.actualDateOfBirth || ""} onChange={(e) => updateField("actualDateOfBirth", e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === "contact" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Official Email *</Label>
                  <Input type="email" value={formData.email || ""} onChange={(e) => updateField("email", e.target.value)} data-testid="input-email" />
                </div>
                <div className="space-y-2">
                  <Label>Personal Email</Label>
                  <Input type="email" value={formData.personalEmail || ""} onChange={(e) => updateField("personalEmail", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone || ""} onChange={(e) => updateField("phone", e.target.value)} data-testid="input-phone" />
                </div>
                <div className="space-y-2">
                  <Label>Alternate Contact</Label>
                  <Input value={formData.alternateContactNumber || ""} onChange={(e) => updateField("alternateContactNumber", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Current Address</Label>
                <Textarea value={formData.address || ""} onChange={(e) => updateField("address", e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Permanent Address</Label>
                <Textarea value={formData.permanentAddress || ""} onChange={(e) => updateField("permanentAddress", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={formData.city || ""} onChange={(e) => updateField("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={formData.state || ""} onChange={(e) => updateField("state", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={formData.country || ""} onChange={(e) => updateField("country", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input value={formData.pincode || ""} onChange={(e) => updateField("pincode", e.target.value)} />
                </div>
              </div>
              <h4 className="font-medium pt-4 border-t">Emergency Contact</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.emergencyContactName || ""} onChange={(e) => updateField("emergencyContactName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.emergencyContactPhone || ""} onChange={(e) => updateField("emergencyContactPhone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Relation</Label>
                  <Input value={formData.emergencyContactRelation || ""} onChange={(e) => updateField("emergencyContactRelation", e.target.value)} />
                </div>
              </div>
              <h4 className="font-medium pt-4 border-t">Emergency Contact 1</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.emergencyContact1Name || ""} onChange={(e) => updateField("emergencyContact1Name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.emergencyContact1Phone || ""} onChange={(e) => updateField("emergencyContact1Phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Relation</Label>
                  <Input value={formData.emergencyContact1Relation || ""} onChange={(e) => updateField("emergencyContact1Relation", e.target.value)} />
                </div>
              </div>
              <h4 className="font-medium pt-4 border-t">Emergency Contact 2</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.emergencyContact2Name || ""} onChange={(e) => updateField("emergencyContact2Name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.emergencyContact2Phone || ""} onChange={(e) => updateField("emergencyContact2Phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Relation</Label>
                  <Input value={formData.emergencyContact2Relation || ""} onChange={(e) => updateField("emergencyContact2Relation", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "employment" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Employee Code</Label>
                  <Input value={formData.employeeCode || ""} onChange={(e) => updateField("employeeCode", e.target.value)} data-testid="input-employee-code" />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input value={formData.designation || ""} onChange={(e) => updateField("designation", e.target.value)} data-testid="input-designation" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={formData.departmentId?.toString() || ""} onValueChange={(v) => updateField("departmentId", parseInt(v))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {departments?.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reporting Manager</Label>
                  <Select value={formData.reportingManagerId?.toString() || "none"} onValueChange={(v) => updateField("reportingManagerId", v === "none" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees?.filter(e => e.id !== employeeId && e.employeeCode).map(e => (
                        <SelectItem key={e.id} value={e.employeeCode!}>{e.firstName} {e.lastName} ({e.employeeCode})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={formData.location || ""} onChange={(e) => updateField("location", e.target.value)} data-testid="input-location" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Location Permission</Label>
                  <Select value={formData.locationPermission || "office"} onValueChange={(v) => updateField("locationPermission", v)}>
                    <SelectTrigger data-testid="select-locationPermission"><SelectValue placeholder="Select permission" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office Only</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Biometric Device ID</Label>
                  <Input value={formData.biometricDeviceId || ""} onChange={(e) => updateField("biometricDeviceId", e.target.value)} placeholder="e.g., 36 (ID from biometric device)" data-testid="input-biometricDeviceId" />
                </div>
                <div className="space-y-2">
                  <Label>Attendance Exempt</Label>
                  <Select value={formData.attendanceExempt ? "true" : "false"} onValueChange={(v) => updateField("attendanceExempt", v === "true")}>
                    <SelectTrigger data-testid="select-attendanceExempt"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Yes (VP / Director / MD / CEO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select value={formData.employmentType || ""} onValueChange={(v) => updateField("employmentType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                      <SelectItem value="fixed_term">Fixed Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment Status</Label>
                  <Select value={formData.employmentStatus || ""} onValueChange={(v) => updateField("employmentStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="probation">Probation</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="notice_period">Notice Period</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status || ""} onValueChange={(v) => updateField("status", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Join Date</Label>
                  <Input type="date" value={formData.joinDate || ""} onChange={(e) => updateField("joinDate", e.target.value)} data-testid="input-joinDate" />
                </div>
                <div className="space-y-2">
                  <Label>Actual DOJ</Label>
                  <Input type="date" value={formData.actualJoinDate || ""} onChange={(e) => updateField("actualJoinDate", e.target.value)} data-testid="input-actualJoinDate" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmation Date</Label>
                  <Input type="date" value={formData.confirmationDate || ""} onChange={(e) => updateField("confirmationDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Probation End Date</Label>
                  <Input type="date" value={formData.probationEndDate || ""} onChange={(e) => updateField("probationEndDate", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Entity</Label>
                  <Select value={formData.entityId ? String(formData.entityId) : "all"} onValueChange={(v) => updateField("entityId", v === "all" ? null : parseInt(v))}>
                    <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entities</SelectItem>
                      {entities.map(entity => (
                        <SelectItem key={entity.id} value={String(entity.id)}>{entity.name} ({entity.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>BGV Status</Label>
                  <Select value={formData.bgvStatus || ""} onValueChange={(v) => updateField("bgvStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shift</Label>
                  <Select value={formData.shiftId?.toString() || "none"} onValueChange={(v) => updateField("shiftId", v === "none" ? null : parseInt(v))}>
                    <SelectTrigger data-testid="select-shiftId"><SelectValue placeholder="Select shift" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Shift Assigned</SelectItem>
                      {shiftsData?.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.startTime} - {s.endTime})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {shiftChanged && (
                    <div className="space-y-1 mt-2 p-3 border rounded-md bg-amber-50">
                      <Label className="text-amber-700 text-xs font-semibold">Shift Change Effective Date</Label>
                      <Input
                        type="date"
                        value={shiftEffectiveDate}
                        onChange={e => setShiftEffectiveDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="border-amber-300"
                        data-testid="input-shift-effective-date"
                      />
                      <p className="text-xs text-amber-600">
                        New shift ({shiftsData?.find(s => s.id === formData.shiftId)?.name || 'selected'}) will take effect from this date.
                      </p>
                    </div>
                  )}
                  {!shiftChanged && (formData as any).pendingShiftId && (formData as any).shiftEffectiveDate && (
                    <p className="text-xs text-amber-600">Pending shift change to {shiftsData?.find(s => s.id === (formData as any).pendingShiftId)?.name || 'new shift'} — effective from {(formData as any).shiftEffectiveDate}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CTC (Annual)</Label>
                  <Input type="number" value={formData.ctc || ""} onChange={(e) => updateField("ctc", e.target.value)} data-testid="input-ctc" />
                </div>
                <div className="space-y-2">
                  <Label>Variable Pay (Rs./month)</Label>
                  <Input type="number" value={formData.variablePay || ""} onChange={(e) => updateField("variablePay", e.target.value)} data-testid="input-variable-pay" />
                </div>
              </div>
              <h4 className="font-medium pt-2">Retention Bonus</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Amount (Rs.)</Label>
                  <Input type="number" value={formData.retentionBonus || ""} onChange={(e) => updateField("retentionBonus", e.target.value)} data-testid="input-retention-bonus" />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={formData.retentionBonusDuration || ""} onValueChange={(v) => updateField("retentionBonusDuration", v)}>
                    <SelectTrigger data-testid="select-retention-bonus-duration"><SelectValue placeholder="Select duration" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="one-time">One-Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.retentionBonusStartDate || ""} onChange={(e) => updateField("retentionBonusStartDate", e.target.value)} data-testid="input-retention-bonus-start" />
                </div>
              </div>
              <h4 className="font-medium pt-2">Notice Period Buyout</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Amount (Rs.)</Label>
                  <Input type="number" value={formData.noticeBuyout || ""} onChange={(e) => updateField("noticeBuyout", e.target.value)} data-testid="input-notice-buyout" />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={formData.noticeBuyoutDuration || ""} onValueChange={(v) => updateField("noticeBuyoutDuration", v)}>
                    <SelectTrigger data-testid="select-notice-buyout-duration"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-time">One-Time</SelectItem>
                      <SelectItem value="monthly">Monthly Installments</SelectItem>
                      <SelectItem value="quarterly">Quarterly Installments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>No. of Payments</Label>
                  <Input type="number" value={formData.noticeBuyoutPayments || ""} onChange={(e) => updateField("noticeBuyoutPayments", parseInt(e.target.value) || "")} data-testid="input-notice-buyout-payments" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>HOD</Label>
                  <Select value={formData.hodId?.toString() || "none"} onValueChange={(v) => updateField("hodId", v === "none" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Select HOD" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees?.filter(e => e.id !== employeeId && e.employeeCode).map(e => (
                        <SelectItem key={e.id} value={e.employeeCode!}>{e.firstName} {e.lastName || ''} ({e.employeeCode})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Salary Structure</Label>
                  <Select value={formData.salaryStructureId?.toString() || ""} onValueChange={(v) => updateField("salaryStructureId", parseInt(v))}>
                    <SelectTrigger data-testid="select-salary-structure"><SelectValue placeholder="Select salary structure" /></SelectTrigger>
                    <SelectContent>
                      {salaryStructures?.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Position Type</Label>
                  <Select value={formData.positionType || ""} onValueChange={(v) => updateField("positionType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Position</SelectItem>
                      <SelectItem value="replacement">Replacement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vice President</Label>
                  <Select value={formData.vicePresidentId?.toString() || "none"} onValueChange={(v) => updateField("vicePresidentId", v === "none" ? null : parseInt(v))}>
                    <SelectTrigger><SelectValue placeholder="Select VP" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees?.filter(e => e.id !== employeeId).map(e => (
                        <SelectItem key={e.id} value={e.id.toString()}>{e.firstName} {e.lastName || ''} {e.designation ? `- ${e.designation}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sourcing Channel</Label>
                  <Select value={formData.sourcingChannel || ""} onValueChange={(v) => updateField("sourcingChannel", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="employee_referral">Employee Referral</SelectItem>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                      <SelectItem value="social_site">Social Site</SelectItem>
                      <SelectItem value="job_portal">Job Portal</SelectItem>
                      <SelectItem value="campus">Campus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sourcing Name</Label>
                  <Input value={formData.sourcingName || ""} onChange={(e) => updateField("sourcingName", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Access Role</Label>
                <Select value={formData.accessRole || ""} onValueChange={(v) => updateField("accessRole", v)}>
                  <SelectTrigger data-testid="select-access-role"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee (Default)</SelectItem>
                    <SelectItem value="hr_manager">HR Manager</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                    <SelectItem value="manager">Reporting Manager</SelectItem>
                    <SelectItem value="asset_team">Asset Team</SelectItem>
                    <SelectItem value="payroll_team">Payroll Team</SelectItem>
                    <SelectItem value="project_team">Project Team</SelectItem>
                    <SelectItem value="onboarding_team">Onboarding Team</SelectItem>
                    <SelectItem value="pms_team">PMS Team</SelectItem>
                    <SelectItem value="lms_team">LMS Team</SelectItem>
                    <SelectItem value="admin">Admin (Full Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Replaced Employee (Search by Code or Name)</Label>
                <Input
                  placeholder="Type to search employee by code or name..."
                  value={replacementSearch}
                  onChange={(e) => setReplacementSearch(e.target.value)}
                  data-testid="input-replacement-search"
                />
                {replacementSearch.length >= 2 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {employees?.filter(e => {
                      const search = replacementSearch.toLowerCase();
                      const fullName = `${e.firstName} ${e.middleName || ''} ${e.lastName || ''}`.toLowerCase();
                      const code = (e.employeeCode || '').toLowerCase();
                      return (fullName.includes(search) || code.includes(search)) && e.id !== employeeId;
                    }).slice(0, 10).map(e => (
                      <div
                        key={e.id}
                        className="px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                        onClick={() => {
                          const displayName = `${e.employeeCode || ''} - ${e.firstName} ${e.lastName || ''}`.trim();
                          updateField("replacedEmployeeName", displayName);
                          setReplacementSearch("");
                        }}
                      >
                        <span className="text-sm">{e.firstName} {e.lastName || ''}</span>
                        <span className="text-xs text-muted-foreground">{e.employeeCode || 'No Code'}</span>
                      </div>
                    ))}
                    {employees?.filter(e => {
                      const search = replacementSearch.toLowerCase();
                      const fullName = `${e.firstName} ${e.middleName || ''} ${e.lastName || ''}`.toLowerCase();
                      const code = (e.employeeCode || '').toLowerCase();
                      return (fullName.includes(search) || code.includes(search)) && e.id !== employeeId;
                    }).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No employees found</div>
                    )}
                  </div>
                )}
                {formData.replacedEmployeeName && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{formData.replacedEmployeeName}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => updateField("replacedEmployeeName", null)}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "education" && (
            <div className="space-y-5">
              <h4 className="font-medium">Highest Qualification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Qualification</Label>
                  <Select value={formData.highestQualification || ""} onValueChange={(v) => updateField("highestQualification", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10th">10th</SelectItem>
                      <SelectItem value="12th">12th</SelectItem>
                      <SelectItem value="diploma">Diploma</SelectItem>
                      <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                      <SelectItem value="masters">Master's Degree</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input value={formData.specialization || ""} onChange={(e) => updateField("specialization", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Institute Name</Label>
                <Input value={formData.instituteName || ""} onChange={(e) => updateField("instituteName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Score/Percentage/CGPA</Label>
                <Input value={formData.qualificationScore || ""} onChange={(e) => updateField("qualificationScore", e.target.value)} />
              </div>
              <h4 className="font-medium pt-4 border-t">Second Qualification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Qualification</Label>
                  <Select value={formData.secondHighestQualification || ""} onValueChange={(v) => updateField("secondHighestQualification", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10th">10th</SelectItem>
                      <SelectItem value="12th">12th</SelectItem>
                      <SelectItem value="diploma">Diploma</SelectItem>
                      <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                      <SelectItem value="masters">Master's Degree</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input value={formData.secondSpecialization || ""} onChange={(e) => updateField("secondSpecialization", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Institute Name</Label>
                  <Input value={formData.secondInstituteName || ""} onChange={(e) => updateField("secondInstituteName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Score/Percentage/CGPA</Label>
                  <Input value={formData.secondQualificationScore || ""} onChange={(e) => updateField("secondQualificationScore", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "financial" && (
            <div className="space-y-5">
              <h4 className="font-medium">Bank Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={formData.bankName || ""} onChange={(e) => updateField("bankName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Branch Name</Label>
                  <Input value={formData.branchName || ""} onChange={(e) => updateField("branchName", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={formData.bankAccountNumber || ""} onChange={(e) => updateField("bankAccountNumber", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input value={formData.ifscCode || ""} onChange={(e) => updateField("ifscCode", e.target.value)} />
                </div>
              </div>
              <h4 className="font-medium pt-4 border-t">Statutory Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PAN Number</Label>
                  <Input value={formData.panNumber || ""} onChange={(e) => updateField("panNumber", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Aadhaar Number</Label>
                  <Input value={formData.aadharNumber || ""} onChange={(e) => updateField("aadharNumber", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>UAN Number</Label>
                  <Input value={formData.uanNumber || ""} onChange={(e) => updateField("uanNumber", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>PF Number</Label>
                  <Input value={formData.pfNumber || ""} onChange={(e) => updateField("pfNumber", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ESI Number</Label>
                  <Input value={formData.esiNumber || ""} onChange={(e) => updateField("esiNumber", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>PF Status</Label>
                <Select value={formData.pfStatus || ""} onValueChange={(v) => updateField("pfStatus", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tax Regime</Label>
                <Select value={formData.taxRegime || ""} onValueChange={(v) => updateField("taxRegime", v)}>
                  <SelectTrigger data-testid="select-tax-regime"><SelectValue placeholder="Select Tax Regime" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="old_regime">Old Regime</SelectItem>
                    <SelectItem value="new_regime">New Regime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {activeTab === "insurance" && (
            <div className="space-y-5">
              <h4 className="font-medium">Insurance Premium (Age-Based Auto-Calculation)</h4>
              {(() => {
                const ageSlabs = [
                  { minAge: 0, maxAge: 18, employer: 243, employee: 162 },
                  { minAge: 19, maxAge: 35, employer: 288, employee: 192 },
                  { minAge: 36, maxAge: 45, employer: 315, employee: 210 },
                  { minAge: 46, maxAge: 55, employer: 481, employee: 320 },
                  { minAge: 56, maxAge: 60, employer: 740, employee: 493 },
                  { minAge: 61, maxAge: 65, employer: 1002, employee: 668 },
                  { minAge: 66, maxAge: 70, employer: 1178, employee: 785 },
                  { minAge: 71, maxAge: 75, employer: 1388, employee: 925 },
                  { minAge: 76, maxAge: 90, employer: 1597, employee: 1065 },
                ];
                const dob = employee?.actualDateOfBirth || employee?.dateOfBirth;
                let age = 0;
                let slab = null as typeof ageSlabs[0] | null;
                if (dob) {
                  const dobDate = new Date(dob);
                  const today = new Date();
                  age = today.getFullYear() - dobDate.getFullYear();
                  const md = today.getMonth() - dobDate.getMonth();
                  if (md < 0 || (md === 0 && today.getDate() < dobDate.getDate())) age--;
                  slab = ageSlabs.find(s => age >= s.minAge && age <= s.maxAge) || null;
                }
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Employee Age</Label>
                        <Input value={dob ? `${age} years` : "N/A - No DOB"} disabled className="bg-muted" data-testid="text-employee-age" />
                      </div>
                      <div className="space-y-2">
                        <Label>Age Bracket</Label>
                        <Input value={slab ? `${slab.minAge}-${slab.maxAge} years` : "N/A"} disabled className="bg-muted" data-testid="text-age-bracket" />
                      </div>
                      <div className="space-y-2">
                        <Label>Annual Premium (Rs.) (Optional Override)</Label>
                        <Input type="number" value={formData.insuranceAnnualPremium || ""} onChange={(e) => updateField("insuranceAnnualPremium", e.target.value)} placeholder="Leave blank for age-based auto" data-testid="input-insurance-annual-premium" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Monthly Employer Share (Rs.)</Label>
                        <Input value={slab ? `Rs. ${slab.employer}` : "N/A"} disabled className="bg-muted" data-testid="text-employer-share" />
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Employee Share (Rs.) - Deducted in Payroll</Label>
                        <Input value={slab ? `Rs. ${slab.employee}` : "N/A"} disabled className="bg-muted" data-testid="text-employee-share" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Insurance Cycle Start</Label>
                        <Input type="date" value={formData.insuranceCycleStartDate || ""} onChange={(e) => updateField("insuranceCycleStartDate", e.target.value)} data-testid="input-insurance-cycle-start" />
                      </div>
                      <div className="space-y-2">
                        <Label>Insurance Cycle End</Label>
                        <Input type="date" value={formData.insuranceCycleEndDate || ""} onChange={(e) => updateField("insuranceCycleEndDate", e.target.value)} data-testid="input-insurance-cycle-end" />
                      </div>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const premium = Number(formData.insuranceAnnualPremium) || 0;
                const empPercent = Number(formData.insuranceEmployeeSharePercent) || 40;
                const emplrPercent = Number(formData.insuranceEmployerSharePercent) || 60;
                const monthlyEmpShare = Math.round((premium * empPercent / 100) / 12);
                const monthlyEmplrShare = Math.round((premium * emplrPercent / 100) / 12);
                const joinDate = employee?.joinDate;
                const cycleStart = formData.insuranceCycleStartDate;
                const cycleEnd = formData.insuranceCycleEndDate;
                let proRataMonths = 12;
                let proRataNote = "";
                if (joinDate && cycleStart && cycleEnd) {
                  const jd = new Date(joinDate);
                  const cs = new Date(cycleStart);
                  const ce = new Date(cycleEnd);
                  if (jd > cs) {
                    const diffMs = ce.getTime() - jd.getTime();
                    proRataMonths = Math.max(1, Math.ceil(diffMs / (30.44 * 24 * 60 * 60 * 1000)));
                    proRataNote = `Mid-year joiner: ${proRataMonths} months pro-rata`;
                  }
                }
                if (premium <= 0) return null;
                return (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 pb-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Monthly Employee Share</p>
                          <p className="font-bold" data-testid="text-monthly-emp-share">Rs. {monthlyEmpShare.toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Monthly Employer Share</p>
                          <p className="font-bold" data-testid="text-monthly-employer-share">Rs. {monthlyEmplrShare.toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Annual Employee Share</p>
                          <p className="font-bold">Rs. {Math.round(premium * empPercent / 100).toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                      {proRataNote && <p className="text-xs text-amber-600 mt-2">{proRataNote}</p>}
                    </CardContent>
                  </Card>
                );
              })()}

              <h4 className="font-medium pt-4 border-t">Health Insurance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Input value={formData.healthInsuranceProvider || ""} onChange={(e) => updateField("healthInsuranceProvider", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Policy Number</Label>
                  <Input value={formData.healthInsurancePolicyNumber || ""} onChange={(e) => updateField("healthInsurancePolicyNumber", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sum Insured</Label>
                  <Input value={formData.healthInsuranceSumInsured || ""} onChange={(e) => updateField("healthInsuranceSumInsured", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.healthInsuranceStartDate || ""} onChange={(e) => updateField("healthInsuranceStartDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formData.healthInsuranceEndDate || ""} onChange={(e) => updateField("healthInsuranceEndDate", e.target.value)} />
                </div>
              </div>

              <h4 className="font-medium pt-4 border-t">Life Insurance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Input value={formData.lifeInsuranceProvider || ""} onChange={(e) => updateField("lifeInsuranceProvider", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Policy Number</Label>
                  <Input value={formData.lifeInsurancePolicyNumber || ""} onChange={(e) => updateField("lifeInsurancePolicyNumber", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sum Insured</Label>
                  <Input value={formData.lifeInsuranceSumInsured || ""} onChange={(e) => updateField("lifeInsuranceSumInsured", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.lifeInsuranceStartDate || ""} onChange={(e) => updateField("lifeInsuranceStartDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formData.lifeInsuranceEndDate || ""} onChange={(e) => updateField("lifeInsuranceEndDate", e.target.value)} />
                </div>
              </div>

              <h4 className="font-medium pt-4 border-t">Personal Accident Insurance</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Input value={formData.personalAccidentProvider || ""} onChange={(e) => updateField("personalAccidentProvider", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Policy Number</Label>
                  <Input value={formData.personalAccidentPolicyNumber || ""} onChange={(e) => updateField("personalAccidentPolicyNumber", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sum Insured</Label>
                  <Input value={formData.personalAccidentSumInsured || ""} onChange={(e) => updateField("personalAccidentSumInsured", e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mt-6 sticky bottom-0 bg-background py-4 border-t">
        <div className="text-sm text-muted-foreground">
          {tabs.find(t => t.id === activeTab)?.label} Tab
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation(`/employees/${employeeId}`)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate(formData)}
            disabled={updateMutation.isPending}
            data-testid="button-save-employee"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
