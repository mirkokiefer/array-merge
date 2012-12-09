
var assert = require('assert')
var merge = require('./index')

describe('merging sets', function() {
  it('should merge without conflicts', function() {
    var origin = [1, 2, 3, 4, 5]
    var modified1 = [1, 6, 2, 3, 5, 4]
    var modified2 = [1, 2, 3, 4, 7, 5]
    var expected = [1, 6, 2, 3, 7, 5, 4]
    var merged = merge.sets(origin, modified1, modified2)
    assert.deepEqual(merged[0], expected)
    assert.deepEqual(merged[1], expected)

    var origin = [1, 2, 3, 4, 5]
    var modified1 = [1, 2, 6, 3, 4, 5]
    var modified2 = [1, 2, 3, 4, 7, 5]
    var expected = [1, 2, 6, 3, 4, 7, 5]
    var merged = merge.sets(origin, modified1, modified2)
    assert.deepEqual(merged[0], expected)
    assert.deepEqual(merged[1], expected)

    var origin = [1, 2]
    var modified1 = [2, 1, 3]
    var modified2 = [1, 2, 4]
    var expected = [2, 4, 1, 3]
    var merged = merge.sets(origin, modified1, modified2)
    assert.deepEqual(merged[0], expected)
    assert.deepEqual(merged[1], expected)

    var origin = [1, 2, 3, 4, 5, 6, 7]
    var modified1 = [1, 2, 7, 3, 4, 5, 6]
    var modified2 = [1, 6, 2, 3, 4, 5, 7]
    var expected = [1, 6, 2, 7, 3, 4, 5]
    var merged = merge.sets(origin, modified1, modified2)
    assert.deepEqual(merged[0], expected)
    assert.deepEqual(merged[1], expected)
  })
  it('should merge with conflicts', function() {
    var origin = [1, 2, 3, 4, 5]
    var modified1 = [2, 6, 1, 3, 5, 4]
    var modified2 = [2, 3, 1, 4, 7, 5]
    var expected1 = [2, 6, 1, 3, 7, 5, 4]
    var expected2 = [2, 6, 3, 1, 7, 5, 4]
    var merged = merge.sets(origin, modified1, modified2)
    assert.deepEqual(merged[0], expected1)
    assert.deepEqual(merged[1], expected2)

    var origin = [1, 2, 3, 4, 5]
    var modified1 = [2, 6, 1, 5, 4, 3]
    var modified2 = [2, 4, 1, 7, 3, 5]
    var expected1 = [2, 6, 1, 7, 5, 4, 3]
    var expected2 = [2, 6, 1, 7, 3, 5, 4]
    var merged = merge.sets(origin, modified1, modified2)
    assert.deepEqual(merged[0], expected1)
    assert.deepEqual(merged[1], expected2)
  })
  it('should merge with deletes', function() {
    var origin = [1, 2, 3, 4, 5]
    var modified1 = [1, 2, 5, 4]
    var modified2 = [2, 3, 1, 4, 5]
    var expected1 = [2, 1, 5, 4]
    var merged = merge.sets(origin, modified1, modified2)
    assert.deepEqual(merged[0], expected1)
    assert.deepEqual(merged[1], expected1)
  })
})
