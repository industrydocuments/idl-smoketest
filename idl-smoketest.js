#!/usr/bin/env node

import puppeteer from 'puppeteer'

const IDL_URL = process.env.IDL_URL || 'http://localhost:4173/'
const HEADLESS = !process.env.IDL_SHOWBROWSER

async function beforeEach() {
  const browser = await puppeteer.launch({ headless: HEADLESS })
  const page = await browser.newPage()
  await page.goto(IDL_URL, { waitUntil: 'networkidle2' })
  await page.waitForSelector('body')
  return { browser, page }
}

async function afterEach(browser) {
  await browser.close()
}

const tests = [
  // Check home page
  async (browser, page) => {
    await page.$eval('body', body => {
      if (!body.innerText.includes('Industry Documents Library')) {
        throw new Error('Text "Industry Documents Library" not found')
      }
    })
    await browser.close()
  },
  // Check 'Learn more' link
  async (browser, page) => {
    await page.locator("::-p-text(Learn more)").click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    await page.waitForSelector('h1')
    await page.$eval('h1', el => {
      if (!el.innerText.includes('Introducing the New IDL Website')) {
        throw new Error('Text "Introducing the New IDL Website" not found')
      }
    })
  }
]

try {
  for (const test of tests) {
    const { browser, page } = await beforeEach()
    await test(browser, page)
    await afterEach(browser)
  }
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
