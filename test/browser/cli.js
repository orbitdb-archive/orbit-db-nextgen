import args from 'args'
import { runner } from './runner.js'
import writeFile from './write-file.js'

args.option('file', 'Path to the page which contains tests (required)')
  .option('args', 'Chrome arguments (\'--\' prefix will be added)')
  .option('timeout', 'Timeout in ms (defaults to 60000)', undefined, parseInt)  

const cfg = args.parse(process.argv, {
  name: 'orbitdb-cli',
  version: false,
  help: false
})

runner(cfg)
  .then(obj => {
    const getContent = (obj) => obj ? JSON.stringify(obj) : ''

    cfg.out && writeFile(cfg.out, getContent(obj.result))
    cfg.coverage && writeFile(cfg.coverage, getContent(obj.coverage))

    if (obj.result.stats.failures) {
      throw 'Tests failed'
    }
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
