import { useQuery } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, MapPin, Building2, CalendarDays, Users, UserCheck } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import type { Employee, Department } from "@shared/schema";

export default function EmployeeDirectory() {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/departments${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const getDepartmentName = (deptId: number | null) => {
    if (!deptId) return "Unassigned";
    return departments?.find(d => d.id === deptId)?.name || "Unknown";
  };

  const getManagerName = (managerId: string | null | undefined) => {
    if (!managerId) return null;
    const manager = employees?.find(e => e.id === parseInt(managerId));
    if (!manager) return null;
    return `${manager.firstName} ${manager.lastName || ''}`.trim();
  };

  const getReportees = (empId: number) => {
    return employees?.filter(e => e.reportingManagerId === String(empId) && e.status === 'active') || [];
  };

  const activeEmployees = employees?.filter(emp => emp.status === 'active') || [];

  const filteredEmployees = activeEmployees.filter(emp => {
    const matchesSearch = 
      emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
      (emp.lastName || '').toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      (emp.employeeCode || '').toLowerCase().includes(search.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(search.toLowerCase());
    
    const matchesDept = departmentFilter === "all" || emp.departmentId === parseInt(departmentFilter);
    
    return matchesSearch && matchesDept;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Employee Directory</h1>
        <p className="text-slate-500">Search and browse all employees in the organization</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by name, email, or designation..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-department">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map(dept => (
              <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-slate-500">
        Showing {filteredEmployees.length} of {activeEmployees.length} employees
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredEmployees.map((emp) => {
          const managerName = getManagerName(emp.reportingManagerId);
          const reportees = getReportees(emp.id);
          return (
            <Card key={emp.id} data-testid={`employee-card-${emp.id}`} className="hover-elevate">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-2xl font-bold mb-4">
                    {emp.firstName?.[0]}{(emp.lastName || emp.firstName)?.[0]}
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900">{emp.firstName} {emp.lastName || ''}</h3>
                  <p className="text-sm text-slate-600">{emp.designation || "No designation"}</p>
                  <Badge variant="secondary" className="mt-2">
                    {emp.employeeCode || `EMP${emp.id.toString().padStart(3, '0')}`}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{getDepartmentName(emp.departmentId)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                  {emp.city && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{emp.city}{emp.state ? `, ${emp.state}` : ""}</span>
                    </div>
                  )}
                  {emp.joinDate && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Joined: {format(new Date(emp.joinDate), "dd MMM yyyy")}</span>
                    </div>
                  )}
                  {managerName && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">Reports to: {managerName}</span>
                    </div>
                  )}
                  {reportees.length > 0 && (
                    <div className="flex items-start gap-2 text-slate-600">
                      <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium">Reportees ({reportees.length}):</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {reportees.slice(0, 5).map(r => (
                            <Badge key={r.id} variant="outline" className="text-[10px] px-1.5 py-0">
                              {r.firstName} {r.lastName?.[0] || ''}
                            </Badge>
                          ))}
                          {reportees.length > 5 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{reportees.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No employees found matching your search</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
