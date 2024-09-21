import app_asar from "./app.asar" with { type: "binary" };
import app_config from "./config.json" with { type: "json" };
import { existsSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import asar from "@electron/asar";

console.log("Running app...");
console.log(app_config.path);

await unpack();

async function unpack() {
  const archive = await Bun.file(app_asar).bytes();

  if (existsSync(app_config.path)) {
    return await run();
  }

  mkdirSync(app_config.path, { recursive: true });

  writeFileSync(path.join(app_config.path, "app.asar"), archive);

  asar.extractAll(path.join(app_config.path, "app.asar"), app_config.path);

  await run();
}

async function run() {
  const entrypoint = path.join(app_config.path, "AppRun");

  await new Promise((r) =>
    Bun.spawn({
      cmd: [entrypoint],
      cwd: app_config.path,
      stdio: ["inherit", "inherit", "inherit"],
      onExit: r,
    }),
  );
}
