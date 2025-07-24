import { Container } from "inversify";
import { TYPES } from "./core/types";

// Services
import { DatabaseService } from "./services/DatabaseService";
import { UserService } from "./services/UserService";
import { WebsiteRssService } from "./services/WebsiteRssService";
import { SettingService } from "./services/SettingService";

import { DynamicRouteService } from "./services/DynamicRouteService";
import { NpmPackageService } from "./services/NpmPackageService";
// Controllers
import { SettingController } from "./controllers/setting";
import { UserController } from "./controllers/user";
import { WebsiteRssController } from "./controllers/websiteRss";

import { DynamicRouteController } from "./controllers/dynamicRoute";
import { NpmPackageController } from "./controllers/npmPackage";

const container = new Container();

// Services
container.bind<DatabaseService>(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();
container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
container.bind<WebsiteRssService>(TYPES.WebsiteRssService).to(WebsiteRssService).inSingletonScope();

container.bind<SettingService>(TYPES.SettingService).to(SettingService).inSingletonScope();
container.bind<DynamicRouteService>(TYPES.DynamicRouteService).to(DynamicRouteService).inSingletonScope();
container.bind<NpmPackageService>(TYPES.NpmPackageService).to(NpmPackageService).inSingletonScope();
// Controllers
container.bind<SettingController>(TYPES.SettingController).to(SettingController);
container.bind<UserController>(TYPES.UserController).to(UserController);
container.bind<WebsiteRssController>(TYPES.WebsiteRssController).to(WebsiteRssController);

container.bind<DynamicRouteController>(TYPES.DynamicRouteController).to(DynamicRouteController);
container.bind<NpmPackageController>(TYPES.NpmPackageController).to(NpmPackageController);

export { container };
