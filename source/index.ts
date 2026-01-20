import { spawn } from "node:child_process";
import { createWriteStream, existsSync, readFileSync, unlink, unlinkSync, writeFileSync } from "node:fs";
import { exit } from "node:process";
import { Buffer } from "node:buffer";
import { Open } from "unzipper";
import { get } from "node:https";

enum ColorType {
    RED,
    BLUE,
    YELLOW,
    GREEN
}

class Color {
    type: ColorType;
    color: string;
    name: string;

    constructor(type: ColorType, color: string, name: string) {
        this.type = type;
        this.color = "\x1b[" + color + "m";
        this.name = name;
    }
}

class Logger {

    colors: Color[] = [];

    add(type: ColorType, color: string, name: string) {
        this.colors.push(new Color(type, color, name));
    }

    write(color: ColorType, text: string) {
        let element = this.colors.find(element => element.type == color);

        if (element)
            console.log(element.color + "[" + element.name + "] \x1b[37m" + text);
    }
}

var Log: Logger = new Logger();

Log.add(ColorType.BLUE, "36", "INFO");
Log.add(ColorType.RED, "31", "ERROR");
Log.add(ColorType.YELLOW, "33", "WARNING");
Log.add(ColorType.GREEN, "32", "LOG");

class Manager {

    config: any;
    file_name: string;

    constructor() {
        try {
            this.config = JSON.parse(readFileSync("./config.json", "utf-8"));
        }
        catch (error) {
            Log.write(ColorType.RED, "Failed to parse or load config.json!");
        }

        if (this.check_downloader())
            this.initialize();
        else
            this.download_updater();
    }

    initialize() {
        this.check_update().then((update) => {
            if (update) {
                Log.write(ColorType.GREEN, "Your server should be up to date. Closing in 5 seconds.");
                setTimeout(() => { exit(0) }, 5000);
            }
            else {
                this.download();
            }
        });
    }

    check_downloader() {
        return existsSync(this.config.downloader_path + "/" + this.config.downloader_name);
    }

    download_updater() {
        const path = this.config.downloader_path + "/" + this.config.downloader_name + ".zip";

        Log.write(ColorType.YELLOW, "Cannot find Hytale updater. Trying to fetch the latest one. Please wait...");

        let updater_file = this.config.downloader_path + "/updater.zip";

        const writer = createWriteStream(updater_file);

        get(this.config.updater, (response) => {

            response.pipe(writer);

            writer.on("close", () => {
                Log.write(ColorType.GREEN, "Updater has been downloaded. Please wait...");
                Open.file(updater_file).then((element) => {
                    element.extract({ path: this.config.downloader_path }).then((extraction) => {
                        unlinkSync(updater_file);
                        console.clear();
                        this.initialize();
                    });
                });
            });
        });

    }

    download() {

        const process = spawn("./" + this.config.downloader_name, { cwd: this.config.downloader_path });

        process.stdout.on('data', (data: Buffer) => {
            let output = data.toString("utf-8");

            let authorization = this.check_authorization(output);

            if (authorization)
                Log.write(ColorType.BLUE, "Please authorize: https://oauth.accounts.hytale.com/oauth2/device/verify?user_code=" + authorization);

            let progess = this.check_progess(output);

            if (progess) {
                console.clear();
                Log.write(ColorType.GREEN, "Downloading: " + progess.current + "/" + progess.total + " (" + progess.percentage + "%)");
            }

            if (output.includes("successfully downloaded")) {
                this.extract();
            }
        });

        process.on('close', (code) => {

        });
    }

    check_update() {
        return new Promise((resolve, reject) => {
            const process = spawn("./" + this.config.downloader_name, ["-print-version"], { cwd: this.config.downloader_path });

            process.stdout.on('data', (data: Buffer) => {
                let output = data.toString("utf-8");

                /* Checking if the downloader is authorized by user ... */
                let authorization = this.check_authorization(output);

                if (authorization)
                    Log.write(ColorType.BLUE, "Please authorize: https://oauth.accounts.hytale.com/oauth2/device/verify?user_code=" + authorization);

                let version = output.split(".");

                if (version[0] == new Date().getFullYear().toString()) {
                    this.file_name = this.config.downloader_path + "/" + output.replace("\n", "") + ".zip";
                    resolve(existsSync(this.file_name));
                }
            });
        })
    }

    check_authorization(input: string) {
        const matcher = new RegExp(/Authorization code:\s*([A-Za-z0-9]+)/);

        let output = matcher.exec(input);

        if (output != null)
            return output[1];
    }

    check_version(input: string) {

        const matcher = new RegExp(/^\d{4}\.\d{2}\.\d{2}-[a-f0-9]{9}$/);

        let output = matcher.exec(input);

        if (output)
            return true;
        else
            return false;
    }

    check_progess(input: string) {
        const matcher = new RegExp(/\]\s*([\d.]+)%\s*\(([\d.]+\s*[A-Z]{2})\s*\/\s*([\d.]+\s*[A-Z]{2})\)/);

        let output = matcher.exec(input);

        if (output != null)
            return { percentage: output[1], current: output[2], total: output[3] };
        else
            return undefined;
    }

    extract() {
        Open.file(this.file_name).then((element) => {
            Log.write(ColorType.YELLOW, "Extracting server files.. do not close.");
            element.extract({ path: this.config.server_path }).then((output) => {
                Log.write(ColorType.GREEN, "Server files have been extracted! Closing in 5 seconds.");

                setTimeout(() => {
                    exit(0);
                }, 5000);
            });
        });
    }
}

var manager = new Manager();