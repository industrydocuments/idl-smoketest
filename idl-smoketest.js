#!/usr/bin/env node

import puppeteer from 'puppeteer'

const IDL_URL = process.env.IDL_URL || 'http://localhost:4173/'
const HEADLESS = !process.env.IDL_SHOWBROWSER

async function beforeEach () {
  const browser = await puppeteer.launch({ headless: HEADLESS })
  const page = (await browser.newPage())
  await page.setViewport({ width: 1280, height: 800 })
  await page.goto(IDL_URL, { waitUntil: 'networkidle2' })
  await page.waitForSelector('body')
  return { browser, page }
}

async function afterEach (browser) {
  await browser.close()
}

const tests = [
  // Check home page
  async (page) => {
    await page.$eval('body', body => {
      if (!body.innerText.includes('Industry Documents Library')) {
        throw new Error('Text "Industry Documents Library" not found')
      }
    })
  },

  // Check 'Learn more' link
  async (page) => {
    await page.locator('::-p-text(Learn more)').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    await page.waitForSelector('h1')
    await page.$eval('h1', el => {
      if (!el.innerText.includes('Introducing the New IDL Website')) {
        throw new Error('Text "Introducing the New IDL Website" not found')
      }
    })
    await page.waitForSelector('span.label')
    await page.$eval('span.label', span => {
      if (!span.innerText.includes('Back to Home')) {
        throw new Error(`Text "Back to Home" not found in "${span.innerText}"`)
      }
    })
  },

  // Test 'share your feedback' link
  async (page) => {
    await page.locator('::-p-text(share your feedback)').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    await page.waitForSelector('h1')
    await page.$eval('h1', el => {
      if (!el.innerText.includes('Industry Documents Library Website beta:')) {
        throw new Error('Text "Industry Documents Library Website beta:" not found')
      }
      if (!el.innerText.includes('User feedback')) {
        throw new Error('Text "User feedback" not found')
      }
    })
  },

  async (page) => {
    const bannerChecks = [
      { clickSelector: '.header-ucsf nav a::-p-text(About UCSF)', expected: 'UCSF Overview' },
      { clickSelector: '.header-ucsf nav a::-p-text(Search UCSF)', expected: 'Search | UC San Francisco' },
      { clickSelector: '.header-ucsf nav a::-p-text(UCSF Health)', expected: 'UCSF Health' },
      { clickSelector: '.header-ucsf img', expected: 'Home | UC San Francisco' }
    ]

    for (const check of bannerChecks) {
      await page.goto(IDL_URL, { waitUntil: 'networkidle2' })
      await page.waitForSelector('.header-ucsf')
      await page.locator(check.clickSelector).click()
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
      await page.waitForSelector('title')
      await page.$eval('title', (el, expected) => {
        if (!el.innerText.includes(expected)) {
          throw new Error(`Text "${expected}" not found`)
        }
      }, check.expected)
    }
  }
]

try {
  for (const test of tests) {
    const { browser, page } = await beforeEach()
    await test(page)
    await afterEach(browser)
  }
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
