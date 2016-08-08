const irc = require('irc');
const OrbitDB = require('orbit-db');
const Post = require('ipfs-post');
const Ipfs = require('ipfs-api');

const channel = process.argv[2] || 'testchannel'

const ircClient = new irc.Client('irc.freenode.net', 'MrsOrbit', {
  channels: ["#" + channel],
});

const ipfs = new Ipfs();
let orbitdb;
let db = {};

const sanitizeChannelName = (ircChannel) => {
  let arr = ircChannel.split("")
  arr.shift()
  return arr.join('');
}

// writing message from  irc into orbit db
const createMessage = (ipfs, message, from, to) => {
  const sanitizedChannel = sanitizeChannelName(to)

  const data = {
    content: message,
    from: from
  };

  // adds a message to the db
  Post.create(ipfs, Post.Types.Message, data)
    .then((post) => db[sanitizedChannel].add(post.Hash))
    .catch(e => console.log(e))
}

OrbitDB.connect('178.62.241.75:3333', 'MrsOrbit', '', ipfs)
  .then((res) => orbitdb = res);

ircClient.addListener('join',  (channelName, nick, message) => {
  console.log(nick + ' joined ' + channelName, message)

  if(nick === botName) {
    // notifications in orbit and irc that connection has happened:
    const orbitText = `/me has now connected this channel with IRC.`
    const ircText = `has now connected this channel with Orbit.`
    createMessage(ipfs, orbitText, nick, channelName)
    ircClient.action(channelName, ircText)

    // no more joining and sending, putting it all directly in the db. sets db instance per channel name/channel joined
    const sanitizedChannel = sanitizeChannelName(channelName)
    orbitdb.eventlog(sanitizedChannel)
      .then((database) => db[sanitizedChannel] = database)
      .catch(e => console.log(e))
  }
});

//  by writing directly to the db user can be other than MrsOrbit (which is set initially when connecting to OrbitDB), 'from' gets set dynamically now depending on irc username who sends message
ircClient.addListener('message', (from, to, message) => {
  console.log(from + ' => ' + to + ': ' + message);
  createMessage(ipfs, message, from, to);
});

ircClient.addListener('error', (message) => {
  console.log('error: ', message);
});

