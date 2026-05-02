import { UserDto } from "@root/shared/types/auth.dto";

declare global {
  namespace Express {
    export interface Request {
      user?: UserDto;
    }
    export interface Response {
      success(data: any, statusCode?: number): this;
    }
  }
}

export {};
