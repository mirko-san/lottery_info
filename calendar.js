'use strict';
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const CONSTANT = require('./constant');
const CREDENTIALS = require('./credentials/credentials.json');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'credentials/token.json';

module.exports.get_list = async () => {
  const list = await authorize(CREDENTIALS, listEvents);

  return new Promise(resolve => {
    resolve(JSON.stringify(list));
  });

};

module.exports.insert = async (data) => {
  authorize(CREDENTIALS, insert, data);
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @param {Object} data
 */
async function authorize(credentials, callback, data) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const token = await getToken(TOKEN_PATH);
  oAuth2Client.setCredentials(JSON.parse(token));
  const result = await callback(oAuth2Client, data);

  function getToken(path) {
    const promise = new Promise(resolve => {
      fs.readFile(path, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        resolve(token);
      });
    });
    return promise;
  }

  return result;
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  const param = {
    calendarId: CONSTANT.calendarId,
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  };
  const result = await get_schesuled_list();

  function get_schesuled_list() {
    const promise = new Promise(resolve => {
      calendar.events.list(param, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        var events = {};
        if (res.data.items.length) {
          // console.log('Upcoming 10 events:');
          // events.map((event, i) => {
          //   const start = event.start.dateTime || event.start.date;
          //   console.log(`${event.description}`);
          // });
          var events = res.data.items;
        } else {
          console.log('No upcoming events found.');
        }
        resolve(events);
      });
    });
    return promise;
  }

  return result;
}

async function insert(auth, data) {
  console.log('[info] start function insert');
  console.log(data);
  const calendar = await google.calendar({ version: 'v3', auth });
  const event = [
    {
      location: '〒100-0006 東京都千代田区有楽町１丁目１−３ 東京宝塚ビル内',
      reminders: { useDefault: false },
      transparency: 'transparent',
      summary: data.title,
      description: data.url,
      start:
      {
        timeZone: 'Asia/Tokyo',
        dateTime: data.first[0]
      },
      end:
      {
        timeZone: 'Asia/Tokyo',
        dateTime: data.first[1]
      }
    },
    {
      location: '〒100-0006 東京都千代田区有楽町１丁目１−３ 東京宝塚ビル内',
      reminders: { useDefault: false },
      transparency: 'transparent',
      summary: data.title,
      description: data.url,
      start:
      {
        timeZone: 'Asia/Tokyo',
        dateTime: data.second[0]
      },
      end:
      {
        timeZone: 'Asia/Tokyo',
        dateTime: data.second[1]
      }
    }
  ];
  event.forEach(async element => {
    await calendar.events.insert({
      calendarId: CONSTANT.calendarId,
      resource: element
    });
  });
}
