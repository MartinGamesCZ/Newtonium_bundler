import asar from "@electron/asar";
import path from "path";
import { cpSync, existsSync, rmdirSync, writeFileSync } from "fs";
import { $, readableStreamToText } from "bun";

export default async function bundle(root_path: string) {
  console.log("Bundling %s...", root_path);

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
      path: "/tmp/" + Math.random().toString(36).substring(7),
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
      cmd: ["bun", "build", "--compile", "--outfile", "app", "entrypoint.ts"],
      cwd: path.join(root_path, "bundle"),
      stdio: ["inherit", "inherit", "inherit"],
      onExit: r,
    }),
  );

  console.log("Done");
}
