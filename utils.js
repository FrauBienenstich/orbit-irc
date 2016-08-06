'use strict';

const fs = require('fs');
const du = require('du');

exports.getUserHome = () => {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

exports.getAppPath = () => {
  return process.type && process.env.ENV !== "dev" ? process.resourcesPath + "/app/" : process.cwd();
}

/* File utils */
exports.getFileSize = (filePath) => {
  return new Promise((resolve, reject) => {
    const result = fs.statSync(filePath);
    if(result.isDirectory())
      du(filePath, (err, res) => resolve(res));
    else
      resolve(result.size);
  });
};

exports.isDirectory = (filePath) => {
  if(!fs.existsSync(filePath))
    return false;
  const file = fs.statSync(filePath)
  return file.isDirectory();
};

const deleteDirectoryRecursive = (path) => {
  if(fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file, index) => {
      const curPath = path + '/' + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteDirectoryRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};
exports.deleteDirectoryRecursive = deleteDirectoryRecursive;

// TODO: move to its own file 'IpfsJsDaemon'
// TODO: create 'IpfsGoDaemon' for js-ipfs-api
exports.ipfsDaemon = (IPFS, repo, signalServerAddress) => {
  repo = repo || '/tmp/orbit';
  signalServerAddress = signalServerAddress || '0.0.0.0';
  console.log("Signalling server: " + signalServerAddress);
  console.log("IPFS Path: " + repo);
  const ipfs = new IPFS(repo);
  return new Promise((resolve, reject) => {
    ipfs.init({}, (err) => {
      if (err) {
        if (err.message === 'repo already exists') {
          console.log(repo, err.message)
          resolve();
        }
        reject(err);
      }
      resolve();
    })
  })
  .then(() => {
    return new Promise((resolve, reject) => {
      ipfs.goOnline(() => resolve(ipfs));
    });
  })
  .then((id) => {
    return new Promise((resolve, reject) => {
      ipfs.config.show((err, config) => {
        if (err) return reject(err);
        resolve(config);
      });
    });
  })
  .then(() => {
    return new Promise((resolve, reject) => {
      ipfs.id((err, id) => {
        if (err) return reject(err);
        resolve(id);
      });
    });
  })
  .then((id) => new Promise((resolve, reject) => {
    ipfs.config.show((err, config) => {
      if (err) return reject(err);
      const signallingServer = `/libp2p-webrtc-star/ip4/${signalServerAddress}/tcp/9090/ws`; // localhost
      config.Addresses.Swarm = [`${signallingServer}/ipfs/${id.ID}`];
      ipfs.config.replace(config, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }))
  .then(() => {
    return new Promise((resolve, reject) => {
      ipfs.goOffline(resolve);
    });
  })
  .then(() => {
    return new Promise((resolve, reject) => {
      ipfs.goOnline(() => resolve(ipfs));
    });
  })
  .then(() => {
    return new Promise((resolve, reject) => {
      ipfs.id((err, id) => {
        if (err) return reject(err);
        resolve(id);
      });
    });
  })
  .then((id) => {
    return new Promise((resolve, reject) => {
      ipfs.config.show((err, config) => {
        if (err) return reject(err);
        resolve(config);
      });
    });
  })
  .then(() => ipfs)
}
