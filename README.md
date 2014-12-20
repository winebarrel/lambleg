# lambleg

Node module for create/invoke JavaScript function as AWS Lambda function

# example

```js
var Lambleg = require('lambleg');

var lambleg = new Lambleg({
  region: 'us-east-1',
  Role: 'arn:aws:iam::123456789012:role/lambda_exec_role',
  QueueUrl: 'https://sqs.ap-northeast-1.amazonaws.com/123456789012/myqueue'
});

var lambda_func = lambleg.lambda(function(args, callback) {
  // Running on AWS Lambda
  console.log(args);
  callback({from_lambda:args});
});

lambda_func({key: "val"}, function(retval) {
  console.log(retval); // { from_lambda: { key: 'val' } }
  lambleg.cleanup();
});
```
