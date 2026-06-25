import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.mjs";

export const authHandler = toNodeHandler(auth);
