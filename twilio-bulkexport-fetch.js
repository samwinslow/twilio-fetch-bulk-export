import twilioClient from 'twilio'
import 'dotenv/config'
import fetch from 'node-fetch'
import * as fs from 'fs'
import { exec } from 'child_process'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const client = twilioClient(accountSid, authToken)

const DAY_MS = 1000 * 60 * 60 * 24

const getBulkExport = async (date) =>
  client.bulkexports.exports('Messages').days(date).fetch()

const writeExportToFile = async (date, gzipURL) => {
  const result = await fetch(gzipURL)
  if (result) {
    const outputPath = `./output/${date}.json.gz`
    console.log(`Writing to ${outputPath}`)
    const output = fs.createWriteStream(outputPath)
    result.body.pipe(output)
  } else {
    throw new Error('Unexpected response', result)
  }
}

const getAllExports = async (startDate, endDate) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let current = start
  while (current <= end) {
    const date = current.toISOString().split('T')[0]
    console.log(`Fetching ${date}`)
    try {
      const bulkExport = await getBulkExport(date)
      if (bulkExport?.redirectTo) {
        await writeExportToFile(date, bulkExport.redirectTo)
      } else {
        console.warn(`HTTP response was OK, but no bulk export found for ${date}.`)
      }
    } catch (err) {
      console.error(`Failed to fetch ${date}`, err)
    } finally {
      current = new Date(current.getTime() + DAY_MS)
    }
  }
}

await getAllExports('2021-09-01', '2021-09-05')
console.log('Gunzipping files...')
exec('gunzip -fv ./output/*.gz', (err, stdout, stderr) => {
  if (err) {
    console.error(err)
  }
  if (stdout) {
    console.log(stdout)
  }
  if (stderr) {
    console.error(stderr)
  }
})
