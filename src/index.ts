import asar from "@electron/asar";
import path from "path";
import { cpSync, existsSync, rmdirSync, writeFileSync } from "fs";
import { $, readableStreamToText } from "bun";

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
) {
  const platform = platform_id
    ? platforms[platform_id]
    : platforms[process.platform == "win32" ? "windows" : "linux"];

  if (!platform) {
    console.error("Unknown platform.");
    process.exit(1);
  }

  console.log("Bundling %s for %s...", root_path, platform_id);

  if (existsSync(path.join(root_path, "bundle")))
    rmdirSync(path.join(root_path, "bundle"), {
      recursive: true,
    });

  console.log("Creating ASAR archive...");

  await asar.createPackage(root_path, path.join(root_path, "bundle/app.asar"));

  console.log("Copying entrypoint...");

  cpSync(
    path.join(__dirname, "assets/entrypoint.ts"),
    path.join(root_path, "bundle/entrypoint.ts"),
  );

  cpSync(
    path.join(__dirname, "assets/package.json"),
    path.join(root_path, "bundle/package.json"),
  );

  console.log("Creating configuration...");

  writeFileSync(
    path.join(root_path, "bundle/config.json"),
    JSON.stringify({
      path: platform.temp + Math.random().toString(36).substring(7),
      entrypoint: platform.executable,
    }),
  );

  console.log("Installing dependencies...");

  await new Promise((r) => {
    Bun.spawn({
      cmd: ["bun", "install"],
      cwd: path.join(root_path, "bundle"),
      stdio: ["inherit", "inherit", "inherit"],
      onExit: r,
    });
  });

  await new Promise((r) => setTimeout(r, 500));

  console.log("Building executable...");

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
      stdio: ["inherit", "inherit", "inherit"],
      onExit: r,
    }),
  );

  console.log("Done");
}
