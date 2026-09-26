/**
 * Skapar (eller uppgraderar) en superadmin — kontot som loggar in på
 * /admin/login och därifrån kan lägga till användare och admins.
 *
 * Finns e-postadressen redan uppgraderas det kontot, och du kan välja att
 * sätta ett nytt lösenord. Annars skapas ett nytt konto.
 *
 * Kör db/admin-invites.sql och db/superadmin.sql först.
 *
 * Usage:
 *   npm run admin:superuser
 */
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Saknar NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Frågar utan att eka det som skrivs (för lösenord). */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    stdout.write(question);
    let value = "";
    const raw = stdin.isTTY;
    if (raw) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.off("data", onData);
          if (raw) stdin.setRawMode(false);
          stdin.pause();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") process.exit(130); // Ctrl+C
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function findUserByEmail(email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const email = (await rl.question("E-post: ")).trim().toLowerCase();
  rl.close();
  if (!email.includes("@")) throw new Error("Ogiltig e-post");

  let userId: string;
  const existing = await findUserByEmail(email);

  if (existing) {
    console.log("Kontot finns redan — uppgraderar till superadmin.");
    userId = existing.id;

    const rl2 = createInterface({ input: stdin, output: stdout });
    const reset = (await rl2.question("Sätt nytt lösenord? (j/N): ")).trim();
    rl2.close();
    if (/^j/i.test(reset)) {
      const password = await askHidden("Nytt lösenord (minst 8 tecken): ");
      if (password.length < 8) throw new Error("Lösenordet ska vara minst 8 tecken");
      const again = await askHidden("Upprepa lösenordet: ");
      if (again !== password) throw new Error("Lösenorden matchar inte");
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password,
      });
      if (error) throw error;
      console.log("Lösenordet är uppdaterat.");
    }
  } else {
    const rl2 = createInterface({ input: stdin, output: stdout });
    const username = (await rl2.question("Användarnamn: ")).trim();
    rl2.close();
    if (username.length < 3) throw new Error("Användarnamnet ska vara minst 3 tecken");

    const password = await askHidden("Lösenord (minst 8 tecken): ");
    if (password.length < 8) throw new Error("Lösenordet ska vara minst 8 tecken");
    const again = await askHidden("Upprepa lösenordet: ");
    if (again !== password) throw new Error("Lösenorden matchar inte");

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (error || !data.user) throw error ?? new Error("Kontot skapades inte");
    userId = data.user.id;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "admin", is_superadmin: true })
    .eq("id", userId);
  if (error) throw error;

  console.log(`Klart. ${email} är superadmin — logga in på /admin/login.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
