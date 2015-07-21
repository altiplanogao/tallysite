;
(function ($, window, undefined) {
  'use strict';

  var ENTITY_GRID_SEL_CONTAINER_CLASS = "div.entity-grid-container";

  $.fn.initAsEntityGrid = function () {
    var ENTITY_GRID_CONTAINER = "div.entity-grid-container";
    var ENTITY_GRID_CONTAINER_CLASS = "entity-grid-container";
    var ENTITY_GRID_CONTAINER_INITIALIZED_FLAG = "initialized";
    var ENTITY_GRID_HEADER_TABLE = ".header > table";
    var ENTITY_GRID_BODY = ".body";
    var ENTITY_GRID_BODY_TABLE = ".body table";
    var ENTITY_GRID_FOOTER = ".footer";

    var LOAD_SPINNER = 'i.spinner-item';

    var fetchDebounce = 200;
    var lockDebounce = 200;

    var tableColumnResizing = {
      active: false,
      container: undefined,
      headerTableThead: undefined,
      bodyTableThead: undefined,
      columnIndex: 0,
      startX: undefined,
      startWidths: undefined,
      totalWidth: 0
    };

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
      toString: function () {
        return this.lo + '-' + this.hi;
      },
      clone: function () {
        return new Range(this.lo, this.hi);
      },
      compareIndex: function (index) {
        return (index < this.lo) ? -1 : ( index >= this.hi ? 1 : 0);
      },
      containsIndex: function (index) {
        return ((this.lo <= index) && (index < this.hi));
      },
      overlap: function (range) {
        var a, b;
        (this.lo < range.lo) ? (a = this, b = range) : (a = range, b = this);
        return (b.lo < a.hi);
      },
      merge: function (range) {
        var a, b;
        (this.lo < range.lo) ? (a = this, b = range) : (a = range, b = this);
        return (b.lo <= a.hi) ? (new Range(a.lo, Math.max(a.hi, b.hi))) : null;
      },
      findGap: function (range) {
        var a, b;
        (this.lo < range.lo) ? (a = this, b = range) : (a = range, b = this);
        return (b.lo > a.hi) ? (new Range(a.hi, b.lo)) : null;
      },
      width: function () {
        return this.hi - this.lo;
      },
      intersect: function (range) {
        var a, b;
        (this.lo < range.lo) ? (a = this, b = range) : (a = range, b = this);
        return (b.lo < a.hi) ? (new Range(Math.max(a.lo, b.lo), Math.min(a.hi, b.hi))) : null;
      },
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
      chipOffOnePiece: function (pieceWidth, fromTail) {
        if (fromTail == undefined) {
          fromTail = false;
        }
        return fromTail ? (new Range(this.hi - pieceWidth, this.hi)) : (new Range(this.lo, this.lo + pieceWidth));
      }
    };

    var Ranges = {
      addRange: function (ranges, range) {
        ranges.push(range);
        ranges.sort(function (a, b) {
          return a.lo - b.lo
        });
      },
      containsIndex: function (ranges, index) {
        return ranges.some(function (item, arrayIndex, array) {
          return item.containsIndex(index);
        });
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
      findMissingRanges: function (ranges, from, to, totalCount) {
        var mainRange = new Range(from, to);
        var result = [];
        var lastEnd = 0;
        var itemBehind = null;
        var finish = false;
        for (var i = 0; i < ranges.length; ++i) {
          var item = ranges[i];
          if (from < item.lo) {
            result.push(new Range(lastEnd, item.lo));
          }

          lastEnd = item.hi;
          if (to <= item.lo) {
            finish = true;
            break;
          }
        }
        if (!finish) {
          result.push(new Range(lastEnd, totalCount))
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
    }

    var EntityGrid = function (container) {
      this.$container = $(container);
      this.initialize();
      this.paging.triggerLoad(this.$container);
    };

    EntityGrid.prototype = {

      updateHeaderWidth: function () {
        var bodyTable = this.$container.find(ENTITY_GRID_BODY_TABLE);
        var headerTable = this.$container.find(ENTITY_GRID_HEADER_TABLE);
        var bodyTabelWidth = bodyTable.parent().width();
        headerTable.css('width', bodyTabelWidth);
        bodyTable.css('width', bodyTabelWidth);
        headerTable.closest(ENTITY_GRID_CONTAINER).find('th').css('width', '');

        var headerTableThs = headerTable.find('thead tr th');
        var bodyTableThs = bodyTable.find('thead tr th');
        for (var i = 0; i < headerTableThs.length; i++) {
          $(bodyTableThs[i]).outerWidth($(headerTableThs[i]).outerWidth());
        }
      },

      updateBodyHeight: function () {
        var containerHolder = this.$container.parent();
        var alignType = containerHolder.data("entity-grid-align-type");
        switch (alignType) {
          case "window":
          {
            var $window = $(window);
            var offset = containerHolder.data("entity-grid-align-offset");
            var bodyWrapper = this.$container.find(ENTITY_GRID_BODY);
            var wrapperMaxHeight = $window.innerHeight() - (bodyWrapper.offset().top) - offset;
            var actualHeight = Math.min(bodyWrapper.find("tbody").height(), wrapperMaxHeight);
            bodyWrapper.css('max-height', wrapperMaxHeight);
            bodyWrapper.find('.viewport').css('max-height', wrapperMaxHeight);
            bodyWrapper.css('height', actualHeight);
            bodyWrapper.find('.viewport').css('height', actualHeight);
            break;
          }
        }
      },

      resize: function () {
        this.updateBodyHeight();
        var bodyWrapper = this.$container.find(ENTITY_GRID_BODY);
        var $this = this;
        bodyWrapper.customScrollbar("resize", true);
        this.updateHeaderWidth();
        this.paging.updateTableFooter(bodyWrapper.find("tbody"));
      },

      initialize: function () {
        if (this.$container.hasClass(ENTITY_GRID_CONTAINER_CLASS)) {
          if (this.$container.hasClass(ENTITY_GRID_CONTAINER_INITIALIZED_FLAG)) {
            return;
          }
          this.updateBodyHeight();
          var bodyWrapper = this.$container.find(ENTITY_GRID_BODY);
          var $this = this;
          bodyWrapper.customScrollbar({
            //updateOnWindowResize: true,
            onCustomScroll: function (event, scrollData) {
              $this.paging.updateTableFooter($this.$container.find(ENTITY_GRID_BODY_TABLE + ' tbody'));
              $this.paging.triggerLoad($this.$container);
            }
          });
          this.updateHeaderWidth();

          this.paging = new Paging(this);
          this.paging.initialize();

          this.resizer = new ColumnResizer(this);
          this.resizer.initialize();

          this.$container.EntityGrid = this;
          this.$container.addClass(ENTITY_GRID_CONTAINER_INITIALIZED_FLAG);
        } else {
          throw "EntityGrid should contains class 'entity-grid-container'";
        }
      }
    };

    var Paging = function (entityGrid) {
      this.entityGrid = entityGrid;
      this.$container = entityGrid.$container;
      this.ENTITY_GRID_AJAX_LOCK = 0;
    };

    Paging.prototype = {
      // ********************** *
      // LOCK RELATED FUNCTIONS *
      // ********************** *

      acquireLock: function () {
        if (this.ENTITY_GRID_AJAX_LOCK == 0) {
          this.ENTITY_GRID_AJAX_LOCK = 1;
          return true;
        }
        return false;
      },

      releaseLock: function () {
        this.ENTITY_GRID_AJAX_LOCK = 0;
      },

      // ************************* *
      // entity data method *
      // ************************* *
      getBaseUrl: function ($tbody) {
        return $tbody.data('baseurl');
      },
      getLoadParameter: function ($tbody) {
        return $tbody.data('currentparameter');
      },
      getTotalRecords: function ($tbody) {
        return $tbody.data('totalrecords');
      },

      getLoadedRecordRanges: function ($tbody) {
        var rangeDescriptions = $tbody.data('recordranges').split(',');
        var ranges = [];

        rangeDescriptions.forEach(function (item, index, array) {
          Ranges.addRange(ranges, new Range(item));
        })

        return ranges;
      },
      addLoadedRecordRange: function ($tbody, range) {
        var ranges = this.getLoadedRecordRanges($tbody);
        Ranges.addRange(ranges, range);
        ranges = Ranges.merge(ranges);
        var rangesString = ranges.join(',');
        $tbody.attr('data-recordranges', rangesString);
        $tbody.data('recordranges', rangesString);
      },
      getPageSize: function ($tbody) {
        return $tbody.data('pagesize');
      },

      // ************************* *
      // UI method *
      // ************************* *
      getRowHeight: function ($tbody) {
        var $row = $tbody.find('tr:not(.blank-padding):not(.empty-mark):first');
        return $row.height();
      },

      getTopVisibleIndex: function ($tbody) {
        var $overview = $tbody.closest('div.overview');
        var offset = -$overview.position().top;
        var rowHeight = this.getRowHeight($tbody);
        if (rowHeight == null) {
          return 0;
        }
        return Math.floor(offset / rowHeight);
      },

      getBottomVisibleIndex: function ($tbody) {
        var rowHeight = this.getRowHeight($tbody);
        if (rowHeight == null) {
          return 0;
        }
        var $overview = $tbody.closest('div.overview');
        var $viewport = $overview.closest('div.viewport');
        var offset = 0 - $overview.position().top; //avoid -0
        var viewportHeight = $viewport.height()

        return Math.ceil((offset + viewportHeight) / rowHeight);
      },

      createPadding: function ($tbody, startRange, endRange) {
        var rowHeight = this.getRowHeight($tbody);
        var recordsCount = endRange - startRange;
        var $pad = $('<tr>', {
          'class': 'blank-padding',
          'css': {
            'height': recordsCount * rowHeight
          },
          'data-range': startRange + '-' + endRange
        });

        return $pad;
      },

      scrollToIndex: function ($tbody, index) {
        var offset = index * this.getRowHeight($tbody);
        //console.log('scrolling to ' + offset);

        var bodyWrapper = this.$container.find(ENTITY_GRID_BODY);
        bodyWrapper.customScrollbar("scrollToY", offset);
      },

      showLoadingSpinner: function ($tbody, spinnerOffset) {
        var $spinner = $tbody.closest(ENTITY_GRID_CONTAINER).find(LOAD_SPINNER);

        if (spinnerOffset) {
          $spinner.css('position', 'absolute').css('top', spinnerOffset + 'px');
        }

        $spinner.parent().css('display', 'block');
      },

      hideLoadingSpinner: function ($tbody) {
        var $spinner = $tbody.closest(ENTITY_GRID_CONTAINER).find(LOAD_SPINNER);
        $spinner.parent().css('display', 'none');
      },

      updateTableFooter: function ($tbody) {
        var topIndex = this.getTopVisibleIndex($tbody);
        var bottomIndex = this.getBottomVisibleIndex($tbody);
        var totalCount = this.getTotalRecords($tbody);
        var humanTopIndex = topIndex + 1;
        var rowHeight = this.getRowHeight($tbody);
        if (rowHeight == null) {
          humanTopIndex = 0;
        }
        if (topIndex > bottomIndex) {
          bottomIndex = topIndex;
        }

        var $footer = $tbody.closest(ENTITY_GRID_CONTAINER).find(ENTITY_GRID_FOOTER);
        $footer.find('.low-index').text(humanTopIndex);
        $footer.find('.high-index').text(bottomIndex);
        $footer.find('.total-records').text(totalCount);
      },

      loadRecords: function ($container) {
        while (!this.acquireLock()) {
          var _this = this;
          //console.log("Couldn't acquire lock. Will try again in " + lockDebounce + "ms");
          $.doTimeout('acquirelock', lockDebounce, function () {
            _this.loadRecords($container);
          });
          return false;
        }

        var $tbody = $container.find(ENTITY_GRID_BODY_TABLE + ' tbody');
        // If we can't see the list grid at all, don't load anything
        var totalRecords = this.getTotalRecords($tbody);
        if ((!$tbody.is(':visible')) || (totalRecords == 0)) {
          this.releaseLock();
          return false;
        }

        var topIndex = this.getTopVisibleIndex($tbody);
        var botIndex = this.getBottomVisibleIndex($tbody);
        var dataWindowRange = new Range(topIndex, botIndex);
        var loadedRanges = this.getLoadedRecordRanges($tbody);
        var pageSize = this.getPageSize($tbody);

        var topIndexLoaded = Ranges.containsIndex(loadedRanges, topIndex);
        var botIndexLoaded = Ranges.containsIndex(loadedRanges, botIndex);

        var missingRanges = Ranges.findMissingRangesWithin(loadedRanges, topIndex, botIndex);
        if (missingRanges.length > 0) {
          var baseUrl = this.getBaseUrl($tbody);
          baseUrl = window.location.origin + '/' + baseUrl;
          var firstMissingRange = missingRanges[0];
          firstMissingRange = firstMissingRange.chipOffOnePiece(pageSize, (firstMissingRange.lo == topIndex));
          var loadingWindowRange = dataWindowRange.intersect(firstMissingRange);
          var spinnerOffset = ((loadingWindowRange.lo + loadingWindowRange.hi) / 2 - topIndex) * this.getRowHeight($tbody);

          this.showLoadingSpinner($tbody, spinnerOffset);

          this.ajaxLoadMissing($tbody, baseUrl, firstMissingRange);
        }

        var startIndex = null;
        var maxIndex = null;
        this.releaseLock();
      },

      // ************************* *
      // AJAX *
      // ************************* *
      triggerLoad: function ($container) {
        if ($container == undefined) {
          $container = this.$container;
        }
        var $this = this;
        $.doTimeout('fetch', fetchDebounce, function () {
          $this.loadRecords($container);
        });
      },
      ajaxLoadMissing: function ($tbody, baseUrl, range) {
        var url = tallybook.history.getUrlWithParameter('startIndex', range.lo, null, baseUrl);
        url = tallybook.history.getUrlWithParameter('pageSize', range.width(), null, url);
        var $paging = this;
        $.ajax({
          url: url, success: function (data) {
            var $data = $(data);
            var $newTbody = null;
            //test if the page depends on the entity.js
            var handled = $.entityOperation.grid.tryToFill($data);
            $newTbody = $data.find('tbody');
            $paging.injectRecords($tbody, $newTbody);
            $paging.releaseLock();
            $paging.hideLoadingSpinner($tbody);
            $paging.triggerLoad();
          }
        });
      },
      // ************************* *
      // DOM *
      // ************************* *
      injectRecords: function ($tbody, $newTbody) {
        var _this = this;
        var newRange = this.getLoadedRecordRanges($newTbody)[0];
        $tbody.find('tr.blank-padding').each(function (index, element) {
          var $e = $(element);
          var range = new Range($e.data('range'));
          var intersect = range.intersect(newRange);
          if (intersect != null) {
            var blanks = range.drop(intersect, true);
            var preblank = blanks[0];
            var posblank = blanks[1];
            var $prepad = null;
            var $pospad = null;
            // Extract the new rows
            var $newTrs = $newTbody.find('tr.data-row');
            var rangeHeadOffset = intersect.lo - newRange.lo;
            $newTrs = $newTrs.slice(rangeHeadOffset, intersect.width() + rangeHeadOffset );

            if (preblank) {
              $prepad = _this.createPadding($tbody, preblank.lo, preblank.hi);
              $newTrs.splice(0, 0, $prepad[0]);
            }
            if (posblank) {
              $pospad = _this.createPadding($tbody, posblank.lo, posblank.hi);
              $newTrs.push($pospad[0]);
            }
            $e.replaceWith($newTrs);
            _this.addLoadedRecordRange($tbody, intersect);
          }
        });
      },

      // ************************* *
      // Initialize *
      // ************************* *

      initialize: function () {
        var headerTable = this.$container.find(ENTITY_GRID_HEADER_TABLE);
        headerTable.find('th').css('width', '');
        headerTable.find('th').each(function (index, thElement) {
          var $th = $(thElement);
          var width = $th.width();
          $th.css('width', width);
        });
        var bodyTable = this.$container.find(ENTITY_GRID_BODY_TABLE);

        var headerTableThead = headerTable.find("thead").clone();
        headerTableThead.addClass("width-control-header").find('th').empty();

        var bodyTableThead = bodyTable.find("thead");
        bodyTableThead.replaceWith(headerTableThead);

        var $tbody = bodyTable.find('tbody');

        var range = this.getLoadedRecordRanges($tbody)[0];
        var recordsAbove = range.lo;
        var recordsBelow = this.getTotalRecords($tbody) - range.hi;
        var rowHeight = this.getRowHeight($tbody);

        if (recordsAbove) {
          var $pad = this.createPadding($tbody, 0, recordsAbove);
          $tbody.find('tr:first').before($pad);
          // Update the height so that the user doesn't see a scroll action
          this.scrollToIndex($tbody, range.lo);
        }
        if (recordsBelow) {
          var $pad = this.createPadding($tbody, range.hi, this.getTotalRecords($tbody));
          $tbody.find('tr:last').after($pad);
        }

        var bodyWrapper = this.$container.find(ENTITY_GRID_BODY);
        bodyWrapper.customScrollbar("resize", true);

        this.scrollToIndex($tbody, range.lo);
        this.updateTableFooter($tbody);
      }
    };

    var ColumnResizer = function (entityGrid) {
      this.entityGrid = entityGrid;
      this.$container = entityGrid.$container;
    };

    ColumnResizer.prototype = {
      initialize: function () {
        var container = this.$container;
        var $headerTableThead = this.$container.find(ENTITY_GRID_HEADER_TABLE).find('thead');
        var $bodyTableThead = this.$container.find(ENTITY_GRID_BODY_TABLE).find('thead');
        $headerTableThead.find('th div.resizer').mousedown(function (e) {
          var $this = $(this).closest('th');
          tableColumnResizing.active = true;
          tableColumnResizing.container = container;
          tableColumnResizing.headerTableThead = $headerTableThead;
          tableColumnResizing.bodyTableThead = $bodyTableThead;
          tableColumnResizing.columnIndex = $this.index();
          tableColumnResizing.startX = e.pageX;
          tableColumnResizing.startWidths = [];
          tableColumnResizing.totalWidth = 0;

          tableColumnResizing.headerTableThead.find('th').each(function (index, element) {
            tableColumnResizing.startWidths.push($(this).outerWidth());
            tableColumnResizing.totalWidth += $(this).outerWidth();
          });
          $(document).disableSelection();
        });

        $(document).mousemove(function (e) {
          if (tableColumnResizing.active) {
            var headerTableThead = tableColumnResizing.headerTableThead;
            var headerTableOffset = headerTableThead.offset();
            if (e.pageX < (headerTableOffset.left - 100) || e.pageX > (headerTableOffset.left + headerTableThead.width() + 100) ||
              (e.pageY < (headerTableOffset.top - 100)) || (e.pageY > (headerTableOffset.top + headerTableThead.height() + 100))) {
              tableColumnResizing.active = false;
              $(document).enableSelection();
              return;
            }

            var minColumnWidth = 30;
            var index = tableColumnResizing.columnIndex;
            var widthDiff = (e.pageX - tableColumnResizing.startX);
            var minAllow = -tableColumnResizing.startWidths[index] + minColumnWidth;
            var maxAllow = tableColumnResizing.startWidths[index + 1] - minColumnWidth;

            if (widthDiff < minAllow) {
              widthDiff = minAllow;
            } else if (widthDiff > maxAllow) {
              widthDiff = maxAllow;
            }

            var newLeftWidth = tableColumnResizing.startWidths[index] + widthDiff;
            var newRightWidth = tableColumnResizing.startWidths[index + 1] - widthDiff;

            var newWidths = [];
            for (var i = 0; i < tableColumnResizing.startWidths.length; i++) {
              newWidths[i] = tableColumnResizing.startWidths[i];
            }
            newWidths[index] = newLeftWidth;
            newWidths[index + 1] = newRightWidth;

            var headerTableThs = tableColumnResizing.headerTableThead.find('tr th');
            var bodyTableThs = tableColumnResizing.bodyTableThead.find('tr th');

            for (var i = 0; i < tableColumnResizing.startWidths.length; i++) {
              $(headerTableThs[i]).outerWidth(newWidths[i]);
              $(bodyTableThs[i]).outerWidth(newWidths[i]);
            }
          }
        });
        $(document).mouseup(function () {
          if (tableColumnResizing.active) {
            tableColumnResizing.active = false;
            $(document).enableSelection();
          }
        });
      }
    }

    return this.each(function () {
      var entityGrid = new EntityGrid($(this));
      $(document).ready(function () {
        $(window).resize(function () {
          $.doTimeout('resize', 250, function () {
            entityGrid.resize();
          });
        });
      });
    });
  }

  $.fn.entityGridInit = function (options) {
    ($(ENTITY_GRID_SEL_CONTAINER_CLASS)).each(function () {
      var $container = $(this);
      $container.initAsEntityGrid();
    });
  };

})(jQuery, this);

