const childProcess = require("node:child_process");
const chokidar = require("chokidar");

const slsLogs = require("@serverless/utils/log");
const mainProgress = slsLogs.progress.get("main");
const chokidarConfig = {
  interval: 500,
  awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 },
};

/*
 *  Watches your code for changes
 *  Runs fast deploys with 'serverless deploy function'
 *  Tails logs
 *
 */
class ServerlessRunWatch {
  constructor(serverless, cliOptions) {
    this.cliOptions = cliOptions;
    this.serverless = serverless;
    this.serviceDir = serverless.config.serviceDir;
    this.watchPaths = [];

    this.slsRegex = /serverless.(yml|yaml|json|ts)$/;
    this.spawnSlsOptions = []

    this.hooks = {
      "run-watch:start": this.start.bind(this),
      initialize: this.init.bind(this),
    };

    this.commands = {
      "run-watch": {
        lifecycleEvents: ["start"],
        options: {
          function: {
            type: "string",
            usage: "Specify a function",
            required: true,
            shortcut: "f",
          },
          config: {
            type: "string",
            usage: "Path to serverless config file",
            shortcut: "c",
          },
          "disable-logs": {
            type: "boolean",
            usage: "Skip tailing logs",
          },
          "watch-glob": {
            type: "string",
            usage: "Comma separated list of files or globs to watch",
          },
        },
        usage:
          "Watch and redeploy your Lambda function when code is changed. Uses direct function updates for speed",
      },
    };
  }

  async init() {
    if (!this.cliOptions["disable-logs"]) {
      let plugins = this.serverless.cli.loadedPlugins;
      for (let plugin of plugins) {
        if (plugin.constructor.name === "AwsLogs") {
          plugin.options["tail"] = true;
        }
      }
    }
    this.spawnSlsOptions = Object.entries(this.cliOptions).reduce((accum, [k, v]) => {
      if (['config', 'stage', 'region', 'verbose', 'force'].includes(k)) {
        accum.push(`--${k}`, v)
      }
      return accum
    }, [])
    if (this.cliOptions["watch-glob"]) {
      this.watchPaths.push(...this.cliOptions["watch-glob"].split(","));
    } else {
      this.watchPaths.push(`${this.serviceDir}/**/*.(js|mjs||py|ts|go|java|rb)`);
    }
    if (this.cliOptions.config) {
      this.watchPaths.push(this.cliOptions.config);
    } else {
      this.watchPaths.push(`${this.serviceDir}/serverless.(yml|yaml|json|ts)`);
    }
  }

  async tailLogs() {
    await this.serverless.pluginManager.spawn("logs");
  }

  spawnServerless() {
    const cmdArray = [
      "deploy",
      "function",
      "--function",
      this.cliOptions.function,
      ...this.spawnSlsOptions
    ];
    return childProcess.execFileSync("serverless", cmdArray, { stdio: "inherit" });
  }

  async delay(time) {
    return new Promise((res) => setTimeout(res, time));
  }

  async setCli() {
    if (this.cliOptions["disable-logs"]) {
      mainProgress.notice("Waiting for file change", { isMainEvent: true });
      await this.delay(5000000);
    } else {
      mainProgress.notice("Waiting for logs", { isMainEvent: true });
      await this.tailLogs();
    }
  }

  serverlessFileChanged(event) {
    if (this.cliOptions.config) {
      return event.includes(this.cliOptions.config);
    } else {
      return event.match(this.slsRegex) !== null;
    }
  }

  async processEvent(event) {
    // Serverless won't reload itself
    // so if the file changes, we have to shell-out
    // to a new serverless instance
    if (this.serverlessFileChanged(event)) {
      this.spawnServerless();
    } else {
      await this.serverless.pluginManager.spawn("deploy:function");
    }
    await this.setCli();
  }

  async start() {
    await chokidar
      .watch(this.watchPaths, chokidarConfig)
      .on("change", async (event) => {
        await this.processEvent(event);
      });
    await this.setCli();
  }
}

module.exports = ServerlessRunWatch;
