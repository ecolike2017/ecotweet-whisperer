var Twitter = require('twitter');
var config = require('config');
var MongoClient = require('mongodb').MongoClient;

var dbPass = process.env.DB_PASSWORD || config.get('db.password');

var url = 'mongodb://'+config.get('db.username')+':'+dbPass+'@'+config.get('db.host')+':'+config.get('db.port')+'/'+config.get('db.name');

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY || config.get('twitter.consumer_key'),
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET || config.get('twitter.consumer_secret'),
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY || config.get('twitter.access_token_key'),
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET || config.get('twitter.access_token_secret'),
});

var HASHTAG = process.env.HASHTAG || config.get('hashtag');

console.log('Listening to your twitterz for "%s"', HASHTAG);
var stream = client.stream('statuses/filter', {track: HASHTAG});

stream.on('error', function(error) {
  throw error;
});

stream.on('data', function(event) {
  console.log('Received an event from the Twitter stream!');
  // console.log(event && event.text);
  // console.log('Full event data %j', event);

  // Use connect method to connect to the hosted MongoDB server
  MongoClient.connect(url, function(err, db) {
    console.log("Connected successfully to Mongo server");

    var collection = db.collection('ecotweets');

    collection.insert(event, function(err, result) {
      db.close();
      if (err) {
        console.log('Error inserting tweet into Mongo, tweet data: %j', event);
        return;
      }

      console.log('Inserted tweet into DB, result: %j', result);

      // Reply to tweet with link to their activity!
      if (result.insertedCount === 1) {
        setTimeout(function() {
          replyToTweet(result.insertedIds[0], event);
        }, getRandomInt(1000, 5000));
      }
    });

  });

});

function replyToTweet(activityId, tweetData) {
  console.log('Replying to tweet, activityId=%s, tweetId=%s', activityId, tweetData.id_str);
  var statusText = '@' + tweetData.user.screen_name + ' Great job being eco-friendy! EcoLike: ' + config.get('website_url') + '?activity=' + activityId;

  client.post('statuses/update', {
    status: statusText,
    in_reply_to_status_id: tweetData.id_str
  }, function(error, tweet, response) {
    if (error) {
      console.log('Error tweeting reply', error);
    }
    if (!error) {
      console.log('Success tweeting reply!', tweet);
    }
  });
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}
