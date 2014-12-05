# lambleg

Node module for create/invoke JavaScript function as AWS Lambda function

# example

```js
var Lambleg = require('lambleg');

var lambleg = new Lambleg({
  region: 'us-east-1',
  Role: 'arn:aws:iam::123456789012:role/lambda_exec_role'
});

var callback = function() {
  lambleg.myfunc({key: 'value'});
}

lambleg.create('myfunc', function(event, context) {
  console.log(event);
  context.done();
}, callback);
```

```
START RequestId: 4095d240-7c91-11e4-8c62-01d86d138b00
END RequestId: 4095d240-7c91-11e4-8c62-01d86d138b00
2014-12-05T15:12:58.596Z  4095d240-7c91-11e4-8c62-01d86d138b00  { key: 'value' }
REPORT RequestId: 4095d240-7c91-11e4-8c62-01d86d138b00  Duration: 62.26 ms  Billed Duration: 100 ms   Memory Size: 128 MB Max Memory Used: 9 MB
```

## define JS function only

```js
lambleg.define('myfunc');

lambleg.myfunc({key: 'value'});
```
