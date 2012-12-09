
var _ = require('underscore')
var deepEqual = require('assert').deepEqual

var modifierMap = function(diff) {
  return _.object(diff.map(function(each) {
    return [each[1], each[0]]
  }))
}

var matchPattern = function(key, patterns) {
  var next = function(newKey) {
    matchPattern(newKey, patterns)
  }
  var matchChar = function(char, pattern) {
    if ((pattern == '*') || (char === pattern)) return true
  }
  for(var i in patterns) {
    if(matchChar(key[0], patterns[i][0][0]) && matchChar(key[1], patterns[i][0][1])) {
      return patterns[i][1](next)
    }
  }
}

var mergePatterns = function(result1, result2, pos1, pos2, diff1Map, diff2Map) {
  var bothResults = {
    push: function() {
      result1.push.apply(result1, arguments)
      result2.push.apply(result2, arguments)
    }
  }
  var bothPos = {
    next: function() { pos1.next(); pos2.next() }
  }
  return [[
    '==', function() {
      bothResults.push(pos1.value)
      bothPos.next()
    }], [
    '++', function(next) {
      // two additions - apply both in lexicographic order
      if(pos1.value > pos2.value) {
        bothResults.push(pos1.value, pos2.value)
      } else {
        bothResults.push(pos2.value, pos1.value)
      }
      bothPos.next()
    }], [
    '+*', function() {
      bothResults.push(pos1.value)
      pos1.next()
    }], [
    '*+', function() {
      bothResults.push(pos2.value)
      pos2.next()
    }], [
    'pp', function(next) {
      // two pastes - apply both in lexicographic order
      if(pos1.value > pos2.value) { next('p*'); next('*p') } else { next('*p'); next('p*') }
    }], [
    'p*', function() {
      // paste - apply only to both if no conflicting paste
      if(diff2Map[pos1.value] == '=') {
        bothResults.push(pos1.value)
      } else {
        result1.push(pos1.value)
      }
      pos1.next()
    }], [
    '*p', function() {
      if(diff1Map[pos2.value] == '=') {
        bothResults.push(pos2.value)
      } else {
        result2.push(pos2.value)
      }
      pos2.next()
    }], [
    // cover cases x=, xx, -=, --
    '**', function() { bothPos.next() }]
  ]
}

function Position(diff) {
  this.diff = diff
  this.next()
}
Position.prototype.next = function() {
  var entry = this.diff.shift() || [0]
  this.pattern = entry[0]
  this.value = entry[1]
}

var merge = function(diff1, diff2) {
  var diff1Map = modifierMap(diff1)
  var diff2Map = modifierMap(diff2)
  var result1 = []
  var result2 = []
  var pos1 = new Position(diff1)
  var pos2 = new Position(diff2)
  var patterns = mergePatterns(result1, result2, pos1, pos2, diff1Map, diff2Map)
  while(pos1.pattern || pos2.pattern) {
    matchPattern(pos1.pattern+pos2.pattern, patterns)
  }
  if(_.isEqual(result1, result2)) {
    return {result: result1}
  } else {
    return {conflict: true, result: [result1, result2]}
  }
}

module.exports = merge
