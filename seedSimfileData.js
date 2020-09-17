import { readJson } from 'https://deno.land/std@v0.64.0/fs/mod.ts'
import { allArcadeReleases, outputPath, expressURL } from './utils.js'

const baseURL = `${expressURL}/api`

export const seedData = async (route, body) => {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }

  const response = await fetch(`${baseURL}/${route}/add`, options)
  const data = response.json()

  return data
}

const seedRelease = (body) => seedData('release', body)
const seedSong = (body) => seedData('song', body)

const seed = async (release) => {
  const releaseResponse = await seedRelease({ payload: release })

  if (!releaseResponse._id) {
    console.log(releaseResponse)
    return null
  }

  console.log(`Seeded release: ${releaseResponse.title}`)

  // NOTE: this is the directory scrapeSimfiles saves to,
  //   hence the use of output rather than input here
  const songs = await readJson(`./${outputPath}/JSON/${release.title}.json`)

  const releaseId = releaseResponse._id

  const data = songs
    .map(song => {
      let { charts, title, subtitle, titletranslit, subtitletranslit } = song

      if (subtitle) title = `${title} ${subtitle}`
      if (subtitletranslit) titletranslit = `${titletranslit} ${subtitletranslit}`

      charts = charts.map(song => ({
        ...song,
        difficulty: song.difficulty
          .replace('medium', 'difficult')
          .replace('hard', 'expert')
      }))
      return { ...song, title, titletranslit, release: releaseId, length: 0, charts }
    })
  // TODO: get length from accompanying audio tracks

  for (const entry of data) {
    const body = {
      payload: { ...entry, release: releaseId }
    }
    const songResponse = await seedSong(body)
    songResponse._id
      ? console.log(`Seeded song: ${songResponse.title}`)
      : console.log(`failed to seed ${body.title}: ${songResponse}`)
  }
}

for (const release of allArcadeReleases) {
  await seed(release)
}
