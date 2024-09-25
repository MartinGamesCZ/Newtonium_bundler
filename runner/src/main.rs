fn main() -> std::io::Result<()> {
    let out = std::process::Command::new(
        std::env::var("NEWTONIUM_ROOT").unwrap()
            + "/"
            + std::env::var("NEWTONIUM_BUN").unwrap().as_str(),
    )
    .arg(std::env::var("NEWTONIUM_ENTRYPOINT").unwrap())
    .current_dir(std::env::current_dir().unwrap())
    .output()
    .unwrap();

    println!("{}", String::from_utf8_lossy(&out.stdout));

    Ok(())
}
