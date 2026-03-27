import { useQuery } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  GraduationCap, Users, BookOpen, Award, Search,
  TrendingUp, Briefcase, BarChart3, Clock, CheckCircle2
} from "lucide-react";
import { useState, useMemo } from "react";
import type { Employee, Department } from "@shared/schema";
import { format, differenceInMonths } from "date-fns";

export default function Learning() {
  const { entityFilterParam, selectedEntityIds } = useEntity();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/departments${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const activeEmployees = employees.filter(e => e.status === "active");

  const getDepartmentName = (deptId: number | null) => {
    if (!deptId) return "-";
    const dept = departments.find((d: any) => d.id === deptId);
    return dept?.name || "-";
  };

  const getEmployeeName = (emp: Employee) => `${emp.firstName} ${emp.lastName || ''}`.trim();

  const designationDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const key = emp.designation || "Unassigned";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [activeEmployees]);

  const departmentHeadcount = useMemo(() => {
    const map: Record<string, { total: number, newJoiners: number }> = {};
    const today = new Date();
    activeEmployees.forEach(emp => {
      const dept = getDepartmentName(emp.departmentId);
      if (!map[dept]) map[dept] = { total: 0, newJoiners: 0 };
      map[dept].total++;
      if (emp.joinDate && differenceInMonths(today, new Date(emp.joinDate)) < 6) {
        map[dept].newJoiners++;
      }
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [activeEmployees, departments]);

  const experienceBreakdown = useMemo(() => {
    const buckets: Record<string, number> = { "Freshers (< 1y)": 0, "Junior (1-3y)": 0, "Mid (3-5y)": 0, "Senior (5-10y)": 0, "Expert (10y+)": 0 };
    const today = new Date();
    activeEmployees.forEach(emp => {
      if (!emp.joinDate) return;
      const months = differenceInMonths(today, new Date(emp.joinDate));
      if (months < 12) buckets["Freshers (< 1y)"]++;
      else if (months < 36) buckets["Junior (1-3y)"]++;
      else if (months < 60) buckets["Mid (3-5y)"]++;
      else if (months < 120) buckets["Senior (5-10y)"]++;
      else buckets["Expert (10y+)"]++;
    });
    return Object.entries(buckets);
  }, [activeEmployees]);

  const probationCount = activeEmployees.filter(e => e.employmentStatus === "probation").length;
  const newJoinersCount = useMemo(() => {
    const today = new Date();
    return activeEmployees.filter(e => e.joinDate && differenceInMonths(today, new Date(e.joinDate)) < 3).length;
  }, [activeEmployees]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const matchesSearch =
        getEmployeeName(emp).toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = departmentFilter === "all" || String(emp.departmentId) === departmentFilter;
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "probation" && emp.employmentStatus === "probation") ||
        (statusFilter === "confirmed" && (emp.employmentStatus === "confirmed" || !emp.employmentStatus));
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [activeEmployees, searchTerm, departmentFilter, statusFilter]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Learning & Development</h1>
          <p className="text-slate-500">Skills overview, department analysis, and employee development tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Workforce</p>
                <p className="text-2xl font-bold text-slate-800" data-testid="text-total-workforce">{activeEmployees.length}</p>
                <p className="text-xs text-green-600 mt-1">Active employees</p>
              </div>
              <Users className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Departments</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-dept-count">{departmentHeadcount.length}</p>
                <p className="text-xs text-slate-400 mt-1">Active departments</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">On Probation</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-probation-count">{probationCount}</p>
                <p className="text-xs text-slate-400 mt-1">Needs mentoring</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">New Joiners (3m)</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-new-joiners">{newJoinersCount}</p>
                <p className="text-xs text-green-600 mt-1">Last 3 months</p>
              </div>
              <GraduationCap className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="skills" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="skills" data-testid="tab-skills">Skills & Roles</TabsTrigger>
          <TabsTrigger value="departments" data-testid="tab-departments">Department Analysis</TabsTrigger>
          <TabsTrigger value="directory" data-testid="tab-directory">Employee Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="skills">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" />
                  Role Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {designationDistribution.map(([designation, count]) => {
                    const percentage = activeEmployees.length > 0 ? (count / activeEmployees.length) * 100 : 0;
                    return (
                      <div key={designation} data-testid={`role-${designation}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600 truncate max-w-[60%]">{designation}</span>
                          <span className="text-sm font-medium text-slate-800">{count}</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-2.5">
                          <div className="bg-indigo-500 rounded-full h-2.5 transition-all" style={{ width: `${percentage}%` }} />
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
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Experience Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {experienceBreakdown.map(([level, count]) => {
                    const percentage = activeEmployees.length > 0 ? (count / activeEmployees.length) * 100 : 0;
                    return (
                      <div key={level} data-testid={`exp-${level}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600">{level}</span>
                          <span className="text-sm font-medium text-slate-800">{count} ({Math.round(percentage)}%)</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-3">
                          <div className="bg-emerald-500 rounded-full h-3 transition-all" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Department Headcount & Development Needs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departmentHeadcount.map(([dept, data]) => {
                  const percentage = activeEmployees.length > 0 ? (data.total / activeEmployees.length) * 100 : 0;
                  return (
                    <div key={dept} className="p-4 bg-slate-50 rounded-lg border" data-testid={`dept-${dept}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-900">{dept}</p>
                          <p className="text-xs text-slate-500">
                            {data.total} employees · {Math.round(percentage)}% of workforce
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {data.newJoiners > 0 && (
                            <Badge className="bg-blue-100 text-blue-700">{data.newJoiners} new</Badge>
                          )}
                          <Badge className="bg-emerald-100 text-emerald-700">{data.total}</Badge>
                        </div>
                      </div>
                      <div className="bg-slate-200 rounded-full h-2">
                        <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directory">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Employee Skills Directory ({filteredEmployees.length})
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="probation">Probation</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
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
                        const months = emp.joinDate ? differenceInMonths(new Date(), new Date(emp.joinDate)) : 0;
                        const years = Math.floor(months / 12);
                        const rem = months % 12;
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
                              {emp.joinDate ? (years > 0 ? `${years}y ${rem}m` : `${rem}m`) : '-'}
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
      </Tabs>
    </div>
  );
}
