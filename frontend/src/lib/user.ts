import { createClient } from "./supabase";
import { api } from "./api";

const KEY = "bsc_user_id";

export async function getOrCreateUserId(): Promise<string> {
  if (typeof window === "undefined") throw new Error("client only");

  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (session) return session.user.id;

  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const { user_id } = await api.post<{ user_id: string }>("/api/users/anon");
  window.localStorage.setItem(KEY, user_id);
  return user_id;
}
