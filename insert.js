'use strict';
const latest = require('./latest');
const calendar = require('./calendar');

module.exports.insert = async (event, context) => {
  const shesuled_url = [];
  const insertItem = [];
  const shesuled = JSON.parse(await calendar.get_list());
  const result = await latest.get_latest();

  // すでにカレンダーに入っている予定のurlを抽出
  if(shesuled.length){
    shesuled.forEach((item, index) => {
      shesuled_url.push(item.description);
    });
  }

  console.log('[info] shesuled_url');
  console.log(shesuled_url);

  // 予定にない情報があれば calendar.insert() する
  JSON.parse(result.body).message.forEach((item, index) => {
    if (item.lottery === true) {
      console.log('[info] item.lottery === true');
      console.log(item);
      const iShesuled = shesuled_url.some((value) => {
        return value === item.url;
      });
      if (!iShesuled) {
        console.log('[info] !iShesuled');
        console.log(item);
        insertItem.push(item);
        calendar.insert(item);
      } else {
        console.log('[info] item is all shesuled');
      }
    }
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: insertItem,
      input: event,
    }),
  };
};
