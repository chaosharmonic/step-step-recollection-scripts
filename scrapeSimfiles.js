import { walkSync, writeJson, ensureDirSync } from 'https://deno.land/std@v0.64.0/fs/mod.ts'
import { outputPath, readSimfile, allArcadeReleases } from './utils'

const scrapeSimfiles = (release) => {
  const directory = `${outputPath}/Simfiles/${release}`
  const songs = []

  for (const entry of walkSync(directory, { exts: ['.sm', '.ssc'] })) {
    const sim = readSimfile(entry.path)

    let {
      title,
      subtitle,
      artist,
      titletranslit,
      subtitletranslit,
      artisttranslit,
      displaybpm,
      bpms,
      stops
    } = getSimfileData(sim)

    const parseTimeChanges = (times) => times
      .split(',')
      .map(mod => {
        const [timestamp, value] = mod.split('=')
          .map(e => e.includes(';')
            ? Number(e.split(';')[0])
            : Number(e))
        return { timestamp, value }
      })

    if (bpms) bpms = parseTimeChanges(bpms)
    if (stops) stops = parseTimeChanges(stops)

    displaybpm = displaybpm
      ? displaybpm
        .split('-')
        .map(e => Math.round(e))
        .join('-')
      : bpms[0].value

    const data = {
      title,
      subtitle,
      artist,
      titletranslit,
      subtitletranslit,
      artisttranslit,
      displaybpm,
      bpms,
      stops
    }
    data.charts = getChartData(sim)
    data.bpm = {
      display: displaybpm,
      values: bpms
    }
    songs.push(data)
  }

  return songs
}

const getSimfileData = (text) => text
  .split('//')[0]
  .replace(/#/g, '')
  .split('\n')
  .map(prop => {
    const [propKey, propValue] = prop
      .trim()
      .replace(/;/, '')
      .replace(':', '!!!')
      .split('!!!')
    // split only the first separator in line
    // (displaybpm also uses it in place of a hyphen)
      .filter((e, i, a) =>
        e && a.length > 1)
      .map((e, i, a) => a[i - 1] === 'DISPLAYBPM'
        ? e.replace(':', '-')
        : e)

    return propKey && propValue
      ? { [propKey.toLowerCase()]: propValue }
      : null
  })
  .filter(e => e)
  .reduce((a, b) => ({ ...a, ...b }))

const getChartData = (simfile) => simfile
  .replace(/;/g, '')
  // conversion between DDR and stepmania chart naming conventions
  .toLowerCase()
  .replace('medium', 'difficult')
  .replace('hard', 'expert')
  .split('//')
  .slice(1)
  // defaults to 4-panel charts. Remove the below line to edit this.
  .filter(e => e.includes('dance') && !e.includes('solo') && !e.includes('couple'))
  .map(chart => {
    const data = chart
      .split('\n')
      .filter(e => e.includes('stepstype') ||
      e.includes('difficulty') ||
      e.includes('meter'))
      .map(e => e
        .trim()
        .split(':')[1]
      )
      .filter(e => e)

    let [style, difficulty, level] = data

    level = Number(level)

    const numPanels = 4
    const numPads = style.includes('double') // || style.includes('couple')
      ? 2
      : 1

    return { numPads, numPanels, difficulty, level }
  })

for (const { title } of allArcadeReleases) {
  ensureDirSync(title)
  console.log(`parsing release: ${title}...`)
  writeJson(`./Output/JSON/${title}.json`, scrapeSimfiles(title))
  console.log('success!')
}
