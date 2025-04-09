import { LoginLoader, RegisterLoader } from "./accounts/loaders/LoginLoader.js";
import { UserRelationLoader } from "./accounts/loaders/UserRelationLoader.js";
import { UserTableLoader } from "./accounts/loaders/UserTableLoader.js";
import { isLoggedIn } from './accounts/utils.js';
import { EditProfileLoader  } from "./accounts/loaders/EditProfil.js";
import { ChatLoader} from "./chat/loaders/ChatLoader.js";
import { ChatDetails } from "./chat/views/ChatDetails.js";
import { MyProfileLoader } from "./accounts/loaders/MyProfileLoader.js";
import { ProfileLoader } from "./accounts/loaders/ProfileLoader.js";
import { EventHistoryLoader } from "./events/loaders/EventHistoryLoader.js";
import { EventDetailLoader } from "./events/loaders/EventDetail.js";
import { HomeLoader } from "./HomeLoader.js";
import { GameLoader } from "./GameLoader.js";
import { LocalGameLoader } from "./local_game/LocalGameLoader.js";
import { EventCreateLoader } from "./events/loaders/EventCreate.js";
import { AccessibleEventsLoader } from "./events/loaders/AccessibleEvents.js";

// Define routes
export const routes = [
    { path: "/", loader: HomeLoader },
    { path: "/local_menu", loader: HomeLoader },
    { path: "/online_menu", loader: HomeLoader },
    { path: "/local_game/:nb_player", loader: LocalGameLoader },
    { path: "/game/:nb_player", loader: GameLoader },
    { path: "/chat", loader: ChatLoader, guard: () => isLoggedIn(), redirectTo: "/login" },
    { path: "/chat/:id", loader: ChatDetails, guard: () => isLoggedIn(), redirectTo: "/login" },
    { path: "/register", loader: RegisterLoader },
    { path: "/login", loader: LoginLoader },
    
    { path: "/login/:code", loader: LoginLoader },
    { path: "/profiles/:id", loader: ProfileLoader, guard: () => isLoggedIn(), redirectTo: "/login" }, // remplacer par ProfileLoader
    { path: "/profile", loader: MyProfileLoader, guard: () => isLoggedIn(), redirectTo: "/login" }, // remplacer par ProfileLoader
    { path: "/edit", loader: EditProfileLoader, guard: () => isLoggedIn(), redirectTo: "/login" },
    { path: "/ranking", loader: UserTableLoader, guard: () => isLoggedIn(), redirectTo: "/login" },
    { path: "/relation/:rel_type", loader: UserRelationLoader, guard: () => isLoggedIn(), redirectTo: "/login" },
    { path: "/event-history", loader: EventHistoryLoader, guard: () => isLoggedIn(), redirectTo: "/login" },
    { path: "/accessible-events", loader: AccessibleEventsLoader, guard: () => isLoggedIn(), redirectTo: "/login" },
    { path: "/event/:id", loader: EventDetailLoader, guard: () => isLoggedIn(), redirectTo: "/login" },
    { path: "/event_create", loader: EventCreateLoader, guard: () => isLoggedIn(), redirectTo: "/login" },
];

