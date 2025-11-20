import { Container } from "inversify";
import { TYPES } from "./core/types";

// Services
import { DatabaseService } from "./services/DatabaseService";
import { UserService } from "./services/UserService";
import { WebsiteRssService } from "./services/WebsiteRssService";
import { AuthCredentialService } from "./services/AuthCredentialService";
import { SettingService } from "./services/SettingService";
import { NotificationService } from "./services/NotificationService";

import { DynamicRouteService } from "./services/DynamicRouteService";

import { ScriptFileService } from "./services/ScriptFileService";
import { NpmPackageService } from "./services/NpmPackageService";
import { ScriptTemplateService } from "./services/ScriptTemplateService";

// 新的书籍订阅服务

// Controllers
import { SettingController } from "./controllers/setting";
import { UserController } from "./controllers/user";
import { WebsiteRssController } from "./controllers/websiteRss";
import { AuthCredentialController } from "./controllers/authCredential";
import { DynamicRouteController } from "./controllers/dynamicRoute";
import { NpmPackageController } from "./controllers/npmPackage";
import { NotificationController } from "./controllers/notification";
import { BackupController } from "./controllers/backup";

// 新的书籍订阅控制器

const container = new Container();

// Services
container.bind<DatabaseService>(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();
container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
container.bind<WebsiteRssService>(TYPES.WebsiteRssService).to(WebsiteRssService).inSingletonScope();
container
  .bind<AuthCredentialService>(TYPES.AuthCredentialService)
  .to(AuthCredentialService)
  .inSingletonScope();

container.bind<SettingService>(TYPES.SettingService).to(SettingService).inSingletonScope();
container
  .bind<NotificationService>(TYPES.NotificationService)
  .to(NotificationService)
  .inSingletonScope();
container
  .bind<DynamicRouteService>(TYPES.DynamicRouteService)
  .to(DynamicRouteService)
  .inSingletonScope();

container.bind<ScriptFileService>(TYPES.ScriptFileService).to(ScriptFileService).inSingletonScope();
container.bind<NpmPackageService>(TYPES.NpmPackageService).to(NpmPackageService).inSingletonScope();
container
  .bind<ScriptTemplateService>(TYPES.ScriptTemplateService)
  .to(ScriptTemplateService)
  .inSingletonScope();

// 新的书籍订阅服务
// Controllers
container.bind<SettingController>(TYPES.SettingController).to(SettingController);
container.bind<UserController>(TYPES.UserController).to(UserController);
container.bind<WebsiteRssController>(TYPES.WebsiteRssController).to(WebsiteRssController);
container
  .bind<AuthCredentialController>(TYPES.AuthCredentialController)
  .to(AuthCredentialController);
container.bind<DynamicRouteController>(TYPES.DynamicRouteController).to(DynamicRouteController);
container.bind<NpmPackageController>(TYPES.NpmPackageController).to(NpmPackageController);
container.bind<NotificationController>(TYPES.NotificationController).to(NotificationController);
container.bind<BackupController>(TYPES.BackupController).to(BackupController);

// 新的书籍订阅控制器

export { container };
