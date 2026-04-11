import { IUser } from "../models/user.model.js";

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
      } & Partial<IUser>;
    }
    export interface Response {
      success: (data: any) => void;
    }
  }
}

export {};
