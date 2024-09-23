import asar from "@electron/asar";
import path from "path";
import { cpSync, existsSync, rmdirSync, writeFileSync } from "fs";
import { $, readableStreamToText } from "bun";

import _entrypoint from "./assets/entrypoint.template" with { type: "text" };
import _package from "./assets/package.json" with { type: "json" };

const platforms = {
  linux: {
    bun_target: "bun-linux-x64",
    temp: "/tmp/",
    executable: "AppRun",
    output: "app",
  },
  windows: {
    bun_target: "bun-windows-x64",
    temp: "C:\\Windows\\Temp\\",
    executable: "AppRun.exe",
    output: "app.exe",
  },
};

export default async function bundle(
  root_path: string,
  platform_id?: keyof typeof platforms,
  noLog: boolean = false,
) {
  const platform = platform_id
    ? platforms[platform_id]
    : platforms[process.platform == "win32" ? "windows" : "linux"];

  if (!platform) {
    console.error("Unknown platform.");
    process.exit(1);
  }

  if (!noLog) console.log("Bundling %s for %s...", root_path, platform_id);

  if (existsSync(path.join(root_path, "bundle")))
    rmdirSync(path.join(root_path, "bundle"), {
      recursive: true,
    });

  if (!noLog) console.log("Creating ASAR archive...");

  await asar.createPackage(root_path, path.join(root_path, "bundle/app.asar"));

  if (!noLog) console.log("Copying entrypoint...");

  writeFileSync(
    path.join(root_path, "bundle/entrypoint.ts"),
    _entrypoint,
    "binary",
  );

  writeFileSync(
    path.join(root_path, "bundle/package.json"),
    JSON.stringify(_package, null, 2),
  );

  if (!noLog) console.log("Creating configuration...");

  writeFileSync(
    path.join(root_path, "bundle/config.json"),
    JSON.stringify({
      path: platform.temp + Math.random().toString(36).substring(7),
      entrypoint: platform.executable,
    }),
  );

  if (!noLog) console.log("Installing dependencies...");

  await new Promise((r) => {
    Bun.spawn({
      cmd: ["bun", "install"],
      cwd: path.join(root_path, "bundle"),
      stdio: noLog
        ? ["ignore", "ignore", "ignore"]
        : ["inherit", "inherit", "inherit"],
      onExit: r,
    });
  });

  await new Promise((r) => setTimeout(r, 500));

  if (!noLog) console.log("Building executable...");

  await new Promise((r) =>
    Bun.spawn({
      cmd: [
        "bun",
        "build",
        "--compile",
        "--outfile",
        platform.output,
        "entrypoint.ts",
        "--target",
        platform.bun_target,
      ],
      cwd: path.join(root_path, "bundle"),
      stdio: noLog
        ? ["ignore", "ignore", "ignore"]
        : ["inherit", "inherit", "inherit"],
      onExit: r,
    }),
  );

  if (!noLog) console.log("Done");
}
