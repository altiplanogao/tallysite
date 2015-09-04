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

  var ReservedParameter={
    StartIndex :'startIndex',
    PageSize : 'pageSize'
  };
  //page symbols
  var PageSymbols = {
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
  var FilterHandler = function(initializer, valuehandler){
    this.initializer = initializer;
    this.valuehandler = valuehandler;
  }
  var FilterTemplates = {
    handlers : { // keys are filter-types
      string: new FilterHandler(
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
      enumeration : new FilterHandler(
        function (filter, fieldInfo) {
          var $options = $('div.options', filter);
          var optionsVals = fieldInfo.facets.Enum.options;
          var optionsNames = fieldInfo.facets.Enum.friendlyNames;
          optionsVals.forEach(function(opv){
            //<span class="option"><input type="checkbox"/>BBB</span>
            var opName = optionsNames[opv];
            var opipt = $('<input type="checkbox">').attr('name', fieldInfo.name).attr('value', opv);
            var op = $('<span class="option">').html(opipt).append(opName);
            $options.append(op);
          });
        },
        {//get: ui value -> string; set: string -> ui value
          get: function (entityFilter) {
            var $options = $('div.options span.option input[type=checkbox]', entityFilter);
            var checkedVals = [];
            $options.filter(function(index, $item){return $item.checked;})
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
    _filterTemplateByFieldType: (function () {
      var $filters = $('.template.grid-template table.entity-filters-table > tbody ul.entity-filter');
      var filterMap = {};
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
      var filter = FilterTemplates._filterTemplateByFieldType(fieldType);
      var filterType = filter.data('filter-type');
      $('input.filter-property', filter).val(fieldInfo.name);
      $('input.sort-property', filter).val('sort_' + fieldInfo.name);
      var initializer = this.handlers[filterType].initializer;
      if(initializer){
        initializer(filter, fieldInfo);
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
  var CellTemplateEntry = function(celltype, supportedFieldTypes, cellmaker){
    this.celltype = celltype;
    this.supportedFieldTypes = supportedFieldTypes.split(',');
    this.cellmaker = cellmaker;
  }
  var CellTemplates = {
    _cellTemplateByFieldType : (function(){
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
          var $content = $('<a>').attr('href', url).text(fieldvalue);
          return $content;
        }),
        new CellTemplateEntry('email', 'email', function(entity, fieldInfo, cellCreationContext){
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname];
          var $content = $('<a>').attr('href', 'mailto:' + fieldvalue).text(fieldvalue);
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
          var $content = $('<a>').attr('href', 'tel:' + fieldvalue).text(formatedPhone);
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
      return function(aFieldType){
        var aCellType = fieldType2CellType[aFieldType];
        aCellType = (aCellType ? aCellType : 'default');
        return cellType2CellMaker[aCellType];
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
    this.gridcontainer = GridControl.findGridContainerElement(grid);
  };
  GridDataAccess.elementValueAccess = function(_this, key, defVal, val) {
    var $ele = _this.gridcontainer;
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
    criteriaParameter : GridDataAccess.specifyValueAccess('criteria-parameter',''),
    pageSize : GridDataAccess.specifyValueAccess('pagesize',''),
    totalRecords : GridDataAccess.specifyValueAccess('totalrecords', 0),
    selectedIndex : GridDataAccess.specifyValueAccess('selected-index', -1),

    //make parameter string: http://abc.com/xxx?a=1&b=2&b=3&c=4 (support multi-value for a particular key)
    gatherCriteriaParameter : function(includeAll){
      var inputsWithVal = [];
      var filterSortInputs = this.gridcontainer.find(PageSymbols.GRID_HEADER).find(PageSymbols.GRID_HEADER__ROW)
          .find('input[type=hidden][name].filter-value, input[type=hidden][name].sort-value');
      filterSortInputs.map(function(i,item){
        var $item = $(item);
        var val = $item.val();
        if(includeAll || val){
          if($item.data("multi-value")){
            var vars = val.split(',');
            vars.forEach(function(singleVal, index, array){
              var $tmpInput = $('<input>').attr('name', $item.attr('name')).attr('value', singleVal);
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
      return host.url.param.string2Object(string, includeAll);
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
    if (!$container.is(PageSymbols.GRID_CONTAINER)) {
      throw new Error("$container does not seems tobe a valid gridcontrol.");
    } else {
      this.$container = $container;
    }
    console.log('GridControl construct');
    this.ENTITY_GRID_AJAX_LOCK = 0;
    this.$toolbar = this.$container.find(PageSymbols.GRID_TOOLBAR);
    this.header = new HeaderControl(this, this.$container.find(PageSymbols.GRID_HEADER));
    this.footer = new FooterControl(this, this.$container.find(PageSymbols.GRID_FOOTER));
    this.body = new BodyControl(this, this.$container.find(PageSymbols.GRID_BODY));
    this.spinner = new SpinnerControl(this, this.$container.find(PageSymbols.GRID_SPINNER));
    this.data = new GridDataAccess(this);
    this.entityData = this.$container.find('.data-content p').data("content");

    var _this = this;
    this.reloadTriggerPoint = function(){
      var _onloadevent = GridControl.prototype.onReloadEvent;
      _onloadevent.apply(_this, arguments);
    };
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
      var paramObj = host.url.param.string2Object(parameter);
      HeaderControl.getAllCols(this.getHeader().$row).map(function(i,item){
        var $item = $(item);
        var filterValEle = $item.find('.filter-value');
        var keyname = $item.data('column-key');
        var sortkeyname = 'sort_' + keyname;
        var filterVal = paramObj[keyname];
        if(filterValEle.data('multi-value') && (!!filterVal)){
          filterVal = filterVal.join(',');
        }

        SortHandler.setOrder($item, paramObj[sortkeyname]);
        FilterHandler.setValue($item, filterVal);

        //update filter
        var $filter = $item.find('.entity-filter');
        var filterType = $filter.data('filter-type');

        if(filterType){
          var filterValHandler = FilterTemplates.handlers[filterType].valuehandler;
          var value = filterValHandler.set($filter, filterVal);
        }
      });
    },

    // ********************** *
    // RELOAD TRIGGERING      *
    // ********************** *
    onReloadEvent : function(e, loadEvent){
      //build parameters
      var griddata = new GridDataAccess(this);
      var params = griddata.parameter();
      if(loadEvent.triggerFrom(LoadEventData.source.UI)){
        var cparams = griddata.gatherCriteriaParameter();
        griddata.criteriaParameter(cparams?cparams:'');
      }else if(loadEvent.triggerFrom(LoadEventData.source.URL)){
        //this.fillParameterByUrl();
        //var cparams = griddata.criteriaParameter();
        //this.updateSortFilterUi(cparams);
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
        data = this.entityData;
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
          var cparams = griddata.criteriaParameter();
          this.updateSortFilterUi(cparams);
        }
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
    fillParameterByUrl:function(url){
      var griddata = new GridDataAccess(this);
      //Make sure column ui already built
      var fsParamObj4Key = griddata.gatherCriteriaParameterAsObject(true);
      var urlParamObj = host.url.getParametersObject(url);
      var cParamObj = {};
      for(var k in fsParamObj4Key){
        var pv = urlParamObj[k];
        cParamObj[k] = pv;
        if(pv !== undefined){
          delete urlParamObj[k];
        }
      }
      var resvParamObj={};
      for(var k in ReservedParameter){
        var paramName = ReservedParameter[k];
        var pv = urlParamObj[paramName];
        resvParamObj[paramName] = pv;
        if(pv !== undefined){
          delete urlParamObj[paramName];
        }
      }

      var parameter = host.url.param.object2String(urlParamObj);
      var cparameter = host.url.param.object2String(cParamObj);

      griddata.baseUrl(host.url.getPath(url));
      griddata.parameter(parameter?parameter:'');
      griddata.criteriaParameter(cparameter?cparameter:'');
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

          if(loadEvent){
            if(loadEvent.triggerFrom(LoadEventData.source.URL)){
              _this.fillParameterByUrl();
              var cparams = _this.data.criteriaParameter();
              _this.updateSortFilterUi(cparams);
            }
          }
        }
      });
    },
    ajaxLoadData : function(options){
      //url(value or function), canskipcheck, ondata, ondataloaded
      var grid = this;
      var optionsclone = $.extend({}, options);
      var paramsObj = host.url.param.string2Object(options.data);
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

        AJAX.get(optionsclone, function (response) {
          if(options.ondata) {
            options.ondata(response);
          }

           if(grid.isMain()){
             var dataObject = optionsclone.dataObject;
             var paramsStr = host.url.param.object2String(dataObject);
             var newurl = host.url.getUrlWithParameterString(paramsStr, null, url);
             //var skipParam = [ReservedParameter.PageSize];
             newurl = host.url.getUrlWithParameter(ReservedParameter.PageSize, null, null, newurl);
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
      GridControl.eh.unbindUiEvent(this);
      (new ColumnResizer()).unbindEvents(this);
      (new SortHandler()).unbindEvents(this);
      (new FilterHandler()).unbindEvents(this);
      (new ToolbarHandler()).unbindEvents(this);
    },
    bindEvents : function(){
      GridControl.eh.bindUiEvent(this);
      (new ColumnResizer()).bindEvents(this);
      (new SortHandler()).bindEvents(this);
      (new FilterHandler()).bindEvents(this);
      (new ToolbarHandler()).bindEvents(this);
    },
    rebindEvents : function(){
      this.unbindEvents();
      this.bindEvents();
    }
  };
  GridControl.PageSymbols = PageSymbols;
  GridControl.ReservedParameter = ReservedParameter;
  GridControl.eh= {
    _eventInstall : 0,
    bindUiEvent: function (grid) {
      grid.header.$row.on(ENTITY_RELOAD_EVENT, grid.reloadTriggerPoint);
      grid.body.$tbody.on('click', 'tr.data-row', this.rowClickHandler);

      GridControl.eh._eventInstall++;
      console.log('GridControl.install. [' + GridControl.eh._eventInstall + ']');
    },
    unbindUiEvent: function (grid) {
      grid.header.$row.off(ENTITY_RELOAD_EVENT, this.reloadTriggerPoint);
      grid.body.$tbody.off('click', 'tr.data-row', this.rowClickHandler);

      GridControl.eh._eventInstall--;
      console.log('GridControl.uninstall. [' + GridControl.eh._eventInstall + ']');
    },
    fireReloadEvent: function ($ele, reloadVent) {
      var $container = ($ele.is(PageSymbols.GRID_CONTAINER_CLASS) ? $ele : $ele.closest(PageSymbols.GRID_CONTAINER));
      var header = $container.find(PageSymbols.GRID_HEADER + ' ' + PageSymbols.GRID_HEADER__ROW);
      var griddata = new GridDataAccess($container);
      griddata.totalRecords('');
      griddata.recordRanges('set', '0-0');

      header.trigger(ENTITY_RELOAD_EVENT, reloadVent);
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

      var gridEle = GridControl.findGridContainerElement($row);
      (new ToolbarHandler()).switchElementAction(gridEle, dataUrl)
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

  GridControl.findGridContainerElement = function(anyEle){
    var gridEle = null;
    if(anyEle instanceof GridControl){
      gridEle = anyEle.$container;
    } else {
      var gridIsParent = anyEle.closest(PageSymbols.GRID_CONTAINER);
      if(gridIsParent.length == 1){
        gridEle = $(gridIsParent[0]);
      }else if(gridIsParent.length == 0){
        gridEle = $(anyEle.find(PageSymbols.GRID_CONTAINER)[0]);
      }
    }
    return gridEle;
  };
  GridControl.findFromPage = function ($page) {
    var $ctrls = $page.find(PageSymbols.GRID_CONTAINER);
    var gcs = $ctrls.map(function (index, $ctrl, array) {
      var gc = new GridControl($($ctrl));return gc;
    });
    return gcs;
  };
  GridControl.findFirstOnPage = function () {
    var $page = $(document);
    var $ctrls = $page.find(PageSymbols.GRID_CONTAINER);
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

    GridControl.eh.fireReloadEvent(gridContainer.find(PageSymbols.GRID_HEADER), new LoadEventData(LoadEventData.source.PARAMETER));
  }
  GridControl.loadByUrl = function(gridContainer, url, parameter){
    var griddata = new GridDataAccess(gridContainer);

    var inUrl = host.url.getBaseUrl(url);
    parameter = host.url.param.connect( host.url.getParameter(url),parameter);

    griddata.baseUrl(inUrl ? inUrl : '');
    griddata.parameter(parameter ? parameter : '');

    griddata.criteriaParameter('').pageSize('').totalRecords('');

    GridControl.eh.fireReloadEvent(gridContainer.find(PageSymbols.GRID_HEADER), new LoadEventData(LoadEventData.source.URL));
  }

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
      var $row = $('<tr class="data-row">');
      $row.attr('data-id', entity[gridinfo.idField]);
      $row.attr('data-name', entity[gridinfo.nameField]);
      $row.attr('data-entity-index', entityIndex);
      var url = EntityDataHandler.makeUrl(cellCreationContext.idField, entity, cellCreationContext.baseUrl);     
      $row.attr('data-url', url);
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
      actionGrp.hide();
      if(actions){
        actionGrp.find('.action-btn[data-action]').each(function(i,btn){
          var $btn = $(btn);
          var action = $btn.data('action');
          $btn.toggle(actions.indexOf(action) >= 0);
          if(linksObj[action]){
            $btn.attr('data-action-url', linksObj[action]);
          }
        });
        actionGrp.show();
      }
    },
    switchElementAction: function (grid, dataUrl) {
      var $ele = this.element(grid);
      var actionGrp = $ele.find('.action-group');
      actionGrp.find('.action-btn.entity-action').each(function(i,btn){
        var $btn = $(btn);
        $btn.attr('data-action-url', dataUrl);
        btn.disabled = (!dataUrl);
      });

    },
    element : function (grid){
      return GridControl.findGridContainerElement(grid).find(PageSymbols.GRID_TOOLBAR);
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

      GridControl.loadBySortFilterParam($inputGroup.closest(PageSymbols.GRID_CONTAINER), parameter);
    }
  };

  function HeaderControl(grid, $header) {
    this.grid = grid;
    this.$header = $header;
    this.$row = $header.find(PageSymbols.GRID_HEADER__ROW);
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
        var $col = new ColumnControl(null, fieldInfo);
        var visi = (fieldInfo.gridVisible ? 1 : 0);
        visibles.push(visi);
        visibleTotal += visi;
        return $col.element();
      });
      if(visibleTotal == 0)visibleTotal=1;
      var visPer = visibles.map(function(t,i){
        return 1.0*t/visibleTotal;
      });
      this.$row.attr('data-col-visible', visibles);
      this.$row.attr('data-col-percents', visPer);
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
    var cellCreationContext = new CellCreationContext(gridinfo.idField, baseUrl);
    var $rows = entities.records.map(function (entity, index, array) {
      var entityIndex = entities.startIndex + index;
      var row = new RowControl();
      row.fillByEntity(gridinfo, entity, entityIndex, cellCreationContext);
      return row.element();
    });
    $tbody.append($rows);
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
      var filterValHandler = FilterTemplates.handlers[filterType].valuehandler;
      FilterHandler.setValue(header, '');
      filterValHandler.set($filter, '');
    },
    invokeDoFilterHandler: function (e) {
      var $el = $(e.currentTarget);
      var header = $el.closest('.column-header.dropdown');
      var $filter = header.find('.entity-filter');
      var filterType = $filter.data('filter-type');
      var filterValHandler = FilterTemplates.handlers[filterType].valuehandler;
      var value = filterValHandler.get($filter);
      FilterHandler.setValue(header, value ? value : '');
      FilterHandler.closeDropdowns();

      GridControl.eh.fireReloadEvent(header, new LoadEventData(LoadEventData.source.UI));
    }
  };

  var SortHandler = function(){};
  SortHandler.orders= {
    DEFAULT: '_', ASC: 'asc', DESC: 'desc',
    calcNextOrder: function (order) {
      switch (order) {
        case this.DEFAULT:return this.ASC;
        case this.ASC:return this.DESC;
        case this.DESC:return this.DEFAULT;
        default :return this.DEFAULT;
      }
    }
  };
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
      return SortHandler.orders.ASC;
    if ($el.is('.fa-sort-amount-desc'))
      return SortHandler.orders.DESC;
    return SortHandler.orders.DEFAULT;
  };
  SortHandler.setOrder= function (header, order) {
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
  };
  SortHandler.clickHandler = function(e){
    var $el = $(this),
      header = $el.closest('.column-header.dropdown'),
      dropdown = $('> ul', header),
      colsRow = header.closest('tr');

    var currentOrder = SortHandler.getOrder(header);
    var nextOrder = SortHandler.orders.calcNextOrder(currentOrder);
    SortHandler.setOrder(header, nextOrder);

    HeaderControl.getAllCols(colsRow).not(header).map(function(i,item){
      SortHandler.setOrder($(item), SortHandler.orders.DEFAULT);
    });
    GridControl.eh.fireReloadEvent(header,new LoadEventData(LoadEventData.source.UI));
  };

  var ColumnResizer = function () {};
  ColumnResizer.prototype = {
    rebindEvents:function(grid){this.unbindEvents(grid);this.bindEvents(grid);},
    bindEvents: function (grid) {
      var $headerTableThead = grid.header.$row;
      $headerTableThead.on('mousedown', 'th div.resizer', ColumnResizer.eh._mousedown);

      ColumnResizer._installation++;
      console.log('ColumnResizer.install. [' + ColumnResizer._installation + ']');
    },
    unbindEvents : function(grid){
      var $headerTableThead = grid.header.$row;
      $headerTableThead.off('mousedown', 'th div.resizer', ColumnResizer.eh._mousedown);

      ColumnResizer._installation--;
      console.log('ColumnResizer.uninstall. [' + ColumnResizer._installation + ']');
    }
  };
  ColumnResizer._installation = 0;
  ColumnResizer.eh = {
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
      var container = $resizeEle.closest(PageSymbols.GRID_CONTAINER);
      var $headerColumnRow = container.find(PageSymbols.GRID_HEADER + ' ' + PageSymbols.GRID_HEADER__ROW);
      var $bodyColumnRow = container.find(PageSymbols.GRID_BODY + ' ' + PageSymbols.GRID_BODY__THEAD_ROW);

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
    }
  };
  var onDocReady = function ($doc) {
    GridControl.autoLoad($doc);
    $(document).bind('mousemove',ColumnResizer.eh._mousemove);
    $(document).bind('mouseup', ColumnResizer.eh._mouseup);
    $doc.on('click', 'body, html',FilterHandler.eh.outsideClickHandler);
  };

  host.entity = {
    grid: GridControl,
    initOnDocReady: onDocReady
  };
})($, tallybook);
