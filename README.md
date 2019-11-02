## rn-debundle

A _very_ basic debundler for Javascript bundles compiled with React Native's bundler. 

Debundles a large React Native bundle by walking the compiled AST and extracts individual module declarations and 
writes them to their own modules & attempts to resolve dependeny import relationships.

### Install
```sh
npm install -g rn-debundle
```

### Usage

```sh
rn-debundle main.jsbundle ./my-output-dir
```

### Demo
 
**Input**
```js
__d(function() {
  "use strict";
}, 0, []);
__d(function(v) {
  "use strict";
}, 1, [0]);

var a = "foo bar baz";
```

**Output**

`main.js`
```js
var a = 'foo bar baz';
```

`mod_0.js`
```
'use strict';
```

`mod_1.js`
```
import v from './mod_0';
'use strict';
```



