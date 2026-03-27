import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, Receipt, Check, X, FileText,
  Clock, CheckCircle, Upload, IndianRupee
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Expense, Employee } from "@shared/schema";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

const expenseSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  expenseDate: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function Expenses() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const { user } = useAuth();

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const currentEmployee = employees?.find(e => e.email === user?.email);
  const userRoles = (currentEmployee?.accessRole || 'employee').split(',').map(r => r.trim());
  const isAdmin = userRoles.includes('admin') || userRoles.includes('hr') || userRoles.includes('payroll_team');

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      employeeId: "",
      category: "",
      amount: "",
      expenseDate: format(new Date(), "yyyy-MM-dd"),
      description: "",
    },
  });

  useEffect(() => {
    if (currentEmployee && !isAdmin) {
      form.setValue("employeeId", currentEmployee.id.toString());
    }
  }, [currentEmployee, isAdmin]);

  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => 
      apiRequest("POST", "/api/expenses", {
        employeeId: parseInt(data.employeeId),
        category: data.category,
        amount: data.amount,
        expenseDate: data.expenseDate,
        description: data.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense claim submitted successfully" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to submit expense", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/expenses/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense status updated" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      case "reimbursed": return "bg-blue-100 text-blue-700";
      case "settled": return "bg-purple-100 text-purple-700";
      default: return "bg-yellow-100 text-yellow-700";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "travel": return "Travel";
      case "food": return "Food & Meals";
      case "accommodation": return "Accommodation";
      case "transport": return "Transport";
      default: return "Other";
    }
  };

  const getEmployeeName = (employeeId: number) => {
    const emp = employees?.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };

  const pendingCount = expenses?.filter(e => e.status === "pending").length || 0;
  const approvedTotal = expenses?.filter(e => e.status === "approved" || e.status === "reimbursed")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;


  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reimbursement & Expenses</h1>
          <p className="text-slate-500">Manage expense claims, advances, and settlements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Claims</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Approved</p>
                <p className="text-2xl font-bold text-green-600">Rs. {approvedTotal.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Expense Reimbursement Claims
                </CardTitle>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-new-expense">
                      <Plus className="w-4 h-4 mr-2" />
                      New Claim
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Expense Claim</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                        {isAdmin ? (
                        <FormField
                          control={form.control}
                          name="employeeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Employee</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-employee">
                                    <SelectValue placeholder="Select employee" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {employees?.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id.toString()}>
                                      {emp.firstName} {emp.lastName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Submitting as: <span className="font-medium text-foreground">{currentEmployee?.firstName} {currentEmployee?.lastName}</span>
                          </div>
                        )}
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-category">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="travel">Travel</SelectItem>
                                  <SelectItem value="food">Food & Meals</SelectItem>
                                  <SelectItem value="accommodation">Accommodation</SelectItem>
                                  <SelectItem value="transport">Transport</SelectItem>
                                  <SelectItem value="communication">Communication</SelectItem>
                                  <SelectItem value="client_entertainment">Client Entertainment</SelectItem>
                                  <SelectItem value="office_supplies">Office Supplies</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Amount (INR)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0.00" {...field} data-testid="input-amount" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="expenseDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} data-testid="input-date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Expense details..." {...field} data-testid="input-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                          <div className="flex items-center justify-center gap-2 text-slate-500">
                            <Upload className="w-4 h-4" />
                            <span className="text-sm">Attach receipts/bills (optional)</span>
                          </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-expense">
                          {createMutation.isPending ? "Submitting..." : "Submit Claim"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {!expenses?.length ? (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-400">No expense claims found</p>
                  <p className="text-sm text-slate-400 mt-1">Click "New Claim" to submit an expense</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div 
                      key={expense.id} 
                      data-testid={`expense-row-${expense.id}`}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center">
                          <Receipt className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{getCategoryIcon(expense.category)}</p>
                          <p className="text-sm text-slate-500">{getEmployeeName(expense.employeeId)}</p>
                          {expense.description && (
                            <p className="text-xs text-slate-400 mt-1">{expense.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">Rs. {parseFloat(expense.amount).toLocaleString()}</p>
                          <p className="text-xs text-slate-400">{format(new Date(expense.expenseDate), "MMM dd, yyyy")}</p>
                        </div>
                        <Badge className={getStatusColor(expense.status || "pending")}>
                          {expense.status}
                        </Badge>
                        {expense.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => updateStatusMutation.mutate({ id: expense.id, status: "approved" })}
                              data-testid={`button-approve-${expense.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => updateStatusMutation.mutate({ id: expense.id, status: "rejected" })}
                              data-testid={`button-reject-${expense.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {expense.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: expense.id, status: "reimbursed" })}
                          >
                            Mark Reimbursed
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
