import { AuthModule } from "./auth.module";
import { ChatModule } from "./chat.module";
import { InfraModule } from "./infra.module";
import { lazy } from "./lazy";
import { NotificationModule } from "./notification.module";
import { RepoModule } from "./repo.module";
import { SocketModule } from "./socket.module";

export interface IContainer {
  infra: InfraModule;
  repos: RepoModule;
  auth: AuthModule;
  chat: ChatModule;
  notification: NotificationModule;
  socket: SocketModule;
}

const containerObj = {} as IContainer;

lazy(containerObj, "infra", () => new InfraModule());
lazy(containerObj, "repos", () => new RepoModule());
lazy(containerObj, "auth", () => new AuthModule(containerObj.repos, containerObj.infra));
lazy(containerObj, "chat", () => new ChatModule(containerObj.repos, containerObj.infra));
lazy(containerObj, "notification", () => new NotificationModule(containerObj.repos));
lazy(
  containerObj,
  "socket",
  () => new SocketModule(containerObj.repos, containerObj.infra, containerObj.auth, containerObj.chat),
);

export const container = containerObj;
