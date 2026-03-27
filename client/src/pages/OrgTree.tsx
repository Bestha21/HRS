import { useQuery } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, User, ChevronDown, ChevronRight, Search, Minus, Maximize2, FolderTree, UserCircle } from "lucide-react";
import type { Employee, Department } from "@shared/schema";
import { useState, useMemo, useEffect } from "react";

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

interface DeptTreeNode {
  department: Department;
  children: DeptTreeNode[];
  employees: Employee[];
}

function buildTree(employees: Employee[]): TreeNode[] {
  const nodesByKey = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  employees.forEach(emp => {
    const node: TreeNode = { employee: emp, children: [] };
    if (emp.employeeCode) {
      nodesByKey.set(emp.employeeCode, node);
      nodesByKey.set(emp.employeeCode.toLowerCase(), node);
    }
    nodesByKey.set(String(emp.id), node);
    const fullName = `${emp.firstName} ${emp.lastName || ''}`.trim().toLowerCase();
    if (fullName && !nodesByKey.has(fullName)) {
      nodesByKey.set(fullName, node);
    }
  });

  const findParent = (key: string): TreeNode | undefined => {
    return nodesByKey.get(key) || nodesByKey.get(key.toLowerCase()) || nodesByKey.get(key.trim());
  };

  const childSet = new Set<number>();

  employees.forEach(emp => {
    const node = emp.employeeCode ? nodesByKey.get(emp.employeeCode)! : nodesByKey.get(String(emp.id))!;
    if (!node) return;
    const parentKey = emp.reportingManagerId ? String(emp.reportingManagerId).trim() : null;
    if (parentKey) {
      const parentNode = findParent(parentKey);
      if (parentNode && parentNode !== node) {
        parentNode.children.push(node);
        childSet.add(emp.id);
        return;
      }
    }
    roots.push(node);
  });

  const isManager = (emp: Employee) => {
    return employees.some(other => {
      const mgr = other.reportingManagerId ? String(other.reportingManagerId).trim() : null;
      if (!mgr) return false;
      return mgr === emp.employeeCode || mgr === String(emp.id) ||
        mgr.toLowerCase() === emp.employeeCode?.toLowerCase() ||
        mgr.toLowerCase() === `${emp.firstName} ${emp.lastName || ''}`.trim().toLowerCase();
    });
  };

  const trueRoots = roots.filter(n => isManager(n.employee));
  const unassigned = roots.filter(n => !isManager(n.employee));

  trueRoots.sort((a, b) => getSubordinateCount(b) - getSubordinateCount(a));

  return [...trueRoots, ...unassigned];
}

function buildDeptTree(departments: Department[], employees: Employee[]): { roots: DeptTreeNode[], unassigned: Employee[] } {
  const map = new Map<number, DeptTreeNode>();
  const roots: DeptTreeNode[] = [];

  departments.forEach(dept => {
    map.set(dept.id, { department: dept, children: [], employees: [] });
  });

  employees.forEach(emp => {
    if (emp.departmentId && map.has(emp.departmentId)) {
      map.get(emp.departmentId)!.employees.push(emp);
    }
  });

  departments.forEach(dept => {
    const node = map.get(dept.id)!;
    if (dept.parentDepartmentId && map.has(dept.parentDepartmentId)) {
      map.get(dept.parentDepartmentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const unassigned = employees.filter(e => !e.departmentId || !map.has(e.departmentId));

  return { roots, unassigned };
}

function getSubordinateCount(node: TreeNode): number {
  let count = node.children.length;
  node.children.forEach(child => {
    count += getSubordinateCount(child);
  });
  return count;
}

function getDeptTotalCount(node: DeptTreeNode): number {
  let count = node.employees.length;
  node.children.forEach(child => {
    count += getDeptTotalCount(child);
  });
  return count;
}

function matchesSearch(node: TreeNode, query: string): boolean {
  const q = query.toLowerCase();
  const emp = node.employee;
  if (
    emp.firstName?.toLowerCase().includes(q) ||
    emp.lastName?.toLowerCase().includes(q) ||
    emp.designation?.toLowerCase().includes(q) ||
    emp.employeeCode?.toLowerCase().includes(q)
  ) return true;
  return node.children.some(child => matchesSearch(child, q));
}

function matchesDeptSearch(node: DeptTreeNode, query: string): boolean {
  const q = query.toLowerCase();
  if (node.department.name.toLowerCase().includes(q)) return true;
  if (node.employees.some(e =>
    e.firstName?.toLowerCase().includes(q) ||
    e.lastName?.toLowerCase().includes(q) ||
    e.employeeCode?.toLowerCase().includes(q)
  )) return true;
  return node.children.some(child => matchesDeptSearch(child, q));
}

function OrgNodeCard({ node, departments, level, expandedNodes, toggleNode, searchQuery }: {
  node: TreeNode;
  departments: Department[];
  level: number;
  expandedNodes: Set<number>;
  toggleNode: (id: number) => void;
  searchQuery: string;
}) {
  const emp = node.employee;
  const dept = departments.find(d => d.id === emp.departmentId);
  const subordinateCount = getSubordinateCount(node);
  const isExpanded = expandedNodes.has(emp.id);
  const hasChildren = node.children.length > 0;

  const sortedChildren = [...node.children].sort((a, b) =>
    `${a.employee.firstName} ${a.employee.lastName || ''}`.localeCompare(`${b.employee.firstName} ${b.employee.lastName || ''}`)
  );

  const filteredChildren = searchQuery
    ? sortedChildren.filter(child => matchesSearch(child, searchQuery))
    : sortedChildren;

  const levelColors = [
    { bg: "bg-primary", ring: "ring-primary/20", badge: "bg-primary/10 text-primary" },
    { bg: "bg-blue-600", ring: "ring-blue-200", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" },
    { bg: "bg-emerald-600", ring: "ring-emerald-200", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
    { bg: "bg-purple-600", ring: "ring-purple-200", badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300" },
    { bg: "bg-orange-600", ring: "ring-orange-200", badge: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" },
    { bg: "bg-pink-600", ring: "ring-pink-200", badge: "bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-300" },
  ];
  const color = levelColors[Math.min(level, levelColors.length - 1)];

  return (
    <div className="flex flex-col items-center" data-testid={`org-node-${emp.id}`}>
      <div
        className={`relative w-48 p-3 bg-card border rounded-xl shadow-sm cursor-pointer transition-all hover:shadow-md ${
          hasChildren ? "hover-elevate" : ""
        }`}
        onClick={() => hasChildren && toggleNode(emp.id)}
      >
        <div className="flex flex-col items-center text-center gap-0.5">
          <div className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ${color.ring}`}>
            {emp.firstName?.[0]}{emp.lastName?.[0] || ''}
          </div>
          <p className="text-xs font-semibold text-foreground mt-1 leading-tight">
            {emp.firstName} {emp.lastName || ''}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">{emp.designation || 'No designation'}</p>
          {emp.employeeCode && (
            <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium border rounded text-foreground">
              {emp.employeeCode}
            </span>
          )}
        </div>
        {hasChildren && (
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t">
            <span className="text-[10px] text-muted-foreground">
              {subordinateCount} report{subordinateCount !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {isExpanded ? "Collapse" : "Expand"}
            </div>
          </div>
        )}
      </div>

      {hasChildren && isExpanded && filteredChildren.length > 0 && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="relative">
            {filteredChildren.length > 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border" style={{
                width: `calc(100% - 14rem)`,
              }} />
            )}
            <div className="flex gap-4 flex-wrap justify-center">
              {filteredChildren.map(child => (
                <div key={child.employee.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  <OrgNodeCard
                    node={child}
                    departments={departments}
                    level={level + 1}
                    expandedNodes={expandedNodes}
                    toggleNode={toggleNode}
                    searchQuery={searchQuery}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DeptNodeCard({ node, level, expandedDepts, toggleDept, searchQuery, allEmployees }: {
  node: DeptTreeNode;
  level: number;
  expandedDepts: Set<number>;
  toggleDept: (id: number) => void;
  searchQuery: string;
  allEmployees: Employee[];
}) {
  const dept = node.department;
  const totalCount = getDeptTotalCount(node);
  const isExpanded = expandedDepts.has(dept.id);
  const hasContent = node.children.length > 0 || node.employees.length > 0;

  const manager = dept.managerId ? allEmployees.find(e => e.id === dept.managerId) : null;

  const filteredChildren = searchQuery
    ? node.children.filter(child => matchesDeptSearch(child, searchQuery))
    : node.children;

  const filteredEmployees = searchQuery
    ? node.employees.filter(e =>
        e.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : node.employees;

  const levelColors = [
    "bg-primary",
    "bg-blue-600",
    "bg-emerald-600",
    "bg-purple-600",
    "bg-orange-600",
    "bg-pink-600",
  ];
  const bgColor = levelColors[Math.min(level, levelColors.length - 1)];

  return (
    <div className="flex flex-col items-center" data-testid={`dept-node-${dept.id}`}>
      <div
        className={`relative w-64 p-3 bg-card border rounded-md shadow-sm cursor-pointer transition-all ${
          hasContent ? "hover-elevate" : ""
        }`}
        onClick={() => hasContent && toggleDept(dept.id)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center text-white shrink-0`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{dept.name}</p>
            {manager && (
              <p className="text-xs text-muted-foreground truncate">
                Head: {manager.firstName} {manager.lastName || ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">
            {node.employees.length} member{node.employees.length !== 1 ? 's' : ''}
          </Badge>
          {node.children.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {node.children.length} sub-dept{node.children.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {totalCount !== node.employees.length && (
            <Badge variant="outline" className="text-[10px]">
              {totalCount} total
            </Badge>
          )}
        </div>
        {hasContent && (
          <div className="flex items-center justify-end mt-2 pt-2 border-t">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {isExpanded ? "Collapse" : "Expand"}
            </div>
          </div>
        )}
      </div>

      {hasContent && isExpanded && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="relative">
            <div className="flex gap-4 flex-wrap justify-center">
              {filteredChildren.map(child => (
                <div key={child.department.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  <DeptNodeCard
                    node={child}
                    level={level + 1}
                    expandedDepts={expandedDepts}
                    toggleDept={toggleDept}
                    searchQuery={searchQuery}
                    allEmployees={allEmployees}
                  />
                </div>
              ))}
              {filteredEmployees.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  <div className="bg-card border rounded-md shadow-sm p-3 w-64">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Team Members ({filteredEmployees.length})
                    </p>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {filteredEmployees.map(emp => (
                        <div key={emp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors" data-testid={`dept-emp-${emp.id}`}>
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                            {emp.firstName?.[0]}{emp.lastName?.[0] || ''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {emp.firstName} {emp.lastName || ''}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {emp.designation || 'No designation'}
                              {emp.employeeCode ? ` · ${emp.employeeCode}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgTree() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [expandedDepts, setExpandedDepts] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState("reporting");

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

  const activeEmployees = useMemo(() => {
    return employees?.filter(e => e.status === 'active') || [];
  }, [employees]);

  const tree = useMemo(() => {
    return buildTree(activeEmployees);
  }, [activeEmployees]);

  const deptTree = useMemo(() => {
    return buildDeptTree(departments || [], activeEmployees);
  }, [departments, activeEmployees]);

  useEffect(() => {
    if (activeEmployees.length > 0 && expandedNodes.size === 0 && tree.length > 0) {
      const topRoots = new Set<number>();
      tree.forEach(root => {
        if (root.children.length > 0) {
          topRoots.add(root.employee.id);
        }
      });
      setExpandedNodes(topRoots);
    }
  }, [activeEmployees, tree]);

  useEffect(() => {
    if (departments && departments.length > 0 && expandedDepts.size === 0) {
      setExpandedDepts(new Set(departments.map(d => d.id)));
    }
  }, [departments]);

  const toggleNode = (id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleDept = (id: number) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (activeTab === "reporting") {
      setExpandedNodes(new Set(activeEmployees.map(e => e.id)));
    } else {
      setExpandedDepts(new Set((departments || []).map(d => d.id)));
    }
  };

  const collapseAll = () => {
    if (activeTab === "reporting") {
      setExpandedNodes(new Set());
    } else {
      setExpandedDepts(new Set());
    }
  };

  const managersCount = activeEmployees.filter(e =>
    activeEmployees.some(other => {
      const mgr = other.reportingManagerId ? String(other.reportingManagerId).trim() : null;
      if (!mgr) return false;
      return mgr === e.employeeCode || mgr === String(e.id) ||
        mgr.toLowerCase() === e.employeeCode?.toLowerCase() ||
        mgr.toLowerCase() === `${e.firstName} ${e.lastName || ''}`.trim().toLowerCase();
    })
  ).length;

  const withoutManager = activeEmployees.filter(e => !e.reportingManagerId).length;
  const withoutDept = activeEmployees.filter(e => !e.departmentId).length;

  if (loadingEmp || loadingDept) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading organization tree...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organization Tree</h1>
          <p className="text-muted-foreground">Visualize reporting hierarchy and department structure</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "reporting" ? "Search employee..." : "Search department or employee..."}
              className="pl-8 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-org"
            />
          </div>
          <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
            <Maximize2 className="w-4 h-4 mr-1" />
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
            <Minus className="w-4 h-4 mr-1" />
            Collapse
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold text-foreground">{activeEmployees.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold text-foreground">{departments?.length || 0}</p>
              </div>
              <Building2 className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Managers</p>
                <p className="text-2xl font-bold text-foreground">{managersCount}</p>
              </div>
              <User className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Without Manager</p>
                <p className="text-2xl font-bold text-foreground">{withoutManager}</p>
              </div>
              <User className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reporting" className="flex items-center gap-1.5" data-testid="tab-reporting">
            <UserCircle className="w-4 h-4" />
            Reporting Hierarchy
          </TabsTrigger>
          <TabsTrigger value="department" className="flex items-center gap-1.5" data-testid="tab-department">
            <FolderTree className="w-4 h-4" />
            Department Tree
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reporting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Reporting Hierarchy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tree.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No employees found</p>
                  <p className="text-sm">Add employees and assign reporting managers to see the org tree.</p>
                </div>
              ) : (() => {
                const managersWithReports = tree.filter(n =>
                  n.children.length > 0 || activeEmployees.some(other => {
                    const mgr = other.reportingManagerId ? String(other.reportingManagerId) : null;
                    return mgr && (mgr === n.employee.employeeCode || mgr === String(n.employee.id));
                  })
                );
                const unassignedNodes = tree.filter(n =>
                  n.children.length === 0 && !activeEmployees.some(other => {
                    const mgr = other.reportingManagerId ? String(other.reportingManagerId) : null;
                    return mgr && (mgr === n.employee.employeeCode || mgr === String(n.employee.id));
                  })
                );
                const filteredManagers = searchQuery
                  ? managersWithReports.filter(root => matchesSearch(root, searchQuery))
                  : managersWithReports;
                const filteredUnassigned = searchQuery
                  ? unassignedNodes.filter(root => matchesSearch(root, searchQuery))
                  : unassignedNodes;

                return (
                  <div className="space-y-8">
                    <div className="overflow-x-auto pb-4">
                      <div className="flex flex-col items-center gap-2 min-w-fit">
                        {filteredManagers.length === 1 ? (
                          <OrgNodeCard
                            node={filteredManagers[0]}
                            departments={departments || []}
                            level={0}
                            expandedNodes={expandedNodes}
                            toggleNode={toggleNode}
                            searchQuery={searchQuery}
                          />
                        ) : filteredManagers.length > 1 ? (
                          <div className="flex gap-6 flex-wrap justify-center">
                            {filteredManagers.map(root => (
                              <OrgNodeCard
                                key={root.employee.id}
                                node={root}
                                departments={departments || []}
                                level={0}
                                expandedNodes={expandedNodes}
                                toggleNode={toggleNode}
                                searchQuery={searchQuery}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {filteredUnassigned.length > 0 && (
                      <div className="border-t pt-6">
                        <p className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Unassigned Employees ({filteredUnassigned.length}) — No reporting manager assigned
                        </p>
                        <div className="flex gap-4 flex-wrap">
                          {filteredUnassigned.map(root => (
                            <OrgNodeCard
                              key={root.employee.id}
                              node={root}
                              departments={departments || []}
                              level={0}
                              expandedNodes={expandedNodes}
                              toggleNode={toggleNode}
                              searchQuery={searchQuery}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="department">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-primary" />
                Department Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deptTree.roots.length === 0 && deptTree.unassigned.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No departments found</p>
                  <p className="text-sm">Add departments and assign employees to see the department tree.</p>
                </div>
              ) : (
                <div className="overflow-x-auto pb-4">
                  <div className="flex flex-col items-center gap-2 min-w-fit">
                    {deptTree.roots.length === 1 && deptTree.unassigned.length === 0 ? (
                      <DeptNodeCard
                        node={deptTree.roots[0]}
                        level={0}
                        expandedDepts={expandedDepts}
                        toggleDept={toggleDept}
                        searchQuery={searchQuery}
                        allEmployees={activeEmployees}
                      />
                    ) : (
                      <div className="flex gap-6 flex-wrap justify-center">
                        {deptTree.roots
                          .filter(root => !searchQuery || matchesDeptSearch(root, searchQuery))
                          .map(root => (
                            <DeptNodeCard
                              key={root.department.id}
                              node={root}
                              level={0}
                              expandedDepts={expandedDepts}
                              toggleDept={toggleDept}
                              searchQuery={searchQuery}
                              allEmployees={activeEmployees}
                            />
                          ))}
                        {deptTree.unassigned.length > 0 && (
                          <div className="flex flex-col items-center">
                            <div className="bg-card border rounded-md shadow-sm p-3 w-64 border-dashed border-orange-300 dark:border-orange-700">
                              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                Unassigned ({deptTree.unassigned.length})
                              </p>
                              <div className="space-y-2 max-h-72 overflow-y-auto">
                                {deptTree.unassigned
                                  .filter(e => !searchQuery ||
                                    e.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    e.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    e.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
                                  )
                                  .map(emp => (
                                    <div key={emp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors" data-testid={`unassigned-emp-${emp.id}`}>
                                      <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-xs font-semibold text-orange-600 dark:text-orange-400 shrink-0">
                                        {emp.firstName?.[0]}{emp.lastName?.[0] || ''}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate">
                                          {emp.firstName} {emp.lastName || ''}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate">
                                          {emp.designation || 'No designation'}
                                          {emp.employeeCode ? ` · ${emp.employeeCode}` : ''}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
