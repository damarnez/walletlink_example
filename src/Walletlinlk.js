import WalletLink from "walletlink";
import Web3 from "web3";
import _ from "underscore";

let WAIT_RESPONSE = false;
const SUBSCRIBED_EVENTS = [];
let RESPONSES = { eth_subscribe: [], eth_unsubscribe: [] };
const INFURA_KEY =
  process.env.REACT_APP_INFURA_KEY || "128cf34effcd46a18b345e71f62f732f";
if (!INFURA_KEY) {
  console.log("INFURA ", INFURA_KEY);
  throw new Error("INFURA KEY NEEDED");
}
export const walletLink = new WalletLink({
  appName: "My Awesome DApp",
  appLogoUrl: "https://static.herodev.es/favicons/favicon.ico`"
});

export const ethereum = walletLink.makeWeb3Provider(
  `https://kovan.infura.io/v3/${INFURA_KEY}`,
  42
);

/**** FIX BUG ******/

const responseCallbacks = {};
const notificationCallbacks = [];
const _customTimeout = 30000;
let lastChunk;
let lastChunkTimeout;
let subscriptions = {};
const ws = new WebSocket(`wss://kovan.infura.io/ws/v3/${INFURA_KEY}`);
ws.onopen = () => {
  console.log("OPEN");
};

const _timeout = function() {
  for (var key in responseCallbacks) {
    if (responseCallbacks.hasOwnProperty(key)) {
      responseCallbacks[key](new Error("Invalid Connection"));
      delete responseCallbacks[key];
    }
  }
};
const _parseResponse = function(data) {
  var returnValues = [];

  // DE-CHUNKER
  var dechunkedData = data
    .replace(/\}[\n\r]?\{/g, "}|--|{") // }{
    .replace(/\}\][\n\r]?\[\{/g, "}]|--|[{") // }][{
    .replace(/\}[\n\r]?\[\{/g, "}|--|[{") // }[{
    .replace(/\}\][\n\r]?\{/g, "}]|--|{") // }]{
    .split("|--|");

  dechunkedData.forEach(function(data) {
    // prepend the last chunk
    if (lastChunk) data = lastChunk + data;

    var result = null;

    try {
      result = JSON.parse(data);
    } catch (e) {
      lastChunk = data;

      // start timeout to cancel all requests
      clearTimeout(lastChunkTimeout);
      lastChunkTimeout = setTimeout(function() {
        _timeout();
        throw new Error("Invalid Response");
      }, 1000 * 15);

      return;
    }

    // cancel timeout and set chunk to null
    clearTimeout(lastChunkTimeout);
    lastChunk = null;

    if (result) returnValues.push(result);
  });

  return returnValues;
};

ws.onmessage = e => {
  console.log("> MESSAGE!!!!! ");
  var data = typeof e.data === "string" ? e.data : "";
  // console.log("EVENT DATA : ", e.data);
  _parseResponse(data).forEach(function(result) {
    console.log("PARSED DATA : ", result);
    var id = null;
    console.log("LLEGA ALGO?");
    // get the id which matches the returned id
    if (_.isArray(result)) {
      result.forEach(function(load) {
        if (responseCallbacks[load.id]) id = load.id;
      });
    } else {
      id = result.id;
    }
    console.log("> RESULT ID : ", id, responseCallbacks);
    // notification
    if (result.params) {
      // console.log("HOLA??? LLEGA AQUI? ", id, "RESPONSES ", result);

      const myId = subscriptions[result.params.subscription];
      console.log(
        "SUBS: ",
        subscriptions,
        "  SUBSPARAMS: ",
        result.params.subscription,
        " ID ",
        myId
      );
      const cx = responseCallbacks[myId];
      result.result = result.params.result;
      result.id = myId;
      delete result.method;
      delete result.params;
      console.log(" VALID JSON ? ", result);
      cx && cx(null, result);
      delete responseCallbacks[myId];
    } else if (result && result.result) {
      subscriptions[result.result] = id;
      const cx2 = responseCallbacks[id];
      cx2 && cx2(null, result);
    }
  });
};

ws.onclose = event => {
  if (event.wasClean) {
    console.log(
      `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
    );
  } else {
    // e.g. server process killed or network down
    // event.code is usually 1006 in this case
    console.log("[close] Connection died");
  }
};
ws.onerror = error => {
  console.log(`[error] ${error}`);
};

const _addResponseCallback = function(payload, callback) {
  var id = payload.id || payload[0].id;
  var method = payload.method || payload[0].method;

  responseCallbacks[id] = callback;
  responseCallbacks[id].method = method;

  // schedule triggering the error response if a custom timeout is set
  // if (_customTimeout) {
  //   setTimeout(function() {
  //     if (responseCallbacks[id]) {
  //       // responseCallbacks[id](new Error("Connection Timeout !!"));
  //       delete responseCallbacks[id];
  //     }
  //   }, _customTimeout);
  // }
};
const newBlockSubscription = (payload, callback) => {
  // var _this = this;

  // if (this.connection.readyState === this.connection.CONNECTING) {
  //   setTimeout(function() {
  //     _this.send(payload, callback);
  //   }, 10);
  //   return;
  // }

  // try reconnect, when connection is gone
  // if(!this.connection.writable)
  //     this.connection.connect({url: this.url});
  // if (this.connection.readyState !== this.connection.OPEN) {
  //   console.error("connection not open on send()");
  //   if (typeof this.connection.onerror === "function") {
  //     this.connection.onerror(new Error("connection not open"));
  //   } else {
  //     console.error("no error callback");
  //   }
  //   callback(new Error("connection not open"));
  //   return;
  // }
  const cb = (err, res) => {
    console.log(">> RESPONSE CALLBACK : ", err, res);
    callback(err, res);
  };
  ws.send(JSON.stringify(payload));
  _addResponseCallback(payload, cb);
};

ethereum.sendAsync = (request, callback) => {
  if (typeof callback !== "function") {
    throw new Error("callback is required");
  }

  if (Array.isArray(request)) {
    const arrayCb = callback;

    ethereum
      ._sendMultipleRequestsAsync(request)
      .then(responses => arrayCb(null, responses))
      .catch(err => arrayCb(err, null));

    return;
  }
  console.log("REQUEST : ", request);
  const cb = callback;
  if (
    request.method === "eth_subscribe" ||
    request.method === "eth_unsubscribe"
  ) {
    newBlockSubscription(request, callback);
    return;
  }
  ethereum
    ._sendRequestAsync(request)
    .then(response => cb(null, response))
    .catch(err => cb(err, null));
};

const oldFilters = ethereum._handleAsynchronousFilterMethods;
ethereum._handleAsynchronousFilterMethods = request => {
  // console.log(" FILTERS ASYNCRONOUS ", request);
  oldFilters(request);
};
export const web3Instance = new Web3(ethereum);
