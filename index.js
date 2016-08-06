var irc = require('irc');
var channel = process.argv[2] || 'testchannel'
var ircClient = new irc.Client('irc.freenode.net', 'MrsOrbit', {
    channels: ["#" + channel],
});

var Orbit = require('./Orbit');
var Ipfs = require('ipfs-api');

var orbitClient = new Orbit(new Ipfs());

// talking to Orbit
orbitClient.connect('178.62.241.75:3333', 'MrsOrbit', '').then(function (result) {
  console.log("CONNECTED");
  orbitClient.join(channel);
  orbitClient.events.on('synced', function (channel, messages) {
    console.log("MESSAGES:", JSON.stringify(messages, null, 2));
    messages.forEach((message) => { 
      orbitClient.getPost(message.payload.value).then(function (post) {
        console.log(`content: ${post.content}` );
        ircClient.say('#' + channel, `Orbit <${post.meta.from}> ${post.content}`);
      });
      // returns something like {"Links":[],"Data":"{\"content\":\"hallo\",\"meta\":{\"type\":\"text\",\"size\":15,\"ts\":1470483208976,\"from\":\"name\"}}"}
    });
  })
});

// talking to IRC
ircClient.addListener('message', function (from, to, message) {
    var userName = from;
    console.log(from + ' => ' + to + ': ' + message);
    orbitClient.send(channel, `IRC <${from}> ${message}`);
});

ircClient.addListener('error', function(message) {
    console.log('error: ', message);
});

