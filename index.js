require('dotenv').config();
const Twitter = require('twitter');
const Telegram = require('telegraf/telegram');
const urlExpander = require('url-unshort')();
const AsyncPolling = require('async-polling');

// Create bot and twitter objects
const client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

async function twitterTextTokenizer(text) {
    const textParts = text.split(" ");
    const links = textParts.splice(-2);
    let articleLink;

    try {
        articleLink = await urlExpander.expand(links[0]);
    } catch (e) {
        articleLink = links[0];
    }

    return {
        tweet: textParts.join(' '),
        articleLink: articleLink,
        twitterLink: links[1]
    };
}

async function constructPost(text) {
    const tweet = await twitterTextTokenizer(text);
    return `*${tweet.tweet}* \n[Article](${
        tweet.articleLink
        }), [Comments](${tweet.twitterLink})`;
}

async function retrievePosts(bot, params) {
    const tweets = await client.get('statuses/user_timeline', params);
    if (!tweets[0]) {
        return;
    }

    let tweet = tweets[0];
    const message = await constructPost(decodeURI(tweet.full_text));
    bot.sendMessage(process.env.CHANNEL_ID, message, {
        parse_mode: 'Markdown'
    });

    params.since_id = tweet.id_str;
    return true;
}

async function start() {
    const bot = new Telegram(process.env.BOT_TOKEN);
    const params = {
        screen_name: process.env.TWITTER_USER,
        since_id: undefined,
        tweet_mode: 'extended'
    };

    AsyncPolling(async (end) => {
        await retrievePosts(bot, params);
        end();
    }, 10e3).run();
}

start();
