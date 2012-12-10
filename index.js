
var _ = require('underscore')
var deepEqual = require('assert').deepEqual

var modifierMap = function(diff) {
  return _.object(diff.map(function(each) {
    return [each[1], each[0]]
  }))
}

function Parser(diff) {
  this.diff = diff
  this.result = []
  this.modifierMap = modifierMap(diff)
  this.next()
}
Parser.prototype.next = function() {
  var entry = this.diff.shift() || [0]
  this.token = {
    modifier: entry[0],
    value: entry[1]
  }
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
      .sort(function(a, b) { return a.token.modifier > b.token.modifier })
      .forEach(function(each) {
        allParsersResultPush(each.token.value)
        each.next()
      })

    parsers.filter(function(each) { return each.token.modifier == 'p' })
      .sort(function(a, b) { return a.token.modifier > b.token.modifier })
      .forEach(function(eachPasting) {
        parsers.forEach(function(eachOther) {
          if((eachOther.modifierMap[eachPasting.token.value] == '=') || (eachOther == eachPasting)) {
            eachOther.result.push(eachPasting.token.value)
          }
        })
        eachPasting.next()
      })

    if(_.some(parsers, function(each) { return _.contains(['x', '-'], each.token.modifier) })) {
      parsers.forEach(function(each) { each.next() })
    }
  }
}

var merge = function() {
  var parsers = _.map(arguments, function(each) { return new Parser(each) })
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
