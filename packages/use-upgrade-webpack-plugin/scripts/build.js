const { rmSync } = require('fs')
const { execSync } = require('child_process')

rmSync('./lib', { recursive: true, force: true })
rmSync('./es', { recursive: true, force: true })

execSync(`tsc --module commonjs --outDir lib`)
execSync(`tsc --module esnext --outDir es`)
