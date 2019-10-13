'use strict';
const request = require('request');
const cheerio = require('cheerio');

module.exports.get_latest = async (event, context) => {
  const html = await get_html('https://kageki.hankyu.co.jp/revue/index.html');
  let message = perse_html(html);

  for (let i = 0; i < message.length; i++) {
    const html = await get_html(message[i].url);
    const content = await get_each_content(html, message[i].url);
    if (0 !== Object.keys(content).length) {
      message[i].first = content.first;
      message[i].second = content.second;
      message[i].lottery = true;
    } else {
      message[i].lottery = false;
    }
  }

  /**
   * 引数 url に渡されたURLのコンテンツを取得
   * @param {*} url コンテンツを取得するURL
   * @returns {*} promiseを返す
   */
  function get_html(url) {
    return new Promise(resolve => {
      request(url, (e, response, body) => {
        resolve(body);
      });
    });
  };

  /**
   * 公演ごとのページのHTMLから、抽選開始日と終了日を取得する
   * @param {*} html
   * @param {*} url その公演のURL
   * @returns {*} {first: [抽選開始日, 抽選終了日], second: [抽選開始日, 抽選終了日]}
   */
  async function get_each_content(html, url) {
    let year = url.match(/^https:\/\/kageki.hankyu.co.jp\/revue\/([0-9]{4})\//)[1];

    function parse_date(string, year) {
      const prese = string.replace(/（.*）/, ' ').match(/^([0-9]*?)月([0-9]*?)日\s(.+)$/);
      const date = new Date();
      let month = date.getMonth() + 1;

      if (prese[1] < month) {
        year -= 1;
      }

      function zeropadding(i) {
        var num = ('00' + i).slice(-2);
        return num;
      }
      return year + '-' + zeropadding(prese[1]) + '-' + zeropadding(prese[2]) + 'T' + prese[3] + ':00+09:00';
    }

    /**
     * 渡されたHTMLのなかに「第1(or 2)抽選方式：」という文字列があれば、
     * 正規表現で開始日と終了日を取得し、パースする
     * @param {*} html
     * @param {*} year
     * @returns {*} {first: [抽選開始日, 抽選終了日], second: [抽選開始日, 抽選終了日]}
     */
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

    return prese_each_html(html, year);
  };

  /**
   * 引数にわたされたhtmlをパースし、現在掲載されている公演情報を格納したオブジェクトを返す
   * @param {*} html
   * @returns {Array} 現在掲載されている公演情報を格納した配列 ex.[{title, url}]
   */
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
};
