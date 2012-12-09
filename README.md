#array-merge
3-way merging of arrays using [array-diff](https://github.com/mirkok/array-diff) as a diffing tool.

You have to pass in an origin array and two modified versions of it.  

In the following example an optimal solution can be found as there are no edit conflicts:

``` js
var origin = [1, 2, 3, 4, 5]
var modified1 = [1, 6, 2, 3, 5, 4]
var modified2 = [1, 2, 3, 4, 7, 5]
var merged = merge.sets(origin, modified1, modified2)
// returns:
{result: [1, 6, 2, 3, 7, 5, 4]}
```

In this scenario we have order conflicts and the function returns two different solutions:

``` js
var origin = [1, 2, 3, 4, 5]
var modified1 = [2, 6, 1, 3, 5, 4]
var modified2 = [2, 3, 1, 4, 7, 5]
var merged = merge.sets(origin, modified1, modified2)
// returns:
{conflict:true, result:[[2, 6, 1, 3, 7, 5, 4], [2, 6, 3, 1, 7, 5, 4]]}
```