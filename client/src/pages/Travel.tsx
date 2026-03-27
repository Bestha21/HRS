import { useQuery } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plane, MapPin, Clock, Users, Building2, Search,
  TrendingUp, Briefcase, BarChart3, CheckCircle2, ChevronRight,
  FileText, DollarSign
} from "lucide-react";
import { useState, useMemo } from "react";
import type { Employee } from "@shared/schema";
import { format, differenceInMonths } from "date-fns";

export default function Travel() {
  const { entityFilterParam, selectedEntityIds } = useEntity();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
  });

  const activeEmployees = employees.filter(e => e.status === "active");

  const getDepartmentName = (deptId: number | null) => {
    if (!deptId) return "-";
    const dept = departments.find((d: any) => d.id === deptId);
    return dept?.name || "-";
  };

  const getEmployeeName = (emp: Employee) => `${emp.firstName} ${emp.lastName || ''}`.trim();

  const locationDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const loc = (emp as any).workLocation || (emp as any).location || "Office";
      map[loc] = (map[loc] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeEmployees]);

  const locationPermissionBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const perm = (emp as any).locationPermission || "office";
      map[perm] = (map[perm] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeEmployees]);

  const departmentHeadcount = useMemo(() => {
    const map: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const dept = getDepartmentName(emp.departmentId);
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeEmployees, departments]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const matchesSearch =
        getEmployeeName(emp).toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = departmentFilter === "all" || String(emp.departmentId) === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [activeEmployees, searchTerm, departmentFilter]);

  const remoteCount = activeEmployees.filter(e => (e as any).locationPermission === "remote" || (e as any).locationPermission === "hybrid").length;
  const officeCount = activeEmployees.length - remoteCount;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900" data-testid="text-page-title">Travel Management</h1>
        <p className="text-sm sm:text-base text-slate-500">Employee locations, work arrangements, and travel policy</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Employees</p>
                <p className="text-2xl font-bold text-slate-800" data-testid="text-total-count">{activeEmployees.length}</p>
                <p className="text-xs text-green-600 mt-1">Active workforce</p>
              </div>
              <Users className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Office Based</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-office-count">{officeCount}</p>
                <p className="text-xs text-slate-400 mt-1">On-site employees</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Remote / Hybrid</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-remote-count">{remoteCount}</p>
                <p className="text-xs text-green-600 mt-1">Flexible work</p>
              </div>
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Departments</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="text-dept-count">{departmentHeadcount.length}</p>
                <p className="text-xs text-slate-400 mt-1">Active departments</p>
              </div>
              <Briefcase className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-lg text-xs sm:text-sm">
          <TabsTrigger value="overview" data-testid="tab-overview">Locations</TabsTrigger>
          <TabsTrigger value="policy" data-testid="tab-policy">Travel Policy</TabsTrigger>
          <TabsTrigger value="directory" data-testid="tab-directory">Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  Work Location Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {locationDistribution.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No location data available</p>
                ) : (
                  <div className="space-y-3">
                    {locationDistribution.map(([loc, count]) => {
                      const percentage = activeEmployees.length > 0 ? (count / activeEmployees.length) * 100 : 0;
                      return (
                        <div key={loc} data-testid={`location-${loc}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-600 capitalize">{loc.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-medium text-slate-800">{count} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="bg-slate-100 rounded-full h-3">
                            <div className="bg-blue-500 rounded-full h-3 transition-all" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-500" />
                  Work Arrangement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {locationPermissionBreakdown.map(([perm, count]) => {
                    const percentage = activeEmployees.length > 0 ? (count / activeEmployees.length) * 100 : 0;
                    const colorMap: Record<string, string> = {
                      office: "bg-blue-500",
                      remote: "bg-green-500",
                      hybrid: "bg-amber-500",
                    };
                    return (
                      <div key={perm} className="p-3 bg-slate-50 rounded-lg" data-testid={`perm-${perm}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700 capitalize">{perm}</span>
                          <Badge className="bg-slate-200 text-slate-700">{count} ({Math.round(percentage)}%)</Badge>
                        </div>
                        <div className="bg-slate-200 rounded-full h-2">
                          <div className={`${colorMap[perm] || 'bg-slate-400'} rounded-full h-2 transition-all`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-3">
                  <p className="text-sm font-medium text-slate-700">Department Headcount</p>
                  {departmentHeadcount.slice(0, 8).map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm text-slate-600">{dept}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Travel Workflow & Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-4">Travel Request Workflow</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {[
                    { step: "Request Submitted", icon: FileText, desc: "Employee submits travel request" },
                    { step: "Manager Approval", icon: Users, desc: "Reporting manager reviews" },
                    { step: "HR Verification", icon: Building2, desc: "HR verifies policy compliance" },
                    { step: "Finance Approval", icon: DollarSign, desc: "Budget validation" },
                    { step: "Travel Booked", icon: Plane, desc: "Tickets & hotel booked" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <p className="text-xs font-medium text-blue-900 mt-2">{item.step}</p>
                      <p className="text-xs text-blue-600 mt-1 hidden sm:block">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Approval Matrix</h4>
                  <div className="space-y-2">
                    {[
                      { level: "Domestic (Local)", approver: "Reporting Manager", limit: "Rs. 25,000" },
                      { level: "Domestic (Interstate)", approver: "Department Head", limit: "Rs. 75,000" },
                      { level: "International (APAC)", approver: "VP + HR", limit: "Rs. 2,00,000" },
                      { level: "International (Others)", approver: "CEO + Finance", limit: "Rs. 5,00,000+" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-700">{item.level}</p>
                          <p className="text-xs text-slate-500">Approved by: {item.approver}</p>
                        </div>
                        <Badge variant="secondary">{item.limit}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Travel Policy Highlights</h4>
                  <div className="space-y-2">
                    {[
                      { policy: "Advance booking required", detail: "Minimum 7 days for domestic, 15 days for international" },
                      { policy: "Class of travel", detail: "Economy for <6 hrs, Business for >6 hrs (Sr. Mgmt only)" },
                      { policy: "Hotel category", detail: "3-star standard, 4-star for client visits" },
                      { policy: "Per diem allowance", detail: "Rs. 2,000/day domestic, Rs. 5,000/day international" },
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium text-slate-700">{item.policy}</p>
                        <p className="text-xs text-slate-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directory">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Employee Directory ({filteredEmployees.length})
                </CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search employees..."
                      className="pl-9 w-full sm:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full sm:w-44" data-testid="select-dept-filter">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept: any) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Work Type</TableHead>
                      <TableHead>Join Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400">No employees found</TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.slice(0, 50).map((emp) => (
                        <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                          <TableCell className="font-medium">{getEmployeeName(emp)}</TableCell>
                          <TableCell className="text-slate-500">{emp.employeeCode || '-'}</TableCell>
                          <TableCell>{getDepartmentName(emp.departmentId)}</TableCell>
                          <TableCell className="text-slate-600">{emp.designation || '-'}</TableCell>
                          <TableCell className="text-slate-600 capitalize">
                            {((emp as any).workLocation || (emp as any).location || "Office").replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              (emp as any).locationPermission === "remote" ? "bg-green-100 text-green-700" :
                              (emp as any).locationPermission === "hybrid" ? "bg-amber-100 text-amber-700" :
                              "bg-blue-100 text-blue-700"
                            }>
                              {((emp as any).locationPermission || "office").charAt(0).toUpperCase() + ((emp as any).locationPermission || "office").slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {emp.joinDate ? format(new Date(emp.joinDate), 'dd MMM yyyy') : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredEmployees.length > 50 && (
                <p className="text-sm text-slate-400 mt-3 text-center">Showing 50 of {filteredEmployees.length} employees</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
