import { SanitizedUser } from "../services/auth.service";

declare global {
  namespace Express {
    export interface Request {
      user?: SanitizedUser;
    }
    export interface Response {
      success: (data: any) => void;
    }
  }
}

export {};
