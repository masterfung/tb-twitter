var express = require('express');
var passport = require('./auth');
var router = express.Router();
var shortId = require('shortId');
var _ = require('lodash');

var fixtures = require('./fixtures');
var conn = require('./db');
var User = conn.model('User');
var Tweet = conn.model('Tweet');


function ensureAuthentication(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.sendStatus(403);
};

router.get('/api/tweets', function (req, res) {
  var userId = req.query.userId;

  if (!userId) {
    return res.sendStatus(400);
  }

  var tweets = [];
  for (var i = 0; i < fixtures.tweets.length; i++) {
    if (fixtures.tweets[i].userId === userId) {
      tweets.push(fixtures.tweets[i]);
    }
  }

  var tweetsSorted = tweets.sort(function(t1, t2) {
    if (t1.created > t2.created) {
      return -1;
    } else if (t1.created === t2. created) {
      return 0;
    } else {
      return 1;
    }
  });

  return res.send({
    tweets: tweetsSorted
  });
});

router.get('/api/tweets/:tweetId', function(req, res) {
  var tweetId = req.params.tweetId;
  // var tweet = _.find(fixtures.tweets, 'id', req.params.tweetId);

  Tweet.findById(tweetId, function(err, tweet) {
    if (!tweet) {
      return res.sendStatus(404);
    }
    console.log(tweet, tweet.toClient());
    return res.send({tweet: tweet.toClient()});
  })

});

router.delete('/api/tweets/:tweetId', ensureAuthentication, function(req, res) {

  var deleteTweets;

  var verify = _.pluck(_.where(fixtures.tweets, {'id': req.params.tweetId, 'userId': req.user.id}), 'userId');

  if (verify[0] === req.user.id) {
    deleteTweets = _.remove(fixtures.tweets, 'id', req.params.tweetId)
  }

  if (!deleteTweets) {
    return res.sendStatus(403);
  }

  return res.sendStatus(200);
});

router.get('/api/users/:userId', function (req, res) {
  var userId = req.params.userId;

  User.findOne({id: userId}, function(err, user) {
    if (!user) {
      return res.sendStatus(404);
    }

    return res.send({
      user: user
    });
  })
});

router.put('/api/users/:userId', ensureAuthentication, function(req, res) {
  var query = { id: req.params.userId }
    , update = { password: req.body.password };

  if (req.user.id !== req.params.userId) {
    return res.sendStatus(403);
  }

  User.findOneAndUpdate(query, update, function(err, user) {
    if (err) {
      return res.sendStatus(500)
    }
    res.sendStatus(200)
  })
});

router.post('/api/users', function(req, res) {
  var user = new User({
    id: req.body.user.id,
    name: req.body.user.name,
    email: req.body.user.email,
    password: req.body.user.password
  })

  user.save(function(err, savedUser) {
    if (err) {
      if (err.code === 11000) {
        return res.sendStatus(409);
      }
    }

    req.login(savedUser, function(err) {
      if (err) {
        return res.sendStatus(500);
      }
      return res.sendStatus(200);
    });
  })

});

router.post('/api/auth/logout', function(req, res) {
  req.session.destroy(function (err) {
    return res.sendStatus(200);
});
});

router.post('/api/tweets', ensureAuthentication, function(req, res) {
  var userId, text;

  if (req.body.tweet) {
    userId = req.user.id,
    text = req.body.tweet.text
  }

  var tweet = new Tweet({
    text: text,
    created: Math.floor(Date.now() / 1000),
    userId: userId
  });

  tweet.save(function(err, savedTweet) {
    if (err) {
      return res.sendStatus(500);
    }
    return res.send({tweet: savedTweet.toClient()});

  })

});

router.post('/api/auth/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return res.sendStatus(500);
    }
    if (!user) {
      return res.sendStatus(403);
    }
    req.login(user, function(err) {
      if (err) {
        return res.sendStatus(500);
      }
      return res.send({user: user})
    });
  })(req, res);
});

module.exports = router;
