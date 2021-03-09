import { readJson } from 'jsonfile/mod.ts'
import { allArcadeAlbums, outputPath, expressURL } from './utils.js'

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

const seedAlbum = (body) => seedData('album', body)
const seedSong = (body) => seedData('song', body)

const seed = async (album) => {
  const albumResponse = await seedAlbum({ payload: album })

  if (!albumResponse._id) {
    console.log(albumResponse)
    return null
  }

  console.log(`Seeded album: ${albumResponse.title}`)

  // NOTE: this is the directory scrapeSimfiles saves to,
  //   hence the use of output rather than input here
  const songs = await readJson(`./${outputPath}/JSON/${album.title}.json`)

  const albumId = albumResponse._id

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
      return { ...song, title, titletranslit, album: albumId, length: 0, charts }
    })
  // TODO: get length from accompanying audio tracks

  for (const entry of data) {
    const body = {
      payload: { ...entry, album: albumId }
    }
    const songResponse = await seedSong(body)
    songResponse._id
      ? console.log(`Seeded song: ${songResponse.title}`)
      : console.log(`failed to seed ${body.title}: ${songResponse}`)
  }
}

for (const album of allArcadeAlbums) {
  await seed(album)
}
