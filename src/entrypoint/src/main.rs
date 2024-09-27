#![windows_subsystem = "windows"]

use flate2::read::GzDecoder;
use std::fs::File;
use std::io::BufReader;
use tar::Archive;

const ARCH: &[u8] = include_bytes!("../app.tar.gz");

const is_installer: bool = @installer;

fn main() -> std::io::Result<()> {
    if !std::path::Path::new("@tmpdr/@appid").exists() {
        //println!("Extracting!");

        let buffered = BufReader::new(ARCH);
        let decoder = GzDecoder::new(buffered);
        let mut archive = Archive::new(decoder);

        archive.unpack("@tmpdr/@appid")?;
    }

    if is_installer {
        let child = std::process::Command::new("./newtonium_binaries/newtonium_installer").current_dir("@tmpdr/@appid")
            .stdin(std::process::Stdio::inherit())
            .stdout(std::process::Stdio::inherit())
            .stderr(std::process::Stdio::inherit())
            .status()
            .unwrap();

        return Ok(());
    }

    let child = std::process::Command::new("@tmpdr/@appid/@runfl")
        .current_dir("@tmpdr/@appid")
        .env("NEWTONIUM_APP", "true")
        .env("NEWTONIUM_ROOT", "@tmpdr/@appid")
        .env("NEWTONIUM_ENTRYPOINT", "@entry")
        .env("NEWTONIUM_BUN", "@bunfl")
        .stdin(std::process::Stdio::inherit())
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit())
        .status()
        .unwrap();

    Ok(())
}
