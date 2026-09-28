/* Server-side read of the language cookie so the first server render is already
 * in the member's language (no flash of English on refresh or navigation). */
import { cookies } from "next/headers";
import { isLang, LANG_COOKIE, type Lang } from "./i18n-shared";

export async function serverLang(): Promise<Lang> {
  try {
    const c = (await cookies()).get(LANG_COOKIE)?.value;
    return isLang(c) ? c : "en";
  } catch {
    return "en";
  }
}
