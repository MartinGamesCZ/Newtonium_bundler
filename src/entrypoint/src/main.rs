use flate2::read::GzDecoder;
use std::fs::File;
use std::io::BufReader;
use tar::Archive;

const arch: &[u8] = include_bytes!("../app.tar.gz");

fn main() -> std::io::Result<()> {
    if (!std::path::Path::new("@tmpdr/@appid").exists()) {
        println!("Extracting!");

        let buffered = BufReader::new(arch);
        let decoder = GzDecoder::new(buffered);
        let mut archive = Archive::new(decoder);

        archive.unpack("@tmpdr/@appid")?;
    }

    let child = std::process::Command::new("@tmpdr/@appid/@runfl")
        .current_dir("@tmpdr/@appid")
        .env("NEWTONIUM_APP", "true")
        .env("NEWTONIUM_ROOT", "@tmpdr/@appid")
        .env("NEWTONIUM_ENTRYPOINT", "@entry")
        .env("NEWTONIUM_BUN", "@bunfl")
        .spawn();

    child?.wait().unwrap();

    Ok(())
}
