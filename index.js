
var _ = require('underscore')
var deepEqual = require('assert').deepEqual

function Parser(diff) {
  this.diff = _.clone(diff)
  this.result = []
  this.next()
}
Parser.prototype.next = function() {
  var entry = this.diff.shift() || [0]
  this.token = {
    modifier: entry[0],
    value: entry[1]
  }
}

var pasteConflicts = function(parsers) {
  var pasteMap = {}
  var pos = 0;
  var applyRules = function() {
    parsers.filter(function(each) { return each.token.modifier == '+' })
      .forEach(function(each) { each.next() })
    parsers.filter(function(each) { return each.token.modifier == 'p' })
      .forEach(function(each) {
        var value = each.token.value
        if (pasteMap[value] === undefined) return pasteMap[value] = {value: value, pos: pos}
        if (pasteMap[value].pos !== pos) pasteMap[value].conflict = true
      })
    parsers.forEach(function(each) { each.next() })
    pos++
  }
  while(_.some(parsers, function(parser) { return parser.token.modifier })) {
    applyRules()
  }
  var conflicts = []
  _.each(pasteMap, function(each) {
    if (each.conflict) conflicts.push(each.value)
  })
  return conflicts
}

var markConflicts = function(diffs) {
  var conflicts = pasteConflicts(diffs.map(function(each) { return new Parser(each) }))
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

var mergePatterns = function(parsers) {
  var allParsersResultPush = function(value) {
    parsers.forEach(function(each) { each.result.push(value) })
  }
  return function() {
    if (_.every(parsers, function(each) { return each.token.modifier == '=' })) {
      allParsersResultPush(parsers[0].token.value)
      parsers.forEach(function(each) { each.next() })
    }

    parsers.filter(function(each) { return each.token.modifier == '+' })
      .sort(function(a, b) { return a.token.value > b.token.value })
      .forEach(function(each) {
        allParsersResultPush(each.token.value)
        each.next()
      })

    var pasting = parsers.filter(function(each) { return _.contains(['p', 'pc'], each.token.modifier) })
    _.chain(pasting).uniq(function(each) { return each.token.value })
      .sort(function(a, b) { return a.token.value > b.token.value })
      .each(function(eachPasting) {
        if(eachPasting.token.modifier == 'pc') {
          eachPasting.result.push(eachPasting.token.value)
        } else {
          parsers.forEach(function(eachOther) { eachOther.result.push(eachPasting.token.value) })
        }
      })
    pasting.forEach(function(each) { each.next() })

    if(_.some(parsers, function(each) { return each.token.modifier == 'xc' })) {
      parsers.forEach(function(each) {
        if (each.token.modifier == '=') each.result.push(each.token.value)
      })
    }
    
    if(_.some(parsers, function(each) { return _.contains(['x', 'xc', '-'], each.token.modifier) })) {
      parsers.forEach(function(each) { each.next() })
    }
  }
}

var merge = function(diffs) {
  var diffs = markConflicts(diffs)
  var parsers = _.map(diffs, function(each) { return new Parser(each) })
  var applyPatterns = mergePatterns(parsers)
  while(_.some(parsers, function(parser) { return parser.token.modifier })) {
    applyPatterns()
  }
  if (_.every(parsers, function(each) { return _.isEqual(each.result, parsers[0].result) })) {
    return {result: parsers[0].result}
  } else {
    return {conflict: true, result: parsers.map(function(each) { return each.result })}
  }
}

module.exports = merge
