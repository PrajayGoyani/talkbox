import { UserDto } from "shared/types/auth.dto";

declare global {
  namespace Express {
    export interface Request {
      user?: UserDto;
      token?: string;
    }
    export interface Response {
      success(data: any, statusCode?: number): this;
    }
  }
}

export {};
