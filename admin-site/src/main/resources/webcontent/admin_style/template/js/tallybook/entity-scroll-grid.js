;
var tallybook = tallybook || {};

(function ($, window, host) {
  'use strict';

  var QueryResponse = host.entity.queryResponse;

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
    this._inModal = false;
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
    inModal : {value:function(_modal){
      if(_modal === undefined)return this._inModal;
      this._inModal = _modal;
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
      var bodyWrapper = this.body.$body;
      var totalContentHeight = Math.max(this.da.totalRecords() * this.getRowHeight(),bodyWrapper.find("tbody").height());
      var maxAllowed;

      if(bodyWrapper.height() == 0){ //not initialized
        bodyWrapper.css('max-height', 'none');
        bodyWrapper.find('.viewport').css('max-height', 'none');
        bodyWrapper.height(totalContentHeight);
        bodyWrapper.find('.viewport').height(totalContentHeight);
      }
      var _modal = this.inModal();
      if(_modal){
        var modalBody = _modal.element().find('.modal-body');
        var headAndFootHeight = this.element().height() - bodyWrapper.height();
        var modalBodyHeight = modalBody.height();
        maxAllowed = modalBodyHeight - headAndFootHeight;

//        return;
      }else{
        var alignType = container.data("align-type");
        switch (alignType) {
          case "window":
          {
            var $window = $(window);
            var offset = container.data("align-offset");
            maxAllowed = $window.innerHeight() - (bodyWrapper.offset().top) - offset;
            break;
          }
        }
      }

      var actualHeight = totalContentHeight;
      if(maxAllowed != null){
        bodyWrapper.css('max-height', maxAllowed);
        bodyWrapper.find('.viewport').css('max-height', maxAllowed);
        actualHeight = Math.min(totalContentHeight, maxAllowed);
      } 
      if(actualHeight != null){
        bodyWrapper.height(actualHeight);
        bodyWrapper.find('.viewport').height(actualHeight);
      }
    }},
    resize:{value: function () {
      GridControl.prototype.resize.apply(this, arguments);
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
      var totalCount = this.da.totalRecords();
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
    fill :{value: function (ops) {
      GridControl.prototype.fill.apply(this, arguments);
      this.paging.paddingAdjustAfterFirstLoad();

      this.teardown();
      this.setup();

      var bodyWrapper = this.body.$body;
      bodyWrapper.height(0);
      bodyWrapper.find('.viewport').height(0);

      this.resize();
      this.element().trigger(ScrollGrid.event.filled);
    }},
    buildAjaxLoadUri :{value : function(queryUri, parameter, range){
      var start = range.lo; start = (start < 0)? null:start;
      var url = host.url.getUrlWithParameterString(parameter,null,queryUri);
      url = host.url.getUrlWithParameter(GridControl.ReservedParameter.StartIndex, start, null, url);
      url = host.url.getUrlWithParameter(GridControl.ReservedParameter.PageSize, range.width(), null, url);
      return url;
    }}
  });
  ScrollGrid.event={
    filled:'scroll.grid.filled'
  }
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
    var sgcs = $ctrls.map(function (index, ctrl, array) {
      var sgc = ScrollGrid.getScrollGrid($(ctrl));return gc;
    });
    return sgcs;
  };

  var Paging = function (sgc) {this.sgc = sgc;};
  Paging.prototype = {

    // ************************* *
    // UI method *
    // ************************* *
    loadRecords : function () {
      var $paging = this;
      var sgc = this.sgc;
      return sgc.ajaxLoadData({
          url: function (/*urlbuilder*/) {
            var $tbody = sgc.body.$tbody;

            var fullRange = new Range(0, sgc.da.totalRecords());
            var topIndex = sgc.getTopVisibleIndex();
            var botIndex = sgc.getBottomVisibleIndex();
            var dataWindowRange = fullRange.intersect(new Range(topIndex, botIndex));
            var loadedRanges = sgc.da.recordRanges();
            var pageSize = sgc.da.pageSize();

            if(dataWindowRange == null){
              return null;
            }

            var missingRanges = RangeArrayHelper.findMissingRangesWithin(loadedRanges, dataWindowRange.lo, dataWindowRange.hi);
            if (missingRanges.length > 0) {
              var queryUri = sgc.da.entityQueryUri();
              queryUri = host.url.connectUrl(window.location.origin, queryUri);

              var firstMissingRange = missingRanges[0];
              firstMissingRange = firstMissingRange.subRange(pageSize, (firstMissingRange.lo == topIndex));
              var loadingWindowRange = dataWindowRange.intersect(firstMissingRange);
              {
                var $overview = $tbody.closest('div.overview');
                var offset = 0 - $overview.position().top;
                var spinnerOffset = (loadingWindowRange.lo + loadingWindowRange.hi) * sgc.getRowHeight() / 2 - offset;
                sgc.getSpinner().setOffset(spinnerOffset);
              }

              var parameter = sgc.da.parameter();
              var cParameter = sgc.da.criteriaParameter();
              var allParam = host.url.param.connect(parameter, cParameter);

              var url = sgc.buildAjaxLoadUri(queryUri, allParam, firstMissingRange);
              return url
            } else {
              return null;
            }
          },
          canskipcheck: function (/*canskipcheck*/) {
            var $tbody = sgc.body.$tbody;
            var totalRecords = sgc.da.totalRecords();
            if ((!$tbody.is(':visible')) || (totalRecords == 0)) {
              return true;
            }
            return false;
          },
          ondata: function (/*ondata*/ response) {
            var $tbody = sgc.body.$tbody;
            var queryResponse = new QueryResponse(response.data);
            var $newTbody = sgc.fillTbody(queryResponse, undefined);
            var queryBeans = queryResponse.entities();
            $paging.injectRecords($tbody, $newTbody, queryBeans.range());
            sgc.da.totalRecords(queryBeans.totalCount);
          },
          ondataloaded: function (/*ondataloaded*/) {
            sgc.triggerLoad();
          }
        }
      );
    },

    // ************************* *
    // DOM *
    // ************************* *
    injectRecords: function ($tbody, $newTbody, newRange) {
      var _sgc = this.sgc;
      var loadedRange = _sgc.da.recordRanges();
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
            $prepad = _sgc.createPadding( preblank.lo, preblank.hi);
            $newTrs.splice(0, 0, $prepad[0]);
          }
          if (posblank) {
            $pospad = _sgc.createPadding( posblank.lo, posblank.hi);
            $newTrs.push($pospad[0]);
          }
          $e.replaceWith($newTrs);
          _sgc.da.recordRanges('add', intersect);
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
      var sgc = this.sgc;
      var $tbody = sgc.body.$tbody;

      var range = sgc.da.recordRanges()[0];
      var recordsAbove = range.lo;
      var recordsBelow = sgc.da.totalRecords() - range.hi;
      if (recordsAbove) {
        var $pad = sgc.createPadding(0, recordsAbove);
        $tbody.find('tr:first').before($pad);
        sgc.scrollToIndex(range.lo);
      }
      if (recordsBelow) {
        var $pad = sgc.createPadding( range.hi, sgc.da.totalRecords());
        $tbody.find('tr:last').after($pad);
      }

      sgc.scrollHolder.customScrollbar("resize", true);
      if(range.lo != sgc.getTopVisibleIndex()){
        sgc.scrollToIndex(range.lo);
      }
    }
  };

  ScrollGrid.initOnDocReady = function ( $doc) {
    ($(ENTITY_GRID_CONTAINER)).each(function (i, item) {
      var $container = $(item);
      var sgc = ScrollGrid.getScrollGrid($container);
      var ops = {};if(sgc.isMain()){ops = {updateUri:true, uri:window.location.href}}
      sgc.fill(ops);
    });
    $(window).resize(function () {
      ($(ENTITY_GRID_CONTAINER)).each(function (i, item) {
        var $container = $(item);
        var sgc = ScrollGrid.getScrollGrid($container);
        $.doTimeout('resize', 250, function () {
          sgc.resize();
        });
      });
    });
  };

  var EntityGridModalOptions = {
    model:'select',
    //target:'xxxx',
    postSetUrlContent:function(content, _modal){
      var sgc = host.entity.scrollGrid.findFirstOnPage(content);
      var sgcEle = sgc.element();
      sgcEle.off(ScrollGrid.event.filled, EntityGridModal.filledHandler);
      sgcEle.on(ScrollGrid.event.filled, _modal, EntityGridModal.filledHandler);
      _modal.scrollGrid = sgc;
      sgc.inModal(_modal);
      sgc.fill();
      _modal.addOnHideCallback(function () {
        sgcEle.off(ScrollGrid.event.filled, EntityGridModal.filledHandler);
        _modal.scrollGrid = null;
      });
      sgc.element().on('selectedIndexChanged', function(event, oldidx, newidx, entity){
        _modal._selectedEntity = entity;
        if(entity){
          if(_modal.options.model == 'select'){
            _modal.hide();
          }
        }
      });
      _modal._doSetTitle(host.messages.select + ' ' + _modal.options.target);
    }
  }
  var Modal = host.modal;
  function EntityGridModal(options){
    var newOpts = $.extend({}, EntityGridModalOptions, options);
    var getargs = Array.prototype.slice.call(arguments);getargs[0] = newOpts;
    Modal.apply(this, getargs);
    this._selectedEntity = null;
  }
  EntityGridModal.prototype = Object.create(Modal.prototype, {
    constructor:{value:EntityGridModal},
    selectedEntity : {value:function(){
      return this._selectedEntity;}},
    setFormSubmitHandlers:{value:function(handlers){
      this.formSubmitHandlers = handlers;
    }}
  });
  EntityGridModal.filledHandler = function (e) {
  }
  host.entity = $.extend({}, host.entity,{
    scrollGrid : ScrollGrid,
    gridModal : EntityGridModal
  });

})(jQuery, this, tallybook);

