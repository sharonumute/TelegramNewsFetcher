require('dotenv').config();
const Twitter = require('twitter');
const Telegram = require('telegraf/telegram');
const AsyncPolling = require('async-polling');

// Create bot and twitter objects
const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const cnn = {
  screen_name: 'CNNBrk',
  display_name: 'CNN',
  tweet_mode: 'extended',
  since_id: undefined,
  trim_user: true,
};

const bbc = {
  screen_name: 'BBCBreaking',
  display_name: 'BBC',
  tweet_mode: 'extended',
  since_id: undefined,
  trim_user: true,
};

function cnnTextTokenizer(tweet) {
  const text = decodeURI(tweet.full_text);
  const { entities } = tweet;

  const textParts = text.split(' ');
  textParts.splice(-2); // Remove last two thing from tweet.
  const articleLink = entities.urls.pop();
  return {
    text: textParts.join(' '),
    articleLink: articleLink.expanded_url,
    twitterLink: `https://twitter.com/${tweet.screen_name}/${tweet.id_str}`,
  };
}

function bbcTextTokenizer(tweet) {
  const text = decodeURI(tweet.full_text);
  const { entities } = tweet;

  const textParts = text.split(' ');
  textParts.splice(-1); // Remove last thing from tweet.
  const articleLink = entities.urls.pop();

  return {
    text: textParts.join(' '),
    articleLink: articleLink.expanded_url,
    twitterLink: `https://twitter.com/${tweet.screen_name}/${tweet.id_str}`,
  };
}

async function constructTwitterPost(tweet, tokenizer) {
  const result = tokenizer(tweet);
  console.log(result);
  return `*${tweet.display_name}*\n${result.text} \n[Article](${result.articleLink}), [Comments](${
    result.twitterLink
  })`;
}

async function sendMessage(bot, message) {
  bot.sendMessage(process.env.CHANNEL_ID, message, {
    parse_mode: 'Markdown',
  });
}

async function retrieveCNNPosts(bot) {
  const options = Object.assign({}, cnn);
  if (!options.since_id) {
    options.count = 1;
  }

  let tweets = await client.get('statuses/user_timeline', options);
  if (tweets.length === 0) {
    return false;
  }

  tweets = tweets.reverse();
  tweets.forEach(async (tweet) => {
    console.log(tweet);
    cnn.since_id = tweet.id_str;

    if (tweet.retweeted_status) {
      tweet = tweet.retweeted_status;
    }

    tweet.screen_name = options.screen_name;
    tweet.display_name = options.display_name;

    const message = await constructTwitterPost(tweet, cnnTextTokenizer);
    console.log(message);
    sendMessage(bot, message);
  });
  return true;
}

async function retrieveBBCPosts(bot) {
  const options = Object.assign({}, bbc);
  if (!options.since_id) {
    options.count = 1;
  }

  let tweets = await client.get('statuses/user_timeline', options);
  if (tweets.length === 0) {
    return false;
  }

  tweets = tweets.reverse();
  tweets.forEach(async (tweet) => {
    console.log(tweet);
    bbc.since_id = tweet.id_str;

    if (tweet.retweeted_status) {
      tweet = tweet.retweeted_status;
    }

    tweet.screen_name = options.screen_name;
    tweet.display_name = options.display_name;

    const message = await constructTwitterPost(tweet, bbcTextTokenizer);

    sendMessage(bot, message);
  });
  return true;
}

async function start() {
  const bot = new Telegram(process.env.BOT_TOKEN);

  AsyncPolling(async (end) => {
    await retrieveCNNPosts(bot);
    await retrieveBBCPosts(bot);
    end();
  }, 10e3)
    .run();
}

start();
