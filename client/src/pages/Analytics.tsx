import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, TrendingDown, UserMinus, BarChart3, PieChart as PieChartIcon, MapPin, GraduationCap, Clock, Building2, Calendar, Download, FileSpreadsheet } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from "recharts";
import { differenceInYears, subMonths, startOfMonth, isAfter, isBefore, format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import type { Employee, Department } from "@shared/schema";

const COLORS = ['#0066FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];
const SELECTED_COLOR = '#FF6B00';

type TimePeriod = 'this_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'all_time' | 'custom';
type ChartType = 'pie' | 'bar';
type SelectedItem = { chartKey: string; categoryName: string } | null;

export default function Analytics() {
  const { toast } = useToast();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('this_year');
  const [activeTab, setActiveTab] = useState('overview');
  const [chartTypes, setChartTypes] = useState<Record<string, ChartType>>({
    gender: 'pie',
    employmentType: 'bar',
    department: 'bar',
    location: 'pie',
    qualification: 'bar',
    age: 'bar',
    entity: 'pie',
    tenure: 'bar',
    attrition: 'bar',
  });
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

  const toggleChartType = (chartKey: string) => {
    setChartTypes(prev => ({
      ...prev,
      [chartKey]: prev[chartKey] === 'pie' ? 'bar' : 'pie'
    }));
  };

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

  const getDateFilter = () => {
    const now = new Date();
    switch (timePeriod) {
      case 'this_month': return { start: startOfMonth(now), end: now };
      case 'last_3_months': return { start: subMonths(now, 3), end: now };
      case 'last_6_months': return { start: subMonths(now, 6), end: now };
      case 'this_year': return { start: new Date(now.getFullYear(), 0, 1), end: now };
      case 'custom': 
        return { 
          start: customStartDate ? parseISO(customStartDate) : new Date(2000, 0, 1), 
          end: customEndDate ? parseISO(customEndDate) : now 
        };
      default: return { start: new Date(2000, 0, 1), end: now };
    }
  };

  const { start: filterStartDate, end: filterEndDate } = getDateFilter();

  const isInDateRange = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return isAfter(date, filterStartDate) && isBefore(date, filterEndDate);
  };

  const filteredHires = useMemo(() => {
    return employees?.filter(e => e.joinDate && isInDateRange(e.joinDate)) || [];
  }, [employees, filterStartDate, filterEndDate]);

  const activeEmployees = employees?.filter(e => e.status === 'active') || [];
  const allTerminatedEmployees = employees?.filter(e => e.status === 'terminated' || e.status === 'resigned') || [];
  
  const terminatedEmployees = useMemo(() => {
    if (timePeriod === 'all_time') return allTerminatedEmployees;
    return allTerminatedEmployees.filter(e => {
      if (!e.joinDate) return false;
      return isInDateRange(e.joinDate);
    });
  }, [allTerminatedEmployees, filterStartDate, filterEndDate, timePeriod]);

  const filteredActiveEmployees = useMemo(() => {
    if (timePeriod === 'all_time') return activeEmployees;
    return activeEmployees.filter(e => e.joinDate && isInDateRange(e.joinDate));
  }, [activeEmployees, filterStartDate, filterEndDate, timePeriod]);

  const genderData = [
    { name: 'Male', value: activeEmployees.filter(e => e.gender === 'male' || e.gender === 'Male').length },
    { name: 'Female', value: activeEmployees.filter(e => e.gender === 'female' || e.gender === 'Female').length },
    { name: 'Not Specified', value: activeEmployees.filter(e => !e.gender || e.gender === 'other').length },
  ].filter(d => d.value > 0);

  const employmentTypeData = [
    { name: 'Permanent', value: activeEmployees.filter(e => e.employmentType === 'permanent').length },
    { name: 'Full Time', value: activeEmployees.filter(e => e.employmentType === 'full_time').length },
    { name: 'Consultant', value: activeEmployees.filter(e => e.employmentType === 'consultant').length },
    { name: 'Intern', value: activeEmployees.filter(e => e.employmentType === 'intern').length },
    { name: 'Fixed Term', value: activeEmployees.filter(e => e.employmentType === 'fixed_term').length },
  ].filter(d => d.value > 0);

  const deptDistribution = departments?.map(dept => ({
    name: dept.name,
    value: activeEmployees.filter(e => e.departmentId === dept.id).length,
  })).filter(d => d.value > 0) || [];

  const tenureData = useMemo(() => {
    const now = new Date();
    const ranges = [
      { name: '< 1 year', min: 0, max: 1 },
      { name: '1-2 years', min: 1, max: 2 },
      { name: '2-3 years', min: 2, max: 3 },
      { name: '3-5 years', min: 3, max: 5 },
      { name: '5-10 years', min: 5, max: 10 },
      { name: '10+ years', min: 10, max: 100 },
    ];
    
    return ranges.map(range => ({
      name: range.name,
      value: activeEmployees.filter(emp => {
        if (!emp.joinDate) return false;
        const years = differenceInYears(now, new Date(emp.joinDate));
        return years >= range.min && years < range.max;
      }).length,
    })).filter(d => d.value > 0);
  }, [activeEmployees]);

  const ageData = useMemo(() => {
    const now = new Date();
    const ranges = [
      { name: '18-25', min: 18, max: 25 },
      { name: '26-30', min: 26, max: 30 },
      { name: '31-35', min: 31, max: 35 },
      { name: '36-40', min: 36, max: 40 },
      { name: '41-50', min: 41, max: 50 },
      { name: '50+', min: 50, max: 100 },
    ];
    
    return ranges.map(range => ({
      name: range.name,
      value: activeEmployees.filter(emp => {
        if (!emp.dateOfBirth) return false;
        const age = differenceInYears(now, new Date(emp.dateOfBirth));
        return age >= range.min && age <= range.max;
      }).length,
    })).filter(d => d.value > 0);
  }, [activeEmployees]);

  const locationData = useMemo(() => {
    const locationMap: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const loc = emp.location || 'Not Specified';
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    });
    return Object.entries(locationMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeEmployees]);

  const qualificationData = useMemo(() => {
    const qualMap: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const qual = emp.highestQualification?.toUpperCase() || 'Not Specified';
      qualMap[qual] = (qualMap[qual] || 0) + 1;
    });
    return Object.entries(qualMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeEmployees]);

  const entityData = useMemo(() => {
    const entityMap: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const entity = emp.entity || 'Not Specified';
      entityMap[entity] = (entityMap[entity] || 0) + 1;
    });
    return Object.entries(entityMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeEmployees]);

  const attritionByDept = useMemo(() => {
    return departments?.map(dept => {
      const deptTotal = employees?.filter(e => e.departmentId === dept.id).length || 0;
      const deptExits = terminatedEmployees.filter(e => e.departmentId === dept.id).length;
      const rate = deptTotal > 0 ? ((deptExits / deptTotal) * 100).toFixed(1) : '0';
      return { name: dept.name, value: deptExits, rate: parseFloat(rate) };
    }).filter(d => d.value > 0) || [];
  }, [departments, employees, terminatedEmployees]);

  const totalEmployeesInPeriod = timePeriod === 'all_time' ? employees?.length || 0 : filteredHires.length + activeEmployees.length;
  const attritionRate = totalEmployeesInPeriod > 0 
    ? ((terminatedEmployees.length / totalEmployeesInPeriod) * 100).toFixed(1) 
    : '0';

  const monthlyHiringData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const hires = employees?.filter(e => {
        if (!e.joinDate) return false;
        const d = new Date(e.joinDate);
        return d.getMonth() === index && d.getFullYear() === currentYear && e.status === 'active';
      }).length || 0;
      
      const exits = allTerminatedEmployees.filter(e => {
        if (!e.joinDate) return false;
        const d = new Date(e.joinDate);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      }).length;
      
      return { month, hires, exits };
    });
  }, [employees, allTerminatedEmployees]);

  const getCurrentTabData = (): { data: Array<{ name: string; value: number; rate?: number }>; title: string } => {
    switch (activeTab) {
      case 'overview': return { data: genderData, title: 'Overview' };
      case 'attrition': return { data: attritionByDept, title: 'Attrition' };
      case 'location': return { data: locationData, title: 'Location' };
      case 'qualification': return { data: qualificationData, title: 'Qualification' };
      case 'age': return { data: ageData, title: 'Age' };
      case 'entity': return { data: entityData, title: 'Entity' };
      case 'tenure': return { data: tenureData, title: 'Tenure' };
      default: return { data: [], title: 'Analytics' };
    }
  };

  const exportToExcel = () => {
    const { data, title } = getCurrentTabData();
    
    if (data.length === 0) {
      toast({ title: "No data", description: "No data available to export", variant: "destructive" });
      return;
    }

    const exportData = data.map(item => ({
      Category: item.name,
      Count: item.value,
      ...(item.rate !== undefined ? { 'Rate (%)': item.rate } : {})
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title);

    const columnWidths = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
    worksheet['!cols'] = columnWidths;

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const periodStr = timePeriod === 'custom' 
      ? `${customStartDate || 'start'}_to_${customEndDate || 'end'}`
      : timePeriod;
    
    XLSX.writeFile(workbook, `HR_Analytics_${title}_${periodStr}_${dateStr}.xlsx`);
    
    toast({ title: "Export successful", description: `${title} data exported to Excel` });
  };

  const exportAllData = () => {
    const workbook = XLSX.utils.book_new();
    
    type DataItem = { name: string; value: number; rate?: number };
    const allDataSets: Array<{ data: DataItem[]; name: string }> = [
      { data: genderData, name: 'Gender' },
      { data: employmentTypeData, name: 'Employment Type' },
      { data: deptDistribution, name: 'Department' },
      { data: locationData, name: 'Location' },
      { data: qualificationData, name: 'Qualification' },
      { data: ageData, name: 'Age' },
      { data: tenureData, name: 'Tenure' },
      { data: entityData, name: 'Entity' },
      { data: attritionByDept, name: 'Attrition' },
    ];

    allDataSets.forEach(({ data, name }) => {
      if (data.length > 0) {
        const exportData = data.map(item => ({
          Category: item.name,
          Count: item.value,
          ...(item.rate !== undefined ? { 'Rate (%)': item.rate } : {})
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
      }
    });

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(workbook, `HR_Analytics_Complete_${dateStr}.xlsx`);
    
    toast({ title: "Export successful", description: "All analytics data exported to Excel" });
  };

  const getFilteredEmployees = (chartKey: string, categoryName: string): Employee[] => {
    const now = new Date();
    
    switch (chartKey) {
      case 'gender':
        return activeEmployees.filter(e => {
          if (categoryName === 'Male') return e.gender === 'male' || e.gender === 'Male';
          if (categoryName === 'Female') return e.gender === 'female' || e.gender === 'Female';
          return !e.gender || e.gender === 'other';
        });
      case 'employmentType':
        return activeEmployees.filter(e => {
          if (categoryName === 'Permanent') return e.employmentType === 'permanent';
          if (categoryName === 'Full Time') return e.employmentType === 'full_time';
          if (categoryName === 'Consultant') return e.employmentType === 'consultant';
          if (categoryName === 'Intern') return e.employmentType === 'intern';
          if (categoryName === 'Fixed Term') return e.employmentType === 'fixed_term';
          return false;
        });
      case 'department':
        const dept = departments?.find(d => d.name === categoryName);
        return activeEmployees.filter(e => e.departmentId === dept?.id);
      case 'location':
        return activeEmployees.filter(e => (e.location || 'Not Specified') === categoryName);
      case 'qualification':
        return activeEmployees.filter(e => (e.highestQualification?.toUpperCase() || 'Not Specified') === categoryName);
      case 'age':
        const ageRanges: Record<string, { min: number; max: number }> = {
          '18-25': { min: 18, max: 25 },
          '26-30': { min: 26, max: 30 },
          '31-35': { min: 31, max: 35 },
          '36-40': { min: 36, max: 40 },
          '41-50': { min: 41, max: 50 },
          '50+': { min: 50, max: 100 },
        };
        const ageRange = ageRanges[categoryName];
        if (!ageRange) return [];
        return activeEmployees.filter(e => {
          if (!e.dateOfBirth) return false;
          const age = differenceInYears(now, new Date(e.dateOfBirth));
          return age >= ageRange.min && age <= ageRange.max;
        });
      case 'tenure':
        const tenureRanges: Record<string, { min: number; max: number }> = {
          '< 1 year': { min: 0, max: 1 },
          '1-2 years': { min: 1, max: 2 },
          '2-3 years': { min: 2, max: 3 },
          '3-5 years': { min: 3, max: 5 },
          '5-10 years': { min: 5, max: 10 },
          '10+ years': { min: 10, max: 100 },
        };
        const tenureRange = tenureRanges[categoryName];
        if (!tenureRange) return [];
        return activeEmployees.filter(e => {
          if (!e.joinDate) return false;
          const years = differenceInYears(now, new Date(e.joinDate));
          return years >= tenureRange.min && years < tenureRange.max;
        });
      case 'entity':
        return activeEmployees.filter(e => (e.entity || 'Not Specified') === categoryName);
      case 'attrition':
        const attrDept = departments?.find(d => d.name === categoryName);
        return terminatedEmployees.filter(e => e.departmentId === attrDept?.id);
      default:
        return [];
    }
  };

  const exportCategoryData = (chartKey: string, categoryName: string) => {
    const filteredEmps = getFilteredEmployees(chartKey, categoryName);
    
    if (filteredEmps.length === 0) {
      toast({ title: "No data", description: "No employees found in this category", variant: "destructive" });
      return;
    }

    const exportData = filteredEmps.map(emp => ({
      'Employee Code': emp.employeeCode || '',
      'Name': `${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.trim(),
      'Email': emp.email,
      'Designation': emp.designation || '',
      'Department': departments?.find(d => d.id === emp.departmentId)?.name || '',
      'Location': emp.location || '',
      'Join Date': emp.joinDate ? (() => { const d = new Date(emp.joinDate); const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${String(d.getDate()).padStart(2,'0')}-${m[d.getMonth()]}-${d.getFullYear()}`; })() : '',
      'Employment Type': emp.employmentType || '',
      'Status': emp.status || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, 
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }
    ];

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const safeCategoryName = categoryName.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Employees_${chartKey}_${safeCategoryName}_${dateStr}.xlsx`);
    
    toast({ title: "Export successful", description: `${filteredEmps.length} employees exported` });
  };

  const handleChartClick = (chartKey: string) => (data: any) => {
    if (data && data.name) {
      if (selectedItem?.chartKey === chartKey && selectedItem?.categoryName === data.name) {
        setSelectedItem(null);
      } else {
        setSelectedItem({ chartKey, categoryName: data.name });
      }
    }
  };

  const handleExportSelected = () => {
    if (selectedItem) {
      exportCategoryData(selectedItem.chartKey, selectedItem.categoryName);
      setSelectedItem(null);
    }
  };

  const renderChart = (data: any[], chartKey: string, showLegend: boolean = true) => {
    const currentChartType = chartTypes[chartKey] || 'bar';
    const isSelected = selectedItem?.chartKey === chartKey;
    const selectedCategory = isSelected ? selectedItem?.categoryName : null;
    
    if (data.length === 0) {
      return <p className="text-muted-foreground text-center py-8">No data available</p>;
    }

    const getBarColor = (entry: any) => {
      if (selectedCategory === entry.name) return SELECTED_COLOR;
      return '#0066FF';
    };

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            {isSelected && (
              <Button 
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white animate-pulse"
                onClick={handleExportSelected}
                data-testid={`button-export-selected-${chartKey}`}
              >
                <Download className="w-4 h-4 mr-1" />
                Export "{selectedCategory}"
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button 
              variant={currentChartType === 'pie' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-7 px-2"
              onClick={() => toggleChartType(chartKey)}
              data-testid={`button-chart-pie-${chartKey}`}
            >
              <PieChartIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant={currentChartType === 'bar' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-7 px-2"
              onClick={() => toggleChartType(chartKey)}
              data-testid={`button-chart-bar-${chartKey}`}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          {isSelected ? `"${selectedCategory}" selected - click Export button above` : 'Click on any bar/segment to select, then export'}
        </p>
        
        {currentChartType === 'pie' ? (
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-48 h-48 min-w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={data} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={50} 
                    outerRadius={70} 
                    paddingAngle={3} 
                    dataKey="value"
                    onClick={handleChartClick(chartKey)}
                    style={{ cursor: 'pointer' }}
                  >
                    {data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={selectedCategory === entry.name ? SELECTED_COLOR : COLORS[index % COLORS.length]} 
                        stroke={selectedCategory === entry.name ? '#000' : 'none'}
                        strokeWidth={selectedCategory === entry.name ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {showLegend && (
              <div className="space-y-2 flex-1 max-h-48 overflow-y-auto">
                {data.map((item, index) => (
                  <div 
                    key={item.name} 
                    className={`flex items-center justify-between gap-2 cursor-pointer rounded px-2 py-1 -mx-2 transition-colors ${
                      selectedCategory === item.name 
                        ? 'bg-orange-100 dark:bg-orange-900/30 ring-2 ring-orange-500' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      if (selectedItem?.chartKey === chartKey && selectedItem?.categoryName === item.name) {
                        setSelectedItem(null);
                      } else {
                        setSelectedItem({ chartKey, categoryName: item.name });
                      }
                    }}
                    data-testid={`legend-${chartKey}-${item.name}`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedCategory === item.name ? SELECTED_COLOR : COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-sm truncate">{item.name}</span>
                    </div>
                    <Badge variant="secondary">{item.value}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-muted-foreground text-xs" angle={-20} textAnchor="end" height={60} />
                <YAxis axisLine={false} tickLine={false} className="text-muted-foreground text-xs" />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]} 
                  style={{ cursor: 'pointer' }}
                  onClick={handleChartClick(chartKey)}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getBarColor(entry)}
                      stroke={selectedCategory === entry.name ? '#000' : 'none'}
                      strokeWidth={selectedCategory === entry.name ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  if (loadingEmp || loadingDept) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  const timePeriodLabels: Record<TimePeriod, string> = {
    this_month: 'This Month',
    last_3_months: 'Last 3 Months',
    last_6_months: 'Last 6 Months',
    this_year: 'This Year',
    all_time: 'All Time',
    custom: 'Custom Range',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Analytics</h1>
        <p className="text-muted-foreground">Attrition, Demographics & Diversity insights</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={timePeriod} onValueChange={(val) => setTimePeriod(val as TimePeriod)}>
                <SelectTrigger className="w-40" data-testid="select-time-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {timePeriod === 'custom' && (
              <>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input 
                    type="date" 
                    value={customStartDate} 
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-36"
                    data-testid="input-start-date"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input 
                    type="date" 
                    value={customEndDate} 
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-36"
                    data-testid="input-end-date"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Headcount</p>
                <p className="text-2xl font-bold text-foreground">{employees?.length || 0}</p>
                <p className="text-xs text-green-600 mt-1">+{filteredHires.length} {timePeriodLabels[timePeriod]}</p>
              </div>
              <Users className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-bold text-green-600">{activeEmployees.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{((activeEmployees.length / (employees?.length || 1)) * 100).toFixed(0)}% of total</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Attrition Rate</p>
                <p className="text-2xl font-bold text-orange-600">{attritionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{timePeriodLabels[timePeriod]}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Exits</p>
                <p className="text-2xl font-bold text-red-600">{terminatedEmployees.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Resignations & Terminations</p>
              </div>
              <UserMinus className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="attrition" data-testid="tab-attrition">Attrition</TabsTrigger>
          <TabsTrigger value="location" data-testid="tab-location">Location</TabsTrigger>
          <TabsTrigger value="qualification" data-testid="tab-qualification">Qualification</TabsTrigger>
          <TabsTrigger value="age" data-testid="tab-age">Age</TabsTrigger>
          <TabsTrigger value="entity" data-testid="tab-entity">Entity</TabsTrigger>
          <TabsTrigger value="tenure" data-testid="tab-tenure">Tenure</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  Gender Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart(genderData, 'gender')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Employment Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart(employmentTypeData, 'employmentType')}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Department-wise Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart(deptDistribution, 'department')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Hiring vs Attrition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyHiringData}>
                      <defs>
                        <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-muted-foreground text-xs" />
                      <YAxis axisLine={false} tickLine={false} className="text-muted-foreground text-xs" />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="hires" name="New Hires" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorHires)" />
                      <Area type="monotone" dataKey="exits" name="Exits" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExits)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attrition" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-orange-500" />
                  Exits by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart(attritionByDept, 'attrition')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attrition Rate by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attritionByDept.map((dept) => (
                    <div key={dept.name} className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium truncate flex-1">{dept.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(dept.rate, 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{dept.rate}%</span>
                      </div>
                    </div>
                  ))}
                  {attritionByDept.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No attrition data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="location" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Employees by Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart(locationData, 'location')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualification" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Employees by Qualification
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart(qualificationData, 'qualification')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="age" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Age Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart(ageData, 'age')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entity" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Employees by Entity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart(entityData, 'entity')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenure" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Tenure Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart(tenureData, 'tenure')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
