import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/login", { email, password });
      const data = await response.json();
      
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ 
          title: "Welcome back", 
          description: "You have been logged in successfully." 
        });
        setLocation("/");
      } else {
        toast({ 
          title: "Error", 
          description: data.message || "Authentication failed", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Authentication failed", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl mx-auto flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Zap className="w-10 h-10" />
          </div>
          <div>
            <CardTitle className="text-2xl">FCT Energy</CardTitle>
            <CardDescription className="text-lg text-orange-600 dark:text-orange-400 font-medium">
              HR Management System
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                data-testid="input-password"
              />
            </div>
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
              data-testid="button-submit"
            >
              {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              Login
            </Button>
            
            <div className="text-center mt-4">
              <a 
                href="/forgot-password" 
                className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline"
                data-testid="link-forgot-password"
              >
                Forgot your password?
              </a>
            </div>
          </form>
          
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 text-center">
            Authorized personnel only. Contact HR admin for access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
