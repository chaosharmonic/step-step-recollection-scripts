import { walkSync, ensureDirSync } from 'https://deno.land/std@v0.64.0/fs/mod.ts'
import { headerProps, getSectionProps, readSimfile, allArcadeReleases } from './utils.js'

const convertHeader = (inputFile) => {
  const inputHeader = inputFile.split('\n\n')[0]
  const inputProps = getSectionProps(inputHeader)
    .filter(prop => typeof (prop) !== 'string')
  const inputVals = inputProps
    .reduce((a, b) => ({ ...a, ...b }))

  const createHeader = (props) => props
    .map(propName => {
      const value = inputVals[propName] || ''
      const prop = propName.toUpperCase()
      return `#${prop}:${value};`
    })
    .join('\n')

  const minHeaderProps = Object.keys(inputVals)

  // minHeader will copy fields with values only
  // fullHeader will copy template.ssc and insert values
  const minHeader = createHeader(minHeaderProps)
  const fullHeader = createHeader(headerProps)

  const header = minHeader

  return header
}

const convertCharts = (inputFile) => {
  const fields = [
    '#STEPSTYPE',
    '#DIFFICULTY',
    '#METER',
    '#RADARVALUES'
  ]

  const rawChartData = inputFile
    .split('\n\n')
    .slice(1)

  const chartProps = rawChartData
    .filter(text => !text.includes('0000'))

  const chartValues = rawChartData
    .filter(text => text.includes('0000'))

  const hasChartProps = inputFile.includes('STEPSTYPE')

  const output = chartProps.map(prop => {
    const propValues = `${prop}\n`
      .replace(/(:|;)\n/g, 'SPLIT')
      .split('SPLIT')
      .filter(line => line && (!line.includes('NOTE')))

    const stepstype = hasChartProps
      ? propValues[0]
        .split(':')[1]
      : propValues[0]

    const data = propValues.map((value, index) => hasChartProps
      ? `${value};`
      : `${fields[index]}:${value};`)

    const divider =
                  `//---------------${stepstype}-----------------`

    return [divider, '#NOTEDATA:;', ...data, '#NOTES:']
      .join('\n')
      .replace('\n\n', '\n')
  })

  return output.map((props, index) => [props, chartValues[index]]
    .join('\n\n'))
}

const convertSMToSSC = (source) => {
  const sim = readSimfile(source)
    .replace(/\n\n/g, '\n')
    .replace(/#NOTEDATA:;/g, '')
    .replace(/#NOTES\n/g, '\n')
    .replace(/:\n0000/g, '\n0000')
    .split('\n')
    .filter(text => !text.startsWith('//'))
    .map(text => text.trim())
    .join('\n')

  const header = convertHeader(sim)
  const charts = convertCharts(sim)

  return [header, ...charts].join('\n\n')
    .split('\n')
    .map(line => line.includes('=')
      ? line.replace(/,/g, ',\n')
      : line)
    .join('\n')
}

const sanitizeSimfiles = (release) => {
  const directory = `./Input/Simfiles/${release}`

  const exts = ['.sm', '.ssc']
  for (const { name, path } of walkSync(directory, { exts })) {
    const parentDir = name.replace(/.(sm|ssc)/, '')
    const filename = name.replace('.sm', '.ssc')
    const outputFile = convertSMToSSC(path)
    const targetPath = `./Output/Simfiles/${release}/${parentDir}`
    ensureDirSync(targetPath)

    console.log(`writing to ${targetPath}/${filename}`)
    Deno.writeTextFile(`${targetPath}/${filename}`, outputFile)
  }
}

for (const { title } of allArcadeReleases) {
  console.log(`parsing release: ${title}...`)
  sanitizeSimfiles(title)
  console.log('success!')
}
