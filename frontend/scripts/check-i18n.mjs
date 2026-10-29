import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
const load = (n) => JSON.parse(readFileSync(join(dir, `${n}.json`), 'utf8'))

function flat(o, p = '') {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`])
}

const en = new Set(flat(load('en')))
let bad = false
for (const l of ['hi', 'mr']) {
  const have = new Set(flat(load(l)))
  const missing = [...en].filter((k) => !have.has(k))
  if (missing.length) { bad = true; console.error(`${l} missing:`, missing) }
}
process.exit(bad ? 1 : 0)
