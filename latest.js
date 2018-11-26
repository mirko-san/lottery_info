'use strict';
const request = require('request');
const cheerio = require('cheerio');

module.exports.get_latest = async (event, context) => {
  const html = await get_html('https://kageki.hankyu.co.jp/revue/index.html');
  let message = perse_html(html);

  for (let i = 0; i < message.length; i++) {
    const html = await get_html(message[i].url);
    const content = await get_each_content(html);
    if (0 !== Object.keys(content).length) {
      message[i].first = content.first;
      message[i].second = content.first;
      message[i].lottery = true;
    } else {
      message[i].lottery = false;
    }
  }

  function get_html(url){
    const promise = new Promise(resolve => {
      request(url, (e, response, body) => {
        resolve(body);
      });
    });
    return promise;
  };

  function get_each_content(html) {
    // TODO:urlからの取得だと公演期間と抽選期間のズレが吸収できない
    // const year = url.match(/^https:\/\/kageki.hankyu.co.jp\/revue\/([0-9]{4})\//)[1];
    const year = '2018';

    function parse_date(string, year) {
      const prese = string.replace(/（.*）/, ' ').match(/^([0-9]*?)月([0-9]*?)日\s(.+)$/);
      function zeropadding(i) {
        var num = ('00' + i).slice(-2);
        return num;
      }
      return year + '-' + zeropadding(prese[1]) + '-' + zeropadding(prese[2]) + 'T' + prese[3] + ':00+09:00';
    }

    function prese_each_html(html, year) {
      const $ = cheerio.load(html);
      const res = {};
      $('h3').each(function (i, elem) {
        if ($(this).text() == '先行販売') {
          const text = $(this).parent().find('.txt').eq(0).text();
          const reg_first = /第1抽選方式：(.*)〜(.*)/;
          const reg_second = /第2抽選方式：(.*)〜(.*)/;
          res.first = [
            parse_date(text.match(reg_first)[1], year),
            parse_date(text.match(reg_first)[2], year)
          ];
          res.second = [
            parse_date(text.match(reg_second)[1], year),
            parse_date(text.match(reg_second)[2], year)
          ];
        }
      });
      return res;
    }

    return new Promise(resolve => {
      resolve(prese_each_html(html, year));
    });
  };

  function perse_html(html) {
    const $ = cheerio.load(html);
    let res = [];
    $('.item_content1').each(function (i, elem) {
      let obj = {};
      const url = $(this).find('a').attr('href').replace('index.html', '');
      obj.title = $(this).find('li').find('img').attr('alt');
      obj.url = 'https://kageki.hankyu.co.jp' + url + 'ticket_tokyo.html';
      res.push(obj);
    });
    return res;
  }

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
