import { existsSync } from 'fs';
import { join } from 'path';
// @ts-ignore
import puppeteer from 'puppeteer';
import http from 'http';

test('index', () => {
  expect(existsSync(join(__dirname, 'fixtures/normal/dist'))).toEqual(true);
  expect(
    existsSync(join(__dirname, 'fixtures/normal/dist/index.html')),
  ).toEqual(true);
  expect(existsSync(join(__dirname, 'fixtures/normal/dist/umi.js'))).toEqual(
    true,
  );
  expect(existsSync(join(__dirname, 'fixtures/normal/dist/umi.css'))).toEqual(
    true,
  );
});

let server: http.Server;

beforeAll(async () => {
  return new Promise((resolve) => {
    const handler = require('serve-handler');
    server = http.createServer((request, response) => {
      return handler(request, response, {
        public: join(__dirname, 'fixtures/normal/dist'),
      });
    });

    server.listen(3123, () => {
      console.log('Running at http://localhost:3123');
      resolve();
    });
  });
});

afterAll(() => {
  if (server) {
    server.close();
  }
});

test('e2e', async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:3123/`);
  const title = await page.evaluate(() => {
    return document.getElementsByTagName('h1')[0].innerHTML;
  });
  expect(title).toEqual('Page index');
  await browser.close();
});
