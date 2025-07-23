import { Container } from "inversify";
import { TYPES } from "./core/types";

// Services
import { DatabaseService } from "./services/DatabaseService";
import { UserService } from "./services/UserService";
import { WebsiteRssService } from "./services/WebsiteRssService";
import { SettingService } from "./services/SettingService";
import { RssTemplateService } from "./services/RssTemplateService";
import { CustomRouteService } from "./services/CustomRouteService";
import { NpmPackageService } from "./services/NpmPackageService";
// Controllers
import { SettingController } from "./controllers/setting";
import { UserController } from "./controllers/user";
import { WebsiteRssController } from "./controllers/websiteRss";
import { RssTemplateController } from "./controllers/rssTemplate";
import { CustomRouteController } from "./controllers/customRoute";
import { NpmPackageController } from "./controllers/npmPackage";

const container = new Container();

// Services
container.bind<DatabaseService>(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();
container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
container.bind<WebsiteRssService>(TYPES.WebsiteRssService).to(WebsiteRssService).inSingletonScope();
container.bind<RssTemplateService>(TYPES.RssTemplateService).to(RssTemplateService).inSingletonScope();
container.bind<SettingService>(TYPES.SettingService).to(SettingService).inSingletonScope();
container.bind<CustomRouteService>(TYPES.CustomRouteService).to(CustomRouteService).inSingletonScope();
container.bind<NpmPackageService>(TYPES.NpmPackageService).to(NpmPackageService).inSingletonScope();
// Controllers
container.bind<SettingController>(TYPES.SettingController).to(SettingController);
container.bind<UserController>(TYPES.UserController).to(UserController);
container.bind<WebsiteRssController>(TYPES.WebsiteRssController).to(WebsiteRssController);
container.bind<RssTemplateController>(TYPES.RssTemplateController).to(RssTemplateController);
container.bind<CustomRouteController>(TYPES.CustomRouteController).to(CustomRouteController);
container.bind<NpmPackageController>(TYPES.NpmPackageController).to(NpmPackageController);

export { container };
