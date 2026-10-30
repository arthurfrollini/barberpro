/** Loads .env into process.env when the file exists (local dev); deploys set real variables. */
export function loadEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    // no .env file
  }
}
