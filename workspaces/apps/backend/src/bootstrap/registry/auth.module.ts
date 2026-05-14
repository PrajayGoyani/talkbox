import { AuthController } from "@controllers/auth.controller";
import { UserController } from "@controllers/user.controller";
import { AuthService } from "@services/auth/auth.service";
import { PolicyService } from "@services/auth/policy.service";
import { UserCacheService } from "@services/auth/user-cache.service";
import { UserService } from "@services/auth/user.service";

import { InfraModule } from "./infra.module";
import { lazy } from "./lazy";
import { RepoModule } from "./repo.module";

export class AuthModule {
  constructor(
    private repos: RepoModule,
    private infra: InfraModule,
  ) {
    lazy(this, "authService", () => new AuthService(this.repos.userRepo, this.infra.redisSessionService));
    lazy(this, "userService", () => new UserService(this.repos.userRepo, this.infra.redisSessionService));
    lazy(this, "userCacheService", () => new UserCacheService(this.repos.userRepo, this.infra.redisBaseService));
    lazy(this, "policyService", () => new PolicyService());
    lazy(this, "authController", () => new AuthController(this.authService));
    lazy(this, "userController", () => new UserController(this.userService, this.infra.imageService));
  }

  declare authService: AuthService;
  declare userService: UserService;
  declare userCacheService: UserCacheService;
  declare policyService: PolicyService;
  declare authController: AuthController;
  declare userController: UserController;
}
