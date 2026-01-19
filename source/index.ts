import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { exit } from "node:process";
import { Buffer } from "node:buffer";

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

    constructor() {
        this.config = JSON.parse(readFileSync("./config.json", "utf-8"));

        this.check_update().then((update) => {
            if (update) {
                Log.write(ColorType.GREEN, "Your server should be up to date.");
            }
            else {
                this.download();
            }
        });
    }

    download() {

        const process = spawn(this.config.server_path + "/hytale-downloader.exe");

        process.stdout.on('data', (data: Buffer) => {
            let output = data.toString("utf-8");

            console.clear();

            /* Checking if the downloader is authorized by user ... */
            let authorization = this.check_authorization(output);

            if (authorization)
                Log.write(ColorType.BLUE, "Please authorize: https://oauth.accounts.hytale.com/oauth2/device/verify?user_code=" + authorization);

            /* Getting actual update data ... */
            let progess = this.check_progess(output);

            if (progess) {
                Log.write(ColorType.GREEN, "Downloading: " + progess.current + "/" + progess.total + " (" + progess.percentage + "%)");
            }
        });

        process.on('close', (code) => {
            exit();
        });
    }

    check_update() {
        return new Promise((resolve, reject) => {
            const process = spawn(this.config.server_path + "/hytale-downloader.exe", ["-print-version"]);

            process.stdout.on('data', (data: Buffer) => {
                let output = data.toString("utf-8");
                let version = output.replace("\n", "");
                resolve(existsSync(version + ".zip"));
            });
        })
    }

    check_authorization(input: string) {
        const matcher = new RegExp(/Authorization code:\s*([A-Za-z0-9]+)/);

        let output = matcher.exec(input);

        if (output != null)
            return output[1];
    }

    check_progess(input: string) {
        const matcher = new RegExp(/\]\s*([\d.]+)%\s*\(([\d.]+\s*[A-Z]{2})\s*\/\s*([\d.]+\s*[A-Z]{2})\)/);

        let output = matcher.exec(input);

        if (output != null)
            return { percentage: output[1], current: output[2], total: output[3] };
        else
            return undefined;
    }

}

var manager = new Manager();