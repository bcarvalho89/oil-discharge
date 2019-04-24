'use strict';
const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

const LOCATIONS_URL = 'http://www.itatiba.sp.gov.br/Meio-Ambiente-e-Agricultura/pontoscoletaoleo.html';
const exportsDir = './src';

function writeFile(filename, data) {
  if (!fs.existsSync(exportsDir)){
    fs.mkdirSync(exportsDir);
  }

  fs.writeFile(
    `${exportsDir}/${filename}`,
    data,
    (err => {
      if (err) {
        console.log(`Error in write ${filename} file`, err);
        process.exit();
      } else {
        console.log(`${filename} exported!`);
      }
    })
  );
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 926 });
  await page.setRequestInterception(true);
  
  page.on('request', (req) => {
    if(req.resourceType() == 'pdf' || req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
      req.abort();
    } else {
      req.continue();
    }
  });
  
  await page.goto(LOCATIONS_URL, {
    waitUntil: 'networkidle2',
    timeout: 0
});
  await page.waitFor(1500);

  // Search for locations
  console.log('Searching for locations...');
  let locationsData = await page.evaluate(() => {
    let locations = [];

    document.querySelectorAll('table.contentpaneopen tbody tr:nth-child(2) p:not(:first-child):not(:nth-last-child(-n+3))').forEach(location => {
      
      try {
        const name = location.innerHTML.split('</strong>')[0].replace(/<[^>]*>|&nbsp;/g, '').replace(/\'/g, '"');
        const items = location.innerHTML.split('</strong>')[1].replace(/<[^>]*>|&nbsp;/g, '').replace(/\'/g, '"').trim().split('-');
        const address = items[1].trim().replace('nº ', '').replace('º', '').split(',');
        const neighborhood = items[2].includes('one') ? null : items[2].trim();
        let phone = location.innerHTML.replace(/<[^>]*>|&nbsp;/g, '').split('one')[1] || null;

        phone = /\d/.test(phone) ? phone.replace(/:|Tel./g, '').trim() : null;

        const locationObj = {
          name,
          address: {
            street: address[0],
            number: address[1].trim(),
            neighborhood
          },
          phone
        };
        
        locations.push(locationObj);
      } catch (error) {
        console.log(error);
      }
    });

    document.querySelectorAll('table.contentpaneopen tbody tr:nth-child(2) p:nth-last-child(-n+3):not(:nth-last-child(-n+2))').forEach(location => {
      try {
        location.innerHTML.split('<br>').forEach(item => {
          const items = item.replace(/<[^>]*>/g, '').split('-');
          
          if (items.length > 1) {
            const address = items[2].replace(',','').split('nº');

            const locationObj = {
              name: items[1].trim(),
              address: {
                street: address[0].trim(),
                number: address[1].trim(),
                neighborhood: null,
              },
              phone: null
            };

            locations.push(locationObj);
          }
        });
      } catch (error) {
        console.log(error);
      }
    });

    return locations;
  });
  
  axios.all(locationsData.map(location => {
    const address = encodeURI(`${location.address.street}, ${location.address.number} ${ location.address.neighborhood ? location.address.neighborhood : '' } - Itatiba/SP`);
    console.log('Searching coordinates for: ' + location.name);

    return axios.get('https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyCP3iIRdwkWKwegt2dU4nA4KdpiInTmSlE&address=' + address)
    .then(response => {
        location.fullAddress = response.data.results[0].formatted_address;
        location.location = response.data.results[0].geometry.location;
        return location;
    });      
  }))
    .then(locations => {
      writeFile('locations.json', JSON.stringify(locations, null, 2),);
      console.log('Crawling finished!');
    });

  browser.close();
})();