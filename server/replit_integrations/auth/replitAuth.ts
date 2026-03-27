import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../../email";
import { db } from "../../db";
import { employees } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const isLocalDev = !process.env.REPL_ID && process.env.NODE_ENV !== 'production';

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  let databaseUrl = process.env.AWS_DATABASE_URL || process.env.DATABASE_URL;
  // Add SSL parameter for AWS RDS connections (no-verify to skip certificate validation)
  if (process.env.AWS_DATABASE_URL && !databaseUrl?.includes('sslmode=')) {
    databaseUrl = databaseUrl + (databaseUrl?.includes('?') ? '&' : '?') + 'sslmode=no-verify';
  }
  const sessionStore = new pgStore({
    conString: databaseUrl,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !isLocalDev,
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, cb) => cb(null, user.id));
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await authStorage.getUserById(id);
      if (user) {
        const { password, ...safeUser } = user;
        cb(null, safeUser);
      } else {
        cb(null, null);
      }
    } catch (err) {
      cb(err);
    }
  });

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await authStorage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          if (!user.password) {
            return done(null, false, { message: "Please set up your password" });
          }
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login failed" });
        }
        return res.json({ 
          success: true, 
          user: { 
            id: user.id, 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName 
          } 
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.json({ success: true });
    });
  });

  // Also support GET for logout (backward compatibility)
  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/login");
    });
  });

  // Forgot password - request reset link
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await authStorage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({ 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await authStorage.setResetToken(user.id, resetToken, resetTokenExpiry);

      // Build reset URL
      const baseUrl = process.env.APP_URL 
        || (process.env.REPL_ID ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : null)
        || `http://localhost:${process.env.PORT || 5000}`;
      const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

      // Try to send email
      const emailSent = await sendPasswordResetEmail(email, resetUrl);
      
      console.log("Password reset requested for:", email);
      console.log("Reset URL:", resetUrl);

      res.json({ 
        success: true, 
        message: "If an account with that email exists, a password reset link has been sent.",
        resetUrl: emailSent ? undefined : resetUrl // Fallback: return URL if email fails
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Reset password - set new password
  app.post("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const user = await authStorage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      // Check if token is expired
      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ message: "Reset link has expired" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update password and clear reset token
      await authStorage.updateUserPassword(user.id, hashedPassword);
      await authStorage.clearResetToken(user.id);

      console.log("Password reset successfully for:", user.email);

      res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Validate reset token
  app.get("/api/validate-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const user = await authStorage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        return res.json({ valid: false });
      }

      res.json({ valid: true });
    } catch (error) {
      res.json({ valid: false });
    }
  });

  // Get current user
  app.get("/api/auth/user", async (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const user = req.user as any;
      // Fetch access role from employees table
      try {
        const employee = await db.select().from(employees).where(eq(employees.email, user.email)).limit(1);
        const accessRole = employee.length > 0 ? (employee[0].accessRole || "employee") : "employee";
        
        return res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accessRole: accessRole,
        });
      } catch (error) {
        console.error("Error fetching employee role:", error);
        return res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accessRole: "employee",
        });
      }
    }
    return res.status(401).json({ message: "Not authenticated" });
  });

  console.log("Custom email/password authentication enabled");
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export function registerAuthRoutes(app: Express) {
  // Auth routes are already registered in setupAuth
}
