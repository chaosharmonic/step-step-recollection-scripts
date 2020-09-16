import { walk, ensureDir } from 'https://deno.land/std@v0.64.0/fs/mod.ts'
import { headerProps, getSectionProps, readSimfile, allArcadeReleases } from './utils.js'

const convertHeader = (inputFile) => {
  const inputHeader = inputFile.split('\n\n')[0] // get song metadata
  const inputProps = getSectionProps(inputHeader) // convert metadata to objects
    .filter(prop => typeof (prop) !== 'string') // remove blank properties
  const inputVals = inputProps
    .reduce((a, b) => ({ ...a, ...b }))

  // concat values to properties
  //   then, convert properties array to text block
  const generateHeader = (props) => props
    .map(propName => {
      const value = inputVals[propName] || ''
      const prop = propName.toUpperCase()
      return `#${prop}:${value};`
    })
    .join('\n')

  const minHeaderProps = Object.keys(inputVals)

  const useFullHeader = false

  // minHeader will copy fields with values only
  // fullHeader will copy template.ssc and insert values
  const minHeader = generateHeader(minHeaderProps)
  const fullHeader = generateHeader(headerProps)

  const header = useFullHeader
    ? fullHeader
    : minHeader

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
    .replace(/;\n#NOTE/g, ';\n\n#NOTE') // force double space between charts
    .replace(/:\n0000/g, ':\n\n0000') // force double space between props and steps
    .replace(/,\n\n/g, ',\n') // remove double space between measures
    .replace(/,\n;/g, ';') // remove trailing comma from chart
    .split('\n\n') // separate text blocks
    .slice(1) // filter out song metadata

  const chartProps = rawChartData
    .filter(text => !text.includes('0000'))

  const chartValues = rawChartData
    .filter(text => text.includes('0000'))

  const hasChartProps = inputFile.includes('STEPSTYPE') // get input file format

  const output = chartProps.map(prop => {
    // split block into individual lines, stripping out boilerplate
    const propValues = `${prop}\n`
      .replace(/(:|;)\n/g, 'SPLIT')
      .split('SPLIT')
      .filter(line => line && (!line.includes('NOTE')))

    // if SSC-fomratted, get value only
    //   else, get whole line
    const stepstype = hasChartProps
      ? propValues[0]
        .split(':')[1]
      : propValues[0]

    // if SSC-fomratted, return whole line
    //   else, concat value to relevant field
    const data = propValues.map((value, index) => hasChartProps
      ? `${value};`
      : `${fields[index]}:${value};`)

    const divider =
      `//---------------${stepstype}-----------------`

    // wrap chart metadata w boilerplate lines and divider
    return [divider, '#NOTEDATA:;', ...data, '#NOTES:']
      .join('\n')
      .replace('\n\n', '\n')
  })

  // concat chart metadata and corresponding notes
  return output.map((props, index) => [props, chartValues[index]]
    .join('\n\n'))
}

const convertSMToSSC = (source) => {
  const sim = readSimfile(source)
    .split('\n')
    .filter(text => !text.startsWith('//')) // remove comment lines
    .map(text => {
      if (text.includes('//')) {
        text = text.split('//')[0] // strip measure labels
          .concat('\n')
      }
      return text.trim()
    })
    .join('\n')

  const header = convertHeader(sim)
  const charts = convertCharts(sim)

  return [header, ...charts].join('\n\n')
    .split('\n')
    .map(line => line.includes('=')
      ? line.replace(/,/g, ',\n') // display one bpm change, stop, etc. per line
      : line)
    .join('\n')
}

const sanitizeSimfiles = async (release) => {
  const directory = `./Input/Simfiles/${release}`

  const exts = ['.sm', '.ssc']
  for await (const { name, path } of walk(directory, { exts })) {
    const parentDir = name.replace(/.(sm|ssc)$/, '')
    const filename = name.replace(/.sm$/, '.ssc')
    const outputFile = convertSMToSSC(path)
    const targetPath = `./Output/Simfiles/${release}/${parentDir}`
    await ensureDir(targetPath)

    console.log(`writing to ${targetPath}/${filename}`)
    await Deno.writeTextFile(`${targetPath}/${filename}`, outputFile)
  }
}

for (const { title } of allArcadeReleases) {
  console.log(`parsing release: ${title}...`)
  await sanitizeSimfiles(title)
}

console.log('success!')
