import puppeteer from 'puppeteer'

(async () => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2' })

  // Ensure the page contains the text "Industry Documents Library".
  // await page.waitForSelector('body', { timeout: 1000 });
  await page.$eval('body', body => {
    if (!body.innerText.includes('Industry Documents Library')) {
      throw new Error('Text "Industry Documents Library" not found')
    }
  })

  // Exit the browser and terminate the process
  await browser.close()
  process.exit(0)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
