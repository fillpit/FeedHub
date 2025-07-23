import { Container } from "inversify";
import { TYPES } from "./core/types";

// Services
import { DatabaseService } from "./services/DatabaseService";
import { UserService } from "./services/UserService";
import { WebsiteRssService } from "./services/WebsiteRssService";
import { SettingService } from "./services/SettingService";
import { RssTemplateService } from "./services/RssTemplateService";
import { CustomRouteService } from "./services/CustomRouteService";
// Controllers
import { SettingController } from "./controllers/setting";
import { UserController } from "./controllers/user";
import { WebsiteRssController } from "./controllers/websiteRss";
import { RssTemplateController } from "./controllers/rssTemplate";
import { CustomRouteController } from "./controllers/customRoute";

const container = new Container();

// Services
container.bind<DatabaseService>(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();
container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
container.bind<WebsiteRssService>(TYPES.WebsiteRssService).to(WebsiteRssService).inSingletonScope();
container.bind<RssTemplateService>(TYPES.RssTemplateService).to(RssTemplateService).inSingletonScope();
container.bind<SettingService>(TYPES.SettingService).to(SettingService).inSingletonScope();
container.bind<CustomRouteService>(TYPES.CustomRouteService).to(CustomRouteService).inSingletonScope();
// Controllers
container.bind<SettingController>(TYPES.SettingController).to(SettingController);
container.bind<UserController>(TYPES.UserController).to(UserController);
container.bind<WebsiteRssController>(TYPES.WebsiteRssController).to(WebsiteRssController);
container.bind<RssTemplateController>(TYPES.RssTemplateController).to(RssTemplateController);
container.bind<CustomRouteController>(TYPES.CustomRouteController).to(CustomRouteController);

export { container };
