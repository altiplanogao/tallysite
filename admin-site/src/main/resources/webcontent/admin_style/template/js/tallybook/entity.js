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
  var ElementValueAccess = host.elementValueAccess;
  var ModalStack = host.modal.stack;

  //const
  var lockDebounce = 200;
  var ENABLE_URL_DEBUG = true;

  var ReservedParameter={
    StartIndex :'startIndex',
    PageSize : 'pageSize'
  };
  var PersistentUrlParams = [ReservedParameter.PageSize];
  //page symbols
  var GridSymbols = {
    GRID_MAIN_TEMPLATE: ".template.grid-template",
    GRID_CONTAINER: ".entity-grid-container",

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

  var FilterTemplates = (function(){
    /**
     * Filter definition, define the initializer of filter, and how to access its value
     * Example:
     *      data-filter-type : string, integer-range, decimal range, foreign-key
     *      data-support-field-types : string, email, phone, boolean  (enum FieldType)
     * @param initializer: initialize the ui elements of the filter
     * @param valueaccess, define get/set (value in string) method of the filter,
     *        get: get value from the ui element, the return value in string
     *        set: set value to the ui element, input the value in string
     *        typically, the value of the ui element will be saved/restored from Column's 'input[type=hidden].filter-value' element
     * @constructor
     */
    var FilterAccess = {
      initializer : function (filter, fieldInfo){},
      //get: ui value -> string; set: string -> ui value
      get: function (entityFilter){return ""},
      set: function (entityFilter, val){}
    };

    return {
      _definitions : { // keys are filter-types
        string: {
          initializer : function (filter, fieldInfo) {
            var $input = $('input.filter-input', filter);
            $input.attr({'data-name': fieldInfo.name, 'placeholder': fieldInfo.friendlyName});
          },
          get: function (entityFilter) {
            return entityFilter.find('.filter-input').val();
          },
          set: function (entityFilter, val) {
            entityFilter.find('i.embed-delete').toggle(!!val);
            return entityFilter.find('.filter-input').val(val);
          }},
        enumeration : {
          initializer : function (filter, fieldInfo) {
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
          get: function (entityFilter) {
            var $options = $('div.options span.option input[type=checkbox]', entityFilter);
            var checkedVals = [];
            $options.filter(function(index, item){return item.checked;})
              .each(function(index, item){checkedVals.push($(item).attr('value'));});
            return checkedVals.join(',');
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
          }},
        boolean : {
          initializer : function (filter, fieldInfo){
            var trOpts = fieldInfo.facets.Boolean.options;
            filter.find('input[type=radio]').attr({'name' : fieldInfo.name});
            filter.find('input[type=radio][value=true]').text(trOpts.t);
            filter.find('input[type=radio][value=false]').text(trOpts.f);
          },
          //get: ui value -> string; set: string -> ui value
          get: function (entityFilter){
            var valStr = entityFilter.find('input[type=radio]:checked').val();
            if(!!valStr){
              return ('true' == valStr.toLowerCase())? 'true' : 'false';
            }else{
              return "";
            }
          },
          set: function (entityFilter, val){
            var trueRadio = entityFilter.find('input[type=radio][value=true]');
            var falseRadio = entityFilter.find('input[type=radio][value=false]');
            if(val === undefined || val === null || '' == val){
              trueRadio[0].checked=false;
              falseRadio[0].checked=false;
            }else{
              val = (val == 'true');
              trueRadio[0].checked=val;
              falseRadio[0].checked=!val;
            }
          }
        }
      },
      /**
       * Get the filter template by field type
       * @param fieldType : the field type of the template
       */
      _getFilterTemplate: (function () {
        var filterMap = {};
        var $filters = $(GridSymbols.GRID_MAIN_TEMPLATE + ' table.entity-filters-table > tbody ul.entity-filter');
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

        var definition = this._definitions[filterType];
        if(definition){
          definition.initializer && definition.initializer(filter, fieldInfo);
        }
        return filter;
      },
      getValueAccess : function(filterType){
        return this._definitions[filterType];
      },
      getValue : function($filter){
        var filterType = $filter.data('filter-type');
        if(filterType){
          var valueAccess = this.getValueAccess(filterType);
          return valueAccess.get($filter);
        }
      },
      setValue : function($filter, val){
        var filterType = $filter.data('filter-type');
        if(filterType){
          var valueAccess = this.getValueAccess(filterType);
          return valueAccess.set($filter, val);
        }
      }
    }
  })();

  var CellTemplates = {
    CellCreationContext : function(idField, baseUrl){
      this.idField = idField;
      this.baseUrl = baseUrl;
    },
    /**
     * Get Cell Maker by field Type
     * @params fieldType: the field type
     */
    _cellTemplateByFieldType : (function(){
      /**
       * @param celltype :
       * @param supportedFieldTypes
       * @param cellmaker
       * @constructor
       *
       * Example={
       *   data-cell-type : string, integer, decimal, foreign-key
       *   data-support-field-types : string, email, phone, boolean
       * }
       */
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
        new CellTemplateEntry('boolean', 'boolean', function(entity, fieldInfo, cellCreationContext) {
          var fieldname = fieldInfo.name;
          var options = fieldInfo.facets.Boolean.options;
          var fieldvalue = entity[fieldname];
          if(fieldvalue === "" || fieldvalue === null || fieldvalue === undefined)
            return '';
          return options[fieldvalue?'t':'f'];
        }),
        new CellTemplateEntry('phone', 'phone', function (entity, fieldInfo, cellCreationContext) {
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname]; if(fieldvalue == null) fieldvalue = '';
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
    createCell : function(entity, fieldInfo, cellCreationContext){
      var fieldType = fieldInfo.fieldType.toLowerCase();
      var cellmaker = this._cellTemplateByFieldType(fieldType);
      var cellcontent = cellmaker(entity, fieldInfo, cellCreationContext);
      return cellcontent;
    }
  }

  var comp = (function(){
    function ColumnCreator() {};
    ColumnCreator.prototype = {
      _makeColumnHeader: (function () {
        var template = $(GridSymbols.GRID_MAIN_TEMPLATE + ' .column-header-template').clone().removeClass('column-header-template');
        return function () {return template.clone();};
      })(),
      makeElement : function(fieldInfo){
        if (fieldInfo) {
          var $col = this._makeColumnHeader();
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
          return $col;
        }
      }
    };

    function RowCreator($tr) {
      this.$tr = $tr;
    };
    RowCreator.prototype = {
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
        var content = CellTemplates.createCell(entity, field, cellCreationContext);
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

    function ToolbarControl(grid){
      this.grid = grid;
      this.$element = this.grid.element().find(GridSymbols.GRID_TOOLBAR);
    };
    ToolbarControl.prototype = {
      init : function(gridinfo, actions, linksObj){
        var $ele = this.element();
        var searchGrp = $ele.find('.search-group');
        if(gridinfo.primarySearchField){
          searchGrp.show();
          searchGrp.attr('data-search-column', gridinfo.primarySearchField);
          $ele.find('i.embed-delete').hide();
          $ele.find('input.search-input').attr(
            {'data-name' : gridinfo.primarySearchField,
              placeholder : gridinfo.primarySearchFieldFriendly} ).val('');
        }else{
          searchGrp.hide();
        }
        var actionGrp = $ele.find('.action-group');
        (new ActionGroup(actionGrp)).setup(actions, linksObj);
      },
      getCsrf : function(){
        var $ele = this.element().find('form.post-agent input[name=_csrf]');
        return $ele.val();
      },
      switchElementActionUrl: function (dataUrl) {
        var $ele = this.element();
        (new ActionGroup($ele.find('.action-group'))).switchElementActionUrl(dataUrl);
      },
      element : function (){
        return this.$element;
      },
      bindEvents : function(){
        var $ele = this.element();
        $ele.on('keyup change focusin', 'input.search-input', this, ToolbarControl.eh.inputChangeHandler);
        $ele.on('click', 'i.embed-delete', this, ToolbarControl.eh.inputDelClickHandler);
        $ele.on('click', '.btn.search-btn', this, ToolbarControl.eh.invokeDoFilterHandler);
        $ele.on('keypress', '.search-input', this, ToolbarControl.eh.invokeKeyTriggerDoFilterHandler);

        $ele.on('click', '.action-control', this, ToolbarControl.eh.invokeActionHandler);
      },
      unbindEvents : function(){
        var $ele = this.element();
        $ele.off('keyup change focusin', 'input.search-input', ToolbarControl.eh.inputChangeHandler);
        $ele.off('click', 'i.embed-delete', ToolbarControl.eh.inputDelClickHandler);
        $ele.off('click', '.btn.search-btn', ToolbarControl.eh.invokeDoFilterHandler);
        $ele.off('keypress', '.search-input', ToolbarControl.eh.invokeKeyTriggerDoFilterHandler);

        $ele.off('click', '.action-control', ToolbarControl.eh.invokeActionHandler);
      }
    };
    ToolbarControl.eh = {
      inputChangeHandler: function (e) {
        var $el = $(this),//NOTE: 'this' is the element triggers the event
          inputElement = $el.closest('.search-input-element');

        var $input = inputElement.find('input.search-input');
        if ($input) {
          var newVal = $input.val();
          inputElement.find('i.embed-delete').toggle(!!newVal);
        }
      },
      inputDelClickHandler: function (e) {
        var $el = $(this),//NOTE: 'this' is the element triggers the event
          inputElement = $el.closest('.search-input-element');

        var $delIcon = inputElement.find('i.embed-delete').hide();
        var $input = inputElement.find('input.search-input').val('').focus();
      },
      invokeKeyTriggerDoFilterHandler: function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') {
          ToolbarControl.eh.invokeDoFilterHandler(event);
          event.stopPropagation();
        }
      },
      invokeDoFilterHandler: function (e) {
        var $el = $(e.currentTarget);//NOTE: 'this' is the element triggers the event
        var $inputGroup = $el.closest('.search-group');
        var inputVal = $inputGroup.find('input.search-input').val();
        var searchColumn = $inputGroup.attr('data-search-column');
        var parameter = (!!inputVal) ? ('' + searchColumn + '=' + inputVal) : '';

        var toolbar = e.data;
        toolbar.grid.loadBySortFilterParam(parameter);
      },
      invokeActionHandler: function(e){
        var grid = e.data.grid, $el = $(this), action=$el.data('action');
        switch(action){
          case 'create':
          case 'update':
            var url = $el.data('action-url'),
              isModal = $el.data('edit-in-modal'),
              editSuccessRedirect=$el.data('edit-success-redirect');
            if(isModal){
              var modal = host.modal.makeModal({}, host.entity.modal);
              ModalStack.showModal(modal);
              modal.setContentByLink(url);//set mod
              modal.setFormSubmitHandlers({
                success : function(data, textStatus, jqXHR, opts){
                    var entityForm = this;
                  if(typeof data == "object"){
                    var operation = data.operation;
                    if(operation == 'redirect'){
                      var url = data.url;
                      if(!editSuccessRedirect){
                        //window.location.replace(url);
                        opts.skipAjaxDefaultHandler = true;
                        modal.element().modal('hide');
                        grid.reload();
                      }
                    }
                  }
                }
              });
            }else{
              window.location.href = url;
            }
            break;
          case 'delete':
            var delConfirmModal = host.modal.makeModal();
            ModalStack.showModal(delConfirmModal);
            delConfirmModal.setContentAsInteractiveDialog({
              header:host.messages.delete,
              message: host.messages.deleteConfirm,
              callback : function(){
                delConfirmModal.hide();
                var doDelModal = host.modal.makeModal();
                ModalStack.showModal(doDelModal);
                var _url = $el.data('action-url') + '/delete';
                var postEntityData = {
                  _csrf : grid.toolbar.getCsrf(),
                  entityType : grid.data.entityType(),
                  entityCeilingType : grid.data.entityCeilingType()
                };
                doDelModal.setContentAsProcessing({
                  url : _url,
                  data : postEntityData,
                  type : 'POST',
                  header:host.messages.delete,
                  message: host.messages.deleting,
                  success:function(data, textStatus, jqXHR, opts){
                    doDelModal.hide();
                    if(typeof data == "object"){
                      var operation = data.operation;
                      if(operation == 'redirect'){
                        grid.reload();
                        opts.skipAjaxDefaultHandler = true;
                        grid.selectRowByIndex(-1);
                      }else{
                        var errors = (data.data)? data.data.errors : null;
                        if(errors) errors = errors.global;
                        var delErrorModal = host.modal.makeModal();
                        ModalStack.showModal(delErrorModal);
                        delErrorModal.setContentAsMessage({
                            header:host.messages.error,
                            message: errors
                        });
                        grid.reload();
                      }
                    }
                  },
                  error:function(){
                    console.log('todo: Handle deleting error');
                  }});
              }     
            });

            break;
        }
      }
    };

    function HeaderControl(grid) {
      this.$ele = grid.element().find(GridSymbols.GRID_HEADER);
      this.$row = this.$ele.find(GridSymbols.GRID_HEADER__ROW);
    };
    HeaderControl.prototype = {
      element: function () {
        return this.$ele;
      },
      row:function(){return this.$row;},
      width: function () {
        return this.$ele.width();
      },
      columnCount: function () {
        return this.$row.find('th').length;
      },
      makeColumnsAndSet: function (gridinfo) {
        var visibles = [];
        var visibleTotal = 0;
        var $cols = gridinfo.fields.map(function (fieldInfo, index, array) {
          var $col = new ColumnCreator().makeElement(fieldInfo);
          var visi = (fieldInfo.gridVisible ? 1 : 0);
          visibles.push(visi);
          visibleTotal += visi;
          return $col;
        });
        if(visibleTotal == 0)visibleTotal=1;
        var visPer = visibles.map(function(t,i){
          return 1.0*t/visibleTotal;
        });
        this.$row.attr({'data-col-visible': visibles, 'data-col-percents': visPer});
        this.$row.empty().wrapInner($cols);
      }
    };
    HeaderControl.getAllCols = function($colsRow){
      return $colsRow.find('.column-header.dropdown');
    };

    function BodyControl(grid) {
      this.grid = grid;
      this.$body = grid.element().find(GridSymbols.GRID_BODY);
      this.$table = this.$body.find('table');
      this.$theadRow = this.$table.find('thead tr');
      this.$tbody = this.$table.find('tbody');
      this.$emptyCell = this.$tbody.find('td.entity-grid-no-results');
      var headerCtrl = grid.header;
      this.$emptyCell.attr('colspan', headerCtrl.columnCount());
      this.$emptyRow = this.$emptyCell.closest('tr');
    };
    BodyControl.prototype = {
      element: function () {
        return this.$body;
      },
      makeHeaderMirror: function () {
        var header = this.grid.getHeader();
        this.$emptyCell.attr('colspan', header.columnCount());
        var $row = header.$row.clone();
        $row.find('th').empty();

        this.$theadRow.html($row.html());
      },
      initEmptyRow: function (entities) {
        this.$emptyRow.toggle(entities.totalCount == 0);
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
      var cellCreationContext = new CellTemplates.CellCreationContext(gridinfo.idField, baseUrl);
      var $rows = entities.records.map(function (entity, index, array) {
        var entityIndex = entities.startIndex + index;
        var row = new RowCreator();
        row.fillByEntity(gridinfo, entity, entityIndex, cellCreationContext);
        return row.element();
      });
      $tbody.append($rows);
    };

    function FooterControl(grid) {
      this.$footer = grid.element().find(GridSymbols.GRID_FOOTER);
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

    function SpinnerControl(grid) {
      this.grid = grid;
      this.$spinner = grid.element().find(GridSymbols.GRID_SPINNER);
      this.$icon = this.$spinner.find(GridSymbols.GRID_SPINNER__ITEM);
    };
    SpinnerControl.prototype = {
      element: function () {
        return this.$spinner;
      },
      setOffset : function (offsetFromBodyTop) {
        var body = this.grid.body;
        var bodyHeight = body.element().height();
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

    return {
      Toolbar : ToolbarControl,
      Header : HeaderControl,
      Body : BodyControl,
      Footer : FooterControl,
      Spinner : SpinnerControl
    };
  })();

  var handlers = (function(){
    var FilterHandler = function(grid){
      this.grid = grid;
      this._installation = 0;
    };
    FilterHandler.prototype={
      bindEvents : function () {
        var colsRow = this.grid.getHeader().row();
        var grid = this.grid;

        colsRow.on('click', '.filter-icon', FilterHandler.eh.popupHandler);
        colsRow.on('keyup change focusin', '.entity-filter span.input-element input.filter-input', FilterHandler.eh.inputChangeHandler);
        colsRow.on('click', '.entity-filter span.input-element i.embed-delete', FilterHandler.eh.inputDelClickHandler);
        colsRow.on('click', '.entity-filter .filter-reset-button', FilterHandler.eh.resetFilterHandler);
        colsRow.on('keypress', '.entity-filter *', grid, FilterHandler.eh.invokeKeyTriggerDoFilterHandler);
        colsRow.on('click', '.entity-filter .filter-button', grid, FilterHandler.eh.invokeDoFilterHandler);
        this._installation++;
        console.log('FilterHandler.install. [' + this._installation + ']');
      },
      unbindEvents : function () {
        var colsRow = this.grid.getHeader().row();

        colsRow.off('click', '.filter-icon',FilterHandler.eh.popupHandler);
        colsRow.off('keyup change focusin', '.entity-filter span.input-element input.filter-input', FilterHandler.eh.inputChangeHandler);
        colsRow.off('click', '.entity-filter span.input-element i.embed-delete', FilterHandler.eh.inputDelClickHandler);
        colsRow.off('click', '.entity-filter .filter-reset-button', FilterHandler.eh.resetFilterHandler);
        colsRow.off('keypress', '.entity-filter *', FilterHandler.eh.invokeKeyTriggerDoFilterHandler);
        colsRow.off('click', '.entity-filter .filter-button', FilterHandler.eh.invokeDoFilterHandler);
        this._installation--;
        console.log('FilterHandler.uninstall. [' + this._installation + ']');
      },
      rebindEvents : function(grid){this.unbindEvents(grid);this.bindEvents(grid);}
    };
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
      popupHandler: function (e) {
        var $el = $(this),
          header = $el.closest('.column-header.dropdown'),
          dropdown = $('> ul', header),
          colsRow = header.closest('tr');

        setTimeout(function () {
          header.toggleClass('show-filter');
          comp.Header.getAllCols(colsRow).not(header).removeClass('show-filter');
        }, 0);
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
      resetFilterHandler: function (e) {
        var $el = $(e.currentTarget);
        var header = $el.closest('.column-header.dropdown');
        var $filter = header.find('.entity-filter');
        FilterTemplates.setValue($filter, '');
        FilterHandler.setValue(header, '');
      },
      outsideClickHandler: function (e) {
        if (e.originalEvent == undefined) return;
        var $target = $(e.originalEvent.target);
        if (!($target.parents().is('.column-header.dropdown'))) {
          FilterHandler.closeDropdowns();
        }
      },
      invokeKeyTriggerDoFilterHandler: function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') {
          FilterHandler.eh.invokeDoFilterHandler(event);
          event.stopPropagation();
        }
      },
      invokeDoFilterHandler: function (e) {
        var $el = $(e.currentTarget);
        var header = $el.closest('.column-header.dropdown');
        var $filter = header.find('.entity-filter');
        var value = FilterTemplates.getValue($filter);
        FilterHandler.setValue(header, value ? value : '');
        FilterHandler.closeDropdowns();

        var grid = e.data;
        GridControl.eh.fireReloadEvent(header, new LoadEventData(LoadEventData.source.UI));
      },
      bindOnDocReady : function($doc){
        $doc.on('click', 'body, html', FilterHandler.eh.outsideClickHandler);
      }
    };

    var SortHandler = function(grid){
      this.grid = grid;
      this._installation = 0;
    };
    SortHandler.prototype = {
      bindEvents : function () {
        var colsRow = this.grid.getHeader().row();
        colsRow.on('click', '.sort-icon', this.grid, SortHandler.eh.sortIconHandler);
        this._installation++;
        console.log('SortHandler.install. [' + this._installation + ']');
      },
      unbindEvents : function () {
        var colsRow = this.grid.getHeader().row();
        colsRow.off('click', '.sort-icon', SortHandler.eh.sortIconHandler);
        this._installation--;
        console.log('SortHandler.uninstall. [' + this._installation + ']');
      },
      rebindEvents : function(){this.unbindEvents();this.bindEvents();}
    }
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
      sortIconHandler : function(e){
        var $el = $(this),
          header = $el.closest('.column-header.dropdown'),
          dropdown = $('> ul', header),
          colsRow = header.closest('tr');

        var orders = SortHandler.orders;
        var currentOrder = orders.getOrder(header);
        var nextOrder = orders.calcNextOrder(currentOrder);
        orders.setOrder(header, nextOrder);

        comp.Header.getAllCols(colsRow).not(header).map(function(i,item){
          orders.setOrder($(item), orders.DEFAULT);
        });
        var grid = e.data;
        GridControl.eh.fireReloadEvent(header,new LoadEventData(LoadEventData.source.UI));
      }
    };

    var ColumnResizer = function (grid){
      this.grid = grid;
      this._installation = 0;
    };
    ColumnResizer.prototype={
      rebindEvents:function(){this.unbindEvents();this.bindEvents();},
      bindEvents: function () {
        var $headerTableThead = this.grid.getHeader().element();
        $headerTableThead.on('mousedown', 'th div.resizer', ColumnResizer.eh._mousedown);

        this._installation++;
        console.log('ColumnResizer.install. [' + this._installation + ']');
      },
      unbindEvents : function(){
        var $headerTableThead = this.grid.getHeader().element();
        $headerTableThead.off('mousedown', 'th div.resizer', ColumnResizer.eh._mousedown);

        this._installation--;
        console.log('ColumnResizer.uninstall. [' + this._installation + ']');
      }
    }
    /**
     * Event binded on the header
     * @type {{rebindEvents: Function, bindEvents: Function, unbindEvents: Function}}
     */
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
          } else if (widthDiff > maxAllow) {
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
      bindOnDocReady : function($doc){
        $doc.bind('mousemove',ColumnResizer.eh._mousemove);
        $doc.bind('mouseup', ColumnResizer.eh._mouseup);
      }
    };
    return {
      FilterHandler : FilterHandler,
      SortHandler : SortHandler,
      ColumnResizer : ColumnResizer
    };
  })();

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

  function GridDataAccess(anyEle) {
    this.$container = GridControl.findContainerElement(anyEle);
  };
  GridDataAccess.prototype = {
    element:function(){return this.$container;},
    recordRanges: ElementValueAccess.defineArrayAddGetSet('recordranges', Range, function(array){
      RangeArrayHelper.sort(array);
      return RangeArrayHelper.merge(array);
    }),
    initialized : ElementValueAccess.defineGetSet('initialized', false),
    baseUrl: ElementValueAccess.defineGetSet('baseurl','/'),
    entityCeilingType :ElementValueAccess.defineGetSet('entity-ceiling-type',''),
    entityType :ElementValueAccess.defineGetSet('entity-type',''),
    parameter : ElementValueAccess.defineGetSet('parameter',''),
    criteriaParameter : ElementValueAccess.defineGetSet('criteria-parameter',''),
    pageSize : ElementValueAccess.defineGetSet('pagesize',''),
    totalRecords : ElementValueAccess.defineGetSet('totalrecords', 0),
    selectedIndex : ElementValueAccess.defineGetSet('selected-index', -1),

    gatherAllCriteriaParameterKeys : function(){
      var keys = [];
      var filterSortInputs = this.$container.find(GridSymbols.GRID_HEADER).find(GridSymbols.GRID_HEADER__ROW)
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
      var filterSortInputs = this.$container.find(GridSymbols.GRID_HEADER).find(GridSymbols.GRID_HEADER__ROW)
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
  function LoadEventData (val, withOffset){
    this._trigger = LoadEventData.source.NONE;
    this._withOffset = (!!withOffset) || false;
    this.trigger(val);
  };
  LoadEventData.prototype={
    trigger : function(val){
      if(val === undefined){return this._trigger;}
      this._trigger = val;
    },
    triggerFrom : function(source){
      return this._trigger == source;
    },
    withOffset : function(val){
      if(val === undefined)
        return this._withOffset;
      this._withOffset = val;
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
      //var existingGrid = $container.data(GridSymbols.GRID_CONTROL_KEY);
      //if(existingGrid){
      //  throw new Error("Element already initialized as GridControl.");
      //}
      this.$container = $container;
    }
    console.log('GridControl construct');
    this.ENTITY_GRID_AJAX_LOCK = 0;
    this.toolbar = new comp.Toolbar(this);
    this.header = new comp.Header(this);
    this.footer = new comp.Footer(this);
    this.body = new comp.Body(this);
    this.spinner = new comp.Spinner(this);
    this.data = new GridDataAccess(this.$container);

    this.filterHandler = new handlers.FilterHandler(this);
    this.sortHandler = new handlers.SortHandler(this);
    this.columnResizer = new handlers.ColumnResizer(this);

    this._eventInstalled = 0;
  };
  GridControl.GridSymbols = GridSymbols;
  GridControl.ReservedParameter = ReservedParameter;
  GridControl.prototype = {
    constructor :GridControl,
    element:function(){return this.$container;},
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
    getToolbar: function () {
      return this.toolbar;
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
      comp.Header.getAllCols(this.getHeader().row()).map(function(i,item){
        var $item = $(item);
        var filterValEle = $item.find('.filter-value');
        var keyname = $item.data('column-key');
        var sortkeyname = 'sort_' + keyname;
        var filterVal = paramObj[keyname];
        if(filterValEle.data('multi-value') && (!!filterVal)){
          filterVal = filterVal.join(',');
        }

        handlers.SortHandler.orders.setOrder($item, paramObj[sortkeyname]);
        handlers.FilterHandler.setValue($item, filterVal);

        //update filter
        var $filter = $item.find('.entity-filter');
        FilterTemplates.setValue($filter, filterVal);
      });
    },

    // ********************** *
    // RELOAD TRIGGERING      *
    // ********************** *
    doLoadByEvent : function(e, loadEvent){
      //build parameters
      var griddata = this.data;
      griddata.entityType('');
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
      var griddata = this.data;
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

      this.toolbar.init(gridinfo, data.actions, data.linksObj);

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
        .entityCeilingType(data.entityCeilingType)
        .entityType(data.entityType)
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
      var griddata = this.data;
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
          if(PersistentUrlParams.indexOf(rkey) < 0){
            delete paramObj[rkey];
          }
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
      var griddata = this.data;

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
      comp.Body.makeRowsAndAppend(gridinfo, entities, $tbody);
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
    reload : function(){
      var griddata = this.data;
      griddata.pageSize('').totalRecords('');
      GridControl.eh.fireReloadEvent(this.header.element(), new LoadEventData(LoadEventData.source.PARAMETER));
    },
    reloadWithOffset : function(){
      var griddata = this.data;
      griddata.pageSize('').totalRecords('');
      GridControl.eh.fireReloadEvent(this.header.element(), new LoadEventData(LoadEventData.source.PARAMETER, true));
    },
    loadByUrl : function(url, parameter){
      var griddata = this.data;

      var inUrl = host.url.getBaseUrl(url);
      parameter = host.url.param.connect( host.url.getParameter(url),parameter);

      griddata.baseUrl(inUrl ? inUrl : '');
      griddata.parameter('').criteriaParameter('').pageSize('').totalRecords('');
      griddata.parameter(parameter ? parameter : '');

      GridControl.eh.fireReloadEvent(this.header.element(), new LoadEventData(LoadEventData.source.URL));
    },
    loadBySortFilterParam : function (criteriaParameter) {
      var griddata = this.data;

      var url = griddata.baseUrl();
      var param = griddata.parameter();

      griddata.criteriaParameter(criteriaParameter).pageSize('').totalRecords('');

      GridControl.eh.fireReloadEvent(this.header.element(), new LoadEventData(LoadEventData.source.PARAMETER));
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
      if(!this._eventInstalled)
        return;
      var $ele = this.element();
      $ele.off(ENTITY_RELOAD_EVENT, GridControl.eh.reloadEventHandler);
      $ele.off('click', 'tr.data-row', GridControl.eh.rowClickHandler);

      this.columnResizer.unbindEvents();
      this.filterHandler.unbindEvents();
      this.sortHandler.unbindEvents();
      this.toolbar.unbindEvents();
      this._eventInstalled --;
    },
    bindEvents : function(){
      if(this._eventInstalled)
        return;
      var $ele = this.element();
      $ele.on(ENTITY_RELOAD_EVENT, this, GridControl.eh.reloadEventHandler);
      $ele.on('click', 'tr.data-row', this, GridControl.eh.rowClickHandler);

      this.columnResizer.bindEvents();
      this.filterHandler.bindEvents();
      this.sortHandler.bindEvents();
      this.toolbar.bindEvents();
      this._eventInstalled ++;
    },
    rebindEvents : function(){
      this.unbindEvents();
      this.bindEvents();
    },

    // ********************** *
    // OTHER FUNCTIONS       *
    // ********************** *
    selectRowByIndex : function(index){
      var grid = this;
      var dataaccess = grid.data;
      var $tbody = grid.body.$tbody;
      var oldindex = dataaccess.selectedIndex();
      var newindex = index;
      if (newindex == oldindex) {newindex = -1;}

      $tbody.find('tr[data-entity-index=' + oldindex + '].data-row').removeClass('selected');
      var $row = $tbody.find('tr[data-entity-index=' + newindex + '].data-row').addClass('selected');

      var selected = $row.is('.selected');
      dataaccess.selectedIndex(newindex);
      var dataUrl = ((!!(newindex >= 0))? $row.attr('data-url') : null);

      var gridEle = GridControl.findContainerElement($row);
      grid.getToolbar().switchElementActionUrl(dataUrl)
    }
  };
  /**
   * Reload event bind-ed on the .container element
   * @type {{_eventInstalled: number, bindUiEvent: Function, unbindUiEvent: Function, fireReloadEvent: Function, rowClickHandler: Function}}
   */
  GridControl.eh= {
    fireReloadEvent: function ($ele, reloadEvent) {
      var $container = GridControl.findContainerElement($ele);
      var header = $container.find(GridSymbols.GRID_HEADER);
      var griddata = new GridDataAccess($container);
      griddata.totalRecords('');
      griddata.recordRanges('set', '0-0');

      header.trigger(ENTITY_RELOAD_EVENT, reloadEvent);
    },
    reloadEventHandler : function(e, reloadEvent){
      var $el = $(this);
      var grid = e.data;
      grid.doLoadByEvent(e, reloadEvent);
    },
    rowClickHandler: function (e) {
      var $el = $(this),
        $row = $el.closest('tr.data-row'),
        grid = e.data;
      var dataaccess = grid.data;
      var newindex = -1;
      if ($row.length == 0) {
        newindex = -1;
      }else{
        var oldindex = dataaccess.selectedIndex();
        var theRowIndex = $row.attr('data-entity-index');
        if (theRowIndex == oldindex) {newindex = -1;}
        else{
            newindex = theRowIndex;
        }
      }
      grid.selectRowByIndex(newindex);
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
  GridControl.makeRawHtmlGridElement = (function(){
    var $template = $(GridSymbols.GRID_MAIN_TEMPLATE + ' .entity-grid-container-template').clone();
    $template.removeClass('entity-grid-container-template').addClass('entity-grid-container');
    return function(){return $template.clone()};
  })();

  var onDocReady = function ($doc) {
    handlers.ColumnResizer.eh.bindOnDocReady($doc);
    handlers.FilterHandler.eh.bindOnDocReady($doc);
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
    element: function(){return this.$grpEle; },
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
        $ctrl.attr('data-action-url', entityUrl).data('action-url', entityUrl);
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
      if(!actions)
        return;
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
      });
    },
    updateEditSuccessRedirect : function(redirect, action){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control[data-action='+action+'][data-edit-success-redirect]')
        .attr('data-edit-success-redirect', (!!redirect)?'true':'false');
    },
    dropActionControl : function(action){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control').remove('[data-action='+action+']');
      return this;
    },
    dropActionControlExcept : function(except){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control').remove(':not([data-action='+except+'])');
      return this;
    },
    hasAction:function(action){
      var actionGrp = this.$grpEle;
      return !!(actionGrp.find('.action-control[data-action='+action+']').is(':visible'));
    },
    toggle : function(val){
      this.$grpEle.toggle(val);
    }
  };
  ActionGroup.replaceMainActionGroup = function(actionGroup){
    if(actionGroup){
      actionGroup.toggle(false);
      var mainAgEle = actionGroup.element().clone();
      var mainAg = new ActionGroup(mainAgEle);mainAg.toggle(true);
      $('.entity-main-action-group').empty().append(mainAgEle);
    }else{
      $('.entity-main-action-group').empty();
    }
  }
  ActionGroup.findChildActionGroup = function ($ele) {
    var $grpEle = $('.action-group', $ele);
    return new ActionGroup($grpEle);
  };
  ActionGroup.findParentActionGroup = function ($ele) {
    var $grpEle = $ele.closest('.action-group');
    if($grpEle.length == 1)
      return new ActionGroup($grpEle);
  };

  var EntityModalOptions = {
    postSetUrlContent:function(content, _modal){
      var mform = host.entity.form.findFirstFromPage(content);
      mform.inModal(_modal);
      mform.fill();
      mform.setSubmitHandler(_modal.formSubmitHandlers);
      _modal._doSetTitle(mform.fullAction(true));
    }
  }
  var Modal = host.modal;
  function EntityModal(options){
    var newOptions = $.extend({}, EntityModalOptions, options);
    var getargs = Array.prototype.slice.call(arguments);getargs[0] = newOptions;
    Modal.apply(this, getargs);
    this.formSubmitHandlers = {};
  }
  EntityModal.prototype = Object.create(Modal.prototype, {
    constructor:{value:EntityModal},
    setFormSubmitHandlers:{value:function(handlers){
      this.formSubmitHandlers = handlers;
    }}
  });

  host.entity = {
    actionGroup : ActionGroup,
    grid: GridControl,
    modal: EntityModal,
    initOnDocReady: onDocReady
  };
})(jQuery, tallybook);
