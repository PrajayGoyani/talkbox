import { IUser } from "../models/user.model";

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
