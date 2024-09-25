#![windows_subsystem = "windows"]

fn main() -> std::io::Result<()> {
    let out = std::process::Command::new(
        std::env::var("NEWTONIUM_ROOT").unwrap()
            + "/"
            + std::env::var("NEWTONIUM_BUN").unwrap().as_str(),
    )
    .arg(std::env::var("NEWTONIUM_ENTRYPOINT").unwrap())
    .current_dir(std::env::current_dir().unwrap())
    .stdin(std::process::Stdio::inherit())
    .stdout(std::process::Stdio::inherit())
    .stderr(std::process::Stdio::inherit())
    .status()
    .unwrap();

    Ok(())
}
