'use strict'
const { expect } = require('chai')
const sinon = require('sinon');

const childProcess = require("node:child_process")
const chokidar = require('chokidar')

const ServerlessRunWatch = require('../ServerlessRunWatch.js')

class AwsLogs {
  constructor() {
    this.options = {}
  }
}

let slsStub, logsPlugin, pluginManagerSpawn, execFileStub

describe('ServerlessRunWatch', () => {
  beforeEach(() => {
    logsPlugin = new AwsLogs
    pluginManagerSpawn = sinon.spy()
    execFileStub = sinon.stub(childProcess, 'execFileSync').returns()

    slsStub = {
      cli: {
        loadedPlugins: [
          logsPlugin
        ]
      },
      config: {
        serviceDir: './test'
      },
      pluginManager: {
        spawn: pluginManagerSpawn
      }
    }
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('init', () => {
    it('sets default watch paths', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello' })
      await runWatch.init()
      expect(runWatch.watchPaths).to.deep.equal([
        "./test/**/*.(js|py|ts|go|java|rb)",
        "./test/serverless.(yml|yaml|json|ts)"
      ])
    })

   it('honors serverless config option', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello', config: './test/custom.yml' })
      await runWatch.init()
      expect(runWatch.watchPaths).to.deep.equal([
        "./test/**/*.(js|py|ts|go|java|rb)",
        "./test/custom.yml"
      ])
    })

   it('takes a watch-glob option', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello', config: './test/custom.yml', 'watch-glob': './test/**/*.myFile' })
      await runWatch.init()
      expect(runWatch.watchPaths).to.deep.equal([
        "./test/**/*.myFile",
        "./test/custom.yml"
      ])
    })

    it('sets tail on logs plugin by default', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello' })
      await runWatch.init()
      expect(logsPlugin.options.tail).to.be.true
    })

    it('skips tail when disable-logs is set', async () => {
      const cliOptions = {
        function: 'hello',
        'disable-logs': true
      }

      const runWatch = new ServerlessRunWatch(slsStub, cliOptions)
      await runWatch.init()
      expect(logsPlugin.options.tail).to.be.undefined
    })

  })

  describe('serverlessFileChanged', () => {
    it('defaults to regex', () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello' })
      expect(runWatch.serverlessFileChanged('/some/path/serverless.yml')).to.be.true
    })

    it('honors config', () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello', config: 'myfile.yml' })
      expect(runWatch.serverlessFileChanged('myfile.yml')).to.be.true
    })

    it('doesn\'t trigger for swapfiles ', () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello' })
      expect(runWatch.serverlessFileChanged('serverless.yml.swp')).to.be.false
    })
  })

  describe('runServerless', () => {
    it('passes hello', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello' })
      await runWatch.init()
      runWatch.spawnServerless()

      sinon.assert.calledWith(execFileStub,'serverless', ['deploy', 'function', '--function', 'hello'], {stdio: 'inherit'})
    })

    it('honors config', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello', config: 'foo.yml' })
      await runWatch.init()
      runWatch.spawnServerless()

      sinon.assert.calledWith(execFileStub,'serverless', ['deploy', 'function', '--function', 'hello', '--config', 'foo.yml'], {stdio: 'inherit'})
    })

    it('passes stage and region', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello', stage: 'foobar', region: 'us-west-2' })
      await runWatch.init()
      runWatch.spawnServerless()

      sinon.assert.calledWith(execFileStub,'serverless', ['deploy', 'function', '--function', 'hello', '--stage', 'foobar', '--region', 'us-west-2'], {stdio: 'inherit'})
    })
  })

  describe('tailLogs', () => {
    it('tails logs...', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello' })
      await runWatch.init()
      runWatch.tailLogs()
      sinon.assert.calledWith(pluginManagerSpawn, 'logs')
    })
  })

  describe('processEvent', () => {
    it('calls spawn serverless if serverless changed', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello' })
      await runWatch.init()
      await runWatch.processEvent('./test/serverless.yml')
      sinon.assert.calledWith(execFileStub,'serverless', ['deploy', 'function', '--function', 'hello'], {stdio: 'inherit'})
    })

    it('calls serverless plugin manager\'s spawn if any other files changed', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello' })
      await runWatch.init()
      await runWatch.processEvent('./test/myFunction.js')
      sinon.assert.calledWith(pluginManagerSpawn, 'deploy:function')
    })

    it('optionally skips tailing logs', async () => {
      const runWatch = new ServerlessRunWatch(slsStub, { function: 'hello', 'disable-logs': true })
      const tailLogsSpy = sinon.spy(runWatch, 'tailLogs')
      const delayStub = sinon.stub(runWatch, 'delay').resolves()
      await runWatch.init()
      await runWatch.processEvent('./test/myFunction.js')
      sinon.assert.calledWith(pluginManagerSpawn, 'deploy:function')
    })
  })
})
