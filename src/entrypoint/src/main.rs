use flate2::read::GzDecoder;
use std::fs::File;
use std::io::BufReader;
use tar::Archive;

const arch: &[u8] = include_bytes!("../app.tar.gz");

fn main() -> std::io::Result<()> {
    if (!std::path::Path::new("/tmp/@appid").exists()) {
        println!("Extracting!");

        let buffered = BufReader::new(arch);
        let decoder = GzDecoder::new(buffered);
        let mut archive = Archive::new(decoder);

        archive.unpack("/tmp/@appid")?;
    }

    let child = std::process::Command::new("./runner")
        .current_dir("/tmp/@appid")
        .env("NEWTONIUM_APP", "true")
        .env("NEWTONIUM_ROOT", "/tmp/@appid")
        .env("NEWTONIUM_ENTRYPOINT", "@entry")
        .spawn();

    child?.wait().unwrap();

    Ok(())
}
