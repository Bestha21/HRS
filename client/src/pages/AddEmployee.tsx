import { useState, useEffect } from "react";
import { useEmployees, useCreateEmployee, useDepartments } from "@/hooks/use-employees";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmployeeSchema } from "@shared/schema";
import type { Entity } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { useEntity } from "@/lib/entityContext";

const formSchema = insertEmployeeSchema.extend({
  joinDate: z.coerce.date().transform(d => d.toISOString().split('T')[0]),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddEmployee() {
  const { entities } = useEntity();
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: salaryStructures } = useQuery<{ id: number; name: string; basicPercent: string; hraPercent: string; conveyancePercent: string; daPercent: string; communicationPercent: string; medicalPercent: string }[]>({
    queryKey: ["/api/salary-structures"],
  });
  const { data: shiftsData } = useQuery<{ id: number; name: string; startTime: string; endTime: string }[]>({
    queryKey: ["/api/shifts"],
  });
  const { toast } = useToast();
  const createEmployee = useCreateEmployee();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("basic");
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);
  const [replacementSearch, setReplacementSearch] = useState("");

  const allEmployees = employees || [];
  const allDepartments = departments || [];

  const generateEmployeeCode = () => {
    if (!allEmployees || allEmployees.length === 0) return "EMP001";
    const codes = allEmployees
      .map(e => e.employeeCode)
      .filter(Boolean)
      .map(code => {
        const match = code!.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
    const maxNum = Math.max(0, ...codes);
    return `EMP${String(maxNum + 1).padStart(3, '0')}`;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      designation: "",
      status: "active",
      joinDate: new Date().toISOString().split('T')[0],
      employmentStatus: "probation",
      employmentType: "permanent",
      employeeCode: generateEmployeeCode(),
    }
  });

  useEffect(() => {
    if (autoGenerateCode) {
      form.setValue("employeeCode", generateEmployeeCode());
    }
  }, [autoGenerateCode, employees]);

  const validateEmployeeCode = (code: string) => {
    if (!code) return true;
    return !allEmployees.some(e => e.employeeCode === code);
  };

  const onSubmit = (data: FormValues) => {
    if (data.employeeCode && !validateEmployeeCode(data.employeeCode)) {
      toast({ title: "Error", description: "Employee code already exists. Please use a unique code.", variant: "destructive" });
      return;
    }
    createEmployee.mutate(data, {
      onSuccess: () => {
        toast({ title: "Success", description: "Employee added successfully" });
        setLocation("/employees");
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const tabs = [
    { id: "basic", label: "Basic Info", step: 1 },
    { id: "personal", label: "Personal", step: 2 },
    { id: "employment", label: "Position", step: 3 },
    { id: "qualifications", label: "Education", step: 4 },
    { id: "bank", label: "Bank & IDs", step: 5 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setLocation("/employees")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Add New Employee</h1>
            <p className="text-sm text-muted-foreground">Fill in the employee details across different sections</p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex items-center gap-1 mb-6 bg-muted/30 p-2 rounded-lg border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'
              }`}>
                {tab.step}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            {activeTab === "basic" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employee Code</label>
                  <div className="flex items-center gap-3">
                    <Input
                      {...form.register("employeeCode")}
                      placeholder="e.g., EMP001"
                      disabled={autoGenerateCode}
                      className={autoGenerateCode ? "bg-muted" : ""}
                      data-testid="input-employeeCode"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="autoGenerate"
                        checked={autoGenerateCode}
                        onCheckedChange={(checked) => setAutoGenerateCode(checked as boolean)}
                      />
                      <label htmlFor="autoGenerate" className="text-sm whitespace-nowrap">Auto-generate</label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name <span className="text-destructive">*</span></label>
                    <Input {...form.register("firstName")} placeholder="Enter first name" data-testid="input-firstName" />
                    {form.formState.errors.firstName && <span className="text-destructive text-xs">{form.formState.errors.firstName.message}</span>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Middle Name</label>
                    <Input {...form.register("middleName")} placeholder="Enter middle name" data-testid="input-middleName" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input {...form.register("lastName")} placeholder="Enter last name" data-testid="input-lastName" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Official Email <span className="text-destructive">*</span></label>
                    <Input type="email" {...form.register("email")} placeholder="name@company.com" data-testid="input-email" />
                    {form.formState.errors.email && <span className="text-destructive text-xs">{form.formState.errors.email.message}</span>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Personal Email</label>
                    <Input type="email" {...form.register("personalEmail")} placeholder="personal@email.com" data-testid="input-personalEmail" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input {...form.register("phone")} placeholder="+91 XXXXX XXXXX" data-testid="input-phone" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alternate Contact Number</label>
                    <Input {...form.register("alternateContactNumber")} placeholder="+91 XXXXX XXXXX" data-testid="input-alternateContactNumber" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Work Location</label>
                    <Input {...form.register("location")} placeholder="e.g., Gurgaon, Delhi" data-testid="input-location" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select onValueChange={(val) => form.setValue("departmentId", parseInt(val))}>
                      <SelectTrigger data-testid="select-department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {allDepartments.map(d => (
                          <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "personal" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Father's Name</label>
                    <Input {...form.register("fatherName")} data-testid="input-fatherName" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mother's Name</label>
                    <Input {...form.register("motherName")} data-testid="input-motherName" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Spouse Name</label>
                    <Input {...form.register("spouseName")} data-testid="input-spouseName" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date of Marriage</label>
                    <Input type="date" {...form.register("dateOfMarriage")} data-testid="input-dateOfMarriage" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Marital Status</label>
                    <Select onValueChange={(val) => form.setValue("maritalStatus", val)}>
                      <SelectTrigger data-testid="select-maritalStatus">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date of Birth (Official)</label>
                    <Input type="date" {...form.register("dateOfBirth")} data-testid="input-dob" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <Select onValueChange={(val) => form.setValue("gender", val)}>
                      <SelectTrigger data-testid="select-gender">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Blood Group</label>
                    <Select onValueChange={(val) => form.setValue("bloodGroup", val)}>
                      <SelectTrigger data-testid="select-bloodGroup">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <Input {...form.register("country")} placeholder="India" data-testid="input-country" />
                  </div>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-sm">Current Address</h4>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Address Line</label>
                      <Input {...form.register("address")} placeholder="Street address, building, etc." data-testid="input-address" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">City</label>
                        <Input {...form.register("city")} placeholder="City" data-testid="input-city" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">State</label>
                        <Input {...form.register("state")} placeholder="State" data-testid="input-state" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Pincode</label>
                        <Input {...form.register("pincode")} placeholder="Pincode" data-testid="input-pincode" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-sm">Permanent Address</h4>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Address Line</label>
                      <Input {...form.register("permanentAddress")} placeholder="Street address, building, etc." data-testid="input-permanentAddress" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-sm">Emergency Contact 1</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input {...form.register("emergencyContact1Name")} data-testid="input-emergencyContact1Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <Input {...form.register("emergencyContact1Phone")} data-testid="input-emergencyContact1Phone" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Relation</label>
                        <Select onValueChange={(val) => form.setValue("emergencyContact1Relation", val)}>
                          <SelectTrigger data-testid="select-emergencyContact1Relation">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="sibling">Sibling</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-sm">Emergency Contact 2</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input {...form.register("emergencyContact2Name")} data-testid="input-emergencyContact2Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <Input {...form.register("emergencyContact2Phone")} data-testid="input-emergencyContact2Phone" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Relation</label>
                        <Select onValueChange={(val) => form.setValue("emergencyContact2Relation", val)}>
                          <SelectTrigger data-testid="select-emergencyContact2Relation">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="sibling">Sibling</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "employment" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Join Date <span className="text-destructive">*</span></label>
                    <Input type="date" {...form.register("joinDate")} data-testid="input-joinDate" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Actual DOJ</label>
                    <Input type="date" {...form.register("actualJoinDate")} data-testid="input-actualJoinDate" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employment Status</label>
                    <Select onValueChange={(val) => form.setValue("employmentStatus", val)} defaultValue="probation">
                      <SelectTrigger data-testid="select-employmentStatus">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="probation">Probation</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="probation_extension">Probation Extension</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employment Type</label>
                    <Select onValueChange={(val) => form.setValue("employmentType", val)} defaultValue="permanent">
                      <SelectTrigger data-testid="select-employmentType">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanent">Permanent</SelectItem>
                        <SelectItem value="consultant">Consultant</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                        <SelectItem value="fixed_term">Fixed Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Position Type</label>
                    <Select onValueChange={(val) => form.setValue("positionType", val)}>
                      <SelectTrigger data-testid="select-positionType">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New Position</SelectItem>
                        <SelectItem value="replacement">Replacement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.watch("positionType") === "replacement" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Replaced Employee (Search by Code or Name)</label>
                    <Input
                      placeholder="Type employee code or name to search..."
                      value={replacementSearch}
                      onChange={(e) => setReplacementSearch(e.target.value)}
                      data-testid="input-replacementSearch"
                    />
                    {replacementSearch.length >= 2 && (
                      <div className="border rounded-md max-h-40 overflow-y-auto bg-background">
                        {allEmployees.filter(e => {
                          const search = replacementSearch.toLowerCase();
                          const fullName = `${e.firstName} ${e.middleName || ''} ${e.lastName || ''}`.toLowerCase();
                          const code = (e.employeeCode || '').toLowerCase();
                          return fullName.includes(search) || code.includes(search);
                        }).slice(0, 10).map(e => (
                          <div
                            key={e.id}
                            className="px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                            onClick={() => {
                              const displayName = `${e.employeeCode || ''} - ${e.firstName} ${e.lastName || ''}`.trim();
                              form.setValue("replacedEmployeeName", displayName);
                              setReplacementSearch("");
                            }}
                          >
                            <span className="text-sm">{e.firstName} {e.lastName || ''}</span>
                            <span className="text-xs text-muted-foreground">{e.employeeCode || 'No Code'}</span>
                          </div>
                        ))}
                        {allEmployees.filter(e => {
                          const search = replacementSearch.toLowerCase();
                          const fullName = `${e.firstName} ${e.middleName || ''} ${e.lastName || ''}`.toLowerCase();
                          const code = (e.employeeCode || '').toLowerCase();
                          return fullName.includes(search) || code.includes(search);
                        }).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No employees found</div>
                        )}
                      </div>
                    )}
                    {form.watch("replacedEmployeeName") && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{form.watch("replacedEmployeeName")}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => form.setValue("replacedEmployeeName", "")}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vice President</label>
                    <Select onValueChange={(val) => form.setValue("vicePresidentId", parseInt(val))}>
                      <SelectTrigger data-testid="select-vicePresident">
                        <SelectValue placeholder="Select VP" />
                      </SelectTrigger>
                      <SelectContent>
                        {allEmployees.filter(e => e.status === 'active').map(e => (
                          <SelectItem key={e.id} value={e.id.toString()}>
                            {e.firstName} {e.lastName || ''} {e.designation ? `- ${e.designation}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Entity</label>
                    <Select onValueChange={(val) => form.setValue("entityId", val === "all" ? undefined : parseInt(val))}>
                      <SelectTrigger data-testid="select-entityId">
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Entities</SelectItem>
                        {entities.map(entity => (
                          <SelectItem key={entity.id} value={String(entity.id)}>{entity.name} ({entity.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Shift</label>
                    <Select onValueChange={(val) => form.setValue("shiftId", val === "none" ? undefined : parseInt(val))}>
                      <SelectTrigger data-testid="select-shiftId">
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Shift Assigned</SelectItem>
                        {shiftsData?.map(s => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.startTime} - {s.endTime})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input {...form.register("location")} placeholder="e.g., Bangalore" data-testid="input-location" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location Permission</label>
                    <Select onValueChange={(val) => form.setValue("locationPermission", val)} defaultValue="office">
                      <SelectTrigger data-testid="select-locationPermission">
                        <SelectValue placeholder="Select permission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">Office Only</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Attendance Exempt</label>
                    <Select onValueChange={(val) => form.setValue("attendanceExempt", val === "true")} defaultValue="false">
                      <SelectTrigger data-testid="select-attendanceExempt">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes (VP / Director / MD / CEO)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Designation</label>
                    <Input {...form.register("designation")} placeholder="e.g., Software Engineer" data-testid="input-designation" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reporting Manager</label>
                    <Select onValueChange={(val) => form.setValue("reportingManagerId", val)}>
                      <SelectTrigger data-testid="select-reportingManager">
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {allEmployees.filter(e => e.status === 'active' && e.employeeCode).map(e => (
                          <SelectItem key={e.id} value={e.employeeCode!}>
                            {e.firstName} {e.lastName || ''} ({e.employeeCode}) - {e.designation || 'Employee'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirmation Date</label>
                    <Input type="date" {...form.register("confirmationDate")} data-testid="input-confirmationDate" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Probation End Date</label>
                    <Input type="date" {...form.register("probationEndDate")} data-testid="input-probationEndDate" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sourcing Channel</label>
                    <Select onValueChange={(val) => form.setValue("sourcingChannel", val)}>
                      <SelectTrigger data-testid="select-sourcingChannel">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
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
                    <label className="text-sm font-medium">Sourcing Name</label>
                    <Input {...form.register("sourcingName")} placeholder="Referrer/Consultant name" data-testid="input-sourcingName" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">BGV Status</label>
                    <Select onValueChange={(val) => form.setValue("bgvStatus", val)}>
                      <SelectTrigger data-testid="select-bgvStatus">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="successful">Successful</SelectItem>
                        <SelectItem value="fail">Failed</SelectItem>
                        <SelectItem value="waived_off">Waived Off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CTC (Annual)</label>
                    <Input {...form.register("ctc")} placeholder="e.g., 1200000" data-testid="input-ctc" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Retention Bonus</label>
                    <Input {...form.register("retentionBonus")} placeholder="e.g., 50000" data-testid="input-retention-bonus" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notice Buyout</label>
                    <Input {...form.register("noticeBuyout")} placeholder="e.g., 100000" data-testid="input-notice-buyout" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Salary Structure</label>
                  <Select onValueChange={(val) => form.setValue("salaryStructureId", parseInt(val))}>
                    <SelectTrigger data-testid="select-salaryStructure">
                      <SelectValue placeholder="Select salary structure" />
                    </SelectTrigger>
                    <SelectContent>
                      {salaryStructures?.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.watch("salaryStructureId") && salaryStructures && (
                    <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted/50 rounded">
                      {(() => {
                        const structure = salaryStructures.find(s => s.id === form.watch("salaryStructureId"));
                        if (!structure) return null;
                        return (
                          <div className="grid grid-cols-3 gap-1">
                            <span>Basic: {structure.basicPercent}%</span>
                            <span>HRA: {structure.hraPercent}%</span>
                            <span>DA: {structure.daPercent}%</span>
                            <span>Conv: {structure.conveyancePercent}%</span>
                            <span>Comm: {structure.communicationPercent}%</span>
                            <span>Med: {structure.medicalPercent}%</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Access Roles (Select all that apply)</label>
                  <p className="text-xs text-slate-500">Employee access is included by default. Select additional roles to grant team dashboard access.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "employee", label: "Employee (Self Service Only)", description: "Default access" },
                      { value: "asset_team", label: "Asset Team", description: "Manage company assets" },
                      { value: "payroll_team", label: "Payroll Team", description: "Manage payroll" },
                      { value: "hr_manager", label: "HR Manager", description: "Full HR module access" },
                      { value: "leadership", label: "Leadership", description: "Org tree, department-specific access" },
                      { value: "manager", label: "Reporting Manager", description: "Team-specific access, all basic info" },
                      { value: "project_team", label: "Project Team", description: "Manage projects" },
                      { value: "onboarding_team", label: "Onboarding Team", description: "Manage onboarding" },
                      { value: "pms_team", label: "PMS Team", description: "Performance management" },
                      { value: "lms_team", label: "LMS Team", description: "Leave management" },
                      { value: "admin", label: "Admin", description: "Full system access" },
                    ].map((role) => {
                      const currentRoles = (form.watch("accessRole") || "employee").split(",").map(r => r.trim());
                      const isChecked = currentRoles.includes(role.value);
                      return (
                        <label
                          key={role.value}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isChecked ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
                          }`}
                          data-testid={`checkbox-role-${role.value}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = (form.getValues("accessRole") || "employee").split(",").map(r => r.trim()).filter(r => r);
                              let newRoles: string[];
                              if (e.target.checked) {
                                newRoles = Array.from(new Set([...current, role.value]));
                              } else {
                                newRoles = current.filter(r => r !== role.value);
                                if (newRoles.length === 0) newRoles = ["employee"];
                              }
                              form.setValue("accessRole", newRoles.join(","));
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <div>
                            <p className="text-sm font-medium">{role.label}</p>
                            <p className="text-xs text-slate-500">{role.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "qualifications" && (
              <div className="space-y-5">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-sm">Highest Qualification</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Qualification</label>
                        <Select onValueChange={(val) => form.setValue("highestQualification", val)}>
                          <SelectTrigger data-testid="select-highestQualification">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="phd">Ph.D.</SelectItem>
                            <SelectItem value="mtech">M.Tech</SelectItem>
                            <SelectItem value="mba">MBA</SelectItem>
                            <SelectItem value="mca">MCA</SelectItem>
                            <SelectItem value="msc">M.Sc</SelectItem>
                            <SelectItem value="btech">B.Tech</SelectItem>
                            <SelectItem value="be">B.E.</SelectItem>
                            <SelectItem value="bca">BCA</SelectItem>
                            <SelectItem value="bsc">B.Sc</SelectItem>
                            <SelectItem value="bcom">B.Com</SelectItem>
                            <SelectItem value="ba">B.A.</SelectItem>
                            <SelectItem value="diploma">Diploma</SelectItem>
                            <SelectItem value="12th">12th</SelectItem>
                            <SelectItem value="10th">10th</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Specialization</label>
                        <Input {...form.register("specialization")} placeholder="e.g., Computer Science" data-testid="input-specialization" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Institute Name</label>
                        <Input {...form.register("instituteName")} placeholder="University/College name" data-testid="input-instituteName" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Score/Percentage/CGPA</label>
                        <Input {...form.register("qualificationScore")} placeholder="e.g., 8.5 CGPA or 85%" data-testid="input-qualificationScore" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-sm">Second Qualification</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Qualification</label>
                        <Select onValueChange={(val) => form.setValue("secondHighestQualification", val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="phd">Ph.D.</SelectItem>
                            <SelectItem value="mtech">M.Tech</SelectItem>
                            <SelectItem value="mba">MBA</SelectItem>
                            <SelectItem value="mca">MCA</SelectItem>
                            <SelectItem value="msc">M.Sc</SelectItem>
                            <SelectItem value="btech">B.Tech</SelectItem>
                            <SelectItem value="be">B.E.</SelectItem>
                            <SelectItem value="bca">BCA</SelectItem>
                            <SelectItem value="bsc">B.Sc</SelectItem>
                            <SelectItem value="bcom">B.Com</SelectItem>
                            <SelectItem value="ba">B.A.</SelectItem>
                            <SelectItem value="diploma">Diploma</SelectItem>
                            <SelectItem value="12th">12th</SelectItem>
                            <SelectItem value="10th">10th</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Specialization</label>
                        <Input {...form.register("secondSpecialization")} placeholder="e.g., Electronics" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Institute Name</label>
                        <Input {...form.register("secondInstituteName")} placeholder="University/College name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Score/Percentage/CGPA</label>
                        <Input {...form.register("secondQualificationScore")} placeholder="e.g., 8.0 CGPA" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "bank" && (
              <div className="space-y-5">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-sm">Bank Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Bank Name</label>
                        <Input {...form.register("bankName")} placeholder="e.g., HDFC Bank" data-testid="input-bankName" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Branch Name</label>
                        <Input {...form.register("branchName")} placeholder="e.g., Connaught Place" data-testid="input-branchName" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Account Number</label>
                        <Input {...form.register("bankAccountNumber")} placeholder="Account number" data-testid="input-bankAccountNumber" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">IFSC Code</label>
                        <Input {...form.register("ifscCode")} placeholder="e.g., HDFC0001234" data-testid="input-ifscCode" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-sm">Statutory IDs</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">PAN Number</label>
                        <Input {...form.register("panNumber")} placeholder="e.g., ABCDE1234F" data-testid="input-panNumber" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Aadhar Number</label>
                        <Input {...form.register("aadharNumber")} placeholder="12-digit Aadhar" data-testid="input-aadharNumber" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-sm">PF & ESI Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">PF Status</label>
                        <Select onValueChange={(val) => form.setValue("pfStatus", val)}>
                          <SelectTrigger data-testid="select-pfStatus">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">UAN Number</label>
                        <Input {...form.register("uanNumber")} placeholder="Universal Account Number" data-testid="input-uanNumber" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">PF Number</label>
                        <Input {...form.register("pfNumber")} placeholder="PF account number" data-testid="input-pfNumber" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">ESI Number</label>
                        <Input {...form.register("esiNumber")} placeholder="ESI number" data-testid="input-esiNumber" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mt-6 sticky bottom-0 bg-background py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Step {tabs.findIndex(t => t.id === activeTab) + 1} of {tabs.length}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setLocation("/employees")}>
              Cancel
            </Button>
            {activeTab !== "basic" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const currentIndex = tabs.findIndex(t => t.id === activeTab);
                  if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id);
                }}
              >
                Previous
              </Button>
            )}
            {activeTab !== "bank" ? (
              <Button
                type="button"
                onClick={() => {
                  const currentIndex = tabs.findIndex(t => t.id === activeTab);
                  if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id);
                }}
              >
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={createEmployee.isPending} data-testid="button-submit">
                {createEmployee.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Employee
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
