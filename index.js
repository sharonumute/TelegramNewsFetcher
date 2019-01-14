require("dotenv").config();
var Twitter = require("twitter");
var AsyncPolling = require("async-polling");
const Telegraf = require("telegraf");
var unescape = require("lodash.unescape");

// Create bot and twitter objects
const bot = new Telegraf(process.env.BOT_TOKEN);
var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

function constructPost(text) {
  let commentsTextLink = `[Comments](${text.split(" ").splice(-1)[0]})`;
  let textWithoutTwitterLink = text.substring(0, text.lastIndexOf(" "));
  let articleTextLink = `[Article](${
    textWithoutTwitterLink.split(" ").splice(-1)[0]
  })`;
  let textWithoutTwitterOrArticleLink = textWithoutTwitterLink.substring(
    0,
    textWithoutTwitterLink.lastIndexOf(" ")
  );
  return (
    `*${textWithoutTwitterOrArticleLink}*` +
    "\n" +
    articleTextLink +
    ", " +
    commentsTextLink
  );
}

async function retrievePosts(ctx, params) {
  client.get("statuses/user_timeline", params, function(
    error,
    tweets,
    response
  ) {
    if (!error && tweets[0] != undefined) {
      let tweet = tweets[0];
      ctx.telegram.sendMessage(
        process.env.CHANNEL_ID,
        constructPost(unescape(tweet.full_text)),
        { parse_mode: "Markdown" }
      );
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
