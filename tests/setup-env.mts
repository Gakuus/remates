import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {
  // Sin .env (CI, entornos desnudos): se usan solo los defaults.
}
