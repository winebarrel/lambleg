var AWS = require('aws-sdk');
var JSZip = require('jszip');
var uuid = require('node-uuid');
var sleep = require('sleep-async')();

var QUEUE_URL_RE = /sqs\.([^.]+)\.amazonaws\.com/;

function Lambleg(options) {
  this.options = options || {};
  this.functions = {};

  this.lambdaClient = new AWS.Lambda(options);

  this.sqsOptions = this.options;
  var md = this.options.QueueUrl.match(QUEUE_URL_RE);

  if (md && md[1]) {
    this.sqsOptions = {};

    for(var k in this.options) {
      this.sqsOptions[k] = this.options[k];
    }

    this.sqsOptions.region = md[1];
  }

  this.sqsClient = new AWS.SQS(this.sqsOptions);
  this.timer = this._startReceiveMessage();
}

Lambleg.prototype.lambda = function(handler, callback) {
  var self = this;
  var functionName = uuid.v1();
  var functionZip = this._zipFuction(functionName, handler);

  var params = {
    FunctionName: functionName,
    FunctionZip: functionZip,
    Handler: 'index.handler',
    Mode: this.options.Mode || 'event',
    Role: this.options.Role,
    Runtime: this.options.Runtime || 'nodejs',
    Description: this.options.Description,
    MemorySize: this.options.MemorySize,
    Timeout: this.options.Timeout
  };

  this.functions[functionName] = 'creating';

  this.lambdaClient.uploadFunction(params, function(err, data) {
    if (callback) {
      callback(err, data);
    } else {
      if (err) { throw err; }
      self.functions[functionName] = 'idle'
    }
  });

  return this._createLocalFunction(functionName);
};

Lambleg.prototype.cleanup = function() {
  var self = this;

  sleep.sleepWithCondition(
    function() {
      for (var name in self.functions) {
        if (self.functions[name] != 'idle') {
          return false;
        }
      }

      return true;
    },
    60000,
    function() {
      Object.keys(self.functions).forEach(function(name) {
        clearInterval(self.timer);

        self.lambdaClient.deleteFunction({FunctionName: name}, function(err, data) {
          if (err) { throw err; }
          delete self.functions[name]
        });
      });
    }
  );
}

Lambleg.prototype._createLocalFunction = function(functionName) {
  var self = this;

  return function(invokeArgs, callback) {
    invokeArgs = invokeArgs || {};

    var params = {
      FunctionName: functionName,
      InvokeArgs: JSON.stringify(invokeArgs)
    }

    sleep.sleepWithCondition(
      function() {
        return self.functions[functionName] == 'idle'
      },
      60000,
      function() {
        self.functions[functionName] = callback;

        self.lambdaClient.invokeAsync(params, function(err, data) {
          if (err) { throw err };
        });
      }
    );
  };
};

Lambleg.prototype._zipFuction = function(functionName, handler) {
  handler = handler.toString().replace(/'/g, "\\'");

  var sqsOpts = this.sqsOptions;
  sqsOpts.accessKeyId = sqsOpts.accessKeyId || this.sqsClient.config.credentials.accessKeyId;
  sqsOpts.secretAccessKey = sqsOpts.secretAccessKey || this.sqsClient.config.credentials.secretAccessKey;
  sqsOpts.region = sqsOpts.region || this.sqsClient.config.region;
  sqsOpts = JSON.stringify(sqsOpts);

  var zip = new JSZip();

  zip.file('index.js',
    'var AWS = require("aws-sdk");\n' +
    'exports.handler = function(event, context) {\n' +
    '  var _callbacked = false;\n' +
    '  var _callback = function(retval) {\n' +
    '    if (_callbacked) { return; }\n' +
    '    _callbacked = true;\n' +
    '    var _sqsOptions = ' + sqsOpts + ';\n' +
    '    var _sqsClient = new AWS.SQS(_sqsOptions);\n' +
    '    var _sqsParams = {\n' +
    '      QueueUrl: "' + this.options.QueueUrl + '",\n' +
    '      MessageBody: JSON.stringify({FunctionName: "' + functionName + '", ReturnValue: retval})\n' +
    '    }\n' +
    '    _sqsClient.sendMessage(_sqsParams, function(err, data) {\n' +
    '      if (err) { throw err; }\n' +
    '      context.done();\n' +
    '    });\n' +
    '  };\n' +
    '  (' + handler + ')(event, _callback);\n' +
    '};\n'
  );

  return zip.generate({base64:false, compression:'DEFLATE', type: 'nodebuffer'});
};

Lambleg.prototype._startReceiveMessage = function() {
  var self = this;

  return setInterval(function() {
    self.sqsClient.receiveMessage({QueueUrl: self.options.QueueUrl}, function(err, data) {
      if (err) { throw err; }
      if (!data.Messages) { return; }

      var messages = data.Messages.splice(0, 200);

      while (messages.length > 0) {
        messages.forEach(function(message) {
          var json = JSON.parse(message.Body);
          self._callbackLocalFunction(json);
        })

        var entries = messages.map(function(message, index) {
          return {
            Id: index.toString(),
            ReceiptHandle: message.ReceiptHandle
          }
        });

        var params = {
          QueueUrl: self.options.QueueUrl,
          Entries: entries
        }

        self.sqsClient.deleteMessageBatch(params, function(err, data) {
          if (err) { throw err; }
        });

        messages = data.Messages.splice(0, 200);
      }
    });
  }, 1000);
}

Lambleg.prototype._callbackLocalFunction = function(json) {
  var functionName = json.FunctionName;
  var returnValue = json.ReturnValue
  var callback = this.functions[functionName]

  if (callback) {
    this.functions[functionName] = 'idle'
    callback(returnValue);
  }
};

module.exports = Lambleg;
