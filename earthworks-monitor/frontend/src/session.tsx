import { createContext, useContext } from "react";
import type { AppConfig, User } from "./types";

export interface Session {
  config: AppConfig;
  user: User;
  isAnalyst: boolean;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession used outside a signed-in view");
  return session;
}
