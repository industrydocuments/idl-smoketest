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

  // Check banner links
  async (page) => {
    const bannerChecks = [
      { clickSelector: '.header-ucsf nav a::-p-text(About UCSF)', expected: /^https:\/\/www\.ucsf\.edu\/about$/ },
      { clickSelector: '.header-ucsf nav a::-p-text(Search UCSF)', expected: /^https:\/\/www\.ucsf\.edu\/search$/ },
      { clickSelector: '.header-ucsf nav a::-p-text(UCSF Health)', expected: /^https:\/\/www\.ucsfhealth\.org\/$/ },
      { clickSelector: '.header-ucsf img', expected: /^https:\/\/www\.ucsf\.edu\/$/ },
      { clickSelector: '.header-idl nav ::-p-text(Industry Documents Library)', expected: /^https?:\/\/[a-zA-Z0-9:.-]+\/(home\/)?$/ },
      { clickSelector: '.header-idl nav ::-p-text(Industries)', expected: /^https?:\/\/[a-zA-Z0-9:.-]+\/(home\/)?$/ }
    ]

    for (const check of bannerChecks) {
      await page.goto(IDL_URL, { waitUntil: 'networkidle2' })
      await page.waitForSelector('.header-ucsf')
      await page.locator(check.clickSelector).click()
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
      const currentUrl = await page.evaluate('window.location')
      if (check.expected.test(currentUrl.href.replace(/#.*$/, '')) === false) {
        throw new Error(`Expected URL to match "${check.expected}", but got "${currentUrl.href}"`)
      }
    }
  },

  // Check IDL banner links (that aren't links to the home page as those are checked in the previous test)
  async (page) => {
    const bannerChecks = [
      { clickSelector: '.header-idl nav ::-p-text(News)', expected: 'News', assertSelector: 'li.breadcrumb-item.active:nth-child(2)' },
      { clickSelector: '.header-idl nav ::-p-text(Resources)', expected: 'Resources', assertSelector: 'li.breadcrumb-item.active:nth-child(2)' },
      { clickSelector: '.header-idl nav ::-p-text(About IDL)', expected: 'About IDL', assertSelector: 'li.breadcrumb-item.active:nth-child(2)' },
      { clickSelector: '.header-idl nav ::-p-text(Help)', expected: 'Help', assertSelector: 'li.breadcrumb-item.active:nth-child(2)' }
    ]

    for (const check of bannerChecks) {
      await page.goto(IDL_URL, { waitUntil: 'networkidle2' })
      await page.waitForSelector('.header-idl')
      await page.locator(check.clickSelector).click()
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
      await page.waitForSelector(check.assertSelector)
      await page.$eval(check.assertSelector, (el, expected) => {
        if (!el.innerText.includes(expected)) {
          throw new Error(`Text "${expected}" not found in ${el.innerText}`)
        }
      }, check.expected)
    }
  },

  // Test MyLibrary menu links
  async (page) => {
    await page.goto(IDL_URL, { waitUntil: 'networkidle2' })
    await page.waitForSelector('.header-idl')

    const testMyLibrary = async (itemText, selector) => {
      await page.locator('.header-idl .my-library-dropdown ::-p-text(My Library)').click()
      await page.locator(`.my-library-dropdown .dropdown-menu ::-p-text(${itemText})`).click()
      await page.waitForSelector(selector)
      await page.$eval(selector, (el, expected) => {
        if (!el.innerText.toLowerCase().includes(expected.toLowerCase())) {
          throw new Error(`Text "${expected}" not found`)
        }
      }, itemText)
    }

    await testMyLibrary('My Documents', '#my-library-navbar .nav-link.active')
    await testMyLibrary('My Publications', '#my-library-navbar .nav-link.active')
    await testMyLibrary('My Searches', '#my-library-navbar .nav-link.active')
    await testMyLibrary('Search History', '#my-library-navbar .nav-link.active')
    await testMyLibrary('Settings', 'h1')
    await testMyLibrary('Log in', 'h6')
  },

  // Test checkboxes on News page
  async (page) => {
    await page.waitForSelector('.header-idl')
    await page.locator('::-p-text(News)').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    await page.waitForSelector('.post-wrapper') // Check that there are posts on the page
    await page.locator('label.form-check-label').click()
    await page.waitForSelector('.post-wrapper', { hidden: true }) // Wait for the posts to be hidden
    await page.locator('::-p-text(Fossil Fuel)').click()
    await page.waitForSelector('.post-wrapper') // Check that there are posts on the page again
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
