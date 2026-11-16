import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = join(process.cwd(), 'src')

// Граница слова для кириллицы: \b в JS её не видит.
// «войдите» и «расскажите» не считаются: после основы стоит «те».
const patterns: Array<{ name: string; re: RegExp }> = [
  {
    name: 'тебя/тебе/тобой',
    re: /(?<![\p{L}\p{N}_])(?:тебя|тебе|тобой|тобою)(?![\p{L}\p{N}_])/giu,
  },
  {
    name: 'твой',
    re: /(?<![\p{L}\p{N}_])тво(?:й|я|ё|е|и|им|ей|ю|их|ими|его|ему|ем|ём|ею)(?![\p{L}\p{N}_])/giu,
  },
  {
    name: 'неформальный императив',
    re: /(?<![\p{L}\p{N}_])(?:войди|фильтруй|перетащи|расскажи|попробуй)(?!те)(?![\p{L}\p{N}_])/giu,
  },
  {
    name: 'местоимение ты',
    re: /(?<![\p{L}\p{N}_])ты(?![\p{L}\p{N}_])/giu,
  },
]

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path))
    else if (/\.(ts|tsx)$/.test(entry)) found.push(path)
  }
  return found
}

describe('обращение на вы', () => {
  it('не оставляет формы на ты в src', () => {
    const hits: string[] = []
    for (const file of sourceFiles(root)) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        for (const pattern of patterns) {
          pattern.re.lastIndex = 0
          if (pattern.re.test(line)) {
            hits.push(`${relative(process.cwd(), file)}:${index + 1} [${pattern.name}] ${line.trim()}`)
          }
        }
      })
    }
    expect(hits).toEqual([])
  })
})
