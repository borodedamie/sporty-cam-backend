import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../lib/supabase";
import { transporter } from "../utils/nodemailer";
import logger from "../utils/logger";
import { setOTP, getOTP, deleteOTP } from "../utils/otpStore";

export const getAuthenticatedUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const userId = user.id ?? (user as any)?.sub;
    let onboarded = false;
    if (userId) {
      const { data: approved, error } = await supabaseAdmin
        .from("players")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      onboarded = !!approved?.id && !error;
    }

    const meta = ((user as any)?.user_metadata ?? {}) as Record<string, any>;
    const fullName: string | undefined =
      (user as any)?.full_name ?? meta.full_name ?? meta.fullName;

    let firstName: string | undefined =
      meta.first_name ?? meta.firstName ?? (user as any)?.first_name;
    let lastName: string | undefined =
      meta.last_name ?? meta.lastName ?? (user as any)?.last_name;

    if ((!firstName || !lastName) && fullName) {
      const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
      if (!firstName && parts.length) firstName = parts[0];
      if (!lastName && parts.length > 1) lastName = parts.slice(1).join(" ");
    }

    res.status(200).json({
      status: "success",
      message: "Authenticated user fetched successfully",
      data: {
        ...user,
        onboarded,
        first_name: firstName ?? null,
        last_name: lastName ?? null,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: (error as any).message || "Internal Server Error",
    });
  }
};

export const loginWithEmailPassword = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      return res
        .status(400)
        .json({ status: "failed", message: "Email and password are required" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data?.session || !data.user) {
      return res.status(401).json({
        status: "failed",
        message: error?.message || "Invalid credentials",
      });
    }

    const { session, user } = data;

    try {
      const deviceToken = req.body?.token;
      const deviceProvider = req.body?.provider || "fcm";
      const devicePlatform = req.body?.platform;
      const deviceMetadata = req.body?.metadata;
      if (deviceToken && user?.id) {
        const payload: any = {
          user_id: user.id,
          token: deviceToken,
          provider: deviceProvider,
        };
        if (devicePlatform) payload.platform = devicePlatform;
        if (deviceMetadata) payload.metadata = deviceMetadata;
        await supabaseAdmin
          .from("user_devices")
          .upsert([payload], { onConflict: "token" });
      }
    } catch (err) {
      logger.error("device upsert failed on login:", err);
    }
    return res.status(200).json({
      status: "success",
      message: "Logged in successfully",
      data: {
        user: { id: user.id, email: user.email, ...user.user_metadata },
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
        tokenType: session.token_type,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: (error as any).message || "Internal Server Error",
    });
  }
};

export const registerWithEmailPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } =
      req.body as {
        firstName?: string;
        lastName?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
      };

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        status: "failed",
        message:
          "firstName, lastName, email, password and confirmPassword are required",
      });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ status: "failed", message: "Passwords do not match" });
    }

    const policyErrors: string[] = [];
    if (password.length < 8) {
      policyErrors.push("at least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      policyErrors.push("at least 1 uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      policyErrors.push("at least 1 lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      policyErrors.push("at least 1 number");
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
      policyErrors.push("at least 1 special character");
    }
    if (policyErrors.length) {
      return res.status(400).json({
        status: "failed",
        message: "Password does not meet policy: " + policyErrors.join(", "),
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: `${firstName} ${lastName}`.trim() },
      },
    });

    if (error) {
      const status = /already|exists|registered/i.test(error.message)
        ? 409
        : 400;
      return res
        .status(status)
        .json({ status: "failed", message: error.message });
    }

    const { user, session } = data;

    try {
      const deviceToken = req.body?.token;
      const deviceProvider = req.body?.provider || "fcm";
      const devicePlatform = req.body?.platform;
      const deviceMetadata = req.body?.metadata;
      if (deviceToken && user?.id) {
        const payload: any = {
          user_id: user.id,
          token: deviceToken,
          provider: deviceProvider,
        };
        if (devicePlatform) payload.platform = devicePlatform;
        if (deviceMetadata) payload.metadata = deviceMetadata;
        await supabaseAdmin
          .from("user_devices")
          .upsert([payload], { onConflict: "token" });
      }
    } catch (err) {
      logger.error("device upsert failed on register:", err);
    }

    return res.status(201).json({
      status: "success",
      message: session
        ? "Account created and signed in"
        : "Account created. Please verify your email to complete signup.",
      data: {
        user: user
          ? { id: user.id, email: user.email, ...user.user_metadata }
          : null,
        accessToken: session?.access_token || null,
        refreshToken: session?.refresh_token || null,
        expiresAt: session?.expires_at || null,
        tokenType: session?.token_type || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: (error as any).message || "Internal Server Error",
    });
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body?.refreshToken;

    if (!refreshToken) {
      return res
        .status(400)
        .json({ status: "failed", message: "Missing refreshToken" });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data?.session || !data.user) {
      return res.status(401).json({
        status: "failed",
        message: error?.message || "Invalid refresh token",
      });
    }

    const { session, user } = data;

    return res.status(200).json({
      status: "success",
      message: "Token refreshed",
      data: {
        user: { id: user.id, email: user.email, ...user.user_metadata },
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
        tokenType: session.token_type,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: (error as any).message || "Internal Server Error",
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const authHeader = req.headers.authorization || "";

    if (!user || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });
    }

    const accessToken = authHeader.slice(7);

    const { currentPassword, newPassword, confirmNewPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      confirmNewPassword?: string;
    };

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        status: "failed",
        message:
          "currentPassword, newPassword and confirmNewPassword are required",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res
        .status(400)
        .json({ status: "failed", message: "New passwords do not match" });
    }

    const policyErrors = validatePasswordPolicy(newPassword);
    if (policyErrors.length) {
      return res.status(400).json({
        status: "failed",
        message: "Password does not meet policy: " + policyErrors.join(", "),
      });
    }

    if (!user.email) {
      return res
        .status(400)
        .json({ status: "failed", message: "User email not found" });
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return res.status(401).json({
        status: "failed",
        message: "Current password is incorrect",
      });
    }

    const client = supabase;
    const { data: userResult, error: getUserErr } = await client.auth.getUser(
      accessToken
    );
    if (getUserErr || !userResult?.user) {
      return res
        .status(401)
        .json({ status: "failed", message: "Invalid session" });
    }

    const { error: updateErr } = await client.auth.updateUser(
      { password: newPassword },
      { accessToken } as any
    );

    if (updateErr) {
      return res
        .status(400)
        .json({ status: "failed", message: updateErr.message });
    }

    return res
      .status(200)
      .json({ status: "success", message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: (error as any).message || "Internal Server Error",
    });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      return res
        .status(400)
        .json({ status: "failed", message: "Email is required" });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is missing",
      });
    }

    const { data: usersData, error: usersErr } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
    if (usersErr) {
      return res
        .status(500)
        .json({ status: "failed", message: usersErr.message });
    }
    const users: Array<{ id: string; email: string | null }> =
      (usersData as any)?.users ?? [];
    const foundUser = users.find(
      (u) => (u.email || "").toLowerCase() === email.toLowerCase()
    );

    if (foundUser) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await setOTP(
        `reset:${otp}`,
        { userId: foundUser.id, email: foundUser.email || email, otp },
        10 * 60
      );

      const generateOtpEmailHtml = (code: string) => `
        <html>
        <head>
            <style>
                .container { font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; }
                .card { max-width: 500px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .otp { font-size: 24px; font-weight: bold; color: #2c3e50; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <h2>Password Reset Request</h2>
                    <p>Here is your One-Time Password (OTP) to reset your account:</p>
                    <p class="otp">${code}</p>
                    <p>This OTP will expire in 10 minutes. Please do not share it with anyone.</p>
                    <p>Best regards,<br/>Support Team</p>
                </div>
            </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `Sporty cam Support <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Password Reset OTP",
        html: generateOtpEmailHtml(otp),
      };

      transporter.sendMail(mailOptions, (error: any, info: any) => {
        console.log(error);
        if (error)
          logger.error(
            "Error sending request password email:",
            (error as any).message || error
          );
        else logger.info("Request password email sent:", info.response);
      });
    }

    return res.status(200).json({
      status: "success",
      message: "If the email exists, an OTP will be sent",
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: (error as any).message || "Internal Server Error",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { otp, newPassword, confirmPassword } = req.body as {
      otp?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: "failed",
        message: "otp, newPassword, confirmPassword are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ status: "failed", message: "Passwords do not match" });
    }

    const policyErrors = validatePasswordPolicy(newPassword);
    if (policyErrors.length) {
      return res.status(400).json({
        status: "failed",
        message: "Password does not meet policy: " + policyErrors.join(", "),
      });
    }

    const record = await getOTP(`reset:${otp}`);
    if (!record) {
      return res
        .status(400)
        .json({ status: "failed", message: "Invalid or expired OTP" });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is missing",
      });
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      record.userId,
      { password: newPassword }
    );

    if (updateErr) {
      return res
        .status(400)
        .json({ status: "failed", message: updateErr.message });
    }

    await deleteOTP(`reset:${otp}`);

    return res.status(200).json({
      status: "success",
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: (error as any).message || "Internal Server Error",
    });
  }
};

export function validatePasswordPolicy(pwd: string): string[] {
  const errors: string[] = [];
  if (!pwd || pwd.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(pwd)) errors.push("at least 1 uppercase letter");
  if (!/[a-z]/.test(pwd)) errors.push("at least 1 lowercase letter");
  if (!/[0-9]/.test(pwd)) errors.push("at least 1 number");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd))
    errors.push("at least 1 special character");
  return errors;
}
