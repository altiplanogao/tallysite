/**
 * Created by Gao Yuan on 2015/7/1.
 */
;
var tallybook = tallybook || {};

(function ($, host) {
  'use strict';

  //namespace
  var Range = host.Range;
  var Ranges = host.Ranges;
  var AJAX = host.ajax;

  //const
  var lockDebounce = 200;
  var ENABLE_URL_DEBUG = true;
  var ENTITY_RELOAD_EVENT = 'entity-reload';

  //page symbols
  var PageSymbols = {
    GRID_CONTAINER: "div.entity-grid-container",
    GRID_CONTAINER_CLASS: "entity-grid-container",

    GRID_HEADER: ".header",
    GRID_FOOTER: ".footer",
    GRID_BODY: ".body",
    GRID_SPINNER: "span.spinner",

    GRID_FOOTER__ROW: "table thead tr",
    GRID_BODY__TABLE: ".body table",
    GRID_BODY__THEAD_ROW: "table thead tr",
    GRID_SPINNER__ITEM: 'i.spinner-item'
  };

  var Template = {
    filterTemplateMapByType: (function () {
      var $templates = $('.template.grid-template table.entity-filters-table > tbody ul.entity-filter');
      var templateMap = {};
      $templates.each(function (index, template) {
        var $template = $(template);
        var types = $template.attr('data-entity-filter-type').split(',');
        types.forEach(function (type) {
          templateMap[type] = $template;
        })
      });
      return function () {
        return templateMap;
      }
    })(),
    columnHeader: (function () {
      var template = $('.template.grid-template .column-header-template');
      template.removeClass('column-header-template');
      return function () {
        return template.clone();
      };
    })(),
    cell: function (fieldname, fieldvalue) {
      var obj = $("<td>");
      obj.attr("data-fieldname", fieldname);
      obj.attr("data-fieldvalue", fieldvalue);
      return obj;
    },
    row: function (gridinfo, entity, entityIndex) {
      var $row = $('<tr class="data-row">');
      $row.attr('data-id', entity[gridinfo.idField]);
      $row.attr('data-name', entity[gridinfo.nameField]);
      $row.attr('data-entity-index', entityIndex);
      return $row;
    }
  };

  var EntityData = {
    processGridData: function (data) {
      var entities = data.entities;
      var range = {lo: entities.startIndex, hi: entities.startIndex + entities.details.length};
      entities.range = range;

      var entityInfos = data.entityInfos;
      var gridinfo = this.processGridInfo(entityInfos);

      return data;
    },
    processGridInfo: function (entityInfos) {
      var gridInfo = entityInfos.details['grid'];
      gridInfo.fields.map(function (field, index, array) {
        switch (field.fieldType) {
          case 'ID':
            gridInfo.idField = field.name;
            break;
          case 'NAME':
            gridInfo.nameField = field.name;
            break;
          default:
        }
      });
      return gridInfo;
    },
    makeUrl: function (gridInfo, entity, baseUrl) {
      var idField = gridInfo.idField;
      return baseUrl + entity[idField];
    }
  };

  function makeColumnFilter(fieldInfo) {
    var templateMap = Template.filterTemplateMapByType();
    var f = {
      makeCellAsGeneral: function () {
        var template = templateMap['default'].clone();
        $('input.filter-property', template).val(fieldInfo.name);
        $('input.sort-property', template).val('sort_' + fieldInfo.name);
        var $input = $('input.filter-input', template);
        $input.attr('data-name', fieldInfo.name);
        $input.attr('placeholder', fieldInfo.friendlyName);
        return template;
      }
    };

    var content = null;
    switch (fieldInfo.fieldType) {
      case 'ID':
        content = f.makeCellAsGeneral();
        break;
      default :
        content = f.makeCellAsGeneral();
    }

    return content;
  };
  function fillCellContent(gridInfo, $cell, entity, field, fieldvalue, baseUrl) {
    var m = {
      makeCellAsGeneral: function () {
        return fieldvalue;
      },
      makeCellAsEmail: function () {
        var $content = $('<a>').attr('href', 'mailto:' + fieldvalue).text(fieldvalue);
        return $content;
      },
      makeCellAsPhone: function () {
        var segLen = 4;
        var formatedPhone = '';
        if (fieldvalue.length <= segLen) {
          formatedPhone = fieldvalue;
        } else {
          var segCount = Math.ceil(fieldvalue.length / segLen);
          var start = 0;
          var end = fieldvalue.length % segLen;
          end = (end == 0) ? segLen : end;
          var segs = [];
          for (var i = 0; i < segCount; ++i) {
            segs[i] = fieldvalue.substring(start, end);
            start = end;
            end = start + segLen;
          }
          formatedPhone = segs.join('-');
        }
        var $content = $('<a>').attr('href', 'tel:' + fieldvalue).text(formatedPhone);
        return $content;
      },
      makeCellAsMainEntry: function () {
        var url = EntityData.makeUrl(gridInfo, entity, baseUrl);
        var $content = $('<a>').attr('href', url).text(fieldvalue);
        return $content;
      }
    };

    var content = null;
    switch (field.fieldType) {
      case 'ID':
        content = m.makeCellAsGeneral();
        break;
      case 'NAME':
        content = m.makeCellAsMainEntry();
        break;
      case 'EMAIL':
        content = m.makeCellAsEmail();
        break;
      case 'PHONE':
        content = m.makeCellAsPhone();
        break;
      default :
        content = m.makeCellAsGeneral();
    }

    $cell.html(content);
  };

  function GridDataAccess(grid) {
    this.grid = grid;
  };
  GridDataAccess.elementValueAccess = function(_this, key, defVal, val) {
    var $ele = _this.grid.$container;
    var datakey = 'data-' + key;
    if (val === undefined) {/*get*/
      var existing = $ele.data(key);
      if (existing === undefined) {
        return defVal;
      } else {
        return existing;
      }
    } else {/*set*/
      $ele.attr(datakey, val);
      $ele.data(key, val);
      return _this;
    }
  };
  GridDataAccess.specifyValueAccess = function( key, defVal){
    var args = [key, defVal];
    var fn = GridDataAccess.elementValueAccess;

    return function(){
      var _newargs = [this];
      var newargs = _newargs.concat(args).concat(Array.prototype.slice.call(arguments));
      return fn.apply(this, newargs);
    };
  };
  GridDataAccess.prototype = {
    recordRanges: function (/* optional: get set add */op, val) {
      var $container = this.grid.$container;
      if (op === undefined) {
        op = 'get';
      }
      switch (op) {
        case 'get':
        {
          var rangesString = $container.data('recordranges');
          if (!rangesString) {
            return null;
          }
          var rangeDescriptions = rangesString.split(',');
          var ranges = [];
          rangeDescriptions.forEach(function (item, index, array) {
            Ranges.addRange(ranges, new Range(item));
          })
          return ranges;
        }
        case 'add':
        {
          var rangesString = '';
          if (val) {
            var rg = new Range(val);
            var existing = this.recordRanges('get');
            var ranges = existing || [];
            Ranges.addRange(ranges, rg);
            ranges = Ranges.merge(ranges);
            var rangesString = ranges.join(',')
          } else {
            rangesString = '';
          }
          $container.attr('data-recordranges', rangesString);
          $container.data('recordranges', rangesString);
          return this;
        }
        case 'set':
        {
          var rangesString = null;
          if(val instanceof Array){
            rangesString = val.join(',');
          }else{
            var rg = new Range(val);
            rangesString = '' + rg;
          }
          $container.attr('data-recordranges', rangesString);
          $container.data('recordranges', rangesString);
          return this;
        }
      }
    },
    initialized : GridDataAccess.specifyValueAccess('initialized', false),

    baseUrl: GridDataAccess.specifyValueAccess('baseurl','/'),
    parameter : GridDataAccess.specifyValueAccess('parameter',''),

    filterParameter : GridDataAccess.specifyValueAccess('filter-parameter',''),

    pageSize : GridDataAccess.specifyValueAccess('pagesize',''),
    totalRecords : GridDataAccess.specifyValueAccess('totalrecords', 0),

    sortFilterParameters : function(includeAll){
      var inputsWithVal = [];

      var filterSortInputs = this.grid.header.$row.find('input[type=hidden][name].filter-value, input[type=hidden][name].sort-value');
      filterSortInputs.map(function(i,item){
        var $item = $(item);
        var val = $item.val();
        if(includeAll || val){
          inputsWithVal.push(item);
        }
      });
      return $(inputsWithVal).serialize();
    },
    sortFilterParametersAsObject : function(){
      var string = this.sortFilterParameters(true);
      return host.url.param.string2Object(string);
    }
  };

  function GridControl($container) {
    if (!$container.is(PageSymbols.GRID_CONTAINER)) {
      throw new Error("$container does not seems tobe a valid gridcontrol.");
    } else {
      this.$container = $container;
    }
    console.log('GridControl construct');
    this.ENTITY_GRID_AJAX_LOCK = 0;
    this.header = new HeaderControl(this, this.$container.find(PageSymbols.GRID_HEADER));
    this.footer = new FooterControl(this, this.$container.find(PageSymbols.GRID_FOOTER));
    this.body = new BodyControl(this, this.$container.find(PageSymbols.GRID_BODY));
    this.spinner = new SpinnerControl(this, this.$container.find(PageSymbols.GRID_SPINNER));
    this.data = new GridDataAccess(this);
    this.entityData = this.$container.find('.raw-data p').data("raw-data");

    var _this = this;
    this.reloadTriggerPoint = function(ele){
      return function(){ _this.onReloadEvent(arguments);}
    }();
    this._loadEventInstallation = 0;
  };
  GridControl.prototype = {
    constructor :GridControl,
    initialized: function (/*optional*/val) {
      return this.data.initialized(val);
    },
    isMain : function () {
      var containerHolder = this.$container.parent();
      return containerHolder.data('grid-scope') == 'main';
    },
    alignHeaderAndBody: function () {
      var hTable = this.header.element().find('table');
      var bTable = this.body.element().find('table');
      var bTabelWidth = bTable.parent().width();
      hTable.outerWidth(bTabelWidth);
      bTable.outerWidth(bTabelWidth);
      this.$container.find('th').css('width', '');
    },
    getHeader: function () {
      return this.header;
    },
    getBody: function () {
      return this.body;
    },
    getFooter: function () {
      return this.footer;
    },
    getSpinner: function () {
      return this.spinner;
    },
    getRowHeight: function () {
      return this.body.getRowHeight();
    },

    // ********************** *
    // Sort Filter UI FUNC    *
    // ********************** *
    updateSortFilterUi:function(parameter){
      var paramObj = host.url.param.string2Object(parameter);
      HeaderControl.getAllCols(this.getHeader().$row).map(function(i,item){
        var $item = $(item);
        var keyname = $item.data('column-key');
        var sortkeyname = 'sort_' + keyname;

        SortHandler.setOrder($item, paramObj[sortkeyname]);
        FilterHandler.setValue($item, paramObj[keyname]);
      });
    },

    // ********************** *
    // RELOAD TRIGGERING      *
    // ********************** *
    onReloadEvent : function(e){
      //build parameters
      var parameter = this.data.parameter();
      var sfParams = this.data.sortFilterParameters();
      console.log('data-reload triggered. at grid control: ' + sfParams);

      this.updateSortFilterUi(sfParams);
      this.data.filterParameter(sfParams);

      var baseUrl = host.url.connectUrl(window.location.origin, this.data.baseUrl());
      var urldata = host.url.param.connect(parameter, sfParams);

      this.doLoadUrl(baseUrl, urldata, true, false);
    },

    // ********************** *
    // DATA FILL FUNCTIONS    *
    // ********************** *
    fill: function (data, fillrows, fillcols) {
      if (data === undefined) {
        data = this.entityData;
      }
      if (fillcols === undefined) {
        fillcols = true;
      }
      if (fillrows === undefined) {
        fillrows = true;
      }
      EntityData.processGridData(data);
      var entityInfos = data.entityInfos;
      var entities = data.entities;
      var range = entities.range;
      var gridinfo = entityInfos.details['grid'];

      if (fillcols) {
        this.header.makeColumnsAndSet(gridinfo);
        this.body.makeHeaderMirror();

        if(this.isMain()){
          var fsParamObj = this.data.sortFilterParametersAsObject();
          var urlParamObj = host.url.getParametersObject();
          for(var k in fsParamObj){
            var pv = urlParamObj[k];
            fsParamObj[k] = pv;
            if(pv !== undefined){
              delete urlParamObj[k];
            }
          }

          var fsParam = host.url.param.object2String(fsParamObj);
          var param = host.url.param.object2String(urlParamObj);
          this.data.filterParameter(fsParam?fsParam:'');
          this.data.parameter(param?param:'');
        }
      }

      if (fillrows) {
        this.body.clearTable();
        this.body.initEmptyRow(entities);
        this.body.makeRowsAndSet(gridinfo, entities);
        this.footer.setDataRange(range.lo, range.hi, entities.totalCount);
      }

      this.data.recordRanges('set', range)
        .totalRecords(entities.totalCount)
        .pageSize(entities.pageSize)
        .baseUrl(entities.baseUrl);
    },
    fillTbody: function (data, $tbody) {
      if($tbody === undefined){
        $tbody = $('<tbody>');
      }
      EntityData.processGridData(data);
      var entityInfos = data.entityInfos;
      var entities = data.entities;
      var range = entities.range;
      var gridinfo = entityInfos.details['grid'];
      BodyControl.makeRowsAndAppend(gridinfo, entities, $tbody);
      return $tbody;
    },

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

    // ********************** *
    // LOAD FUNCTIONS         *
    // ********************** *
    loadByUrl : function(url, parameter){
      this.data.baseUrl(url ? url : '');
      this.data.parameter(parameter ? parameter : '');

      this.data.filterParameter('');
      this.data.pageSize('');
      this.totalRecords('');

      header.trigger(ENTITY_RELOAD_EVENT);
    },
    loadBySortFilterParam : function (filterParameter) {
      var url = this.data.baseUrl();
      var param = this.data.parameter();

      this.data.filterParameter('');
      this.data.pageSize('');
      this.totalRecords('');

      header.trigger(ENTITY_RELOAD_EVENT);
    },

    // ********************** *
    // AJAX FUNCTIONS         *
    // ********************** *
    doLoadUrl : function(url, urldata, fillrows, fillcols){
      var _this = this;
      this.ajaxLoadData({
        url:url,
        data: urldata,
        ondata: function (response) {
          _this.fill(response.data, fillrows, fillcols);
        }
      });
    },
    ajaxLoadData : function(options){
      //url(value or function), canskipcheck, ondata, ondataloaded
      var grid = this;
      var optionsclone = $.extend({}, options);
      var paramsObj = this.data.sortFilterParametersAsObject();
      optionsclone.dataObject = paramsObj;
      var _args = arguments;

      while (!grid.acquireLock()) {
        var _this = this;
        //console.log("Couldn't acquire lock. Will try again in " + lockDebounce + "ms");
        $.doTimeout('acquirelock', lockDebounce, function () {
//          _this.ajaxLoadData(urlbuilder, ondata, ondataloaded);
          var callee = grid.ajaxLoadData;
          callee.apply(grid, _args);
        });
        return false;
      }
      if(options.canskipcheck) {
        if (options.canskipcheck()) {
          grid.releaseLock();
          return false;
        }
      }
      var url = null;
      if(options.url){
        if(typeof options.url == 'function' ){
          url = options.url();
        }else{
          url = options.url;
        }
      }
      if(url){
        grid.getSpinner().show(true);
        optionsclone.url = url;
        host.debug.log(ENABLE_URL_DEBUG, 'url: ' + url + ((optionsclone.data === undefined)? '':'?'+optionsclone.data));

        AJAX.get(optionsclone, function (response) {
          if(options.ondata) {
            options.ondata(response);
          }

           if(grid.isMain()){
             var dataObject = optionsclone.dataObject;
             var paramsStr = host.url.param.object2String(dataObject);
             var newurl = host.url.getUrlWithParameterString(paramsStr, null, url);
             host.history.replaceUrl(newurl);
           }

          grid.releaseLock();
          grid.getSpinner().show(false);
          if(options.ondataloaded) {
            options.ondataloaded();
          }
        });
      }else{
        grid.releaseLock();
      }
    },

    // ********************** *
    // EVENTS FUNCTIONS       *
    // ********************** *

    unbindEvents : function(){
      GridControl.unbindReloadEvent(this);
      (new ColumnResizer()).unbindEvents(this);
      (new SortHandler()).unbindEvents(this);
      (new FilterHandler()).unbindEvents(this);
    },
    bindEvents : function(){
      GridControl.bindReloadEvent(this);
      (new ColumnResizer()).bindEvents(this);
      (new SortHandler()).bindEvents(this);
      (new FilterHandler()).bindEvents(this);
    },
    rebindEvents : function(){
      this.unbindEvents();
      this.bindEvents();
    }

  };
  GridControl._loadEventInstallation = 0;
  GridControl.bindReloadEvent = function (grid) {
    grid.header.$row.on(ENTITY_RELOAD_EVENT, grid.reloadTriggerPoint);
    grid._loadEventInstallation++;
    console.log('GridControl.install. [' + grid._loadEventInstallation + ']');
  };
  GridControl.unbindReloadEvent = function (grid) {
    grid.header.$row.off(ENTITY_RELOAD_EVENT, this.reloadTriggerPoint);
    grid._loadEventInstallation--;
    console.log('GridControl.uninstall. [' + grid._loadEventInstallation + ']');
  };
  GridControl.rebindReloadEvent = function (grid) {
    GridControl.unbindReloadEvent(grid);
    GridControl.bindReloadEvent(grid);
  };

  GridControl.PageSymbols = PageSymbols;
  GridControl.findFromPage = function ($page) {
    var $ctrls = $page.find(PageSymbols.GRID_CONTAINER);
    var gcs = $ctrls.map(function (index, $ctrl, array) {
      var gc = new GridControl($($ctrl));
      return gc;
    });
    return gcs;
  };
  GridControl.findFirstOnPage = function () {
    var $page = $(document);
    var $ctrls = $page.find(PageSymbols.GRID_CONTAINER);
    if($ctrls.length > 0){
      return new GridControl($($ctrls[0]));
    }
  };

  GridControl.autoLoad = function ($page) {
    var gcs = GridControl.findFromPage($page);
    gcs.map(function (index, gc, array) {
        gc.fill();
    });
    return gcs;
  };

  function ColumnControl($th, fieldInfo) {
    this.$th = $th;
    if ((!$th) && fieldInfo) {
      var $col = Template.columnHeader();
      this.$th = $col;
      $col.find('.col-name').text(fieldInfo.friendlyName);
      if (!fieldInfo.gridVisible) {
        $col.css('display', 'none');
      }
      $col.find('.column-header').attr('data-column-key', fieldInfo.name);
      var iconSort = $col.find('.sort-icon');
      var iconFilter = $col.find('.filter-icon');
      if (fieldInfo.supportSort) {
        var sortValEle = $col.find('.sort-value');
        sortValEle.attr('name', 'sort_' + fieldInfo.name);
      } else {
        iconSort.hide();
      }
      if (fieldInfo.supportFilter) {
        var filterValEle = $col.find('.filter-value');
        filterValEle.attr('name', fieldInfo.name);

        var filter = makeColumnFilter(fieldInfo);
        $col.find('.entity-filter').replaceWith(filter);
      } else {
        iconFilter.hide();
      }
    }
  };
  ColumnControl.prototype = {
    element: function () {
      return this.$th;
    }
  };

  function RowControl($tr) {
    this.$tr = $tr;
  };
  RowControl.prototype = {
    element: function () {
      return this.$tr;
    },
    _makeCell: function (gridInfo, field, entity, baseUrl) {
      var fieldname = field.name;
      var fieldvalue = entity[fieldname];
      var $cell = Template.cell(fieldname, fieldvalue);
      fillCellContent(gridInfo, $cell, entity, field, fieldvalue, baseUrl);
      $cell.toggle(field.gridVisible);
      return $cell;
    },
    _makeCells: function (gridInfo, entity, baseUrl) {
      var fields = gridInfo.fields;
      var _this = this;
      var $cells = fields.map(function (field, index, array) {
        var $cell = _this._makeCell(gridInfo, field, entity, baseUrl);
        return $cell;
      });
      return $cells;
    },
    set: function (gridinfo, entity, entityIndex, baseUrl) {
      var $row = Template.row(gridinfo, entity, entityIndex);
      var $cells = this._makeCells(gridinfo, entity, baseUrl);
      $row.html($cells);
      this.$tr = $row;
      return this;
    }
  };

  function HeaderControl(grid, $header) {
    this.grid = grid;
    this.$header = $header;
    this.$row = $header.find(PageSymbols.GRID_FOOTER__ROW);
  };
  HeaderControl.prototype = {
    element: function () {
      return this.$header;
    },
    width: function () {
      return this.$header.width();
    },
    columnCount: function () {
      return this.$row.find('th').length;
    },
    makeColumnsAndSet: function (gridinfo) {
      var $cols = gridinfo.fields.map(function (fieldInfo, index, array) {
        var $col = new ColumnControl(null, fieldInfo);
        return $col.element();
      });
      this.$row.empty().wrapInner($cols);
    }
  };
  HeaderControl.getAllCols = function($colsRow){
    return $colsRow.find('.column-header.dropdown');
  };

  function FooterControl(grid, $footer) {
    this.grid = grid;
    this.$footer = $footer;
  };
  FooterControl.prototype = {
    element: function () {
      return this.$footer;
    },
    setDataRange: function (from, to, total) {
      if (total == 0) {
        from = 0;
        to = 0;
      } else {
        from += 1;
      }
      this.$footer.find('.low-index').text(from);
      this.$footer.find('.high-index').text(to);
      this.$footer.find('.total-records').text(total);
    }
  };

  function SpinnerControl(grid, $spinner) {
    this.grid = grid;
    this.$spinner = $spinner;
    this.$icon = $spinner.find(PageSymbols.GRID_SPINNER__ITEM);
  };
  SpinnerControl.prototype = {
    element: function () {
      return this.$spinner;
    },
    setOffset : function (offsetFromBodyTop) {
      var bodyHeight = this.grid.body.$body.height();
      var iconHeight = this.$icon.height();

      var offsetFromBottom = 0;
      if('middle' == offsetFromBodyTop){
        offsetFromBottom = (bodyHeight / 2);
      }else if(offsetFromBodyTop === undefined) {
        offsetFromBottom = 0;
      }else{
        offsetFromBottom = (bodyHeight - offsetFromBodyTop);
      }
      offsetFromBottom -= iconHeight / 2;
      this.$icon.css('bottom', offsetFromBottom + 'px');
    },
    show: function (show, offsetFromBodyTop) {
      if(offsetFromBodyTop !== undefined){
        this.setOffset(offsetFromBodyTop);
      }
      if (show) {
        this.$spinner.css('display', 'block');
      } else {
        this.$spinner.css('display', 'none');
        this.setOffset(undefined);
      }
    }
  };

  function BodyControl(grid, $body) {
    this.grid = grid;
    this.$body = $body;
    this.$table = $body.find('table');
    this.$theadRow = this.$table.find('thead tr');
    this.$tbody = this.$table.find('tbody');
    this.$emptyCell = this.$tbody.find('td.entity-grid-no-results');
    this.$emptyCell.attr('colspan', grid.header.columnCount());
    this.$emptyRow = this.$emptyCell.closest('tr');
  };
  BodyControl.prototype = {
    element: function () {
      return this.$body;
    },
    makeHeaderMirror: function () {
      this.$emptyCell.attr('colspan', this.grid.header.columnCount());
      var $row = this.grid.header.$row.clone();
      $row.find('th').empty();

      this.$theadRow.html($row.html());
    },
    initEmptyRow: function (entities) {
      if (entities.totalCount == 0) {
        this.$emptyRow.show();
      } else {
        this.$emptyRow.hide();
      }
    },
    clearTable: function () {
      this.$tbody.empty().append(this.$emptyRow);
    },
    makeRowsAndSet: function (gridinfo, entities) {
      BodyControl.makeRowsAndAppend(gridinfo, entities, this.$tbody);
    },
    getRowHeight: function () {
      var $row = this.$tbody.find('tr:not(.blank-padding):not(.empty-mark):first');
      return $row.height();
    }
  };
  BodyControl.makeRowsAndAppend = function (gridinfo, entities, $tbody) {
    var baseUrl = entities.baseUrl;
    var $rows = entities.details.map(function (entity, index, array) {
      var entityIndex = entities.startIndex + index;
      var row = new RowControl();
      row.set(gridinfo, entity, entityIndex, baseUrl);
      return row.element();
    });
    $tbody.append($rows);
  };

  var FilterValueHandlers ={
    string: function (entityFilter) {
      return {
        get: function(){return entityFilter.find('.filter-input').val();}
      }
    }
  };

  var FilterHandler = function(){};
  FilterHandler.prototype={
    bindEvents : function (grid) {
      var colsRow = grid.header.$row;
      colsRow.find('.input-element i.embed-delete').hide();

      colsRow.on('click', '.filter-icon',FilterHandler.clickHandler);
      colsRow.on('click', '.entity-filter span.input-element i.embed-delete', FilterHandler.inputDelClickHandler);
      colsRow.on('keyup change', '.entity-filter span.input-element input.filter-input', FilterHandler.inputChangeHandler);
      colsRow.on('click', '.entity-filter .filter-button', FilterHandler.invokeDoFilterHandler);
      FilterHandler._installation++;
      console.log('FilterHandler.install. [' + FilterHandler._installation + ']');
    },
    unbindEvents : function (grid) {
      var colsRow = grid.header.$row;

      colsRow.off('click', '.filter-icon',FilterHandler.clickHandler);
      colsRow.off('click', '.entity-filter span.input-element i.embed-delete', FilterHandler.inputDelClickHandler);
      colsRow.off('keyup change', '.entity-filter span.input-element input.filter-input', FilterHandler.inputChangeHandler);
      colsRow.off('click', '.entity-filter .filter-button', FilterHandler.invokeDoFilterHandler);
      FilterHandler._installation--;
      console.log('FilterHandler.uninstall. [' + FilterHandler._installation + ']');
    },
    rebindEvents : function(grid){this.unbindEvents(grid);this.bindEvents(grid);}
  };
  FilterHandler._installation = 0;
  FilterHandler.setValue = function (header, value) {
    $('input[type=hidden].filter-value', header).val(value);
    $('.filter-sort-container', header).toggleClass('filter-active', !!value);
    console.log('todo: FilterHandler.setValue for different filters');
  };
  FilterHandler.getValue = function (header){
    return $('input[type=hidden].filter-value', header).val();
  };
  FilterHandler.closeDropdowns = function (header) {
    $('.column-header.dropdown.show-filter').not(header).removeClass('show-filter');
  };
  FilterHandler.clickHandler=function(e){
    var $el = $(this),
      header = $el.closest('.column-header.dropdown'),
      dropdown = $('> ul', header),
      colsRow = header.closest('tr');

    setTimeout(function () {
      header.toggleClass('show-filter');
      HeaderControl.getAllCols(colsRow).not(header).removeClass('show-filter');
    }, 0);
  };
  FilterHandler.outsideClickHandler =function (e) {
    if (e.originalEvent == undefined) return;
    var $target = $(e.originalEvent.target);
    if (!($target.parents().is('.column-header.dropdown'))) {
      FilterHandler.closeDropdowns();
    }
  };
  FilterHandler.inputChangeHandler= function (e) {
    var $el = $(this),
      inputElement = $el.closest('.input-element');

    var $delIcon = inputElement.find('i.embed-delete');
    var $input = inputElement.find('input.filter-input');
    if($input){
      var newVal = $input.val();
      (!!newVal) ? $delIcon.show() : $delIcon.hide();
    }
  };
  FilterHandler.inputDelClickHandler= function (e) {
    var $el = $(this),
      inputElement = $el.closest('.input-element');

    var $delIcon = inputElement.find('i.embed-delete');
    var $input = inputElement.find('input.filter-input');
    if($input){
      $input.val('');
      $delIcon.hide();
    }
  };
  FilterHandler.invokeDoFilterHandler = function(e) {
    var $el = $(this),
      header = $el.closest('.column-header.dropdown'),
      filterValHandlerName = header.data('filter-value-handler');
    var filterValHandler = FilterValueHandlers[filterValHandlerName];
    filterValHandler = filterValHandler || FilterValueHandlers.string;
    var value = filterValHandler(header).get();
    FilterHandler.setValue(header, value);
    FilterHandler.closeDropdowns();

    header.trigger(ENTITY_RELOAD_EVENT);

  };

  var SortHandler = function(){};
  SortHandler.ORDER_DEFAULT ='_';
  SortHandler.ORDER_ASC ='asc';
  SortHandler.ORDER_DESC ='desc';
  SortHandler.prototype={
    bindEvents : function (grid) {
      var colsRow = grid.header.$row;
      colsRow.on('click', '.sort-icon',SortHandler.clickHandler);
      SortHandler._installation++;
      console.log('SortHandler.install. [' + SortHandler._installation + ']');
    },
    unbindEvents : function (grid) {
      var colsRow = grid.header.$row;
      colsRow.off('click', '.sort-icon',SortHandler.clickHandler);
      SortHandler._installation--;
      console.log('SortHandler.uninstall. [' + SortHandler._installation + ']');
    },
    rebindEvents : function(grid){this.unbindEvents(grid);this.bindEvents(grid);}
  };
  SortHandler._installation = 0;
  SortHandler.getOrder = function (header) {
    var $el = header.find('i.sort-icon');
    if ($el.is('.fa-sort-amount-asc'))
      return SortHandler.ORDER_ASC;
    if ($el.is('.fa-sort-amount-desc'))
      return SortHandler.ORDER_DESC;
    return SortHandler.ORDER_DEFAULT;
  };
  SortHandler.setOrderKey= function (header) {
    var $valEle = header.find('input[type=hidden].sort-value');
    return $valEle.attr('name');
  };
  SortHandler.setOrder= function (header, order) {
    if(!order){order =SortHandler.ORDER_DEFAULT;}
    if(this.getOrder(header) === order){
      return;
    }
    var $el = header.find('i.sort-icon');
    $el.removeClass('fa-sort-amount-desc');
    $el.removeClass('fa-sort-amount-asc');
    var $container = $el.parent('.filter-sort-container');
    var $valEle = header.find('input[type=hidden].sort-value');
    var sortVal = null;
    switch (order) {
      case SortHandler.ORDER_DESC:
        $el.addClass('fa-sort-amount-desc');
        $container.addClass('sort-active');
        sortVal = 'desc';
        break;
      case SortHandler.ORDER_ASC:
        $el.addClass('fa-sort-amount-asc');
        $container.addClass('sort-active');
        sortVal = 'asc';
        break;
      case SortHandler.ORDER_DEFAULT:
        $container.removeClass('sort-active');
        sortVal = null;
        break;
    }
    $valEle.val(sortVal);
  };
  SortHandler.calcNextOrder = function (order) {
    switch(order){
      case SortHandler.ORDER_DEFAULT:return SortHandler.ORDER_ASC;
      case SortHandler.ORDER_ASC:return SortHandler.ORDER_DESC;
      case SortHandler.ORDER_DESC:return SortHandler.ORDER_DEFAULT;
      default :return SortHandler.ORDER_DEFAULT;
    }
  };
  SortHandler.clickHandler = function(e){
    var $el = $(this),
      header = $el.closest('.column-header.dropdown'),
      dropdown = $('> ul', header),
      colsRow = header.closest('tr');

    var currentOrder = SortHandler.getOrder(header);
    var nextOrder = SortHandler.calcNextOrder(currentOrder);
    SortHandler.setOrder(header, nextOrder);

    HeaderControl.getAllCols(colsRow).not(header).map(function(i,item){
      SortHandler.setOrder($(item), SortHandler.ORDER_DEFAULT);
    });
    header.trigger(ENTITY_RELOAD_EVENT);
  };

  var ColumnResizer = function () {};
  ColumnResizer.prototype = {
    rebindEvents:function(grid){this.unbindEvents(grid);this.bindEvents(grid);},
    bindEvents: function (grid) {
      var $headerTableThead = grid.header.$row;
      $headerTableThead.on('mousedown', 'th div.resizer', ColumnResizer._mousedown);

      ColumnResizer._installation++;
      console.log('ColumnResizer.install. [' + ColumnResizer._installation + ']');
    },
    unbindEvents : function(grid){
      var $headerTableThead = grid.header.$row;
      $headerTableThead.off('mousedown', 'th div.resizer', ColumnResizer._mousedown);

      ColumnResizer._installation--;
      console.log('ColumnResizer.uninstall. [' + ColumnResizer._installation + ']');
    }
  };
  ColumnResizer._installation = 0;
  ColumnResizer.resizing = {
    active: (function(){var act=false;
      return function(a){
        if(a === undefined)return act;
        act = a;
      };
    })(),
    headColumnRow: undefined,
    bodyColumnRow: undefined,
    columnIndex: 0,
    startX: undefined,
    startWidths: undefined,
    totalWidth: 0
  };
  ColumnResizer._mousedown = function (e) {
    var $resizeEle = $(this).closest('th');
    var container = $resizeEle.closest(PageSymbols.GRID_CONTAINER);
    var $headerColumnRow = container.find(PageSymbols.GRID_HEADER + ' ' + PageSymbols.GRID_FOOTER__ROW);
    var $bodyColumnRow = container.find(PageSymbols.GRID_BODY + ' ' + PageSymbols.GRID_BODY__THEAD_ROW);

    var resizing = ColumnResizer.resizing;
    resizing.active(true);
    resizing.headColumnRow = $headerColumnRow;
    resizing.bodyColumnRow = $bodyColumnRow;
    resizing.columnIndex = $resizeEle.index();
    resizing.startX = e.pageX;
    resizing.startWidths = [];
    resizing.totalWidth = 0;

    resizing.headColumnRow.find('th').each(function (index, element) {
      resizing.startWidths.push($(this).outerWidth());
      resizing.totalWidth += $(this).outerWidth();
    });
    $(document).disableSelection();
  };
  ColumnResizer._mousemove = function (e) {
    var resizing = ColumnResizer.resizing;
    if (resizing.active()) {
      var headColumnRow = resizing.headColumnRow;
      var headerTableOffset = headColumnRow.offset();
      if (e.pageX < (headerTableOffset.left - 100) || e.pageX > (headerTableOffset.left + headColumnRow.width() + 100) ||
        (e.pageY < (headerTableOffset.top - 100)) || (e.pageY > (headerTableOffset.top + headColumnRow.height() + 100))) {
        resizing.active(false);
        $(document).enableSelection();
        return;
      }

      var minColumnWidth = 30;
      var index = resizing.columnIndex;
      var widthDiff = (e.pageX - resizing.startX);
      var minAllow = -resizing.startWidths[index] + minColumnWidth;
      var maxAllow = resizing.startWidths[index + 1] - minColumnWidth;

      if (widthDiff < minAllow) {widthDiff = minAllow;}
      else if (widthDiff > maxAllow) {widthDiff = maxAllow;}

      var newLeftWidth = resizing.startWidths[index] + widthDiff;
      var newRightWidth = resizing.startWidths[index + 1] - widthDiff;

      var newWidths = resizing.startWidths.slice(0);
      newWidths[index] = newLeftWidth;
      newWidths[index + 1] = newRightWidth;

      var headerCols = resizing.headColumnRow.find('th');
      var bodyCols = resizing.bodyColumnRow.find('th');
      for (var i = 0; i < resizing.startWidths.length; i++) {
        $(headerCols[i]).outerWidth(newWidths[i]);
        $(bodyCols[i]).outerWidth(newWidths[i]);
      }
    }
  };
  ColumnResizer._mouseup = function () {
    var resizing = ColumnResizer.resizing;
    if (resizing.active()) {
      resizing.active(false);
      $(document).enableSelection();
    }
  };

  var onDocReady = function ($doc) {
    GridControl.autoLoad($doc);
    $(document).bind('mousemove',ColumnResizer._mousemove);
    $(document).bind('mouseup', ColumnResizer._mouseup);
    $doc.on('click', 'body, html',FilterHandler.outsideClickHandler);
  };

  host.entity = {
    data: EntityData,
    grid: GridControl,
    initOnDocReady: onDocReady
  };
})($, tallybook);