import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Upload, FileText, User, Phone, MapPin, Shield, Loader2, AlertCircle, Lock, Eye, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import logoUrl from "@assets/666a77510ae0e39bca9c24bb_FCT_logo_1766262033443.png";

interface EmployeeData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  joinDate: string;
  phone: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankAccountNumber: string | null;
  ifscCode: string | null;
  panNumber: string | null;
  aadharNumber: string | null;
}

export default function OnboardingSignup() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [completed, setCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    bankAccountNumber: "",
    ifscCode: "",
    panNumber: "",
    aadharNumber: "",
  });
  const [passwordError, setPasswordError] = useState("");

  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { fileName: string; fileUrl: string }>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentDocType, setCurrentDocType] = useState<string>("");
  const [previewFile, setPreviewFile] = useState<{ file: File; previewUrl: string; docType: string } | null>(null);

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/public/onboarding/${token}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.message || "Invalid or expired link");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setEmployee(data.employee);
        setFormData(prev => ({
          ...prev,
          phone: data.employee.phone || "",
          dateOfBirth: data.employee.dateOfBirth || "",
          address: data.employee.address || "",
          emergencyContactName: data.employee.emergencyContactName || "",
          emergencyContactPhone: data.employee.emergencyContactPhone || "",
          bankAccountNumber: data.employee.bankAccountNumber || "",
          ifscCode: data.employee.ifscCode || "",
          panNumber: data.employee.panNumber || "",
          aadharNumber: data.employee.aadharNumber || "",
        }));
        setLoading(false);
      } catch {
        setError("Failed to validate link");
        setLoading(false);
      }
    }
    if (token) validateToken();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUploadClick = (docType: string) => {
    setCurrentDocType(docType);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentDocType || !employee) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PDF, JPG, or PNG files only", variant: "destructive" });
      return;
    }

    const previewUrl = (file.type.startsWith('image/') || file.type === 'application/pdf') ? URL.createObjectURL(file) : '';
    setPreviewFile({ file, previewUrl, docType: currentDocType });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePreviewAccept = async () => {
    if (!previewFile || !employee) return;
    const { file, docType, previewUrl } = previewFile;

    setPreviewFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setUploadingDoc(docType);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('documentType', docType);
      formDataUpload.append('employeeId', employee.id.toString());

      const res = await fetch(`/api/public/onboarding/${token}/upload`, {
        method: 'POST',
        body: formDataUpload,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Upload failed');
      }

      const data = await res.json();
      
      setUploadedDocs(prev => ({
        ...prev,
        [docType]: { fileName: file.name, fileUrl: data.fileUrl || '' }
      }));
      
      toast({ title: "Document uploaded", description: `${file.name} uploaded successfully` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
      setCurrentDocType("");
    }
  };

  const handlePreviewReject = () => {
    if (previewFile?.previewUrl) URL.revokeObjectURL(previewFile.previewUrl);
    setPreviewFile(null);
    setCurrentDocType("");
    toast({ title: "Upload cancelled", description: "File was not uploaded." });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/onboarding/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      
      setCompleted(true);
      toast({ title: "Success", description: "Onboarding completed successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Validating your link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Link Invalid</h2>
            <p className="text-slate-600 dark:text-slate-400">{error}</p>
            <p className="text-sm text-slate-500 mt-4">Please contact HR for a new onboarding link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    window.location.href = "/";
    return null;
  }

  const requiredDocs = [
    { id: "id_proof", name: "ID Proof (Passport/Driving License)", icon: FileText },
    { id: "address_proof", name: "Address Proof", icon: MapPin },
    { id: "education", name: "Education Certificates", icon: FileText },
    { id: "experience", name: "Previous Experience Letters", icon: FileText },
    { id: "pan_card", name: "PAN Card", icon: Shield },
    { id: "aadhar", name: "Aadhar Card", icon: Shield },
    { id: "photo", name: "Passport Size Photo", icon: User },
    { id: "bank_proof", name: "Bank Account Proof", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <img src={logoUrl} alt="FCT Energy" className="h-10 object-contain" />
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-white">People Management</h1>
            <p className="text-sm text-slate-500">New Employee Onboarding</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Welcome, {employee?.firstName} {employee?.lastName}!
            </CardTitle>
            <CardDescription>
              Please complete the following information to finish your onboarding process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Position</span>
                <p className="font-medium text-slate-900 dark:text-white">{employee?.designation}</p>
              </div>
              <div>
                <span className="text-slate-500">Email</span>
                <p className="font-medium text-slate-900 dark:text-white">{employee?.email}</p>
              </div>
              <div>
                <span className="text-slate-500">Join Date</span>
                <p className="font-medium text-slate-900 dark:text-white">
                  {employee?.joinDate && format(new Date(employee.joinDate), "MMM dd, yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 mb-6">
          {[1, 2, 3].map((step) => (
            <button
              key={step}
              onClick={() => setCurrentStep(step)}
              className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                currentStep === step
                  ? "bg-primary text-white border-primary"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              }`}
              data-testid={`button-step-${step}`}
            >
              <div className="font-semibold">Step {step}</div>
              <div className="text-xs opacity-80">
                {step === 1 ? "Personal Info" : step === 2 ? "Documents" : "Review & Submit"}
              </div>
            </button>
          ))}
        </div>

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Create Your Account
              </CardTitle>
              <CardDescription>Set up your login credentials and provide personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                <h3 className="font-semibold flex items-center gap-2 text-primary mb-2">
                  <Lock className="w-4 h-4" />
                  Create Password
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a password to access your employee portal. Use at least 8 characters.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create password"
                      value={formData.password}
                      onChange={(e) => {
                        handleInputChange(e);
                        setPasswordError("");
                      }}
                      data-testid="input-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        handleInputChange(e);
                        setPasswordError("");
                      }}
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
                {passwordError && (
                  <p className="text-sm text-red-500 mt-2">{passwordError}</p>
                )}
              </div>

              <h3 className="font-semibold pt-2">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={handleInputChange}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    data-testid="input-dob"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Enter your complete address"
                  value={formData.address}
                  onChange={handleInputChange}
                  data-testid="input-address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    name="emergencyContactName"
                    placeholder="Name"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    data-testid="input-emergency-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    placeholder="+91 9876543210"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    data-testid="input-emergency-phone"
                  />
                </div>
              </div>

              <h3 className="font-semibold pt-4 border-t">Bank & Statutory Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                  <Input
                    id="bankAccountNumber"
                    name="bankAccountNumber"
                    placeholder="Account number"
                    value={formData.bankAccountNumber}
                    onChange={handleInputChange}
                    data-testid="input-bank-account"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    name="ifscCode"
                    placeholder="IFSC code"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    data-testid="input-ifsc"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    name="panNumber"
                    placeholder="ABCDE1234F"
                    value={formData.panNumber}
                    onChange={handleInputChange}
                    data-testid="input-pan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadharNumber">Aadhar Number</Label>
                  <Input
                    id="aadharNumber"
                    name="aadharNumber"
                    placeholder="1234 5678 9012"
                    value={formData.aadharNumber}
                    onChange={handleInputChange}
                    data-testid="input-aadhar"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => {
                    if (!formData.password || formData.password.length < 8) {
                      setPasswordError("Password must be at least 8 characters");
                      return;
                    }
                    if (formData.password !== formData.confirmPassword) {
                      setPasswordError("Passwords do not match");
                      return;
                    }
                    setCurrentStep(2);
                  }} 
                  data-testid="button-next-step2"
                >
                  Continue to Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Document Upload
              </CardTitle>
              <CardDescription>
                Please upload all required documents. Supported formats: PDF, JPG, PNG
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiredDocs.map((doc) => {
                  const uploadedDoc = uploadedDocs[doc.id];
                  const isUploaded = !!uploadedDoc;
                  const isUploading = uploadingDoc === doc.id;
                  return (
                    <div
                      key={doc.id}
                      className={`p-4 border rounded-lg flex items-center justify-between ${
                        isUploaded ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-slate-50 dark:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isUploading ? (
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : isUploaded ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <doc.icon className="w-5 h-5 text-slate-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className={isUploaded ? "text-green-700 dark:text-green-300" : "text-slate-700 dark:text-slate-300"}>
                            {doc.name}
                          </span>
                          {isUploaded && (
                            <p className="text-xs text-green-600 dark:text-green-400 truncate">
                              {uploadedDoc.fileName}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isUploaded ? "outline" : "default"}
                        onClick={() => handleUploadClick(doc.id)}
                        disabled={isUploading}
                        data-testid={`button-upload-${doc.id}`}
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isUploaded ? "Replace" : "Upload"}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={() => setCurrentStep(1)} data-testid="button-back-step1">
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(3)} data-testid="button-next-step3">
                  Review & Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Review & Submit
              </CardTitle>
              <CardDescription>Please review your information before submitting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Phone</span>
                  <p className="font-medium">{formData.phone || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Date of Birth</span>
                  <p className="font-medium">{formData.dateOfBirth || "Not provided"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Address</span>
                  <p className="font-medium">{formData.address || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Emergency Contact</span>
                  <p className="font-medium">{formData.emergencyContactName || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Emergency Phone</span>
                  <p className="font-medium">{formData.emergencyContactPhone || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-slate-500">PAN Number</span>
                  <p className="font-medium">{formData.panNumber || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Aadhar Number</span>
                  <p className="font-medium">{formData.aadharNumber || "Not provided"}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-sm">Documents Uploaded</span>
                <p className="font-medium">{Object.keys(uploadedDocs).length} of {requiredDocs.length} documents</p>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(2)} data-testid="button-back-step2">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} data-testid="button-submit-onboarding">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Complete Onboarding"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) handlePreviewReject(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Preview Document
            </DialogTitle>
            <DialogDescription>
              Review the file before uploading. Make sure the document is clear and correct.
            </DialogDescription>
          </DialogHeader>
          {previewFile && (
            <div className="space-y-4">
              <div className="border rounded-lg p-3 bg-slate-50">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{previewFile.file.name}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Size: {(previewFile.file.size / 1024).toFixed(1)} KB &bull; Type: {previewFile.file.type.split('/')[1]?.toUpperCase() || 'File'}
                </p>
              </div>

              {previewFile.previewUrl ? (
                previewFile.file.type === 'application/pdf' ? (
                  <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '400px' }}>
                    <iframe
                      src={previewFile.previewUrl}
                      className="w-full h-full"
                      title="PDF Preview"
                      data-testid="iframe-preview"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden bg-white flex items-center justify-center max-h-[400px]">
                    <img
                      src={previewFile.previewUrl}
                      alt="Document preview"
                      className="max-w-full max-h-[400px] object-contain"
                      data-testid="img-preview"
                    />
                  </div>
                )
              ) : (
                <div className="border rounded-lg p-8 bg-white flex flex-col items-center justify-center text-center">
                  <FileText className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700">No preview available</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handlePreviewReject} data-testid="button-preview-reject">
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handlePreviewAccept} data-testid="button-preview-accept">
              <Check className="w-4 h-4 mr-2" />
              Accept & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
