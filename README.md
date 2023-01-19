# Serverless Run Watch
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

This [Serverless](https://github.com/serverless/serverless) plugin provides a fast iterate -> test loop in your CLI.

Logs delivered from CloudWatch to your terminal.

Deployments skip CloudFormation, and use direct `updateFunction` and `updateFunctionConfiguration` API calls which take only a few seconds.

Supports all runtimes

![sls-run-watch-reduced](https://user-images.githubusercontent.com/1598537/213583355-1c08619f-da92-454d-b431-3df21d40ed09.gif)

## Documentation
- [Installation](#installation)
- [Command line options](#command-line-options)
- [Usage](#usage)
- [Serverless Framework Support](#serverless-framework-support)

## Installation
`serverless plugin install -n serverless-run-watch`

then run

`serverless run-watch --function <yourFunctionName>`

## Command Line Options

#### function (required)
Specify the name of the function to deploy and tail logs.

#### disable-logs
Skip streaming logs, only redeploy your function when a change is detected

#### config
This is shared with `serverless`, and honors a config file named something other than `serverless.yml`.

#### stage
This is shared with `serverless`

#### region
This is shared with `serverless`

#### watch-glob
Customize the path or paths (comma-separated) to watch. Supports glob/regex, or a direct file. Useful if you have a large project but only want to redeploy if one (or a few) files change. Also useful if my regex is missing a file you use.

## Usage
`sls run-watch --function <your function name>`

This plugin grew from a hacky script which combines two commands built into the framework: `serverless logs` and `serverless deploy function`, along with `chokidar`, a library based on `fs` events.

It is useful only when changing function code, or function configuration changes like architecture, timeout, memory, or environment variables. Other changes (adding new functions, adding IAM permissions, new events, or provisioning additional resources) requires a full CloudFormation deployment.

## Serverless Framework Support
Initially tested with v3. Likely supports other versions, but the CLI might not look as nice.

## License

MIT

## Contributing
Feel free to raise a PR

