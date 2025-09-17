import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string | null; [key: string]: any };
      accessToken?: string;
      refreshToken?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    const validateAndAttach = (accessToken: string) =>
      supabase.auth.getUser(accessToken).then(({ data, error }) => {
        if (error || !data?.user) return { ok: false as const };
        req.user = {
          id: data.user.id,
          email: data.user.email,
          ...data.user.user_metadata,
        };
        req.accessToken = accessToken;
        return { ok: true as const };
      });

    if (token) {
      const result = await validateAndAttach(token);
      if (result.ok) return next();

      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession({ refresh_token: token });

      if (!refreshError && refreshData?.session) {
        const newAccess = refreshData.session.access_token;
        const newRefresh = refreshData.session.refresh_token;
        const validated = await validateAndAttach(newAccess);
        if (validated.ok) {
          req.refreshToken = newRefresh;
          return next();
        }
      }
    }

    return res.status(401).json({ error: "Invalid or expired token" });
  } catch (err) {
    next(err);
  }
}
