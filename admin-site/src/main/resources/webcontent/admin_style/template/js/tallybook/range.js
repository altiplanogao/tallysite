;
var tallybook = tallybook || {};

(function (host) {
  //[lo, hi)
  var Range = function (rangeDesc) {
    if (arguments.length == 2) {
      this.lo = arguments[0];
      this.hi = arguments[1];
    } else if (typeof rangeDesc == 'string') {
      var range = rangeDesc.split('-');
      this.lo = parseInt(range[0]);
      this.hi = parseInt(range[1]);
    } else if (typeof rangeDesc == 'object') {
      this.lo = rangeDesc.lo;
      this.hi = rangeDesc.hi;
    }
  };
  Range.prototype = {
    _orderedCall_ : function (ib, callback) {
      var ia = this;
      var a, b; (ia.lo < ib.lo) ? (a = ia, b = ib) : (a = ib, b = ia);
      return callback(a, b);
    },
    toString: function () {
      return this.lo + '-' + this.hi;
    },
    clone: function () {
      return new Range(this.lo, this.hi);
    },
    width: function () {
      return this.hi - this.lo;
    },
    compareIndex: function (index) {
      return (index < this.lo) ? -1 : ( index >= this.hi ? 1 : 0);
    },
    containsIndex: function (index) {
      return ((this.lo <= index) && (index < this.hi));
    },
    overlap: function (range) {
      return this._orderedCall_(range, function(a,b){
        return (b.lo < a.hi);
      });
    },
    // if there is overlap between this and @param range, return the merged range, or return null
    merge: function (range) {
      return this._orderedCall_(range, function(a,b){
        return (b.lo <= a.hi) ? (new Range(a.lo, Math.max(a.hi, b.hi))) : null;
      });
    },
    // if there is overlap between this and @param range, return null, or return the gap between them
    findGap: function (range) {
      return this._orderedCall_(range, function(a,b){
        return (b.lo > a.hi) ? (new Range(a.hi, b.lo)) : null;
      });
    },
    intersect: function (range) {
      return this._orderedCall_(range, function(a,b){
        return (b.lo < a.hi) ? (new Range(Math.max(a.lo, b.lo), Math.min(a.hi, b.hi))) : null;
      });
    },
    /**
     *
     * @param range
     * @param withempty
     * @returns {Array}
     */
    drop: function (range, withempty) {
      if (withempty == undefined) {
        withempty = false;
      }
      var result = [];
      if (range.hi <= this.lo) {
        if (withempty) {
          result.push(null);
        }
        result.push(this.clone());
      } else if (this.hi <= range.lo) {
        result.push(this.clone());
        if (withempty) {
          result.push(null);
        }
      } else if (range.lo <= this.lo) {
        if (range.hi < this.hi) {
          if (withempty) {
            result.push(null);
          }
          result.push(new Range(range.hi, this.hi));
        } else if (withempty) {
          result.push(null);
          result.push(null);
        }
      } else if (this.hi <= range.hi) {
        if (this.lo < range.lo) {
          result.push(new Range(this.lo, range.lo));
          if (withempty) {
            result.push(null);
          }
        } else if (withempty) {
          result.push(null);
          result.push(null);
        }
      } else if (this.lo < range.lo && range.hi < this.hi) {
        result.push(new Range(this.lo, range.lo));
        result.push(new Range(range.hi, this.hi));
      } else {
        null.null; //assert faill
      }
      return result;
    },
    subRange: function (pieceWidth, fromTail) {
      if (fromTail == undefined) {
        fromTail = false;
      }
      return fromTail ? (new Range(this.hi - pieceWidth, this.hi)) : (new Range(this.lo, this.lo + pieceWidth));
    }
  };
  Range.compare = function (a, b) {
    if(a.lo == b.lo)return a.hi - b.hi;
    return a.lo - b.lo
  };

  /**
   * A utility object for range array operations
   * @type {{addRange: Function, containsIndex: Function, merge: Function, intersect: Function, findMissingRanges: Function, makePageRanges: Function}}
   */
  var RangeArrayHelper = {
    addRange: function (ranges, range, merge) {
      ranges.push(range);
      ranges.sort(Range.compare);
      if(!!merge){this.merge(ranges);}
    },
    containsIndex: function (ranges, index) {
      return ranges.some(function (item, arrayIndex, array) {
        return item.containsIndex(index);
      });
    },
    sort: function (ranges) {
      ranges.sort(Range.compare);
    },
    merge: function (ranges) {
      var result = [];
      ranges.forEach(function (item, index, array) {
        if (result.length == 0) {
          result.push(item);
        } else {
          var last = result.pop();
          var merged = last.merge(item);
          merged ? result.push(merged) : (result.push(last), result.push(item));
        }
      });
      return result;
    },
    intersect: function (ranges, range) {
      var result = [];
      ranges.forEach(function (item, index, array) {
        var ri = item.intersect(range);
        if (ri) {
          result.push(ri);
        }
      });
      return result;
    },
    findMissingRangesWithin: function (ranges, from, to) {
      var mainRange = new Range(from, to);
      var intersects = this.intersect(ranges, mainRange);
      var result = [];
      var lastEnd = from;
      intersects.forEach(function (item, index, array) {
        if (item.lo > lastEnd) {
          result.push(new Range(lastEnd, item.lo));
        }
        lastEnd = item.hi;
      });
      if (lastEnd < to) {
        result.push(new Range(lastEnd, to));
      }
      return result;
    },
    makePageRanges: function (ranges, pageSize) {
      var result = [];
      if (ranges.length == 0) {
        return null;
      }
      var rangesCount = ranges.length;
      for (var i = 0; i < rangesCount; ++i) {
        var range = ranges[i];
        var t = range.slice(pageSize, (i == 0));
        result.concat(t);
      }
      return result;
    }
  };

  Range.rangeArrayHelper = RangeArrayHelper;

  host.Range = Range;

})(tallybook);