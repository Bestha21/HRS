import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Target, Search, Filter, Download, TrendingUp, Users, Award, Clock, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
import { useState, useMemo } from "react";
import { useEntity } from "@/lib/entityContext";
import type { Employee } from "@shared/schema";
import { format, differenceInMonths, differenceInDays } from "date-fns";

export default function TeamPMS() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const { selectedEntityIds } = useEntity();

  const { data: employees = [], isLoading, error } = useQuery<Employee[]>({
    queryKey: ["/api/team/performance"],
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
  });

  const filteredByEntity = useMemo(() => {
    if (selectedEntityIds.length === 0) return employees;
    return employees.filter(e => e.entityId && selectedEntityIds.includes(e.entityId));
  }, [employees, selectedEntityIds]);

  const getEmployeeName = (emp: Employee) => `${emp.firstName} ${emp.lastName || ''}`.trim();
  const getDepartmentName = (deptId: number | null) => {
    if (!deptId) return "-";
    const dept = departments.find((d: any) => d.id === deptId);
    return dept?.name || "-";
  };

  const filteredEmployees = filteredByEntity.filter(emp => {
    const matchesSearch =
      getEmployeeName(emp).toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
    const matchesDept = departmentFilter === "all" || String(emp.departmentId) === departmentFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const activeEmployees = filteredByEntity.filter(e => e.status === "active");
  const probationEmployees = filteredByEntity.filter(e => e.employmentStatus === "probation" && e.status === "active");
  const confirmedEmployees = filteredByEntity.filter(e => e.employmentStatus === "confirmed" && e.status === "active");
  const noticeEmployees = filteredByEntity.filter(e => e.employmentStatus === "notice_period" && e.status === "active");

  const getProbationProgress = (emp: Employee) => {
    if (!emp.joinDate) return 0;
    const joinDate = new Date(emp.joinDate);
    const months = differenceInMonths(new Date(), joinDate);
    return Math.min(Math.round((months / 6) * 100), 100);
  };

  const getProbationDaysLeft = (emp: Employee) => {
    if (!emp.joinDate) return 0;
    const joinDate = new Date(emp.joinDate);
    const probationEnd = new Date(joinDate);
    probationEnd.setMonth(probationEnd.getMonth() + 6);
    return Math.max(differenceInDays(probationEnd, new Date()), 0);
  };

  const getTenure = (emp: Employee) => {
    if (!emp.joinDate) return "-";
    const months = differenceInMonths(new Date(), new Date(emp.joinDate));
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (years > 0) return `${years}y ${rem}m`;
    return `${rem}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500">You don't have permission to view performance data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900" data-testid="text-page-title">Performance Management</h1>
          <p className="text-sm sm:text-base text-slate-600">Track employee performance, probation, and confirmations</p>
        </div>
        <Button data-testid="button-export-performance" className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total</p>
                <p className="text-2xl font-bold" data-testid="text-total-employees">{filteredByEntity.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active</p>
                <p className="text-2xl font-bold" data-testid="text-active-employees">{activeEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Probation</p>
                <p className="text-2xl font-bold" data-testid="text-probation-employees">{probationEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Confirmed</p>
                <p className="text-2xl font-bold" data-testid="text-confirmed-employees">{confirmedEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Notice Period</p>
                <p className="text-2xl font-bold" data-testid="text-notice-employees">{noticeEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Employee Overview</TabsTrigger>
          <TabsTrigger value="probation" data-testid="tab-probation">Probation Tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <CardTitle>Employee Performance Overview</CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full sm:w-64"
                      data-testid="input-search-employees"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-full sm:w-40" data-testid="select-dept-filter">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Employee Code</TableHead>
                    <TableHead className="whitespace-nowrap">Employee Name</TableHead>
                    <TableHead className="whitespace-nowrap">Department</TableHead>
                    <TableHead className="whitespace-nowrap">Designation</TableHead>
                    <TableHead className="whitespace-nowrap">Employment Status</TableHead>
                    <TableHead className="whitespace-nowrap">Tenure</TableHead>
                    <TableHead className="whitespace-nowrap">Join Date</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map(emp => (
                    <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                      <TableCell className="font-medium">{emp.employeeCode || "-"}</TableCell>
                      <TableCell>{getEmployeeName(emp)}</TableCell>
                      <TableCell>{getDepartmentName(emp.departmentId)}</TableCell>
                      <TableCell>{emp.designation || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={
                          emp.employmentStatus === "confirmed" ? "default" :
                          emp.employmentStatus === "notice_period" ? "destructive" : "secondary"
                        }>
                          {emp.employmentStatus || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getTenure(emp)}</TableCell>
                      <TableCell>
                        {emp.joinDate ? format(new Date(emp.joinDate), 'dd MMM yyyy') : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={emp.status === "active" ? "default" : "outline"}>
                          {emp.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No employees found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="probation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Employees on Probation ({probationEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {probationEmployees.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No employees currently on probation</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {probationEmployees.map(emp => {
                    const progress = getProbationProgress(emp);
                    const daysLeft = getProbationDaysLeft(emp);
                    return (
                      <div key={emp.id} className="border rounded-lg p-4" data-testid={`card-probation-${emp.id}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0) || ''}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{getEmployeeName(emp)}</p>
                            <p className="text-xs text-slate-500">{emp.employeeCode} · {emp.designation || "N/A"}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Probation Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Joined: {emp.joinDate ? format(new Date(emp.joinDate), 'dd MMM yyyy') : '-'}</span>
                            <span className={daysLeft <= 30 ? "text-red-500 font-medium" : ""}>
                              {daysLeft} days left
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
