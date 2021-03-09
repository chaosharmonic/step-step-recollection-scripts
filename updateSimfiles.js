import { walkSync, ensureDirSync } from 'fs/mod.ts'
import { inputPath, outputPath, readSimfile } from './utils'

// TODO: write this output to a file, to enable saving conversion data between scales
//   (DDR to DDR X, etc.)
const generateChartDiff = (title, album, charts, newScale = null) => {
  const keys = Object.keys(charts)
  const newCharts = Object.values(charts).map((chart, index) => {
    if (!chart) return chart
    const [oldVal, newVal = chart[0]] = [chart[0], chart[1]]

    const [difficulty, style] = keys[index]
      .split('_')

    return { difficulty, style, oldVal, newVal }
  }).filter(e => e)
  return { title, album, charts: newCharts }
}

const updateChartLevels = ({ title, album, charts }) => {
  const inputCharts = charts
    .map(e => ({
      ...e,
      difficulty: e.difficulty
        .replace('difficult',
          'medium')
        .replace('expert',
          'hard')
    }))

  // loop over existing charts, making relevant updates
  const outputCharts = inputCharts.split('//')
    .slice(1)
    .map(rawChart => {
      //  get line with difficulty
      const props = rawChart.split(';')
        .filter(e => e.includes('#'))

      const oldDifficulty = props.find(prop => prop.includes('DIFFICULTY'))

      const next = inputCharts.find(({ style, difficulty }) =>
        rawChart.includes(style) &&
      oldDifficulty.toLowerCase().includes(difficulty))

      if (!next) return rawChart

      const { newVal } = next

      const oldMeter = props.find(prop => prop.includes('METER'))
      const newMeter = oldMeter
        .split(':')
        .map((e, i) => i === 1
          ? newVal
          : e)
        .join(':')

      return rawChart.replace(oldMeter, newMeter)
    })

  const header = inputCharts.split('//')[0]

  return [header, ...outputCharts].join('//')
}

const dataset = [
  // sample song format: {
  //   title: 'MAX 300',
  //   album: 'DDRMAX -Dance Dance Revolution 6thMIX-',
  //   charts: [
  //     [3, 5],
  //     [6, 9],
  //     [8, 12],
  //     [10, 15],
  //     null,
  //     [6, 9],
  //     [8, 12],
  //     [10, 15],
  //     null
  //   ]
  // }
].map(({ title, album, charts }) => {
  // data props for generateChartDiff -
  //   which will then map over charts array above,
  //   converting them to key-value pairs
  //   (and skipping over any falsy values)
  const dataProps = [
    'beginner_single',
    'easy_single',
    'difficult_single',
    'expert_single',
    'challenge_single',
    'easy_double',
    'difficult_double',
    'expert_double',
    'challenge_double'
  ]

  const data = charts
    .map((e, i) => {
      const prop = dataProps[i]
      return { [prop]: e }
    }).reduce((a, b) => ({ ...a, ...b }))

  return generateChartDiff(title, album, data)
})

const target = new Set([...dataset.map(e => e.album)])

for (const album of target) {
  const directory = `${inputPath}/Simfiles/${album}`
  for (const { name, path } of walkSync(directory, { exts: ['.ssc', '.sm'] })) {
    const targetPath = `${outputPath}/Simfiles/${album}`
    ensureDirSync(targetPath)

    console.log(`writing to ${path}`)
    const sim = readSimfile(path)

    const title = sim.split(';')
      .find(e => e.includes('TITLE'))
      .split(':')[1]

    const translit = sim.split(';')
      .find(e => e.includes('TITLETRANSLIT'))

    const newData = dataset.find(e => e.title === title)

    if (newData) {
      if (translit) newData.title = translit.split(':')[1]
      const outputFile = updateChartLevels(newData, sim)
      Deno.writeTextFile(path, outputFile)
    }
  }
}
