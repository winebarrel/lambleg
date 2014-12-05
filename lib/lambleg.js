var AWS = require('aws-sdk');
var JSZip = require('jszip');

function Lambleg(options) {
  this.options = options || {};
  this.lambda = new AWS.Lambda(options);
}

Lambleg.prototype.create = function(origFunctionName, handler, callback) {
  var functionName = origFunctionName.replace(/_/g, '-');
  var functionZip = this._zip_fuction(handler);

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

  this.lambda.uploadFunction(params, function(err, data) {
    if (callback) {
      callback(err, data);
    } else {
      if (err) {
        throw err;
      }
    }
  });

  this.define(origFunctionName);
};

Lambleg.prototype.define = function(origFunctionName) {
  var functionName = origFunctionName.replace(/_/g, '-');
  var self = this;

  this[origFunctionName] = function(invokeArgs, callback) {
    invokeArgs = invokeArgs || {};

    var params = {
      FunctionName: functionName,
      InvokeArgs: JSON.stringify(invokeArgs)
    }

    self.lambda.invokeAsync(params, function(err, data) {
      if (callback) {
        callback(err, data);
      } else {
        if (err) {
          throw err;
        }
      }
    });
  };
};

Lambleg.prototype.delete = function(origFunctionName, callback) {
  var functionName = origFunctionName.replace(/_/g, '-');

  var params = {
    FunctionName: functionName
  };

  this.lambda.deleteFunction(params, function(err, data) {
    if (callback) {
      callback(err, data);
    } else {
      if (err) {
        throw err;
      }
    }
  });
};

Lambleg.prototype._zip_fuction = function(handler) {
  var zip = new JSZip();
  zip.file('index.js', 'exports.handler = ' + handler.toString() + ';');
  data = zip.generate({base64:false, compression:'DEFLATE', type: 'nodebuffer'});
  return data;
};

module.exports = Lambleg;
