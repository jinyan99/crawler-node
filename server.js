var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy');
// url 模块是 Node.js 标准库里面的
// http://nodejs.org/api/url.html
var url = require('url');


var cnodeUrl = 'https://cnodejs.org/';

var app = express();

app.get('/', function(req, res, next) {
  let id = 0;
  // 用superagent 去抓取 https://cnodejs.org/ 的内容
  superagent.get(req.query.curl||cnodeUrl)
    .end(function(err, sres) {
      // 常规错误处理
      if (err) return next(err);

      // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
      // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
      // 剩下就都是 jquery 的内容了
      // console.log(sres.text,'获取到的文本内容\n')
      var $ = cheerio.load(sres.text);
      var topicUrls = [];
      $('#topic_list .topic_title').each(function(idx, element) {
        var $element = $(element);
        // $element.attr('href') 本来的样子是 /topic/542acd7d5d28233425538b04
        // 我们用 url.resolve 来自动推断出完整 url，变成
        // https://cnodejs.org/topic/542acd7d5d28233425538b04 的形式
        // 具体请看 http://nodejs.org/api/url.html#url_url_resolve_from_to 的示例
        var href = url.resolve(cnodeUrl, $element.attr('href'))
        topicUrls.push(href);

        // 得到一个 eventproxy 的实例
        var ep = new eventproxy();

        // 命令 ep 重复监听 topicUrls.length 次（在这里也就是 40 次） `topic_html` 事件再行动
        // after()接收一个事件集，对相同事件进行处理，接收三个参数：---> “这段代码表示执行40次topic_html事件后执行侦听器。这个侦听器得到的数据为40次按事件触发次序排序的数组。”
        // 第一个参数：事件名
        // 第二个参数：接收这个事件几次
        // 第三个参数：接收这个事件传递过来的数据的数组
        ep.after('topic_html', topicUrls.length, function (topics) {
          // topics 是个数组，包含了 40 次 ep.emit('topic_html', pair) 中的那 40 个 pair
          id++;
          // 开始行动
          // 开始行动
          topics = topics.map(function (topicPair) {
            // 接下来都是 jquery 的用法了
            var topicUrl = topicPair[0];
            var topicHtml = topicPair[1];
            var $ = cheerio.load(topicHtml);
            return ({
              title: $('.topic_full_title').text().trim(),
              href: topicUrl,
              comment1: $('.reply_content').eq(0).text().trim(),
            });
          });

          console.log(topics,  `执行了${id}次`,topicUrls.length)
        })

        topicUrls.forEach(function(topicUrl) {
          superagent.get(topicUrl)
            .end(function(err, res={}) {
              console.log('fetch ' + topicUrl + 'successful');
              ep.emit('topic_html', [topicUrl, res.text]);
            })
        })
      })

      res.send(topicUrls.length ? topicUrls: sres.text)
    })
  
})

app.listen(3000, function(){
  console.log('应用启动了')
})