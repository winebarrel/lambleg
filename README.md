# lambleg

Node module for create/invoke JavaScript function as AWS Lambda function

# example

```js
var Lambleg = require('lambleg');

var lambleg = new Lambleg({
  region: 'us-east-1',
  Role: 'arn:aws:iam::822997939312:role/lambda_exec_role'
});

lambleg.create('test', function(event, context) {
  console.log(event);
  context.done();
});

lambleg.test({key:'value'});
```

```
START RequestId: f333d248-7c8d-11e4-9d14-b5ee9efba728
2014-12-05T14:50:12.756Z  f333d248-7c8d-11e4-9d14-b5ee9efba728  { key: 'value' }
END RequestId: f333d248-7c8d-11e4-9d14-b5ee9efba728
REPORT RequestId: f333d248-7c8d-11e4-9d14-b5ee9efba728  Duration: 101.57 ms Billed Duration: 200 ms   Memory Size: 128 MB Max Memory Used: 9 MB
```
