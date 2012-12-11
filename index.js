
var _ = require('underscore')
var deepEqual = require('assert').deepEqual

function Stream(diff) {
  this.diff = _.clone(diff)
  this.result = []
  this.next()
}
Stream.prototype.next = function() {
  var entry = this.diff.shift() || [0]
  this.token = {
    type: entry[0],
    value: entry[1]
  }
}

function StreamCol(streams) {
  this.streams = streams
}
StreamCol.prototype.allResultsPush = function(value) {
  this.streams.forEach(function(each) { each.result.push(value) })
}
StreamCol.prototype.next = function() {
  this.streams.forEach(function(each) { each.next() })
}
StreamCol.prototype.filterByTokens = function(tokenTypes) {
  var filtered = this.streams
    .filter(function(each) { return _.contains(tokenTypes, each.token.type) })
  return new StreamCol(filtered)
}
StreamCol.prototype.someHaveTokens = function(tokenTypes) {
  return _.some(this.streams, function(each) { return _.contains(tokenTypes, each.token.type) })
}
StreamCol.prototype.allHaveToken = function(tokenType) {
  return _.every(this.streams, function(each) { return each.token.type == tokenType })
}

var pasteConflicts = function(streamCol) {
  var pasteMap = {}
  var pos = 0;
  var parse = function() {
    if (streamCol.allHaveToken('=')) {
      streamCol.next()
      return pos++
    }
    streamCol.filterByTokens(['+']).next()

    streamCol.filterByTokens(['p']).streams
      .forEach(function(each) {
        var value = each.token.value
        if (pasteMap[value] === undefined) {
          pasteMap[value] = {value: value, pos: pos}
        } else if (pasteMap[value].pos !== pos) {
          pasteMap[value].conflict = true
        }
        each.next()
      })
    
    if(streamCol.someHaveTokens(['x', '-'])) {
      streamCol.next()
    }
  }
  while(_.some(streamCol.streams, function(parser) { return parser.token.type })) {
    parse()
  }
  var conflicts = []
  _.each(pasteMap, function(each) {
    if (each.conflict) conflicts.push(each.value)
  })
  return conflicts
}

var markConflicts = function(diffs) {
  var streams = diffs.map(function(each) { return new Stream(each) })
  var conflicts = pasteConflicts(new StreamCol(streams))
  return diffs.map(function(diff) {
    return diff.map(function(entry) {
      if (_.contains(['x', 'p'], entry[0]) && _.contains(conflicts, entry[1])) {
        return [entry[0]+'c', entry[1]]
      } else {
        return entry
      }
    })
  })
}

var mergePatterns = function(streamCol) {
  var sortByValue = function(a, b) { return a.token.value > b.token.value }
  return function() {
    if (streamCol.allHaveToken('=')) {
      streamCol.allResultsPush(streamCol.streams[0].token.value)
      return streamCol.next()
    }

    streamCol.filterByTokens(['+']).streams
      .sort(sortByValue)
      .forEach(function(each) {
        streamCol.allResultsPush(each.token.value)
        each.next()
      })

    var pasting = streamCol.filterByTokens(['p', 'pc'])
    _.chain(pasting.streams).uniq(function(each) { return each.token.value })
      .sort(sortByValue)
      .each(function(eachPasting) {
        if(eachPasting.token.type == 'pc') {
          eachPasting.result.push(eachPasting.token.value)
        } else {
          streamCol.allResultsPush(eachPasting.token.value)
        }
      })
    pasting.next()

    if(streamCol.someHaveTokens(['xc'])) {
      streamCol.streams.forEach(function(each) {
        if (each.token.type == '=') each.result.push(each.token.value)
      })
    }
    
    if(streamCol.someHaveTokens(['x', 'xc', '-'])) {
      streamCol.next()
    }
  }
}

var merge = function(diffs) {
  var diffs = markConflicts(diffs)
  var streams = _.map(diffs, function(each) { return new Stream(each) })
  var parse = mergePatterns(new StreamCol(streams))
  while(_.some(streams, function(parser) { return parser.token.type })) {
    parse()
  }
  if (_.every(streams, function(each) { return _.isEqual(each.result, streams[0].result) })) {
    return {result: streams[0].result}
  } else {
    return {conflict: true, result: streams.map(function(each) { return each.result })}
  }
}

module.exports = merge
