
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

function StreamCollection(streams) {
  this.streams = streams
  this.listenersSome = []
  this.listenersAll = []
}
StreamCollection.prototype.allResultsPush = function(value) {
  this.streams.forEach(function(each) { each.result.push(value) })
}
StreamCollection.prototype.next = function() {
  this.streams.forEach(function(each) { each.next() })
}
StreamCollection.prototype.emit = function() {
  var obj = this
  var listenerAll = _.find(this.listenersAll, function(listener) {
    return _.every(obj.streams, function(each) { return each.token.type === listener.tokenType })
  })
  if(listenerAll) {
    listenerAll.handler(this)
  } else {
    this.listenersSome.forEach(function(listener) {
      var filtered = obj.filterByTokens(listener.tokenTypes)
      if(filtered.streams.length) listener.handler(filtered)
    })
  }
  if(_.some(this.streams, function(each) { return each.token.type !== 0 })) this.emit()
}
StreamCollection.prototype.filterByTokens = function(tokenTypes) {
  var filtered = this.streams
    .filter(function(each) { return _.contains(tokenTypes, each.token.type) })
  return new StreamCollection(filtered)
}
StreamCollection.prototype.someHaveTokens = function(tokenTypes) {
  return _.some(this.streams, function(each) { return _.contains(tokenTypes, each.token.type) })
}
StreamCollection.prototype.allHaveToken = function(tokenType) {
  return _.every(this.streams, function(each) { return each.token.type == tokenType })
}
StreamCollection.prototype.onSome = function(tokenTypes, handler) {
  this.listenersSome.push({tokenTypes: tokenTypes, handler: handler})
}
StreamCollection.prototype.onAll = function(tokenType, handler) {
  this.listenersAll.push({tokenType: tokenType, handler: handler})
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
  var streamCol = new StreamCollection(streams)
  var conflicts = pasteConflicts(streamCol)
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

var parseDiffs = function(streamCol) {
  var sortByValue = function(a, b) { return a.token.value > b.token.value }
  streamCol.onAll('=', function() {
    streamCol.allResultsPush(streamCol.streams[0].token.value)
    streamCol.next()
  })

  streamCol.onSome(['+'], function(adding) {
    adding.streams
      .sort(sortByValue)
      .forEach(function(each) {
        streamCol.allResultsPush(each.token.value)
        each.next()
      })
  }  )    

  streamCol.onSome(['p', 'pc'], function(pasting) {
    _.chain(pasting.streams)
      .uniq(function(each) { return each.token.value })
      .sort(sortByValue)
      .each(function(eachPasting) {
        if(eachPasting.token.type == 'pc') {
          eachPasting.result.push(eachPasting.token.value)
        } else {
          streamCol.allResultsPush(eachPasting.token.value)
        }
      })
    pasting.next()
  })

  streamCol.onSome(['xc'], function() {
    streamCol.streams.forEach(function(each) {
      if (each.token.type == '=') each.result.push(each.token.value)
    })
  })
  
  streamCol.onSome(['x', 'xc', '-'], function() {
    streamCol.next()
  })

  streamCol.emit()
}

var merge = function(diffs) {
  var diffs = markConflicts(diffs)
  var streams = _.map(diffs, function(each) { return new Stream(each) })
  parseDiffs(new StreamCollection(streams))
  if (_.every(streams, function(each) { return _.isEqual(each.result, streams[0].result) })) {
    return {result: streams[0].result}
  } else {
    return {conflict: true, result: streams.map(function(each) { return each.result })}
  }
}

module.exports = merge
