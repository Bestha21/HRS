import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration missing. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getFromEmail() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@fcteneregy.com";
}

const EMAIL_NOTIFICATIONS_ENABLED = true;

async function sendEmail(to: string, subject: string, html: string, isEssential: boolean = false): Promise<boolean> {
  if (!EMAIL_NOTIFICATIONS_ENABLED && !isEssential) {
    console.log(`[Email] Skipped (notifications disabled): "${subject}" to ${to}`);
    return true;
  }
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"FCT Energy HRMS" <${getFromEmail()}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error: any) {
    console.error(`Email send failed to ${to}:`, error.message);
    return false;
  }
}

function generateLetterPdf(letterContent: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 65, right: 65 }
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('Times-Roman').fontSize(12).lineGap(4);

      const lines = letterContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          doc.moveDown(0.5);
          continue;
        }
        const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.startsWith('•');
        if (isHeading) {
          doc.font('Times-Bold').fontSize(12).text(trimmed, { align: 'left' });
          doc.font('Times-Roman').fontSize(12);
        } else {
          doc.text(trimmed, { align: 'left' });
        }
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function sendEmailWithAttachment(to: string, subject: string, html: string, attachments: Array<{ filename: string; content: string | Buffer; contentType: string }>): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"FCT Energy HRMS" <${getFromEmail()}>`,
      to,
      subject,
      html,
      attachments,
    });
    console.log(`Email with attachment sent successfully to ${to}`);
    return true;
  } catch (error: any) {
    console.error(`Email with attachment send failed to ${to}:`, error.message);
    return false;
  }
}

export async function sendOnboardingEmail(
  to: string,
  employeeName: string,
  signupUrl: string,
  designation: string,
  joinDate: string
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to FCT Energy!</h1>
        </div>
        <div class="content">
          <p>Dear ${employeeName},</p>
          <p>We are excited to have you join our team! Please complete your onboarding process by clicking the button below.</p>
          
          <div class="details">
            <p><strong>Position:</strong> ${designation}</p>
            <p><strong>Start Date:</strong> ${joinDate}</p>
          </div>
          
          <p>You will need to:</p>
          <ul>
            <li>Provide your personal information</li>
            <li>Upload required documents (ID proof, address proof, etc.)</li>
            <li>Review and submit your details</li>
          </ul>
          
          <center>
            <a href="${signupUrl}" class="button">Complete Your Onboarding</a>
          </center>
          
          <p style="font-size: 12px; color: #6b7280;">This link is valid for 7 days. If you have any questions, please contact HR.</p>
        </div>
        <div class="footer">
          <p>FCT Energy - People Management System</p>
          <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, "Welcome to FCT Energy - Complete Your Onboarding", htmlContent);
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316, #d97706); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset your password for your FCT Energy account.</p>
          <p>Click the button below to set a new password:</p>
          
          <center>
            <a href="${resetUrl}" class="button">Reset Password</a>
          </center>
          
          <p style="font-size: 12px; color: #6b7280;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>FCT Energy - People Management System</p>
          <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, "Reset Your Password - FCT Energy", htmlContent);
}

export async function sendNotificationEmail(
  to: string,
  subject: string,
  heading: string,
  body: string
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${heading}</h1>
        </div>
        <div class="content">
          ${body}
        </div>
        <div class="footer">
          <p>FCT Energy - People Management System</p>
          <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, subject, htmlContent);
}

export async function sendPayslipEmail(
  to: string,
  employeeName: string,
  month: string,
  year: number,
  payslipHtml: string
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payslip - ${month} ${year}</h1>
        </div>
        <div class="content">
          <p>Dear ${employeeName},</p>
          <p>Your payslip for <strong>${month} ${year}</strong> is now available. Please find the details below:</p>
          ${payslipHtml}
          <p style="margin-top: 20px;">If you have any questions regarding your payslip, please contact the HR/Payroll team.</p>
        </div>
        <div class="footer">
          <p>FC TECNRGY PVT LTD (FCT) - People Management System</p>
          <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, `Payslip for ${month} ${year} - FCT Energy`, htmlContent);
}

export async function verifySmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: "SMTP connection verified successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function sendLeaveRequestEmail(
  to: string,
  managerName: string,
  employeeName: string,
  leaveType: string,
  fromDate: string,
  toDate: string,
  reason: string
): Promise<boolean> {
  const body = `
    <p>Dear ${managerName},</p>
    <p><strong>${employeeName}</strong> has submitted a leave request that requires your review.</p>
    <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #3b82f6;">
      <p><strong>Leave Type:</strong> ${leaveType}</p>
      <p><strong>From:</strong> ${fromDate}</p>
      <p><strong>To:</strong> ${toDate}</p>
      <p><strong>Reason:</strong> ${reason || 'Not specified'}</p>
    </div>
    <p>Please log in to the HRMS portal to approve or reject this request.</p>
  `;
  return sendNotificationEmail(to, `Leave Request from ${employeeName}`, "Leave Request", body);
}

export async function sendLeaveStatusEmail(
  to: string,
  employeeName: string,
  status: string,
  leaveType: string,
  fromDate: string,
  toDate: string,
  remarks?: string
): Promise<boolean> {
  const statusColor = status === 'approved' ? '#16a34a' : '#dc2626';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  const body = `
    <p>Dear ${employeeName},</p>
    <p>Your leave request has been <span style="color:${statusColor};font-weight:bold;">${statusText}</span>.</p>
    <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid ${statusColor};">
      <p><strong>Leave Type:</strong> ${leaveType}</p>
      <p><strong>From:</strong> ${fromDate}</p>
      <p><strong>To:</strong> ${toDate}</p>
      ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
    </div>
  `;
  return sendNotificationEmail(to, `Leave ${statusText} - FCT Energy`, `Leave ${statusText}`, body);
}

export async function sendLoanRequestEmail(
  to: string,
  employeeName: string,
  loanType: string,
  amount: string,
  repaymentMonths: number
): Promise<boolean> {
  const typeLabel = loanType === 'salary_advance' ? 'Salary Advance' : 'Loan';
  const body = `
    <p>Dear HR/Admin,</p>
    <p><strong>${employeeName}</strong> has submitted a new ${typeLabel.toLowerCase()} request.</p>
    <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #f59e0b;">
      <p><strong>Type:</strong> ${typeLabel}</p>
      <p><strong>Amount:</strong> ₹${Number(amount).toLocaleString('en-IN')}</p>
      <p><strong>Repayment:</strong> ${repaymentMonths} month(s)</p>
    </div>
    <p>Please log in to the HRMS portal to review this request.</p>
  `;
  return sendNotificationEmail(to, `${typeLabel} Request from ${employeeName}`, `${typeLabel} Request`, body);
}

export async function sendLoanStatusEmail(
  to: string,
  employeeName: string,
  status: string,
  loanType: string,
  amount: string
): Promise<boolean> {
  const typeLabel = loanType === 'salary_advance' ? 'Salary Advance' : 'Loan';
  const statusColor = status === 'approved' ? '#16a34a' : '#dc2626';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  const body = `
    <p>Dear ${employeeName},</p>
    <p>Your ${typeLabel.toLowerCase()} request has been <span style="color:${statusColor};font-weight:bold;">${statusText}</span>.</p>
    <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid ${statusColor};">
      <p><strong>Type:</strong> ${typeLabel}</p>
      <p><strong>Amount:</strong> ₹${Number(amount).toLocaleString('en-IN')}</p>
      <p><strong>Status:</strong> ${statusText}</p>
    </div>
  `;
  return sendNotificationEmail(to, `${typeLabel} ${statusText} - FCT Energy`, `${typeLabel} ${statusText}`, body);
}

export async function sendAnnouncementEmail(
  to: string,
  title: string,
  content: string,
  priority?: string
): Promise<boolean> {
  const priorityBadge = priority === 'high'
    ? '<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:4px;font-size:11px;">HIGH PRIORITY</span>'
    : '';
  const body = `
    <p>Dear Team,</p>
    <p>A new announcement has been published: ${priorityBadge}</p>
    <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #8b5cf6;">
      <h3 style="margin:0 0 10px 0;">${title}</h3>
      <p style="margin:0;">${content}</p>
    </div>
    <p>Please log in to the HRMS portal for more details.</p>
  `;
  return sendNotificationEmail(to, `Announcement: ${title}`, "Company Announcement", body);
}

export async function sendAttendanceAlertEmail(
  to: string,
  employeeName: string,
  alertType: 'late' | 'overtime',
  details: string
): Promise<boolean> {
  const heading = alertType === 'late' ? 'Late Arrival Alert' : 'Overtime Recorded';
  const color = alertType === 'late' ? '#f59e0b' : '#3b82f6';
  const body = `
    <p>Dear ${employeeName},</p>
    <p>${details}</p>
  `;
  return sendNotificationEmail(to, `${heading} - FCT Energy`, heading, body);
}

export async function sendExitNotificationEmail(
  to: string,
  employeeName: string,
  lastWorkingDate: string,
  reason: string
): Promise<boolean> {
  const body = `
    <p>Dear ${employeeName},</p>
    <p>Your exit process has been initiated. Please find the details below:</p>
    <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #6366f1;">
      <p><strong>Last Working Date:</strong> ${lastWorkingDate}</p>
      <p><strong>Reason:</strong> ${reason || 'Not specified'}</p>
    </div>
    <p>Please ensure all clearance tasks are completed before your last working day. You can track your clearance status on the HRMS portal.</p>
  `;
  return sendNotificationEmail(to, "Exit Process Initiated - FCT Energy", "Exit Process Initiated", body);
}

export async function sendLetterEmail(
  to: string,
  employeeName: string,
  letterType: string,
  letterContent: string,
  acceptUrl?: string,
  denyUrl?: string
): Promise<boolean> {
  const formattedContent = letterContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/  /g, '&nbsp;&nbsp;');
  
  const actionButtons = (acceptUrl && denyUrl) ? `
    <p style="margin:20px 0 8px;font-size:14px;color:#374151;">Please review and respond to this offer letter:</p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:12px;">
        <a href="${acceptUrl}" style="display:inline-block;padding:10px 28px;background:#22c55e;color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Accept</a>
      </td>
      <td>
        <a href="${denyUrl}" style="display:inline-block;padding:10px 28px;background:#ef4444;color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Deny</a>
      </td>
    </tr></table>
  ` : '';

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:'Times New Roman',serif;font-size:13px;line-height:1.7;color:#000;text-align:left;">
${formattedContent}
${actionButtons}
<br>
<p style="font-family:Arial,sans-serif;font-size:11px;color:#999;margin-top:30px;">This is an automated email from FC TECNRGY PVT LTD - HRMS. Please do not reply directly.</p>
</body></html>`;

  if (letterType.toLowerCase() === 'experience') {
    try {
      const pdfBuffer = await generateLetterPdf(letterContent);
      return sendEmailWithAttachment(to, `${letterType} - FCT Energy`, htmlContent, [{
        filename: `Experience_Letter_${employeeName.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]);
    } catch (e) {
      console.error("PDF generation failed, sending without attachment:", e);
    }
  }

  return sendEmail(to, `${letterType} - FCT Energy`, htmlContent);
}

export async function sendBirthdayEmail(
  to: string,
  employeeName: string
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ec4899, #f43f5e); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; text-align: center; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="font-size:28px;">Happy Birthday! 🎂</h1>
        </div>
        <div class="content">
          <p style="font-size:18px;">Dear <strong>${employeeName}</strong>,</p>
          <p style="font-size:16px;">Wishing you a very Happy Birthday from the entire FCT Energy family!</p>
          <p>May this year bring you success, happiness, and great achievements.</p>
          <p style="font-size:24px;">🎉🎈🎁</p>
        </div>
        <div class="footer">
          <p>FC TECNRGY PVT LTD (FCT) - People Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail(to, "Happy Birthday from FCT Energy! 🎂", htmlContent);
}

export async function sendAnniversaryEmail(
  to: string,
  employeeName: string,
  years: number
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; text-align: center; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="font-size:28px;">Happy Work Anniversary! 🎉</h1>
        </div>
        <div class="content">
          <p style="font-size:18px;">Dear <strong>${employeeName}</strong>,</p>
          <p style="font-size:16px;">Congratulations on completing <strong>${years} year${years !== 1 ? 's' : ''}</strong> with FCT Energy!</p>
          <p>Thank you for your dedication and valuable contributions to the team. We look forward to many more years of working together.</p>
          <p style="font-size:24px;">🏆⭐🎊</p>
        </div>
        <div class="footer">
          <p>FC TECNRGY PVT LTD (FCT) - People Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail(to, `Happy ${years}-Year Work Anniversary! - FCT Energy`, htmlContent);
}

export async function sendDocumentPendingReminderEmail(
  to: string,
  employeeName: string,
  pendingDocNames: string[]
): Promise<boolean> {
  const docList = pendingDocNames.map(name => `<li style="padding:4px 0;">${name}</li>`).join("");
  const body = `
    <p>Dear ${employeeName},</p>
    <p>This is a friendly reminder that the following document${pendingDocNames.length > 1 ? 's are' : ' is'} still <strong>pending verification</strong>:</p>
    <div style="background:#fffbeb;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #f59e0b;">
      <ul style="margin:0;padding-left:20px;">${docList}</ul>
    </div>
    <p>Please ensure all documents are uploaded correctly through the Employee Self Service portal. If you have already submitted them, no action is needed — our HR team will review them shortly.</p>
    <p>For any questions, please reach out to the HR team.</p>
  `;
  return sendNotificationEmail(to, "Reminder: Pending Documents", "Document Reminder", body);
}

export async function sendDocumentRejectionEmail(
  to: string,
  employeeName: string,
  documentName: string,
  comments: string
): Promise<boolean> {
  const body = `
    <p>Dear ${employeeName},</p>
    <p>Your document <strong>${documentName}</strong> has been <span style="color:#dc2626;font-weight:bold;">rejected</span> by the HR team.</p>
    <div style="background:#fef2f2;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #dc2626;">
      <p style="margin:0 0 5px 0;font-weight:bold;color:#991b1b;">Reason for Rejection:</p>
      <p style="margin:0;color:#7f1d1d;">${comments}</p>
    </div>
    <p>Please re-upload the correct document through the Employee Self Service portal at your earliest convenience.</p>
    <p>If you have any questions, please reach out to the HR team.</p>
  `;
  return sendNotificationEmail(to, `Document Rejected - ${documentName}`, "Document Review Update", body);
}

export async function sendNewEmployeeWelcomeEmail(
  to: string,
  employeeName: string,
  designation: string,
  department: string,
  joinDate: string
): Promise<boolean> {
  const body = `
    <p>Dear ${employeeName},</p>
    <p>Welcome to <strong>FCT Energy</strong>! We are thrilled to have you join our team.</p>
    <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #16a34a;">
      <p><strong>Designation:</strong> ${designation || 'To be assigned'}</p>
      <p><strong>Department:</strong> ${department || 'To be assigned'}</p>
      <p><strong>Date of Joining:</strong> ${joinDate}</p>
    </div>
    <p>Please complete your onboarding tasks on the HRMS portal. Your HR team is here to help with any questions.</p>
    <p>We wish you a successful and fulfilling career with us!</p>
  `;
  return sendNotificationEmail(to, "Welcome to FCT Energy!", "Welcome Aboard!", body);
}
