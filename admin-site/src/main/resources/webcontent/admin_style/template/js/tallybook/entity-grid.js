;
var tallybook;
if (!tallybook)
  tallybook = {};

(function ($, window, host) {
  'use strict';

  var ENABLE_SCROLL_DEBUG= false;

  var ENTITY_GRID_CONTAINER = "div.entity-grid-container";

  var fetchDebounce = 200;
  var updateUrlDebounce = 800;

  var Range = host.Range;
  var Ranges = host.Ranges;
  var GridControl = host.entity.grid;

  function ScrollGrid(container) {
    GridControl.apply(this, arguments);
    this.scrollHolder = null;
    this._enableScrollSupport();
    this.scrollviewport = this.body.$body.find('div.viewport');
    this.scrolloverview = this.scrollviewport.find('div.overview');
    this.setup();
  };
  ScrollGrid.prototype = Object.create(GridControl.prototype, {
    constructor:{value:ScrollGrid},
    _enableScrollSupport:{value:function(){
      this.updateBodyHeight();
      var bodyWrapper  = this.body.$body;
      var $this = this;
      bodyWrapper.customScrollbar({
        //updateOnWindowResize: true,
        onCustomScroll: function (event, scrollData) {
          host.debug.log(ENABLE_SCROLL_DEBUG, "scroll to : " + scrollData.direction + ' ' + scrollData.scrollPercent);
          $this.updateRangeInfo(scrollData.scrollPercent / 100);
          $this.triggerLoad();
        }
      });
      this.scrollHolder = bodyWrapper;
      this.alignHeaderAndBody();
    }},
    updateBodyHeight:{value: function () {
      var containerHolder = this.$container.parent();
      var alignType = containerHolder.data("entity-grid-align-type");
      switch (alignType) {
        case "window":
        {
          var $window = $(window);
          var offset = containerHolder.data("entity-grid-align-offset");
          var bodyWrapper = this.body.$body;
          var wrapperMaxHeight = $window.innerHeight() - (bodyWrapper.offset().top) - offset;
          var totalContentHeight = Math.max(this.data.totalRecords() * this.getRowHeight(),bodyWrapper.find("tbody").height());
          
          var actualHeight = Math.min(totalContentHeight, wrapperMaxHeight);
          bodyWrapper.css('max-height', wrapperMaxHeight);
          bodyWrapper.find('.viewport').css('max-height', wrapperMaxHeight);
          bodyWrapper.css('height', actualHeight);
          bodyWrapper.find('.viewport').css('height', actualHeight);
          break;
        }
      }
    }},
    resize:{value: function () {
      this.updateBodyHeight();
       this.scrollHolder.customScrollbar("resize", true);
      this.alignHeaderAndBody();
      this.updateRangeInfo();
      this.triggerLoad();
    }},
    setup:{value: function () {
      if (this.initialized()) {
        return;
      }

      this.paging = new Paging(this);
      this.paging.paddingAdjustAfterFirstLoad();

 //     GridControl.bindReloadEvent(this);

      this.triggerLoad();

      this.initialized(true);
    }},
    teardown:{value: function () {
 //     GridControl.unbindReloadEvent(this);
      this.initialized(false);
    }},
    getTopVisibleIndex:{value: function (normalpercent) {
      var rowHeight = this.getRowHeight();
      if (!rowHeight) {return 0;}

      var offset = (normalpercent === undefined)?
        (-this.scrolloverview.position().top):
        (normalpercent * (this.scrolloverview.height() - this.scrollviewport.height()));
      return Math.floor(offset / rowHeight);
    }},
    getBottomVisibleIndex:{value: function (normalpercent) {
      var rowHeight = this.getRowHeight();
      if (!rowHeight) {return 0;}

      var offset = (normalpercent === undefined)?
        (0 - this.scrolloverview.position().top):
        (normalpercent * (this.scrolloverview.height() - this.scrollviewport.height()));
      return Math.ceil((offset + this.scrollviewport.height()) / rowHeight);
    }},
    createPadding: {value:function (from, to) {
      var rowHeight = this.getRowHeight();
      var recordsCount = to - from;
      var $pad = $('<tr>', {
        'class': 'blank-padding',
        'css': {
          'height': recordsCount * rowHeight
        },
        'data-range': from + '-' + to
      });
      return $pad;
    }},
    scrollToIndex:{value: function (index) {
      var offset = index * this.getRowHeight();
      this.scrollHolder.customScrollbar("scrollToY", offset);
    }},
    updateRangeInfo:{value: function (normalpercent) {
      var topIndex = this.getTopVisibleIndex(normalpercent);
      var bottomIndex = this.getBottomVisibleIndex(normalpercent);
      var totalCount = this.data.totalRecords();
      this.getFooter().setDataRange(topIndex,bottomIndex,totalCount);

      host.debug.log(ENABLE_SCROLL_DEBUG, 'updateRangeInfo: [' + topIndex + ' - ' + bottomIndex +'] ' + topIndex + '  ' + ((normalpercent === undefined)?'':(''+normalpercent)));

      if(this.isMain()) {
        $.doTimeout('updateurl', updateUrlDebounce, function(){
          host.debug.log(ENABLE_SCROLL_DEBUG, 'updateRangeInfo: url actual ' + topIndex);
          if (topIndex > 0) {
            host.history.replaceUrlParameter('startIndex', topIndex);
          } else {
            host.history.replaceUrlParameter('startIndex');
          }
        })
      }
    }},
    triggerLoad :{value: function () {
      var _this = this;
      $.doTimeout('fetch', fetchDebounce, function () {
        _this.paging.loadRecords();
      });
    }},
    fill :{value: function () {
      GridControl.prototype.fill.apply(this,arguments);
      this.teardown();
      this.setup();
      //this.constructor.prototype.
    }}
  });
  ScrollGrid.buildAjaxLoadUrl = function(baseUrl, parameter, range){
    var start = range.lo; start = (start < 0)? null:start;
    var url = tallybook.url.getUrlWithParameterString(parameter,null,baseUrl);
    url = tallybook.url.getUrlWithParameter('startIndex', range.lo, null, url);
    url = tallybook.url.getUrlWithParameter('pageSize', range.width(), null, url);
    return url;
  };
  ScrollGrid.findFirstOnPage = function () {
    var $page = $(document);
    var $ctrls = $page.find(GridControl.PageSymbols.GRID_CONTAINER);
    if($ctrls.length > 0){
      return new ScrollGrid($($ctrls[0]));
    }
  };


  var Paging = function (grid) {
    this.grid = grid;
  };
  Paging.prototype = {

    // ************************* *
    // UI method *
    // ************************* *
    loadRecords : function () {
      var $paging = this;
      var grid = this.grid;
      return grid.ajaxLoadData({
          url: function (/*urlbuilder*/) {
            var $tbody = grid.body.$tbody;

            var topIndex = grid.getTopVisibleIndex();
            var botIndex = grid.getBottomVisibleIndex();
            var dataWindowRange = new Range(topIndex, botIndex);
            var loadedRanges = grid.data.recordRanges();
            var pageSize = grid.data.pageSize();

            var missingRanges = Ranges.findMissingRangesWithin(loadedRanges, topIndex, botIndex);
            if (missingRanges.length > 0) {
              var baseUrl = grid.data.baseUrl();
              baseUrl = host.url.connectUrl(window.location.origin, baseUrl);

              var firstMissingRange = missingRanges[0];
              firstMissingRange = firstMissingRange.subRange(pageSize, (firstMissingRange.lo == topIndex));
              var loadingWindowRange = dataWindowRange.intersect(firstMissingRange);
              {
                var $overview = $tbody.closest('div.overview');
                var offset = 0 - $overview.position().top;
                var spinnerOffset = (loadingWindowRange.lo + loadingWindowRange.hi) * grid.getRowHeight() / 2 - offset;
                grid.getSpinner().setOffset(spinnerOffset);
              }

              var parameter = grid.data.parameter();
              var sfParameter = grid.data.filterParameter();
              var allParam = host.url.param.connect(parameter, sfParameter);

              var url = ScrollGrid.buildAjaxLoadUrl(baseUrl, allParam, firstMissingRange);
              return url
            } else {
              return null;
            }
          },
          canskipcheck: function (/*canskipcheck*/) {
            var $tbody = grid.body.$tbody;
            var totalRecords = grid.data.totalRecords();
            if ((!$tbody.is(':visible')) || (totalRecords == 0)) {
              return true;
            }
            return false;
          },
          ondata: function (/*ondata*/ response) {
            var $tbody = grid.body.$tbody;
            var data = response.data;
            var $newTbody = grid.fillTbody(data, undefined);
            $paging.injectRecords($tbody, $newTbody, data.entities.range);
          },
          ondataloaded: function (/*ondataloaded*/) {
            grid.triggerLoad();
          }
        }
      );
    },

    // ************************* *
    // DOM *
    // ************************* *
    injectRecords: function ($tbody, $newTbody, newRange) {
      var _this = this;
      var loadedRange = this.grid.data.recordRanges();
      var result = Ranges.findMissingRangesWithin(loadedRange, newRange.lo, newRange.hi);
      var tobefilled = (result && result.length) ? result[0] : null;

      var fill = 0;
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
          $newTrs = $newTrs.slice(rangeHeadOffset, intersect.width() + rangeHeadOffset);

          if (preblank) {
            $prepad = _this.grid.createPadding( preblank.lo, preblank.hi);
            $newTrs.splice(0, 0, $prepad[0]);
          }
          if (posblank) {
            $pospad = _this.grid.createPadding( posblank.lo, posblank.hi);
            $newTrs.push($pospad[0]);
          }
          $e.replaceWith($newTrs);
          _this.grid.data.recordRanges('add', intersect);
          fill++;
        }
      });

      if(tobefilled && (!fill)){
        this.paddingAdjustAfterFirstLoad()
        return false;
      }
    },

    // ************************* *
    // Initialize *
    // ************************* *
    paddingAdjustAfterFirstLoad: function () {
      var grid = this.grid;
      var $tbody = grid.body.$tbody;

      var range = grid.data.recordRanges()[0];
      var recordsAbove = range.lo;
      var recordsBelow = grid.data.totalRecords() - range.hi;
      if (recordsAbove) {
        var $pad = grid.createPadding(0, recordsAbove);
        $tbody.find('tr:first').before($pad);
        grid.scrollToIndex(range.lo);
      }
      if (recordsBelow) {
        var $pad = grid.createPadding( range.hi, grid.data.totalRecords());
        $tbody.find('tr:last').after($pad);
      }

      grid.scrollHolder.customScrollbar("resize", true);
      grid.scrollToIndex(range.lo);
    }
  };

  ScrollGrid.initOnDocReady = function ( $doc) {
    ($(ENTITY_GRID_CONTAINER)).each(function () {
      var $container = $(this);
      var grid = new ScrollGrid($container);
      grid.bindEvents();
      $(window).resize(function () {
        $.doTimeout('resize', 250, function () {
          grid.resize();
        });
      });
    });
  };

  host.entity.scrollGrid = ScrollGrid;

})(jQuery, this, tallybook);

