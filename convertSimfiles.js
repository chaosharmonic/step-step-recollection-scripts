import { walk, ensureDir } from 'fs/mod.ts'
import { headerProps, getSectionProps, readSimfile, allArcadeReleases } from './utils.js'

const formatHeader = (inputFile) => {
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

const formatCharts = (inputFile) => {
  const isSSC = inputFile.includes('STEPSTYPE') // get input file format
  const fields = [
    '#STEPSTYPE',
    '#CHARTSTYLE',
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
    .filter(text => !text.includes('0000') && (!isSSC || text !== '#NOTES:'))
    
    
  const chartValues = rawChartData
  .filter(text => text.includes('0000'))
  

  const outputProps = chartProps.map(chart => {
    // split block into individual lines, stripping out boilerplate
    const propValues = isSSC
      ? chart
        .split(';\n')
        .filter(line => line && line.startsWith('#') && !line.includes('NOTE'))
      : chart
        .split('\n')
        .filter(line => line && (!line.includes('NOTE')))
        .map(line => line.replace (/:$/, ''))

    const getSSCProp = (propName, targetArr = propValues) => {
      const result = targetArr.find(prop => prop.includes(propName))
      return result && result.split(':')[1].replace(';', '')
    }

    // if SSC-formatted, get value only
    //   else, get whole line
    const stepsType = isSSC
      ? getSSCProp('#STEPSTYPE')
      : propValues[0]

    const propData = propValues.map((value, index) => {
      if (!value) return null

      return isSSC
      ? `${value};`
      : `${fields[index]}:${value};`
    }).filter(prop => prop)

    const chartStyle = getSSCProp('CHARTSTYLE', propData)

    // const chartStyle = null
    const dividerText = chartStyle
      ? `${stepsType} - ${chartStyle}`
      : stepsType
    const divider =
      `//---------------${dividerText}-----------------`

    // wrap chart metadata w boilerplate lines and divider
    return [divider, '#NOTEDATA:;', ...propData, '#NOTES:']
      .join('\n')
  })

  // concat chart metadata and corresponding notes
  return outputProps.map((props, index) => [props, chartValues[index]]
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

  const header = formatHeader(sim)
  const charts = formatCharts(sim)

  return [header, ...charts].join('\n\n')
    .replace(/;;/g, ';') // cleanup punctuation
    .replace(/\n\n#/g, '\n#') //remove double space from each chart header
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
