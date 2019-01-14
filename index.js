require("dotenv").config();
var Twitter = require("twitter");
var AsyncPolling = require("async-polling");
const Telegraf = require("telegraf");

// Create bot and twitter objects
const bot = new Telegraf(process.env.BOT_TOKEN);
var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

// Format twitter's 'created_at' date
function formatTwitterDate(created_at) {
  return new Date(created_at);
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
        formatTwitterDate(tweet.created_at) +
          ": " +
          tweet.text.split(" ").splice(-1)[0]
      );
      console.log(tweets[0]);
      params.since_id = tweets[0].id_str;
    }
  });
}

bot.use(ctx => {
  // Twitter API parameters to fetch last unseen tweet
  var params = {
    screen_name: process.env.TWITTER_USER,
    since_id: undefined
  };

  // Poll every 10 seconds
  AsyncPolling(function(end) {
    retrievePosts(ctx, params);
    console.log(params);
    end();
  }, 10000).run();
});

bot.launch();
