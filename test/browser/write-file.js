import fs from 'fs'
import path from 'path'
import { mkdirp } from 'mkdirp'

export default function (filePath, content) {
  const dir = path.dirname(filePath)

  if (!fs.existsSync(dir)) {
    mkdirp.sync(dir)
  }

  fs.writeFileSync(filePath, content)
};
