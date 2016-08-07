var irc = require('irc');
var channel = process.argv[2] || 'testchannel'
var ircClient = new irc.Client('irc.freenode.net', 'MrsOrbit', {
    channels: ["#" + channel],
});

const OrbitDB = require('orbit-db');
const Post = require('ipfs-post');
var Ipfs = require('ipfs-api');

var ipfs = new Ipfs();
var orbitdb;
var db = {};

var sanitizeChannelName = (ircChannel) => {
  var arr = ircChannel.split("")
  arr.shift()
  return arr.join('');
}

// writing message from  irc into orbit db
var createMessage = (ipfs, message, from, to) => {
  const data = {
      content: message,
      from: from
    };
  var sanitizedChannel = sanitizeChannelName(to)

  // adds a message to the db
  Post.create(ipfs, Post.Types.Message, data)
    .then((post) => db[sanitizedChannel].add(post.Hash))
    .catch(e => console.log(e))
}

OrbitDB.connect('178.62.241.75:3333', 'MrsOrbit', '', ipfs).then((res) => orbitdb = res);

ircClient.addListener('join', function (channelName, nick, message) {
  // notifications in orbit and irc that connection has happened:
  var ircText = `has now connected this channel with Orbit.`
  var orbitText = `/me has now connected this channel with IRC.`
  createMessage(ipfs, orbitText, nick, channelName)
  ircClient.action(channelName, ircText)

  // no more joining and sending, putting it all directly in the db. sets db instance per channel name/channel joined
  var sanitizedChannel = sanitizeChannelName(channelName)
  orbitdb.eventlog(sanitizedChannel)
    .then((database) => db[sanitizedChannel] = database)
    .catch(e => console.log(e))
});

//  by writing directly to the db user can be other than MrsOrbit (which is set initially when connecting to OrbitDB), 'from' gets set dynamically now depending on irc username who sends message
ircClient.addListener('message', function (from, to, message) {
    console.log(from + ' => ' + to + ': ' + message);

    createMessage(ipfs, message, from, to);
});

ircClient.addListener('error', function(message) {
    console.log('error: ', message);
});

