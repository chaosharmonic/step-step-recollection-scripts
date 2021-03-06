import { walk, ensureDir } from 'fs/mod.ts'
import { writeJson } from 'jsonfile/mod.ts'
import { outputPath, readSimfile, allArcadeAlbums } from './utils.js'

const scrapeSimfiles = async (release) => {
  const directory = `${outputPath}/Simfiles/${release}`
  const songs = []

  for await (const entry of walk(directory, { exts: ['.sm', '.ssc'] })) {
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
    .split('\n')
    .map(prop => {
      const [propKey, propValue] = prop
        .trim()
        .replace(';', '') // strip trailing semicolon from prop value
        .replace(':\\', ':') // strip leading escape character from prop value
        .replace('#', '') // strip leading hash sign from prop name
        .replace(' #', '!!!') // split at any trailing comments
        .replace(':', '!!!') // split between prop name and value
          // note: displaybpm also uses a colon rather than a hyphen,
          // so split at the first colon only
        .split('!!!')
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
  .replace(/medium/g, 'difficult')
  .replace(/hard/g, 'expert')
  .split('//')
  .slice(1)
  // defaults to 4-panel arcade charts. Remove the below line to edit this.
  .filter(e => e.includes('dance')
    && !e.includes('solo') // 6 panel single
    && !e.includes('couple') // 6 panel double
    && !e.includes('chartstyle')) // filter out chart edits
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

for (const { title } of allArcadeAlbums) {
  await ensureDir('./Output/JSON')
  console.log(`parsing release: ${title}...`)
  const data = await scrapeSimfiles(title)
  
  const sorted = data.sort((a, b) => {
    let [a_sort, b_sort] = [a, b]
      .map(e => (e.titletranslit || e.title).toLowerCase())

    return a_sort > b_sort ? 1 : -1
  })
  
  await writeJson(`./Output/JSON/${title}.json`, sorted)
  console.log('success!')
}
