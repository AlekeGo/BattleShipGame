import { createClient } from "./supabase";
import { api } from "./api";

const KEY = "bsc_user_id";

// Singleton promise prevents concurrent calls from creating multiple anon users.
let _inflightAnon: Promise<string> | null = null;

export async function getOrCreateUserId(): Promise<string> {
  if (typeof window === "undefined") throw new Error("client only");

  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (session) return session.user.id;

  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;

  if (!_inflightAnon) {
    _inflightAnon = api
      .post<{ user_id: string }>("/api/users/anon")
      .then(({ user_id }) => {
        window.localStorage.setItem(KEY, user_id);
        _inflightAnon = null;
        return user_id;
      });
  }
  return _inflightAnon;
}
