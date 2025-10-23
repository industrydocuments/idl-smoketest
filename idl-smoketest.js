#!/usr/bin/env node

import puppeteer from 'puppeteer'
import { test, describe } from 'node:test'

const IDL_URL = process.env.IDL_URL || 'http://localhost:4173/'
const HEADLESS = !process.env.IDL_SHOWBROWSER

async function setup () {
  const browser = await puppeteer.launch({ headless: HEADLESS })
  const page = (await browser.newPage())
  await page.setViewport({ width: 1280, height: 800 })
  await page.goto(IDL_URL, { waitUntil: 'networkidle2' })
  await page.waitForSelector('body')
  return { browser, page }
}

async function teardown (browser) {
  await browser.close()
}

const tests = [
  {
    description: 'Check home page',
    test: async (page) => {
      await page.$eval('body', body => {
        if (!body.innerText.includes('Industry Documents Library')) {
          throw new Error('Text "Industry Documents Library" not found')
        }
      })
    }
  },

  // Check 'Learn more' link
  {
    description: 'Check Learn more link',
    test: async (page) => {
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
    }
  },

  // Test 'share your feedback' link
  {
    description: 'Check share your feedback link',
    test: async (page) => {
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
    }
  },

  // Check header/footer nav links (that aren't links to the home page as those are checked in the previous test)
  {
    description: 'Check header/footer nav links',
    test: async (page) => {
      const bannerChecks = [
        { clickSelector: '.header-idl nav ::-p-text(News)', expected: 'Home\nNews' },
        { clickSelector: '.header-idl nav ::-p-text(Resources)', expected: 'Home\nResources' },
        { clickSelector: '.header-idl nav ::-p-text(About IDL)', expected: 'Home\nAbout IDL' },
        { clickSelector: '.header-idl nav ::-p-text(Help)', expected: 'Home\nHelp' },
        // TODO: Bug? OIDA-886? Should be Home\nAbout IDL\nPolicies\nPrivacy Policy
        { clickSelector: 'footer ::-p-text(Privacy Policy)', expected: 'Home\nIDL Privacy Policy' },
        { clickSelector: 'footer ::-p-text(Copyright & Fair Use)', expected: 'Home\nCopyright and Fair Use' },
        { clickSelector: 'footer ::-p-text(Tutorial Videos)', expected: 'Home\nHow to Videos' },
        { clickSelector: 'footer ::-p-text(Ask Us)', expected: 'Home\nAsk Us' },
        { clickSelector: 'footer ::-p-text(Donate)', expected: 'Home\nGiving' }
      ]

      for (const check of bannerChecks) {
        await page.goto(IDL_URL, { waitUntil: 'networkidle2' })
        await page.waitForSelector('.header-idl')
        await page.locator(check.clickSelector).click()
        await page.waitForNavigation({ waitUntil: 'networkidle2' })
        // Wait for new breadcrumbs to render.
        try {
          await page.waitForSelector(`li.breadcrumb-item:nth-child(${check.expected.split('\n').length})`)
        } catch (error) {
          throw new Error(`Waiting for breadcrumbs for ${check.clickSelector}: ${error.message}`)
        }
        await page.$eval('.breadcrumb', (el, expected) => {
          if (!el.innerText.includes(expected)) {
            throw new Error(`Text "${expected}" not found in ${el.innerText}`)
          }
        }, check.expected)
      }
    }
  },

  // Test MyLibrary menu links
  {
    description: 'Test MyLibrary menu links',
    test: async (page) => {
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
    }
  },

  // Test checkboxes on News page
  {
    description: 'Test checkboxes on News page',
    test: async (page) => {
      await page.waitForSelector('.header-idl')
      await page.locator('::-p-text(News)').click()
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
      await page.waitForSelector('.post-wrapper') // Check that there are posts on the page
      await page.locator('label.form-check-label').click()
      await page.waitForSelector('.post-wrapper', { hidden: true }) // Wait for the posts to be hidden
      await page.locator('::-p-text(Fossil Fuel)').click()
      await page.waitForSelector('.post-wrapper') // Check that there are posts on the page again
    }
  },

  // Test dropdown in "What are you looking for?" box
  {
    description: 'Test dropdown in "What are you looking for?" box',
    test: async (page) => {
      await page.waitForSelector('h2')
      await page.$eval('h2', (el) => {
        if (!el.innerText === 'What are you looking for?') {
          throw new Error(`Text "What are you looking for?" not found in ${el.innerText}`)
        }
      })
      await page.waitForSelector('.search-industry-dropdown .dropdown-button-label')
      await page.$eval('.search-industry-dropdown .dropdown-button-label', (el) => {
        if (el.innerText !== 'All Industries') {
          throw new Error(`Expected dropdown button text to be "All Industries", but got "${el.innerText}"`)
        }
      })
      // React creates two buttons and hides one based on  viewport size.
      // Just click them both.
      await page.$$eval('.search-industry-dropdown button', (buttons) => {
        buttons.forEach(button => { button.checkVisibility() && button.click() })
      })
      await page.waitForSelector('.search-industry-dropdown .dropdown-menu')
      await page.$eval('.search-industry-dropdown .dropdown-menu', (el) => {
        if (!el.innerText.includes('All IndustriesTobaccoOpioidsChemicalDrugFoodFossil Fuel')) {
          throw new Error(`Dropdown menu text "${el.innerText}" does not match expected text`)
        }
      })
      await page.$$eval('.search-industry-dropdown .dropdown-menu ::-p-text(Tobacco)', (buttons) => {
        buttons.forEach((button) => { button.checkVisibility() && button.click() })
      })
      await page.$eval('.search-industry-dropdown .dropdown-button-label', (el) => {
        if (el.innerText !== 'Tobacco') {
          throw new Error(`Expected dropdown button text to be "Tobacco", but got "${el.innerText}"`)
        }
      })
    }
  },

  // Test landing page search
  {
    description: 'Test landing page search',
    test: async (page) => {
      await page.waitForSelector('#search-input')
      await page.$$eval('#search-input', (inputs) => {
        inputs.forEach(input => { input.checkVisibility() && input.focus() })
      })
      await page.keyboard.type('Test search')
      await page.keyboard.press('Enter')
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
      await page.waitForSelector('.page-tools-top ::-p-text(Results)')
      await page.$$eval('.page-tools-top', (elements) => {
        const top = elements.filter(el => el.checkVisibility())
        if (top.length === 0) {
          throw new Error('Can not find visible .page-tools-top')
        }
        if (top.length > 1) {
          throw new Error(`Expected only one visible .page-tools-top, but found ${top.length}`)
        }
        if (!/\d{3}\s*Results/.test(top[0].innerText)) {
          throw new Error(`Expected text matching /\\d{3}\\s*Results/ in .page-tools-top, but got "${top[0].innerText}"`)
        }
      })
    }
  },

  {
    description: 'Test tabs in each industry page',
    test: async (page) => {
      const assertResultsVisible = async () => {
        await page.waitForSelector('.page-tools-top ::-p-text(Results)')
        await page.$$eval('.page-tools-top', (elements) => {
          const top = elements.filter(el => el.checkVisibility())
          if (top.length === 0) {
            throw new Error('Can not find visible .page-tools-top')
          }
          if (top.length > 1) {
            throw new Error(`Expected only one visible .page-tools-top, but found ${top.length}`)
          }
          if (!/\d{2}\s*Results/.test(top[0].innerText)) {
            throw new Error(`Expected text matching /\\d{2}\\s*Results/ in .page-tools-top, but got "${top[0].innerText}"`)
          }
        })
      }

      const industryTabs = [
        { name: 'Documents', check: assertResultsVisible },
        { name: 'About', selector: 'h1 ::-p-text(About)' },
        { name: 'Publications', check: assertResultsVisible },
        { name: 'Collections', selector: 'h1 ::-p-text(Collections)' },
        { name: 'More Resources', selector: 'h1 ::-p-text(More Resources)' }
      ]

      const industries = ['Tobacco', 'Opioids', 'Chemical', 'Drug', 'Food', 'Fossil Fuel']
      for (const industry of industries) {
        await page.waitForSelector('.industry-menu')
        await page.locator(`.industry-menu ::-p-text(${industry})`).click()
        await page.waitForSelector(`h2 ::-p-text(${industry} Industry)`)
        await page.waitForSelector('#industry-navbar')
        for (const tab of industryTabs) {
          const needsNav = !tab.selector
          await page.locator(`#industry-navbar ::-p-text(${tab.name})`).click()
          if (needsNav) {
            await page.waitForNavigation({ waitUntil: 'networkidle2' })
          }
          await page.waitForSelector(`#industry-navbar .nav-link.active ::-p-text(${tab.name})`)
          if (tab.check) {
            await tab.check()
          } else if (tab.selector) {
            await page.waitForSelector(tab.selector)
          }
          // Check the "Browse" link on the About page.
          if (tab.name === 'About') {
            await page.locator(`.link-container ::-p-text(Browse Popular ${industry} Documents)`).click()
            await page.waitForNavigation({ waitUntil: 'networkidle2' })
            await page.waitForSelector('#industry-navbar .nav-link.active ::-p-text(Documents)')
            assertResultsVisible()
          }
        }
        await page.goto(IDL_URL, { waitUntil: 'networkidle2' })
      }
    }
  },

  {
    description: 'Check external header/footer links',
    test: async (page) => {
      const bannerChecks = [
        { clickSelector: '.header-ucsf nav a::-p-text(About UCSF)', expected: /^https:\/\/www\.ucsf\.edu\/about$/ },
        { clickSelector: '.header-ucsf nav a::-p-text(Search UCSF)', expected: /^https:\/\/www\.ucsf\.edu\/search$/ },
        { clickSelector: '.header-ucsf nav a::-p-text(UCSF Health)', expected: /^https:\/\/www\.ucsfhealth\.org\/$/ },
        { clickSelector: '.header-ucsf img', expected: /^https:\/\/www\.ucsf\.edu\/$/ },
        { clickSelector: '.header-idl nav ::-p-text(Industry Documents Library)', expected: /^https?:\/\/[a-zA-Z0-9:.-]+\/(home\/)?$/ },
        { clickSelector: '.header-idl nav ::-p-text(Industries)', expected: /^https?:\/\/[a-zA-Z0-9:.-]+\/(home\/)?$/ },
        { clickSelector: 'footer .logo', expected: /^https?:\/\/www\.library\.ucsf\.edu\/$/ },
        { clickSelector: 'footer img[alt="Instagram"]', expected: /https.+www\.instagram\.com.+ucsf_industrydocs/ },
        { clickSelector: 'footer img[alt="Bluesky"]', expected: /^https:\/\/bsky\.app\/profile\/ucsf-industrydocs\.bsky\.social$/ },
        { clickSelector: 'footer img[alt="YouTube"]', expected: /^https:\/\/www\.youtube\.com\/@ucsfindustrydocumentslibrary\/videos$/ },
        { clickSelector: 'footer img[alt="LinkedIn"]', expected: /^https:\/\/www\.linkedin\.com\/company\/industry-documents-library$/ }
      ]

      for (const check of bannerChecks) {
        await page.goto(IDL_URL, { waitUntil: 'networkidle2' })
        await page.waitForSelector('.header-ucsf')
        await page.locator(check.clickSelector).click()
        await page.waitForNavigation()
        const currentUrl = await page.evaluate('window.location')
        if (check.expected.test(currentUrl.href.replace(/#.*$/, '')) === false) {
          throw new Error(`Expected URL to match "${check.expected}", but got "${currentUrl.href}"`)
        }
      }
    }
  },

  {
    description: 'Check Insys timeline',
    test: async (page) => {
      await page.waitForSelector('.industry-menu')
      await page.locator('.industry-menu ::-p-text(Opioids)').click()
      await page.waitForSelector('h2 ::-p-text(Opioids Industry)')
      await page.waitForSelector('#industry-navbar')
      await page.locator('#industry-navbar ::-p-text(Collections)').click()
      await page.waitForSelector('a ::-p-text(Insys Litigation Documents)')
      await page.locator('a ::-p-text(Insys Litigation Documents)').click()
      await page.waitForSelector('a ::-p-text(Timeline of Events)')
      await page.locator('a ::-p-text(Timeline of Events)').click()
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
      const pageUrl = await page.url()
      if (pageUrl !== 'https://idl2023-cms-113e99d.payloadcms.app/media/Insys-Timeline.pdf') {
        throw new Error(`Expected URL to be "https://idl2023-cms-113e99d.payloadcms.app/media/Insys-Timeline.pdf", but got "${pageUrl}"`)
      }
    }
  }
]

describe('IDL Smoke Tests', { concurrency: 4 }, async () => {
  for (const currentTest of tests) {
    const fn = currentTest
    test(currentTest.description, async () => {
      const { browser, page } = await setup()
      try {
        await fn.test(page)
      } finally {
        await teardown(browser)
      }
    })
  }
})
