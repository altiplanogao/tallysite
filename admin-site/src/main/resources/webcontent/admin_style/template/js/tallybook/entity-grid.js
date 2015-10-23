;
var tallybook = tallybook || {};

(function ($, window, host) {
  'use strict';

  var ENABLE_SCROLL_DEBUG= false;

  var ENTITY_GRID_CONTAINER = ".entity-grid-container";
  var SCROLL_GRID_CONTROL_KEY = 'tallybook.scroll.grid';

  var fetchDebounce = 200;
  var updateUrlDebounce = 800;

  var Range = host.Range;
  var RangeArrayHelper = host.Range.rangeArrayHelper;
  var GridControl = host.entity.grid;

  function ScrollGrid(container) {
    GridControl.apply(this, arguments);
    this.scrollHolder = null;
    this.enableScroll();
    this.bindEvents();
    this.setup();
  };
  ScrollGrid.prototype = Object.create(GridControl.prototype, {
    constructor:{value:ScrollGrid},
    enableScroll:{value:function(){
      if(this.scrollenabled) return;
      this.updateBodyHeight();
      var _this = this;
      var bodyWrapper  = this.body.$body;
      bodyWrapper.customScrollbar({
        onCustomScroll: function (event, scrollData) {
          host.debug.log(ENABLE_SCROLL_DEBUG, "scroll to : " + scrollData.direction + ' ' + scrollData.scrollPercent);
          _this.updateRangeInfo(scrollData.scrollPercent / 100);
          _this.triggerLoad();
        }
      });
      this.scrollHolder = bodyWrapper;
      this.alignHeaderAndBody();
      this.scrollviewport = this.body.element().find('div.viewport');
      this.scrolloverview = this.scrollviewport.find('div.overview');
      this.paging = new Paging(this);
      this.scrollenabled = true;
    }},
    disableScroll:{value:function(){
      if(!this.scrollenabled) return;
      var bodyWrapper  = this.body.$body;
      bodyWrapper.customScrollbar("remove");
      this.scrollHolder=null;
      this.scrollviewport = null;
      this.scrolloverview = null;
      this.paging = null;
      this.scrollenabled = false;
    }},
    updateBodyHeight:{value: function () {
      var container = this.$container;
      var alignType = container.data("align-type");
      switch (alignType) {
        case "window":
        {
          var $window = $(window);
          var offset = container.data("align-offset");
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
      if (!this.initialized()) {
        this.triggerLoad();
        this.initialized(true);
      }
    }},
    teardown:{value: function () {
      this.initialized(false);
    }},
    getTopVisibleIndex:{value: function (normalpercent) {
      var rowHeight = this.getRowHeight();
      if (!rowHeight) {return 0;}

      var offset = (!normalpercent)?
        (-this.scrolloverview.position().top):
        (normalpercent * (this.scrolloverview.height() - this.scrollviewport.height()));
      var index = Math.floor(offset / rowHeight);
      return index < 0 ? 0 : index;
    }},
    getBottomVisibleIndex:{value: function (normalpercent) {
      var rowHeight = this.getRowHeight();
      if (!rowHeight) {return 0;}

      var offset = (!normalpercent)?
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
          host.history.replaceUrlParameter(GridControl.ReservedParameter.StartIndex, ((topIndex > 0) ? topIndex : null));
        })
      }
    }},
    triggerLoad :{value: function () {
      var _this = this;
      $.doTimeout('fetch', fetchDebounce, function () {
        _this.paging.loadRecords();
      });
    }},
    fill :{value: function (data, fillrows, fillcols) {
      GridControl.prototype.fill.apply(this,arguments);
      this.paging.paddingAdjustAfterFirstLoad();

      this.teardown();
      this.setup();
      this.resize();
    }},
    buildAjaxLoadUrl :{value : function(baseUrl, parameter, range){
      var start = range.lo; start = (start < 0)? null:start;
      var url = host.url.getUrlWithParameterString(parameter,null,baseUrl);
      url = host.url.getUrlWithParameter(GridControl.ReservedParameter.StartIndex, start, null, url);
      url = host.url.getUrlWithParameter(GridControl.ReservedParameter.PageSize, range.width(), null, url);
      return url;
    }}
  });
  ScrollGrid.getScrollGrid = function($container){
    var existingGrid = $container.data(SCROLL_GRID_CONTROL_KEY);
    if(!existingGrid){
      existingGrid = new ScrollGrid($container);
      $container.data(SCROLL_GRID_CONTROL_KEY, existingGrid);
    }
    return existingGrid;
  }
  ScrollGrid.findFirstOnPage = function ($page) {
    var $page = $page || $(document);
    var $ctrls = $page.find(GridControl.GridSymbols.GRID_CONTAINER);
    if($ctrls.length > 0){
      return new ScrollGrid.getScrollGrid($($ctrls[0]));
    }
  };
  ScrollGrid.findFromPage = function ($page) {
    var $ctrls = $page.find(GridControl.GridSymbols.GRID_CONTAINER);
    var gcs = $ctrls.map(function (index, ctrl, array) {
      var gc = ScrollGrid.getScrollGrid($(ctrl));return gc;
    });
    return gcs;
  };

  var Paging = function (grid) {this.grid = grid;};
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

            var fullRange = new Range(0, grid.data.totalRecords());
            var topIndex = grid.getTopVisibleIndex();
            var botIndex = grid.getBottomVisibleIndex();
            var dataWindowRange = fullRange.intersect(new Range(topIndex, botIndex));
            var loadedRanges = grid.data.recordRanges();
            var pageSize = grid.data.pageSize();

            if(dataWindowRange == null){
              return null;
            }

            var missingRanges = RangeArrayHelper.findMissingRangesWithin(loadedRanges, dataWindowRange.lo, dataWindowRange.hi);
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
              var cParameter = grid.data.criteriaParameter();
              var allParam = host.url.param.connect(parameter, cParameter);

              var url = grid.buildAjaxLoadUrl(baseUrl, allParam, firstMissingRange);
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
            grid.data.totalRecords(data.entities.totalCount);
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
      var _grid = this.grid;
      var loadedRange = _grid.data.recordRanges();
      var result = RangeArrayHelper.findMissingRangesWithin(loadedRange, newRange.lo, newRange.hi);
      var tobefilled = (result && result.length) ? result[0] : null;

      var filled = 0;
      $tbody.find('tr.blank-padding').each(function (index, element) {
        var $e = $(element);
        var range = new Range($e.data('range'));
        var intersect = range.intersect(newRange);
        if (intersect != null) {
          var blanks = range.drop(intersect, true);
          var preblank = blanks[0];
          var posblank = blanks[1];
          var $prepad = null, $pospad = null;
          // Extract the new rows
          var $newTrs = $newTbody.find('tr.data-row');
          var rangeHeadOffset = intersect.lo - newRange.lo;
          $newTrs = $newTrs.slice(rangeHeadOffset, intersect.width() + rangeHeadOffset);

          if (preblank) {
            $prepad = _grid.createPadding( preblank.lo, preblank.hi);
            $newTrs.splice(0, 0, $prepad[0]);
          }
          if (posblank) {
            $pospad = _grid.createPadding( posblank.lo, posblank.hi);
            $newTrs.push($pospad[0]);
          }
          $e.replaceWith($newTrs);
          _grid.data.recordRanges('add', intersect);
          filled++;
        }
      });

      if(tobefilled && (!filled)){
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
      if(range.lo != grid.getTopVisibleIndex()){
        grid.scrollToIndex(range.lo);
      }
    }
  };

  ScrollGrid.initOnDocReady = function ( $doc) {
    ($(ENTITY_GRID_CONTAINER)).each(function (i, item) {
      var $container = $(item);
      var grid = ScrollGrid.getScrollGrid($container);
      grid.fill();
      $(window).resize(function () {
        $.doTimeout('resize', 250, function () {
          grid.resize();
        });
      });
    });
  };

  var EntityGridModalOptions = {
    postSetUrlContent:function(content, _modal){
      var mform = host.entity.scrollGrid.findFirstOnPage(content);
//      mform.inModal(_modal);
      mform.fill();
      //mform.setSubmitHandler(_modal.formSubmitHandlers);
      //_modal._doSetTitle(mform.fullAction(true));
    }
  }
  var Modal = host.modal;
  function EntityGridModal(options){
    var newOpts = $.extend({}, EntityGridModalOptions);
    var getargs = Array.prototype.slice.call(arguments);getargs[0] = newOpts;
    Modal.apply(this, getargs);
  }
  EntityGridModal.prototype = Object.create(Modal.prototype, {
    constructor:{value:EntityGridModal},
    setFormSubmitHandlers:{value:function(handlers){
      this.formSubmitHandlers = handlers;
    }}
  });

  host.entity.scrollGrid = ScrollGrid;
  host.entity.gridModal = EntityGridModal;

})(jQuery, this, tallybook);

