import asar from "@electron/asar";
import path from "path";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmdirSync,
  writeFileSync,
  readFileSync,
} from "fs";
import { $, readableStreamToText } from "bun";
import * as tar from "tar";
import { randomUUID } from "crypto";

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
  entrypoint: string,
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

  mkdirSync(path.join(root_path, "bundle"));

  if (!noLog) console.log("Copying binaries...");

  cpSync(path.join(import.meta.dirname, "assets"), path.join(root_path), {
    recursive: true,
  });

  if (!noLog) console.log("Creating TAR archive...");

  await tar.c(
    {
      gzip: true,
      file: path.join(root_path, "bundle/app.tar.gz"),
      cwd: root_path,
    },
    readdirSync(root_path).filter((a) => a != "bundle"),
  );

  if (!noLog) console.log("Copying entrypoint...");

  cpSync(
    path.join(import.meta.dirname, "entrypoint"),
    path.join(root_path, "bundle"),
    {
      recursive: true,
    },
  );

  writeFileSync(
    path.join(root_path, "bundle/src/main.rs"),
    readFileSync(path.join(root_path, "bundle/src/main.rs"), "utf-8")
      .replaceAll("@appid", randomUUID().replaceAll("-", ""))
      .replaceAll("@entry", entrypoint),
    "utf-8",
  );

  if (!noLog) console.log("Building...");

  await new Promise((r) =>
    Bun.spawn({
      cmd: ["cargo", "build", "--release"],
      cwd: path.join(root_path, "bundle"),
      stdio: noLog
        ? ["ignore", "ignore", "ignore"]
        : ["inherit", "inherit", "inherit"],
      onExit: r,
    }),
  );

  cpSync(
    path.join(root_path, "bundle/target/release/entrypoint"),
    path.join(root_path, "bundle", platform.output),
  );

  if (!noLog) console.log("Done");
}
