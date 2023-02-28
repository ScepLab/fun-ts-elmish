export * as cmd from "./cmd";
export * as program from "./program";
export * as debug from "./debug";

import { elmishifyHistory, program } from "./navigation";

export const navigation = { program, elmishifyHistory };

export type {
    View,
    Program,
    Init,
    Update,
    Subscribe,
    ElmishResult
} from "./program";

export type { Cmd } from "./cmd";

export type {
    InitWithLocation,
    LocationToMessage,
    Location
} from "./navigation";
