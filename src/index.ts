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
  rmSync,
  createWriteStream,
  chmodSync,
} from "fs";
import { $, readableStreamToText } from "bun";
import * as tar from "tar";
import { randomUUID } from "crypto";
import axios from "axios";
import yauzl from "yauzl";

const platforms = {
  linux: {
    temp: "/tmp",
    output: "app",
    bun: "newtonium_binaries/bun",
    runner: "newtonium_binaries/runner",
    assets: "linux",
    target: "x86_64-unknown-linux-gnu",
    build_output: "entrypoint",
    bun_download:
      "https://github.com/oven-sh/bun/releases/download/bun-v1.1.29/bun-linux-x64.zip",
    bun_version: "1.1.29",
  },
  windows: {
    temp: "C:/Windows/Temp",
    output: "app.exe",
    bun: "newtonium_binaries/bun.exe",
    runner: "newtonium_binaries/runner.exe",
    assets: "windows",
    target: "x86_64-pc-windows-msvc",
    build_output: "entrypoint.exe",
    bun_download:
      "https://github.com/oven-sh/bun/releases/download/bun-v1.1.29/bun-windows-x64.zip",
    bun_version: "1.1.29",
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

  const temp_folder = path.join("/tmp", "newtonium_bundler");

  if (!existsSync(temp_folder)) mkdirSync(temp_folder);
  if (!existsSync(path.join(temp_folder, "binaries")))
    mkdirSync(path.join(temp_folder, "binaries"));

  if (!noLog) console.log("Bundling %s for %s...", root_path, platform_id);

  if (existsSync(path.join(root_path, "bundle")))
    rmdirSync(path.join(root_path, "bundle"), {
      recursive: true,
    });

  if (existsSync(path.join(root_path, "newtonium_binaries")))
    rmdirSync(path.join(root_path, "newtonium_binaries"), {
      recursive: true,
    });

  mkdirSync(path.join(root_path, "bundle"));
  mkdirSync(path.join(root_path, "newtonium_binaries"));

  if (
    !existsSync(
      path.join(
        temp_folder,
        "binaries",
        `bun-${platform.target}-${platform.bun_version}.zip`,
      ),
    )
  ) {
    if (!noLog) console.log("Downloading runtime...");

    const { data } = await axios.get(platform.bun_download, {
      responseType: "arraybuffer",
    });

    writeFileSync(
      path.join(
        temp_folder,
        "binaries",
        `bun-${platform.target}-${platform.bun_version}.zip`,
      ),
      Buffer.from(data),
    );
  }

  if (!noLog) console.log("Extracting runtime...");

  await new Promise((r) =>
    yauzl.open(
      path.join(
        temp_folder,
        "binaries",
        `bun-${platform.target}-${platform.bun_version}.zip`,
      ),
      { lazyEntries: true },
      function (err, zipfile) {
        if (err) throw err;
        zipfile.readEntry();
        zipfile.on("entry", function (entry) {
          if (/\/$/.test(entry.fileName)) {
            zipfile.readEntry();
          } else {
            zipfile.openReadStream(entry, function (err, readStream) {
              if (err) throw err;
              readStream.on("end", function () {
                zipfile.readEntry();
              });
              readStream.pipe(
                createWriteStream(
                  path.join(
                    root_path,
                    "newtonium_binaries",
                    entry.fileName.split("/").slice(-1)[0],
                  ),
                ),
              );
            });
          }
        });
        zipfile.on("end", r);
      },
    ),
  );

  if (!noLog) console.log("Copying binaries...");

  cpSync(
    path.join(import.meta.dirname, "assets", platform.assets),
    path.join(root_path, "newtonium_binaries"),
    {
      recursive: true,
    },
  );

  if (process.platform != "win32") {
    const binaries = readdirSync(path.join(root_path, "newtonium_binaries"));

    for (const binary of binaries) {
      chmodSync(path.join(root_path, "newtonium_binaries", binary), 0o755);
    }
  }

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
      .replaceAll("@entry", entrypoint)
      .replaceAll("@tmpdr", platform.temp)
      .replaceAll("@runfl", platform.runner)
      .replaceAll("@bunfl", platform.bun),
    "utf-8",
  );

  if (!noLog) console.log("Building...");

  await new Promise((r) =>
    Bun.spawn({
      cmd: ["cargo", "xwin", "build", "--release", "--target", platform.target],
      cwd: path.join(root_path, "bundle"),
      stdio: noLog
        ? ["ignore", "ignore", "ignore"]
        : ["inherit", "inherit", "inherit"],
      onExit: r,
    }),
  );

  cpSync(
    path.join(
      root_path,
      "bundle/target/" + platform.target + "/release/" + platform.build_output,
    ),
    path.join(root_path, "bundle", platform.output),
  );

  if (!noLog) console.log("Cleaning up...");

  rmdirSync(path.join(root_path, "bundle/target"), { recursive: true });

  rmdirSync(path.join(root_path, "newtonium_binaries"), {
    recursive: true,
  });

  if (!noLog) console.log("Done");
}
