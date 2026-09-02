// Loaded first by every CLI script: read .env.local / .env (Next.js does this for the server, tsx does not)
// and keep JSON logs quiet unless LOG_LEVEL is set explicitly.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* optional */
  }
}
process.env.LOG_LEVEL ??= "warn";
process.env.TTS_WRITER_ID ??= `cli-${require("node:os").hostname().split(".")[0]}`;
