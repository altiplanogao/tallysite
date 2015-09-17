/**
 * Created by Gao Yuan on 2015/7/1.
 */
;
var tallybook = tallybook || {};

(function ($, host) {
  'use strict';

  //namespace
  var Range = host.Range;
  var RangeArrayHelper = Range.rangeArrayHelper;
  var AJAX = host.ajax;

  //const
  var lockDebounce = 200;
  var ENABLE_URL_DEBUG = true;

  var ReservedParameter={
    StartIndex :'startIndex',
    PageSize : 'pageSize'
  };
  //page symbols
  var GridSymbols = {
    GRID_CONTAINER: "div.entity-grid-container",
    GRID_CONTAINER_CLASS: "entity-grid-container",

    GRID_TOOLBAR: ".toolbar",
    GRID_HEADER: ".header",
    GRID_FOOTER: ".footer",
    GRID_BODY: ".body",
    GRID_SPINNER: "span.spinner",

    GRID_HEADER__ROW: "table thead tr",
    GRID_BODY__TABLE: ".body table",
    GRID_BODY__THEAD_ROW: "table thead tr",
    GRID_SPINNER__ITEM: 'i.spinner-item'
  };

  var Template = {
    columnHeader: (function () {
      var template = $('.template.grid-template .column-header-template');
      template.removeClass('column-header-template');
      return function () {return template.clone();};
    })()
  };

//var filterExample={
  //  data-filter-type : string, integer-range, decimal range, foreign-key
  //  data-support-field-types : string, email, phone, boolean  (enum FieldType)
  //}
  var FilterDefinition = function(initializer, valueaccess){
    this.initializer = initializer;
    this.valueaccess = valueaccess;
  }
  var FilterTemplates = {
    definitions : { // keys are filter-types
      string: new FilterDefinition(
        function (filter, fieldInfo) {
          var $input = $('input.filter-input', filter);
          $input.attr('data-name', fieldInfo.name);
          $input.attr('placeholder', fieldInfo.friendlyName);
        },
        {//get: ui value -> string; set: string -> ui value
          get: function (entityFilter) {
            return entityFilter.find('.filter-input').val();
          },
          set: function (entityFilter, val) {
            entityFilter.find('i.embed-delete').toggle(!!val);
            return entityFilter.find('.filter-input').val(val);
          }
        }
      ),
      enumeration : new FilterDefinition(
        function (filter, fieldInfo) {
          var $options = $('div.options', filter);
          var optionsVals = fieldInfo.facets.Enum.options;
          var optionsNames = fieldInfo.facets.Enum.friendlyNames;
          optionsVals.forEach(function(opv){
            //<span class="option"><input type="checkbox"/>BBB</span>
            var opName = optionsNames[opv];
            var opipt = $('<input>', { 'type':"checkbox", 'name': fieldInfo.name, 'value': opv});
            var op = $('<span>',{ 'class':"option"}).html(opipt).append(opName);
            $options.append(op);
          });
        },
        {//get: ui value -> string; set: string -> ui value
          get: function (entityFilter) {
            var $options = $('div.options span.option input[type=checkbox]', entityFilter);
            var checkedVals = [];
            $options.filter(function(index, item){return item.checked;})
              .each(function(index, item){checkedVals.push($(item).attr('value'));});
            var checkedValsJoined = checkedVals.join(',');
            return checkedValsJoined;
          },
          set: function (entityFilter, val) {
            var selectedVals = [];
            if(val){
              selectedVals = val.split(',');
            }
            var $options = $('div.options span.option input[type=checkbox]', entityFilter);
            $options.each(function(index, item){
              var $item = $(item);
              var val = $item.attr('value');
              item.checked = !!(selectedVals.indexOf(val) >= 0);
            })
          }
        }
      )
    },
    /**
     * Get the filter template by field type
     * @param fieldType : the field type of the template
     */
    _getFilterTemplate: (function () {
      var filterMap = {};
      var $filters = $('.template.grid-template table.entity-filters-table > tbody ul.entity-filter');
      $filters.each(function (index, fltr) {
        var $filter = $(fltr);
        var fldtypes = $filter.attr('data-support-field-types').split(',');
        fldtypes.forEach(function (fldtp) {
          filterMap[fldtp.toLowerCase()] = $filter;
        })
      });
      return function (fieldType) {
        var filterTmplt = filterMap[fieldType];
        filterTmplt = filterTmplt? filterTmplt : filterMap['default'];
        return filterTmplt.clone();
      }
    })(),
    createFilterByFieldInfo : function(fieldInfo){
      var fieldType = fieldInfo.fieldType.toLowerCase();
      var filter = FilterTemplates._getFilterTemplate(fieldType);
      var filterType = filter.data('filter-type');
      $('input.filter-property', filter).val(fieldInfo.name);
      $('input.sort-property', filter).val('sort_' + fieldInfo.name);

      var definition = this.definitions[filterType];
      if(definition){
        definition.initializer && definition.initializer(filter, fieldInfo);
      }
      return filter;
    }
  };

//var cellExample={
  //  data-cell-type : string, integer, decimal, foreign-key
  //  data-support-field-types : string, email, phone, boolean
  //}
  var CellCreationContext = function(idField, baseUrl){
    this.idField = idField;
    this.baseUrl = baseUrl;
  }
  var CellTemplates = {
    /**
     * Get Cell Maker by field Type
     * @params fieldType: the field type
     */
    _cellTemplateByFieldType : (function(){
      var CellTemplateEntry = function(celltype, supportedFieldTypes, cellmaker){
        this.celltype = celltype;
        this.supportedFieldTypes = supportedFieldTypes.split(',');
        this.cellmaker = cellmaker;
      };
      var cellentries = [
        new CellTemplateEntry('default', 'default', function (entity, fieldInfo, cellCreationContext) {
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname];
          return fieldvalue;
        }),
        new CellTemplateEntry('name', 'name', function(entity, fieldInfo, cellCreationContext) {
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname];
          var url = EntityDataHandler.makeUrl(cellCreationContext.idField, entity, cellCreationContext.baseUrl);
          var $content = $('<a>', {'href': url}).text(fieldvalue);
          return $content;
        }),
        new CellTemplateEntry('email', 'email', function(entity, fieldInfo, cellCreationContext){
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname];
          var $content = $('<a>', {'href': 'mailto:' + fieldvalue}).text(fieldvalue);
          return $content;
        }),
        new CellTemplateEntry('enumeration', 'enumeration', function(entity, fieldInfo, cellCreationContext){
          var options = fieldInfo.facets.Enum.options;
          var optionNames = fieldInfo.facets.Enum.friendlyNames;
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname];
          return optionNames[fieldvalue];
        }),
        new CellTemplateEntry('phone', 'phone', function (entity, fieldInfo, cellCreationContext) {
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname];
          var segLen = 4;
          var formatedPhone = '';
          if (fieldvalue.length <= segLen) {
            formatedPhone = fieldvalue;
          } else {
            var segCount = Math.ceil(fieldvalue.length / segLen);
            var start = 0; var end = fieldvalue.length % segLen;
            end = (end == 0) ? segLen : end;
            var segs = [];
            for (var i = 0; i < segCount; ++i) {
              segs[i] = fieldvalue.substring(start, end);
              start = end; end = start + segLen;
            }
            formatedPhone = segs.join('-');
          }
          var $content = $('<a>', {'href' : 'tel:' + fieldvalue}).text(formatedPhone);
          return $content;
        })
      ];
      var fieldType2CellType = {};
      var cellType2CellMaker = {};
      cellentries.forEach(function(ce){
        if(ce.supportedFieldTypes){
          ce.supportedFieldTypes.forEach(function(fieldType){
            fieldType2CellType[fieldType] = ce.celltype;
          });
        }
        cellType2CellMaker[ce.celltype] = ce.cellmaker;
      });
      return function(fieldType){
        var cellType = fieldType2CellType[fieldType];
        cellType = (cellType ? cellType : 'default');
        return cellType2CellMaker[cellType];
      }
    })(),
    createCellByFieldInfo : function(entity, fieldInfo, cellCreationContext){
      var fieldType = fieldInfo.fieldType.toLowerCase();
      var cellmaker = this._cellTemplateByFieldType(fieldType);
      var cellcontent = cellmaker(entity, fieldInfo, cellCreationContext);
      return cellcontent;
    }

  }

  var EntityDataHandler = {
    processGridData: function (data) {
      var entities = data.entities;
      var range = {lo: entities.startIndex, hi: entities.startIndex + entities.records.length};
      entities.range = range;
      entities.baseUrl = data.baseUrl;

      var linksObj = {};
      data.links.forEach(function(t,i){
        linksObj[t.rel]=t.href;
      });
      data.linksObj = linksObj;

      var entityInfos = data.info;
      var gridinfo = this.processGridInfo(entityInfos);

      return data;
    },
    processGridInfo: function (entityInfos) {
      var gridInfo = entityInfos.details['pageGrid'];
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
    makeUrl: function (idField, entity, baseUrl) {
      return baseUrl + '/' + entity[idField];
    }
  };

  function GridDataAccess(grid) {
    this.gridcontainer = GridControl.findContainerElement(grid);
  };
  GridDataAccess.prototype = {
    element:function(){return this.gridcontainer;},
    recordRanges: function (/* optional: get set add */op, val) {
      var $container = this.gridcontainer;
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
            RangeArrayHelper.addRange(ranges, new Range(item));
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
            RangeArrayHelper.addRange(ranges, rg);
            ranges = RangeArrayHelper.merge(ranges);
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
    initialized : host.elementValueAccess.defineGetSet('initialized', false),
    baseUrl: host.elementValueAccess.defineGetSet('baseurl','/'),
    parameter : host.elementValueAccess.defineGetSet('parameter',''),
    criteriaParameter : host.elementValueAccess.defineGetSet('criteria-parameter',''),
    pageSize : host.elementValueAccess.defineGetSet('pagesize',''),
    totalRecords : host.elementValueAccess.defineGetSet('totalrecords', 0),
    selectedIndex : host.elementValueAccess.defineGetSet('selected-index', -1),

    gatherAllCriteriaParameterKeys : function(){
      var keys = [];
      var filterSortInputs = this.gridcontainer.find(GridSymbols.GRID_HEADER).find(GridSymbols.GRID_HEADER__ROW)
        .find('input[type=hidden][name].filter-value, input[type=hidden][name].sort-value');
      filterSortInputs.map(function(i,item){
        var name = $(item).attr('name');
        keys.push(name);
      });
      return keys;
    },
    //make parameter string: http://abc.com/xxx?a=1&b=2&b=3&c=4 (support multi-value for a particular key)
    gatherCriteriaParameter : function(includeAll){
      var inputsWithVal = [];
      var filterSortInputs = this.gridcontainer.find(GridSymbols.GRID_HEADER).find(GridSymbols.GRID_HEADER__ROW)
          .find('input[type=hidden][name].filter-value, input[type=hidden][name].sort-value');
      filterSortInputs.map(function(i,item){
        var $item = $(item);
        var val = $item.val();
        if(includeAll || val){
          if($item.data("multi-value")){
            var vals = val.split(',');
            vals.forEach(function(singleVal, index, array){
              var $tmpInput = $('<input>', {'name': $item.attr('name'), 'value' : singleVal});
              inputsWithVal.push($tmpInput[0]);
            });
          }else{
            inputsWithVal.push(item);
          }
        }
      });
      return $(inputsWithVal).serialize();
    },
    gatherCriteriaParameterAsObject : function(includeAll){
      var string = this.gatherCriteriaParameter(includeAll);
      return host.url.param.stringToData(string, includeAll);
    }
  };

  var ENTITY_RELOAD_EVENT = 'entity-reload';
  function LoadEventData (val){
    this._trigger = LoadEventData.source.NONE;
    this.trigger(val);
  };
  LoadEventData.prototype={
    trigger : function(val){
      if(val === undefined){return this._trigger;}
      this._trigger = val;
    },
    triggerFrom : function(source){
      return this._trigger == source;
    }
  }
  LoadEventData.source={
    UI : 'ui',
    URL: 'url',
    PARAMETER : 'parameter',
    NONE : 'none'
  };

  function GridControl($container) {
    if (!$container.is(GridSymbols.GRID_CONTAINER)) {
      throw new Error("$container does not seems tobe a valid gridcontrol.");
    } else {
      this.$container = $container;
    }
    console.log('GridControl construct');
    this.ENTITY_GRID_AJAX_LOCK = 0;
    this.header = new HeaderControl(this);
    this.footer = new FooterControl(this);
    this.body = new BodyControl(this);
    this.spinner = new SpinnerControl(this);
    this.data = new GridDataAccess(this);
  };
  GridControl.prototype = {
    constructor :GridControl,
    dataContent : function(/*optional*/val){
      var $ele = this.$container.find('.data-content p');
      if(val === undefined){
        return $ele.data('content');
      }else{
        $ele.data('content', val);
      }
    },
    initialized: function (/*optional*/val) {
      return this.data.initialized(val);
    },
    isMain : function () {
      return this.$container.data('grid-scope') == 'main';
    },
    alignHeaderAndBody: function () {
      var hTable = this.header.element().find('table');
      var bTable = this.body.element().find('table');
      var bTabelWidth = bTable.parent().width();
      hTable.outerWidth(bTabelWidth);
      bTable.outerWidth(bTabelWidth);
      this.$container.find('th').css('width', '');
      var hRow = hTable.find('thead tr');
      var percents = hRow.attr('data-col-percents');
      if(percents){
        percents = percents.split(',');
        GridControl.updateColumnWidth(hRow, bTable.find('thead tr'), percents, bTabelWidth);
      }
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
      var paramObj = host.url.param.stringToData(parameter);
      HeaderControl.getAllCols(this.getHeader().$row).map(function(i,item){
        var $item = $(item);
        var filterValEle = $item.find('.filter-value');
        var keyname = $item.data('column-key');
        var sortkeyname = 'sort_' + keyname;
        var filterVal = paramObj[keyname];
        if(filterValEle.data('multi-value') && (!!filterVal)){
          filterVal = filterVal.join(',');
        }

        SortHandler.orders.setOrder($item, paramObj[sortkeyname]);
        FilterHandler.setValue($item, filterVal);

        //update filter
        var $filter = $item.find('.entity-filter');
        var filterType = $filter.data('filter-type');

        if(filterType){
          var valueaccess = FilterTemplates.definitions[filterType].valueaccess;
          valueaccess.set($filter, filterVal);
        }
      });
    },

    // ********************** *
    // RELOAD TRIGGERING      *
    // ********************** *
    doLoadByEvent : function(e, loadEvent){
      //build parameters
      var griddata = new GridDataAccess(this);
      var params = griddata.parameter();
      if(loadEvent.triggerFrom(LoadEventData.source.UI)){
        var cparams = griddata.gatherCriteriaParameter();
        griddata.criteriaParameter(cparams?cparams:'');
      }else if(loadEvent.triggerFrom(LoadEventData.source.URL)){
        var pObj = this.splitParameter(params);
        griddata.parameter(pObj.parameter);
        params = pObj.parameter;
        griddata.criteriaParameter(pObj.cparameter);
        this.updateSortFilterUi(pObj.cparameter);
      }else if(loadEvent.triggerFrom(LoadEventData.source.PARAMETER)){
        var cparams = griddata.criteriaParameter();
        this.updateSortFilterUi(cparams);
      }
      var cparams = griddata.criteriaParameter();

      var baseUrl = host.url.connectUrl(window.location.origin, griddata.baseUrl());
      var urldata = host.url.param.connect(params, cparams);

      this.doLoadUrl(baseUrl, urldata, loadEvent, true, false);
    },

    // ********************** *
    // DATA FILL FUNCTIONS    *
    // ********************** *
    fill: function (data, fillrows, fillcols) {
      var griddata = new GridDataAccess(this);
      if (data === undefined) {
        data = this.dataContent();
      }
      if (fillcols === undefined) {
        fillcols = true;
      }
      if (fillrows === undefined) {
        fillrows = true;
      }
      EntityDataHandler.processGridData(data);
      var entityInfos = data.info;
      var entities = data.entities;
      var range = entities.range;
      var gridinfo = entityInfos.details['pageGrid'];

      (new ToolbarHandler()).init(this, gridinfo, data.actions, data.linksObj);

      if (fillcols) {
        this.header.makeColumnsAndSet(gridinfo);
        this.body.makeHeaderMirror();

        if(this.isMain()){
          this.fillParameterByUrl(window.location.href)
        }
        var cparams = griddata.criteriaParameter();
        this.updateSortFilterUi(cparams);
      }

      if (fillrows) {
        this.body.clearTable();
        this.body.initEmptyRow(entities);
        this.body.makeRowsAndSet(gridinfo, entities);
        this.footer.setDataRange(range.lo, range.hi, entities.totalCount);
      }

      griddata.recordRanges('set', range)
        .totalRecords(entities.totalCount)
        .pageSize(entities.pageSize)
        .baseUrl(entities.baseUrl);
    },
    splitUrlParameter : function(url){
      var paramStr = host.url.getParameter(url);
      return this.splitParameter(paramStr);
    },
    splitParameter : function(paramsStr){
      var paramObj = host.url.param.stringToData(paramsStr);
      var griddata = new GridDataAccess(this);
      //Make sure column ui already built
      var cParamKeys = griddata.gatherAllCriteriaParameterKeys();

      var cParamObj = {};
      cParamKeys.forEach(function(ckey, index){
        var pv = paramObj[ckey];
        cParamObj[ckey] = pv;
        if(pv !== undefined){
          delete paramObj[ckey];
        }
      });

      var resvParamObj={};
      for(var rkeyName in ReservedParameter){
        var rkey = ReservedParameter[rkeyName];
        var pv = paramObj[rkey];
        resvParamObj[rkey] = pv;
        if(pv !== undefined){
          delete paramObj[rkey];
        }
      }
      return {
        parameter : host.url.param.dataToString(paramObj),
        cparameter : host.url.param.dataToString(cParamObj),
        rparameter : host.url.param.dataToString(resvParamObj)
      }
    },
    fillParameterByUrl:function(url){
      var params = this.splitUrlParameter(url);
      var griddata = new GridDataAccess(this);

      griddata.baseUrl(host.url.getPath(url));
      griddata.parameter(params.parameter);
      griddata.criteriaParameter(params.cparameter);
    },
    fillTbody: function (data, $tbody) {
      if($tbody === undefined){
        $tbody = $('<tbody>');
      }
      EntityDataHandler.processGridData(data);
      var entityInfos = data.info;
      var entities = data.entities;
      var range = entities.range;
      var gridinfo = entityInfos.details['pageGrid'];
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
      GridControl.loadByUrl(this.$container, url, parameter);
    },
    loadBySortFilterParam : function (criteriaParameter) {
      GridControl.loadBySortFilterParam(this.$container, criteriaParameter);
    },

    // ********************** *
    // AJAX FUNCTIONS         *
    // ********************** *
    doLoadUrl : function(url, urldata, loadEvent,  fillrows, fillcols){
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
      var paramsObj = host.url.param.stringToData(options.data);
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
        if(typeof options.url == 'function' ){ url = options.url();}
        else{ url = options.url;}
      }
      if(url){
        grid.getSpinner().show(true);
        optionsclone.url = url;
        host.debug.log(ENABLE_URL_DEBUG, 'url: ' + url + ((!optionsclone.data)? '':'?'+optionsclone.data));

        AJAX.get(optionsclone, {
          success:function (response) {
            if(options.ondata) {
              options.ondata(response);
            }

            if(grid.isMain()){
              var dataObject = optionsclone.dataObject;
              var paramsStr = host.url.param.dataToString(dataObject);
              var newurl = host.url.getUrlWithParameterString(paramsStr, null, url);
              //var skipParam = [ReservedParameter.PageSize];
              newurl = host.url.getUrlWithParameter(ReservedParameter.PageSize, null, null, newurl);
              host.history.replaceUrl(newurl);
            }

            if(options.ondataloaded) {
              options.ondataloaded();
            }
          },
          complete:function(jqXHR, textStatus){
            grid.releaseLock();
            grid.getSpinner().show(false);
          }}
        );
      }else{
        grid.releaseLock();
      }
    },

    // ********************** *
    // EVENTS FUNCTIONS       *
    // ********************** *

    unbindEvents : function(){
      GridControl.eh.unbindUiEvent(this.$container);
      ColumnResizer.eh.unbindEvents(this.$container);
      SortHandler.eh.unbindEvents(this.$container);
      (new FilterHandler()).unbindEvents(this);
      (new ToolbarHandler()).unbindEvents(this);
    },
    bindEvents : function(){
      GridControl.eh.bindUiEvent(this.$container);
      ColumnResizer.eh.bindEvents(this.$container);
      SortHandler.eh.bindEvents(this.$container);
      (new FilterHandler()).bindEvents(this);
      (new ToolbarHandler()).bindEvents(this);
    },
    rebindEvents : function(){
      this.unbindEvents();
      this.bindEvents();
    }
  };
  GridControl.GridSymbols = GridSymbols;
  GridControl.ReservedParameter = ReservedParameter;
  /**
   * Reload event bind-ed on the .container element
   * @type {{_eventInstall: number, bindUiEvent: Function, unbindUiEvent: Function, fireReloadEvent: Function, rowClickHandler: Function}}
   */
  GridControl.eh= {
    _eventInstall : 0,
    bindUiEvent: function ($container) {
      $container.on(ENTITY_RELOAD_EVENT, this.reloadEventHandler);
      $container.on('click', 'tr.data-row', this.rowClickHandler);

      GridControl.eh._eventInstall++;
      console.log('GridControl.install. [' + GridControl.eh._eventInstall + ']');
    },
    unbindUiEvent: function ($container) {
      $container.off(ENTITY_RELOAD_EVENT, this.reloadEventHandler);
      $container.off('click', 'tr.data-row', this.rowClickHandler);

      GridControl.eh._eventInstall--;
      console.log('GridControl.uninstall. [' + GridControl.eh._eventInstall + ']');
    },
    fireReloadEvent: function ($ele, reloadEvent) {
      var $container = GridControl.findContainerElement($ele);
      var header = $container.find(GridSymbols.GRID_HEADER);
      var griddata = new GridDataAccess($container);
      griddata.totalRecords('');
      griddata.recordRanges('set', '0-0');

      header.trigger(ENTITY_RELOAD_EVENT, reloadEvent);
    },
    reloadEventHandler : function(e, reloadEvent){
      var $el = $(this),
        grid = GridControl.findContainerElement($el);
      var gridCtrl = new GridControl(grid);
      gridCtrl.doLoadByEvent(e, reloadEvent);
    },
    rowClickHandler: function (e) {
      var $el = $(this),
        $row = $el.closest('tr.data-row'),
        $tbody = $row.closest('tbody');
      var dataaccess = (new GridDataAccess($row));
      if ($row.length == 0) {
        dataaccess.selectedIndex(-1);
        return;
      }

      var oldindex = dataaccess.selectedIndex();
      var newindex = $row.attr('data-entity-index');
      if (newindex == oldindex) {newindex = -1;}

      var $oldRow = (oldindex == -1) ? null : $tbody.find('tr[data-entity-index=' + oldindex + '].data-row');
      if (!!$oldRow)$oldRow.removeClass('selected');

      var selected = $row.toggleClass('selected', (newindex != -1)).is('.selected');
      dataaccess.selectedIndex(newindex);
      var dataUrl = ((!!(newindex >= 0))? $row.attr('data-url') : null);

      var gridEle = GridControl.findContainerElement($row);
      (new ToolbarHandler()).switchElementActionUrl(gridEle, dataUrl)
    }
  };
  GridControl.updateColumnWidth = function (headColRow, bodyColRow, newWidths, totalWidth) {
    var widths = newWidths;
    if(!!totalWidth){
      widths = newWidths.map(function(t){return totalWidth*t;});
    }
    var headerCols = headColRow.find('th');
    var bodyCols = bodyColRow.find('th');
    var cols = Math.min(headerCols.length, bodyCols.length);
    for (var i = 0; i < cols; i++) {
      $(headerCols[i]).outerWidth(widths[i]);
      $(bodyCols[i]).outerWidth(widths[i]);
    }
  }

  GridControl.findContainerElement = function(anyEle){
    var gridEle = null;
    if(anyEle instanceof GridControl){
      gridEle = anyEle.$container;
    } else {
      var gridIsParent = anyEle.closest(GridSymbols.GRID_CONTAINER);
      if(gridIsParent.length == 1){
        gridEle = $(gridIsParent[0]);
      }else if(gridIsParent.length == 0){
        gridEle = $(anyEle.find(GridSymbols.GRID_CONTAINER)[0]);
      }
    }
    return gridEle;
  };
  GridControl.findFromPage = function ($page) {
    var $ctrls = $page.find(GridSymbols.GRID_CONTAINER);
    var gcs = $ctrls.map(function (index, $ctrl, array) {
      var gc = new GridControl($($ctrl));return gc;
    });
    return gcs;
  };
  GridControl.findFirstOnPage = function () {
    var $page = $(document);
    var $ctrls = $page.find(GridSymbols.GRID_CONTAINER);
    if($ctrls.length > 0){return new GridControl($($ctrls[0]));}
  };
  GridControl.autoLoad = function ($page) {
    var gcs = GridControl.findFromPage($page);
    gcs.map(function (index, gc, array) {gc.fill();});
    return gcs;
  };

  GridControl.loadBySortFilterParam = function (gridContainer, criteriaParameter) {
    var griddata = new GridDataAccess(gridContainer);

    var url = griddata.baseUrl();
    var param = griddata.parameter();

    griddata.criteriaParameter(criteriaParameter).pageSize('').totalRecords('');

    GridControl.eh.fireReloadEvent(gridContainer.find(GridSymbols.GRID_HEADER), new LoadEventData(LoadEventData.source.PARAMETER));
  }
  GridControl.loadByUrl = function(gridContainer, url, parameter){
    var griddata = new GridDataAccess(gridContainer);

    var inUrl = host.url.getBaseUrl(url);
    parameter = host.url.param.connect( host.url.getParameter(url),parameter);

    griddata.baseUrl(inUrl ? inUrl : '');
    griddata.parameter('').criteriaParameter('').pageSize('').totalRecords('');
    griddata.parameter(parameter ? parameter : '');

    GridControl.eh.fireReloadEvent(gridContainer.find(GridSymbols.GRID_HEADER), new LoadEventData(LoadEventData.source.URL));
  }

  function ColumnControl($th) {
    this.$th = $th;
  };
  ColumnControl.prototype = {
    element: function () {
      return this.$th;
    },
    makeElement : function(fieldInfo){
      if (fieldInfo) {
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
        if (fieldInfo.gridVisible && fieldInfo.supportFilter) {
          var filterValEle = $col.find('.filter-value');
          filterValEle.attr('name', fieldInfo.name);
          if(fieldInfo.fieldType == "ENUMERATION"){
            filterValEle.attr("data-multi-value", "true");
            filterValEle.data("multi-value", true);
          }

          var filter = FilterTemplates.createFilterByFieldInfo(fieldInfo);
          $col.find('.entity-filter').replaceWith(filter);
        } else {
          iconFilter.hide();
        }
      }
      return this;
    }
  };

  function RowControl($tr) {
    this.$tr = $tr;
  };
  RowControl.prototype = {
    element: function () {
      return this.$tr;
    },
    _makeCellContainer: function (fieldname, fieldvalue) {
      var obj = $("<td>");
      obj.attr("data-fieldname", fieldname);
      obj.attr("data-fieldvalue", fieldvalue);
      return obj;
    },
    _makeCell: function ( field, entity, cellCreationContext) {
      var fieldname = field.name;
      var fieldvalue = entity[fieldname];
      var $cell = this._makeCellContainer(fieldname, fieldvalue);
      var content = CellTemplates.createCellByFieldInfo(entity, field, cellCreationContext);
      $cell.html(content);
      $cell.toggle(field.gridVisible);

      return $cell;
    },
    _makeCells: function (fields, entity, cellCreationContext) {
      var _this = this;
      var $cells = fields.map(function (field, index, array) {
        var $cell = _this._makeCell(field, entity, cellCreationContext);
        return $cell;
      });
      return $cells;
    },
    _makeRowContainer: function (gridinfo, entity, entityIndex, cellCreationContext) {
      var url = EntityDataHandler.makeUrl(cellCreationContext.idField, entity, cellCreationContext.baseUrl);
      var $row = $('<tr>', {
        'class' : "data-row",
        'data-id': entity[gridinfo.idField],
        'data-name': entity[gridinfo.nameField],
        'data-entity-index' : entityIndex,
        'data-url' : url
      });
      return $row;
    },
    fillByEntity: function (gridinfo, entity, entityIndex, cellCreationContext) {
      var $row = this._makeRowContainer(gridinfo, entity, entityIndex, cellCreationContext);
      var $cells = this._makeCells(gridinfo.fields, entity, cellCreationContext);
      $row.html($cells);
      this.$tr = $row;
      return this;
    }
  };

  function ToolbarHandler(){};
  ToolbarHandler.prototype = {
    init : function(grid, gridinfo, actions, linksObj){
      var $ele = this.element(grid);
      var searchGrp = $ele.find('.search-group');
      if(gridinfo.primarySearchField){
        searchGrp.show();
        searchGrp.attr('data-search-column', gridinfo.primarySearchField);
        $ele.find('i.embed-delete').hide();
        $ele.find('input.search-input').attr('data-name', gridinfo.primarySearchField).attr('placeholder', gridinfo.primarySearchFieldFriendly).val('');
      }else{
        searchGrp.hide();
      }
      var actionGrp = $ele.find('.action-group');
      (new ActionGroup(actionGrp)).setup(actions, linksObj);
    },
    switchElementActionUrl: function (grid, dataUrl) {
      var $ele = this.element(grid);
      (new ActionGroup($ele.find('.action-group'))).switchElementActionUrl(dataUrl);
     },
    element : function (grid){
      return ToolbarHandler.findToolbarElement(grid);
    },
    bindEvents : function(grid){
      var $ele = this.element(grid);
      $ele.on('keyup change focusin', 'input.search-input', ToolbarHandler.eh.inputChangeHandler);
      $ele.on('click', 'i.embed-delete', ToolbarHandler.eh.inputDelClickHandler);
      $ele.on('click', '.btn.search-btn', ToolbarHandler.eh.invokeDoFilterHandler);
      $ele.on('keypress', '.search-input', ToolbarHandler.eh.invokeKeyTriggerDoFilterHandler);
    },
    unbindEvents : function(grid){
      var $ele = this.element(grid);
      $ele.off('keyup change focusin', 'input.search-input', ToolbarHandler.eh.inputChangeHandler);
      $ele.off('click', 'i.embed-delete', ToolbarHandler.eh.inputDelClickHandler);
      $ele.off('click', '.btn.search-btn', ToolbarHandler.eh.invokeDoFilterHandler);
      $ele.off('keypress', '.search-input', ToolbarHandler.eh.invokeKeyTriggerDoFilterHandler);
    }
  };
  ToolbarHandler.findToolbarElement = function(anyElement){
    var gridEle = GridControl.findContainerElement(anyElement);
    return gridEle.find(GridSymbols.GRID_TOOLBAR);
  };
  ToolbarHandler.eh = {
    inputChangeHandler: function (e) {
      var $el = $(this),
        inputElement = $el.closest('.search-input-element');

      var $input = inputElement.find('input.search-input');
      if ($input) {
        var newVal = $input.val();
        inputElement.find('i.embed-delete').toggle(!!newVal);
      }
    },
    inputDelClickHandler: function (e) {
      var $el = $(this),
        inputElement = $el.closest('.search-input-element');

      var $delIcon = inputElement.find('i.embed-delete');
      var $input = inputElement.find('input.search-input');
      if ($input) {
        $delIcon.hide();
        $input.val('').focus();
      }
    },
    invokeKeyTriggerDoFilterHandler: function (event) {
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode == '13') {
        ToolbarHandler.eh.invokeDoFilterHandler(event);
        event.stopPropagation();
      }
    },
    invokeDoFilterHandler: function (e) {
      var $el = $(e.currentTarget);
      var $inputGroup = $el.closest('.search-group');
      var inputVal = $inputGroup.find('input.search-input').val();
      var searchColumn = $inputGroup.attr('data-search-column');

      var parameter = (!!inputVal) ? ('' + searchColumn + '=' + inputVal) : '';

      GridControl.loadBySortFilterParam($inputGroup.closest(GridSymbols.GRID_CONTAINER), parameter);
    }
  };

  function HeaderControl(grid) {
    this.$header = HeaderControl.findHeaderElement(grid);
    this.$row = this.$header.find(GridSymbols.GRID_HEADER__ROW);
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
      var visibles = [];
      var visibleTotal = 0;
      var $cols = gridinfo.fields.map(function (fieldInfo, index, array) {
        var $col = new ColumnControl(null).makeElement(fieldInfo);
        var visi = (fieldInfo.gridVisible ? 1 : 0);
        visibles.push(visi);
        visibleTotal += visi;
        return $col.element();
      });
      if(visibleTotal == 0)visibleTotal=1;
      var visPer = visibles.map(function(t,i){
        return 1.0*t/visibleTotal;
      });
      this.$row.attr({'data-col-visible': visibles, 'data-col-percents': visPer});
      this.$row.empty().wrapInner($cols);
    }
  };
  HeaderControl.findHeaderElement = function(anyElement){
    var gridEle = GridControl.findContainerElement(anyElement);
    return gridEle.find(GridSymbols.GRID_HEADER);
  };
  HeaderControl.getAllCols = function($colsRow){
    return $colsRow.find('.column-header.dropdown');
  };

  function FooterControl(grid) {
    this.$footer = FooterControl.findFooterElement(grid);
  };
  FooterControl.prototype = {
    element: function () {
      return this.$footer;
    },
    setDataRange: function (from, to, total) {
      if (total == 0) {
        from = 0; to = 0;
      } else {
        from += 1;
      }
      this.$footer.find('.low-index').text(from);
      this.$footer.find('.high-index').text(to);
      this.$footer.find('.total-records').text(total);
    }
  };
  FooterControl.findFooterElement = function(anyElement){
    var gridEle = GridControl.findContainerElement(anyElement);
    return gridEle.find(GridSymbols.GRID_FOOTER);
  };

  function SpinnerControl(grid) {
    this.$spinner = SpinnerControl.findSpinnerElement(grid);
    this.$icon = this.$spinner.find(GridSymbols.GRID_SPINNER__ITEM);
  };
  SpinnerControl.prototype = {
    element: function () {
      return this.$spinner;
    },
    setOffset : function (offsetFromBodyTop) {
      var bodyCtrl = new BodyControl(this.element());
      var bodyHeight = bodyCtrl.element().height();
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
  SpinnerControl.findSpinnerElement = function(anyElement){
    var gridEle = GridControl.findContainerElement(anyElement);
    return gridEle.find(GridSymbols.GRID_SPINNER);
  };

  function BodyControl(grid) {
    this.$body = BodyControl.findBodyElement(grid);
    this.$table = this.$body.find('table');
    this.$theadRow = this.$table.find('thead tr');
    this.$tbody = this.$table.find('tbody');
    this.$emptyCell = this.$tbody.find('td.entity-grid-no-results');
    var headerCtrl = new HeaderControl(grid);
    this.$emptyCell.attr('colspan', headerCtrl.columnCount());
    this.$emptyRow = this.$emptyCell.closest('tr');
  };
  BodyControl.prototype = {
    element: function () {
      return this.$body;
    },
    makeHeaderMirror: function () {
      var headerCtrl = new HeaderControl(this.element());
      this.$emptyCell.attr('colspan', headerCtrl.columnCount());
      var $row = headerCtrl.$row.clone();
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
    var cellCreationContext = new CellCreationContext(gridinfo.idField, baseUrl);
    var $rows = entities.records.map(function (entity, index, array) {
      var entityIndex = entities.startIndex + index;
      var row = new RowControl();
      row.fillByEntity(gridinfo, entity, entityIndex, cellCreationContext);
      return row.element();
    });
    $tbody.append($rows);
  };
  BodyControl.findBodyElement = function(anyElement){
    var gridEle = GridControl.findContainerElement(anyElement);
    return gridEle.find(GridSymbols.GRID_BODY);
  };

  var FilterHandler = function(){};
  FilterHandler.prototype={
    bindEvents : function (grid) {
      var colsRow = grid.header.$row;

      colsRow.on('click', '.filter-icon',FilterHandler.eh.clickHandler);
      colsRow.on('click', '.entity-filter span.input-element i.embed-delete', FilterHandler.eh.inputDelClickHandler);
      colsRow.on('keyup change focusin', '.entity-filter span.input-element input.filter-input', FilterHandler.eh.inputChangeHandler);
      colsRow.on('keypress', '.entity-filter *', FilterHandler.eh.invokeKeyTriggerDoFilterHandler);
      colsRow.on('click', '.entity-filter .filter-reset-button', FilterHandler.eh.invokeDoCleanFilterHandler);
      colsRow.on('click', '.entity-filter .filter-button', FilterHandler.eh.invokeDoFilterHandler);
      FilterHandler._installation++;
      console.log('FilterHandler.install. [' + FilterHandler._installation + ']');
    },
    unbindEvents : function (grid) {
      var colsRow = grid.header.$row;

      colsRow.off('click', '.filter-icon',FilterHandler.eh.clickHandler);
      colsRow.off('click', '.entity-filter span.input-element i.embed-delete', FilterHandler.eh.inputDelClickHandler);
      colsRow.off('keyup change focusin', '.entity-filter span.input-element input.filter-input', FilterHandler.eh.inputChangeHandler);
      colsRow.off('keypress', '.entity-filter *', FilterHandler.eh.invokeKeyTriggerDoFilterHandler);
      colsRow.off('click', '.entity-filter .filter-button', FilterHandler.eh.invokeDoFilterHandler);
      colsRow.off('click', '.entity-filter .filter-reset-button', FilterHandler.eh.invokeDoCleanFilterHandler);
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
  FilterHandler.eh = {
    clickHandler: function (e) {
      var $el = $(this),
        header = $el.closest('.column-header.dropdown'),
        dropdown = $('> ul', header),
        colsRow = header.closest('tr');

      setTimeout(function () {
        header.toggleClass('show-filter');
        HeaderControl.getAllCols(colsRow).not(header).removeClass('show-filter');
      }, 0);
    },
    outsideClickHandler: function (e) {
      if (e.originalEvent == undefined) return;
      var $target = $(e.originalEvent.target);
      if (!($target.parents().is('.column-header.dropdown'))) {
        FilterHandler.closeDropdowns();
      }
    },
    inputChangeHandler: function (e) {
      var $el = $(this),
        inputElement = $el.closest('.input-element');

      var $delIcon = inputElement.find('i.embed-delete');
      var $input = inputElement.find('input.filter-input');
      if ($input) {
        var newVal = $input.val();
        (!!newVal) ? $delIcon.show() : $delIcon.hide();
      }
    },
    inputDelClickHandler: function (e) {
      var $el = $(this),
        inputElement = $el.closest('.input-element');

      var $delIcon = inputElement.find('i.embed-delete');
      var $input = inputElement.find('input.filter-input');
      if ($input) {
        $delIcon.hide();
        $input.val('').focus();
      }
    },
    invokeKeyTriggerDoFilterHandler: function (event) {
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode == '13') {
        FilterHandler.eh.invokeDoFilterHandler(event);
        event.stopPropagation();
      }
    },
    invokeDoCleanFilterHandler: function (e) {
      var $el = $(e.currentTarget);
      var header = $el.closest('.column-header.dropdown');
      var $filter = header.find('.entity-filter');
      var filterType = $filter.data('filter-type');
      var filterValHandler = FilterTemplates.definitions[filterType].valueaccess;
      FilterHandler.setValue(header, '');
      filterValHandler.set($filter, '');
    },
    invokeDoFilterHandler: function (e) {
      var $el = $(e.currentTarget);
      var header = $el.closest('.column-header.dropdown');
      var $filter = header.find('.entity-filter');
      var filterType = $filter.data('filter-type');
      var filterValHandler = FilterTemplates.definitions[filterType].valueaccess;
      var value = filterValHandler.get($filter);
      FilterHandler.setValue(header, value ? value : '');
      FilterHandler.closeDropdowns();

      GridControl.eh.fireReloadEvent(header, new LoadEventData(LoadEventData.source.UI));
    }
  };

  var SortHandler = function(){};
  SortHandler.prototype = {}
  SortHandler.orders= {
    DEFAULT: '_', ASC: 'asc', DESC: 'desc',
    calcNextOrder: function (order) {
      switch (order) {
        case this.DEFAULT:return this.ASC;
        case this.ASC:return this.DESC;
        case this.DESC:return this.DEFAULT;
        default :return this.DEFAULT;
      }
    },
    getOrder : function (header) {
      var $el = header.find('i.sort-icon');
      if ($el.is('.fa-sort-amount-asc'))
        return SortHandler.orders.ASC;
      if ($el.is('.fa-sort-amount-desc'))
        return SortHandler.orders.DESC;
      return SortHandler.orders.DEFAULT;
    },
    setOrder : function (header, order) {
      if($.isArray(order)){order = order[0];}
      if(!order){order =SortHandler.orders.DEFAULT;}
      if(this.getOrder(header) === order){
        return;
      }
      var $el = header.find('i.sort-icon');
      $el.removeClass('fa-sort-amount-desc').removeClass('fa-sort-amount-asc');
      var $container = $el.parent('.filter-sort-container');
      var $valEle = header.find('input[type=hidden].sort-value');
      var sortVal = null;
      switch (order) {
        case SortHandler.orders.DESC:
          $el.addClass('fa-sort-amount-desc');
          $container.addClass('sort-active');
          sortVal = 'desc';
          break;
        case SortHandler.orders.ASC:
          $el.addClass('fa-sort-amount-asc');
          $container.addClass('sort-active');
          sortVal = 'asc';
          break;
        case SortHandler.orders.DEFAULT:
          $container.removeClass('sort-active');
          sortVal = null;
          break;
      }
      $valEle.val(sortVal);
    }
  };
  /**
   * Event binded on the header's row
   */
  SortHandler.eh = {
    _installation : 0,
    bindEvents : function ($container) {
      var headerCtrl = new HeaderControl($container);
      var colsRow = headerCtrl.$row;

      colsRow.on('click', '.sort-icon',this.clickHandler);
      this._installation++;
      console.log('SortHandler.install. [' + this._installation + ']');
    },
    unbindEvents : function ($container) {
      var headerCtrl = new HeaderControl($container);
      var colsRow = headerCtrl.$row;

      colsRow.off('click', '.sort-icon',this.clickHandler);
      this._installation--;
      console.log('SortHandler.uninstall. [' + this._installation + ']');
    },
    rebindEvents : function($container){this.unbindEvents($container);this.bindEvents($container);},
    clickHandler : function(e){
      var $el = $(this),
        header = $el.closest('.column-header.dropdown'),
        dropdown = $('> ul', header),
        colsRow = header.closest('tr');

      var orders = SortHandler.orders;
      var currentOrder = orders.getOrder(header);
      var nextOrder = orders.calcNextOrder(currentOrder);
      orders.setOrder(header, nextOrder);

      HeaderControl.getAllCols(colsRow).not(header).map(function(i,item){
        orders.setOrder($(item), orders.DEFAULT);
      });
      GridControl.eh.fireReloadEvent(header,new LoadEventData(LoadEventData.source.UI));
    }
  };

  var ColumnResizer = function () {};
  /**
   * Event binded on the header
   * @type {{rebindEvents: Function, bindEvents: Function, unbindEvents: Function}}
   */
  ColumnResizer.eh = {
    _installation : 0,
    resizing : {
      active: (function () {
        var act = false;
        return function (a) {if (a === undefined)return act;act = a;};
      })(),
      headColumnRow: undefined,
      bodyColumnRow: undefined,
      columnIndex: 0,
      startX: undefined,
      startWidths: undefined,
      totalWidth: 0
    },
    _mousedown: function (e) {
      var $resizeEle = $(this).closest('th');
      var container = $resizeEle.closest(GridSymbols.GRID_CONTAINER);
      var $headerColumnRow = container.find(GridSymbols.GRID_HEADER + ' ' + GridSymbols.GRID_HEADER__ROW);
      var $bodyColumnRow = container.find(GridSymbols.GRID_BODY + ' ' + GridSymbols.GRID_BODY__THEAD_ROW);

      var resizing = ColumnResizer.eh.resizing;
      resizing.active(true);
      resizing.headColumnRow = $headerColumnRow;
      resizing.bodyColumnRow = $bodyColumnRow;
      resizing.columnIndex = $resizeEle.index();
      resizing.startX = e.pageX;
      resizing.startWidths = [];
      resizing.totalWidth = 0;

      resizing.headColumnRow.find('th').each(function (index, element) {
        var elementWidth = $(this).outerWidth();
        resizing.startWidths.push(elementWidth);
        resizing.totalWidth += elementWidth;
      });
      $(document).disableSelection();
    },
    _mousemove: function (e) {
      var resizing = ColumnResizer.eh.resizing;
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

        if (widthDiff < minAllow) {
          widthDiff = minAllow;
        }
        else if (widthDiff > maxAllow) {
          widthDiff = maxAllow;
        }

        var newLeftWidth = resizing.startWidths[index] + widthDiff;
        var newRightWidth = resizing.startWidths[index + 1] - widthDiff;

        var newWidths = resizing.startWidths.slice(0);
        newWidths[index] = newLeftWidth;
        newWidths[index + 1] = newRightWidth;

        var widthPercents = newWidths.map(function(t,i){
          return 1.0*t/resizing.totalWidth;
        });
        resizing.headColumnRow.attr('data-col-percents', widthPercents);
        GridControl.updateColumnWidth(resizing.headColumnRow, resizing.bodyColumnRow, newWidths);
      }
    },
    _mouseup: function () {
      var resizing = ColumnResizer.eh.resizing;
      if (resizing.active()) {
        resizing.active(false);
        $(document).enableSelection();
      }
    },
    rebindEvents:function($container){this.unbindEvents($container);this.bindEvents($container);},
    bindEvents: function ($container) {
      var headerCtrl = new HeaderControl($container);
      var $headerTableThead = headerCtrl.element();
      $headerTableThead.on('mousedown', 'th div.resizer', ColumnResizer.eh._mousedown);

      this._installation++;
      console.log('ColumnResizer.install. [' + this._installation + ']');
    },
    unbindEvents : function($container){
      var headerCtrl = new HeaderControl($container);
      var $headerTableThead = headerCtrl.element();
      $headerTableThead.off('mousedown', 'th div.resizer', ColumnResizer.eh._mousedown);

      this._installation--;
      console.log('ColumnResizer.uninstall. [' + this._installation + ']');
    }
  };
  var onDocReady = function ($doc) {
    GridControl.autoLoad($doc);
    $(document).bind('mousemove',ColumnResizer.eh._mousemove);
    $(document).bind('mouseup', ColumnResizer.eh._mouseup);
    $doc.on('click', 'body, html',FilterHandler.eh.outsideClickHandler);
    EntityPage.onDocReady($doc);
  };

  /**
   * ActionGroup is a utility class for Action Element handling
   * @param grpEle: the html element
   * @constructor
   */
  var ActionGroup = function(grpEle){
    this.$grpEle = $(grpEle);
  }
  ActionGroup.prototype={
    /**
     * display the specified actions, and hide others; update the action-url
     * @param actions : array of action names
     * @param linksObj : dictionary with action name as key, url as its value
     */
    setup : function(actions, linksObj){
      var actionGrp = this.$grpEle;
      actionGrp.hide();
      if(actions){
        actionGrp.find('.action-control[data-action]').each(function(i,ctrl){
          var $ctrl = $(ctrl); var action = $ctrl.data('action');
          $ctrl.toggle(actions.indexOf(action) >= 0);
          if(linksObj[action]){ $ctrl.attr('data-action-url', linksObj[action]);}
        });
        actionGrp.show();
      }
    },
    /**
     * Update the action-url for entity-action buttons (ONLY for entity button)
     * @param entityUrl : the new entity-url
     */
    switchElementActionUrl: function(entityUrl){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control.entity-action').each(function(i,ctrl){
        var $ctrl = $(ctrl);
        $ctrl.attr('data-action-url', entityUrl);
        ctrl.disabled = (!entityUrl);
      });
    },
    /**
     * Show all / Hide all
     * @param on : whether to show
     */
    switchAllActions : function(on){
      var actionGrp = this.$grpEle;
      actionGrp.hide();
      actionGrp.find('.action-control[data-action]').toggle(!!on);
      actionGrp.show();
    },
    /**
     * For the specified action buttons, show all / hide all
     * @param actions : specify actions
     * @param on : whether to show or hide
     */
    switchAction : function(actions, on){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control[data-action]').each(function(i,ctrl){
        var $ctrl = $(ctrl); var action = $ctrl.data('action');
        if(actions.indexOf(action) >= 0){
          $ctrl.toggle(!!on);
        }
      });
    },
    switchSaveAction : function(saving){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control[data-action=save]').each(function(i,ctrl){
        var $ctrl = $(ctrl);
        if(!$ctrl.is(':visible'))return;
        $('.btn', ctrl).toggle(!saving);
        $('.spinner', ctrl).toggle(!!saving);
      })
    },
    /**
     * set whether the edit-action should be in modal or new page?
     * @param isModal : true: in modal; false: in new page
     */
    updateEditMethod : function(isModal){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control[data-action][data-edit-in-modal]').each(function(i, btn){
        var $btn = $(btn); $btn.attr('data-edit-in-modal', (!!isModal)?'true':'false');
      })
    }
  };
  ActionGroup.findEntityActionGroup = function ($doc) {
    var $grpEle = $('.entity-action-group .action-group', $doc);
    return new ActionGroup($grpEle);
  }

  var EntityPage = function(){}
  EntityPage.onDocReady = function ($doc) {
    $('body').on('click', '.action-control[data-action=add], .action-control[data-action=update]', function(event){
      var $ele = $(this);
      var url = $ele.data('action-url');
      var isModal = $ele.data('edit-in-modal');
      if(isModal){
        var modal = host.modal.makeModal();
        //modal.
      }else{
        window.location.href = url;
      }
    });
  }

  host.entity = {
    actionGroup : ActionGroup,
    grid: GridControl,
    initOnDocReady: onDocReady
  };
})(jQuery, tallybook);
