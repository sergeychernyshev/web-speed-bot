var Twit = require('twit'),
  T = new Twit(require('./config.js'));

var wptKey = require('./wpt.config.js').k;

var WebPageTest = require('webpagetest'),
    wpt = new WebPageTest('www.webpagetest.org', wptKey);

T.get('account/verify_credentials', { skip_status: true })
.catch(function (err) {
  console.log('caught error', err.stack)
})
.then(function (result) {
  // `result` is an Object with keys "data" and "resp". 
  // `data` and `resp` are the same objects as the ones passed 
  // to the callback. 
  // See https://github.com/ttezel/twit#tgetpath-params-callback 
  // for details. 

  //console.log('data', result.data);
  return (result.data.screen_name);
}).then(function(botName) {
  var stream = T.stream('statuses/filter', {
    track: '@' + botName
  });

  console.log('The bot is now listening...');

  stream.on('tweet', function(message) {
    var screenName = message.user.screen_name;

    // Return when the account has replied to itself and prevent infinite loops
    if (screenName === botName) {
      return;
    }

    // This is the regex for detecting URL strings in the incoming tweet.  Probably imperfect and could be better, but works for now.
    var reURL = /(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?/gm;

    // This will print the detected URL to the console, if there is a detected URL
    console.log('URL: ', message.text.match(reURL)[0].split(' ')[0]);

    // This will set the detected URL
    var urlToTest = message.text.match(reURL)[0].split(' ')[0];

    // @Todo --> handle the case (and probably have fun with) where no URL is in the tweet
    if (!urlToTest) {
      return;
    }

    /*
      This is the actual sending of the detected URL to WebPageTest for performance testing.  Right now with simple default settings.
      It also tweets the result URL back to the original tweeter
    */
    wpt.runTest(urlToTest, function(err, data) {
      var thisStatus;
      if (err) {
        console.log(err);
        thisStatus = 'Hey @' + screenName + ', it looks like something went wrong with testing this URL.  WebPageTest threw me an error, sorry about that.';
      }
      else {
        thisStatus = 'No problem @' + screenName + '.  I submitted the test for ' + urlToTest + ' to www.webpagetest.org, check the result at ' + data.data.userUrl;
      }
      T.post('statuses/update', {
        status: thisStatus,
        in_reply_to_status_id: message.id_str
      }, function(err, data, response) {
        // console.log(data)
      })
    });
  })
})


