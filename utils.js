import { config } from 'https://deno.land/x/dotenv/mod.ts'

export const expressURL = config().EXPRESS_URL

export const outputPath = './Output'
export const inputPath = './Input'
export const readSimfile = (target) => {
  const decoder = new TextDecoder('utf-8')
  const raw = Deno.readFileSync(target)
  return decoder.decode(raw)
}

export const template = readSimfile('./template.ssc').toLowerCase()
const [header, chart] = template.split('//')
const splitSectionProps = (section) => section
  .split('\n')
  .filter(line => line.includes('#'))
  .map(line => line
    .trim()
    .replace(';', '')
    .replace('#', '')
  )

export const getSectionProps = (section) => splitSectionProps(section)
  .map(line => {
    const prop = line
      .split(':')

    const key = prop[0].toLowerCase()
    if (!prop[1]) return key

    const value = prop.slice(1).join(':')
    return { [key]: value }
  })

export const [headerProps, chartProps] = [header, chart]
  .map(section => getSectionProps(section))

// Edit below this line to use with custom song packs

const constructRelease = (title, releaseDate, scale = 'DDR', numPanels = 4, releaseType = 'arcade') => (
  { title, releaseDate, scale, numPanels, releaseType }
)

const constructXScaleRelease = (title, releaseDate) => constructRelease(title, releaseDate, 'DDR X')

export const originalScaleReleases = [
  { title: 'Dance Dance Revolution', releaseDate: '1998-09-26' },
  { title: 'Dance Dance Revolution 2ndMIX', releaseDate: '1999-01-19' },
  { title: 'Dance Dance Revolution 2ndMIX LINK Version', releaseDate: '1999-04-28' },
  { title: 'Dance Dance Revolution 2ndMIX CLUB Version', releaseDate: '1999-04-21' },
  { title: 'Dance Dance Revolution 2ndMIX CLUB Version 2', releaseDate: '1999-07-27' },
  { title: 'Dance Dance Revolution 3rdMIX', releaseDate: '1999-10-30' },
  { title: 'Dance Dance Revolution 3rdMIX PLUS', releaseDate: '2000-06-21' },
  { title: 'Dance Dance Revolution 4thMIX', releaseDate: '2000-08-24' },
  { title: 'Dance Dance Revolution 4thMIX PLUS', releaseDate: '2000-12-28' },
  { title: 'Dance Dance Revolution 5thMIX', releaseDate: '2001-03-27' },
  { title: 'DDRMAX -Dance Dance Revolution 6thMIX-', releaseDate: '2001-10-19' },
  { title: 'DDRMAX2 -Dance Dance Revolution 7thMIX-', releaseDate: '2002-03-27' },
  { title: 'Dance Dance Revolution EXTREME', releaseDate: '2002-12-25' },
  { title: 'Dance Dance Revolution SuperNOVA', releaseDate: '2006-07-12' },
  { title: 'Dance Dance Revolution SuperNOVA2', releaseDate: '2007-08-22' }
].map(({ title, releaseDate }) => constructRelease(title, new Date(releaseDate)))

export const xScaleReleases = [
  { title: 'X', releaseDate: '2008-12-24' },
  { title: 'X2', releaseDate: '2010-07-07' },
  { title: 'X3 vs 2ndMIX', releaseDate: '2011-11-16' },
  { title: '2013', releaseDate: '2013-03-14' },
  { title: '2014', releaseDate: '2014-05-12' },
  { title: 'A', releaseDate: '2016-03-30' },
  { title: 'A20', releaseDate: '2019-03-20' }//,
  // { title: 'A20 Plus', releaseDate: '2020-07-01' }
]
  .map(({ title, releaseDate }) =>
    constructXScaleRelease(`DanceDanceRevolution ${title}`, new Date(releaseDate)))

export const allArcadeReleases = [...originalScaleReleases, ...xScaleReleases]
