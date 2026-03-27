import { useQuery } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Target, Users, Award, Clock, TrendingUp, Search,
  CheckCircle2, AlertCircle, BarChart3, Briefcase, CalendarDays
} from "lucide-react";
import { useState, useMemo } from "react";
import type { Employee } from "@shared/schema";
import { format, differenceInMonths, differenceInYears } from "date-fns";

export default function Performance() {
  const { entityFilterParam, selectedEntityIds } = useEntity();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  const probationEmployees = useMemo(() => {
    return activeEmployees.filter(e => e.employmentStatus === "probation");
  }, [activeEmployees]);

  const confirmedEmployees = useMemo(() => {
    return activeEmployees.filter(e => e.employmentStatus === "confirmed" || !e.employmentStatus);
  }, [activeEmployees]);

  const tenureBreakdown = useMemo(() => {
    const buckets = { "< 6 months": 0, "6-12 months": 0, "1-2 years": 0, "2-5 years": 0, "5+ years": 0 };
    const today = new Date();
    activeEmployees.forEach(emp => {
      if (!emp.joinDate) return;
      const months = differenceInMonths(today, new Date(emp.joinDate));
      if (months < 6) buckets["< 6 months"]++;
      else if (months < 12) buckets["6-12 months"]++;
      else if (months < 24) buckets["1-2 years"]++;
      else if (months < 60) buckets["2-5 years"]++;
      else buckets["5+ years"]++;
    });
    return Object.entries(buckets);
  }, [activeEmployees]);

  const departmentHeadcount = useMemo(() => {
    const map: Record<string, { total: number, probation: number }> = {};
    activeEmployees.forEach(emp => {
      const dept = getDepartmentName(emp.departmentId);
      if (!map[dept]) map[dept] = { total: 0, probation: 0 };
      map[dept].total++;
      if (emp.employmentStatus === "probation") map[dept].probation++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
  }, [activeEmployees, departments]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const matchesSearch =
        getEmployeeName(emp).toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "probation" && emp.employmentStatus === "probation") ||
        (statusFilter === "confirmed" && (emp.employmentStatus === "confirmed" || !emp.employmentStatus));
      const matchesDept = departmentFilter === "all" || String(emp.departmentId) === departmentFilter;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [activeEmployees, searchTerm, statusFilter, departmentFilter]);

  const avgTenureMonths = useMemo(() => {
    const today = new Date();
    const empsWithJoin = activeEmployees.filter(e => e.joinDate);
    if (empsWithJoin.length === 0) return 0;
    const total = empsWithJoin.reduce((sum, emp) => sum + differenceInMonths(today, new Date(emp.joinDate!)), 0);
    return Math.round(total / empsWithJoin.length);
  }, [activeEmployees]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Performance Management</h1>
          <p className="text-slate-500">Employee status, probation tracking, and workforce analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Employees</p>
                <p className="text-2xl font-bold text-slate-800" data-testid="text-active-count">{activeEmployees.length}</p>
                <p className="text-xs text-green-600 mt-1">Currently active</p>
              </div>
              <Users className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">On Probation</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-probation-count">{probationEmployees.length}</p>
                <p className="text-xs text-slate-400 mt-1">Pending confirmation</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Confirmed</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-confirmed-count">{confirmedEmployees.length}</p>
                <p className="text-xs text-green-600 mt-1">Permanent staff</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Avg Tenure</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-avg-tenure">
                  {avgTenureMonths >= 12 ? `${Math.floor(avgTenureMonths / 12)}y ${avgTenureMonths % 12}m` : `${avgTenureMonths}m`}
                </p>
                <p className="text-xs text-slate-400 mt-1">Average experience</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="directory" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="directory" data-testid="tab-directory">Employee Directory</TabsTrigger>
          <TabsTrigger value="probation" data-testid="tab-probation">Probation Tracker</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Workforce Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Employee Overview ({filteredEmployees.length})
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search employees..."
                      className="pl-9 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="probation">Probation</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-44" data-testid="select-dept-filter">
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
                      <TableHead>Status</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Tenure</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400">No employees found</TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.slice(0, 50).map((emp) => {
                        const today = new Date();
                        const months = emp.joinDate ? differenceInMonths(today, new Date(emp.joinDate)) : 0;
                        const years = Math.floor(months / 12);
                        const remainingMonths = months % 12;
                        return (
                          <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                            <TableCell className="font-medium">{getEmployeeName(emp)}</TableCell>
                            <TableCell className="text-slate-500">{emp.employeeCode || '-'}</TableCell>
                            <TableCell>{getDepartmentName(emp.departmentId)}</TableCell>
                            <TableCell className="text-slate-600">{emp.designation || '-'}</TableCell>
                            <TableCell>
                              <Badge className={emp.employmentStatus === "probation" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>
                                {emp.employmentStatus === "probation" ? "Probation" : "Confirmed"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {emp.joinDate ? format(new Date(emp.joinDate), 'dd MMM yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {emp.joinDate ? (years > 0 ? `${years}y ${remainingMonths}m` : `${remainingMonths}m`) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
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

        <TabsContent value="probation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Probation Tracker ({probationEmployees.length} employees)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {probationEmployees.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No employees currently on probation</p>
              ) : (
                <div className="space-y-4">
                  {probationEmployees.map((emp) => {
                    const today = new Date();
                    const joinDate = emp.joinDate ? new Date(emp.joinDate) : today;
                    const totalProbation = (emp as any).probationPeriod || 6;
                    const monthsCompleted = differenceInMonths(today, joinDate);
                    const progress = Math.min(100, Math.round((monthsCompleted / totalProbation) * 100));
                    const daysRemaining = Math.max(0, totalProbation * 30 - (today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = monthsCompleted >= totalProbation;

                    return (
                      <div key={emp.id} className={`p-4 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`} data-testid={`card-probation-${emp.id}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isOverdue ? 'bg-red-200 text-red-700' : 'bg-yellow-200 text-yellow-700'}`}>
                              {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0) || ''}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{getEmployeeName(emp)}</p>
                              <p className="text-xs text-slate-500">{emp.designation || emp.employeeCode} · {getDepartmentName(emp.departmentId)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={isOverdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>
                              {isOverdue ? "Overdue" : `${Math.round(daysRemaining)} days left`}
                            </Badge>
                            <p className="text-xs text-slate-400 mt-1">Joined: {format(joinDate, 'dd MMM yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span className="text-sm font-medium text-slate-700 w-12 text-right">{progress}%</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {monthsCompleted} of {totalProbation} months completed
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  Tenure Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenureBreakdown.map(([bucket, count]) => {
                    const percentage = activeEmployees.length > 0 ? (count / activeEmployees.length) * 100 : 0;
                    return (
                      <div key={bucket}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600">{bucket}</span>
                          <span className="text-sm font-medium text-slate-800">{count} ({Math.round(percentage)}%)</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-3">
                          <div className="bg-indigo-500 rounded-full h-3 transition-all" style={{ width: `${percentage}%` }} />
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
                  <Briefcase className="w-5 h-5 text-emerald-500" />
                  Department Headcount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departmentHeadcount.map(([dept, data]) => (
                    <div key={dept} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-700 text-sm">{dept}</p>
                        {data.probation > 0 && (
                          <p className="text-xs text-yellow-600">{data.probation} on probation</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-100 text-emerald-700">{data.total}</Badge>
                      </div>
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
