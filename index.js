require("dotenv").config();
var Twitter = require("twitter");
var AsyncPolling = require("async-polling");
const Telegraf = require("telegraf");
var unescape = require("lodash.unescape");
let urlExpander = require("url-unshort")();

// Create bot and twitter objects
const bot = new Telegraf(process.env.BOT_TOKEN);
var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

async function twitterTextTokenizer(text) {
  let textParts = text.split(" ");
  let links = textParts.splice(-2);
  const articleLink = await urlExpander.expand(links[0]);

  console.log("testing: " + articleLink);
  return {
    tweet: textParts.join(" "),
    articleLink: articleLink,
    twitterLink: links[1]
  };
}

async function constructPost(text) {
  let tweetObject = await twitterTextTokenizer(text);
  return `*${tweetObject.tweet}* \n[Article](${
    tweetObject.articleLink
  }), [Comments](${tweetObject.twitterLink})`;
}

async function retrievePosts(ctx, params) {
  client.get("statuses/user_timeline", params, async function(
    error,
    tweets,
    response
  ) {
    if (!error && tweets[0] != undefined) {
      let tweet = tweets[0];
      const message = await constructPost(unescape(tweet.full_text));
      ctx.telegram.sendMessage(process.env.CHANNEL_ID, message, {
        parse_mode: "Markdown"
      });
      console.log(tweet);
      params.since_id = tweet.id_str;
    }
  });
}

bot.use(ctx => {
  // Twitter API parameters to fetch last unseen tweet
  var params = {
    screen_name: process.env.TWITTER_USER,
    since_id: undefined,
    tweet_mode: "extended"
  };

  // Poll every 10 seconds
  AsyncPolling(function(end) {
    retrievePosts(ctx, params);
    end();
  }, 10000).run();
});

bot.launch();
