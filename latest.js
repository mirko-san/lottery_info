'use strict';
const request = require('request');
const cheerio = require('cheerio');

module.exports.get_latest = async (event, context) => {
  let message = await getHTML('https://kageki.hankyu.co.jp/revue/index.html');
  const date = await get_date_each_title(message);
  function getHTML(url) {
    return new Promise((resolve, reject) => {
      request(url, (e, response, body) => {
        const $ = cheerio.load(body);
        const latestDate = $('.item_content1').length;
        let res = [];
        $('.item_content1').each(function (i, elem) {
          let obj = {};
          url = $(this).find('a').attr('href').replace('index.html', '');
          obj.title = $(this).find('li').find('img').attr('alt');
          obj.url = 'https://kageki.hankyu.co.jp' + url + 'ticket_tokyo.html';
          res.push(obj);
        });
        return resolve(res);
      });
    });
  }

  async function get_date_each_title(obj) {

    for (let i = 0; i < obj.length; i++) {
      let date = await get_date(obj[i].url);
      obj[i].lottery = false;
      if (date.first) {
        obj[i].lottery = true;
        obj[i].first = date.first;
        obj[i].second = date.second;
      }
    }

    function parse_date(string, year) {
      const prese = string.replace(/（.*）/, ' ').match(/^([0-9]*?)月([0-9]*?)日\s(.+)$/);
      // TODO : zero padding
      return year + '-' + prese[1] + '-' + prese[2] + ' ' + prese[3];
    }
    function get_date(url) {
      const year = url.match(/^https:\/\/kageki.hankyu.co.jp\/revue\/([0-9]{4})\//)[1];
      const res = {};
      return new Promise((resolve, reject) => {
        request(url, (e, response, body) => {
          const $ = cheerio.load(body);
          $('h3').each(function (i, elem) {
            if ($(this).text() == '先行販売') {
              const text = $(this).parent().find('.txt').eq(0).text();
              const reg_first = /第1抽選方式：(.*)〜(.*)/;
              const reg_second = /第2抽選方式：(.*)〜(.*)/;
              const first = [parse_date(text.match(reg_first)[1], year), parse_date(text.match(reg_first)[2], year)];
              const second = [parse_date(text.match(reg_second)[1], year), parse_date(text.match(reg_second)[2], year)];
              res.first = first;
              res.second = second;
            }
          });
          return resolve(res);
        });
      });
    }
  }

  console.log(message);
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: message,
      input: event,
    }),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
