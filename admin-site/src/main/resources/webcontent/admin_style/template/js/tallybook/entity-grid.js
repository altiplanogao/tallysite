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
  var ActionGroup = host.entity.actionGroup;
  var CellTemplates = host.entity.gridCellTemplates;
  var FilterHandlerManager = host.entity.filterHandlerManager;
  var entityProperty = host.entity.entityProperty;
  var QueryResponse = host.entity.queryResponse;
  var EntityContext = host.entity.entityContext;

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

  var SelectedIndexChangedEvent = "selectedIndexChanged";

  var comp = (function(){
    var ColumnCreator = {
      _makeColumnHeader: (function () {
        var template = $(GridSymbols.GRID_MAIN_TEMPLATE + ' .column-header-template').clone().removeClass('column-header-template');
        return function () {return template.clone();};
      })(),
      makeElement : function(fieldinfo, gridinfo){
        if (fieldinfo) {
          var $col = this._makeColumnHeader();
          $col.find('.col-name').text(fieldinfo.friendlyName);
          if (!fieldinfo.gridVisible) {
            $col.css('display', 'none');
          }
          $col.find('.column-header').attr('data-column-key', fieldinfo.name);
          var iconSort = $col.find('.sort-icon');
          var iconFilter = $col.find('.filter-icon');
          if (fieldinfo.supportSort) {
            var sortValEle = $col.find('.sort-value');
            sortValEle.attr('name', 'sort_' + fieldinfo.name);
          } else {
            iconSort.hide();
          }
          if (fieldinfo.gridVisible && fieldinfo.supportFilter) {
            var filterValEle = $col.find('.filter-value');
            filterValEle.attr('name', fieldinfo.name);

            var filter = FilterHandlerManager.createFilterByFieldInfo(fieldinfo, gridinfo, filterValEle);
            $col.find('.entity-filter').replaceWith(filter);
          } else {
            iconFilter.hide();
          }
          return $col;
        }
      }
    };

    var RowCreator = {
      _makeCellContainer: function (fieldname, fieldvalue) {
        return $("<td>", {"data-fieldname": fieldname, "data-fieldvalue": fieldvalue});
      },
      _makeCell: function (entityCtx, field, entity) {
        var fieldname = field.name;
        var fieldvalue = entityProperty(entity, fieldname);
        var content = CellTemplates.createCell(entityCtx, entity, field);
        var $cell = this._makeCellContainer(fieldname, fieldvalue);
        $cell.html(content).toggle(field.gridVisible);
        return $cell;
      },
      _makeCells: function (entityCtx, fields, entity) {
        var _this = this;
        var $cells = fields.map(function (field, index, array) {
          var $cell = _this._makeCell(entityCtx, field, entity);
          return $cell;
        });
        return $cells;
      },
      _makeRowContainer: function (entityCtx, entity, entityIndex) {
        var uri = entityCtx.makeUri(entity);
        var $row = $('<tr>', {
          'class' : "data-row",
          'data-id': entityProperty(entity, entityCtx.idField),
          'data-name': entityProperty(entity, entityCtx.nameField),
          'data-entity-index' : entityIndex,
          'data-uri' : uri
        });
        return $row;
      },
      makeRow: function (entityCtx, entity, entityIndex) {
        var $row = this._makeRowContainer(entityCtx, entity, entityIndex);
        var $cells = this._makeCells(entityCtx, entityCtx.info.fields, entity);
        $row.html($cells).data('entity', entity);
        return $row;
      }
    };

    function ToolbarControl(gc){
      this.gc = gc;//grid control
      this.$ele = this.gc.element().find(GridSymbols.GRID_TOOLBAR);
      this.actionGroup = new ActionGroup(this.$ele.find('.action-group'));
    };
    ToolbarControl.prototype = {
      init : function(gridinfo, actions, linksObj){
        var $ele = this.element();
        var searchGrp = $ele.find('.search-group');
        searchGrp.toggle(!!(gridinfo.primarySearchField));
        if(gridinfo.primarySearchField){
          searchGrp.attr('data-search-column', gridinfo.primarySearchField);
          $ele.find('i.embed-delete').hide();
          var gridSearchField = gridinfo.primarySearchField;
          var gridSearchFieldFriendly = null;
          var has = gridinfo.fields.some(function(t,i){
            if(t.name == gridSearchField){
              gridSearchFieldFriendly = t.friendlyName;
              return true;
            }
          });
          $ele.find('input.search-input').attr({'data-name' : gridSearchField, placeholder : gridSearchFieldFriendly})
            .val('').toggle(has);
        }
        this.actionGroup.setup(actions, linksObj);
      },
      element : function (){
        return this.$ele;
      },
      getCsrf : function(){
        var $ele = this.element().find('form.post-agent input[name=_csrf]');
        return $ele.val();
      },
      getActionGroup : function () {
        return this.actionGroup;
      },
      selectionUpdate : function(anchorObj){
        var $ele = this.element();
        this.actionGroup.focusOnEntry(anchorObj);
      },
      bindEvents : function(){
        var $ele = this.element();
        $ele.on('keyup change focusin', 'input.search-input', this, ToolbarControl.eh.searchInputChangeHandler);
        $ele.on('click', 'i.embed-delete', this, ToolbarControl.eh.searchInputDelClickHandler);
        $ele.on('click', '.btn.search-btn', this, ToolbarControl.eh.invokeDoFilterHandler);
        $ele.on('keypress', '.search-input', this, ToolbarControl.eh.invokeKeyTriggerDoFilterHandler);
        $ele.on('click', '.action-control', this, ToolbarControl.eh.invokeActionHandler);
      },
      unbindEvents : function(){
        var $ele = this.element();
        $ele.off('keyup change focusin', 'input.search-input', ToolbarControl.eh.searchInputChangeHandler);
        $ele.off('click', 'i.embed-delete', ToolbarControl.eh.searchInputDelClickHandler);
        $ele.off('click', '.btn.search-btn', ToolbarControl.eh.invokeDoFilterHandler);
        $ele.off('keypress', '.search-input', ToolbarControl.eh.invokeKeyTriggerDoFilterHandler);
        $ele.off('click', '.action-control', ToolbarControl.eh.invokeActionHandler);
      }
    };
    ToolbarControl.eh = {
      searchInputChangeHandler: function (e) {
        var $el = $(this),//NOTE: 'this' is the element triggers the event
          inputElement = $el.closest('.search-input-element');
        var $input = inputElement.find('input.search-input');
        if ($input) {
          var newVal = $input.val();
          inputElement.find('i.embed-delete').toggle(!!newVal);
        }
      },
      searchInputDelClickHandler: function (e) {
        var $el = $(this),//NOTE: 'this' is the element triggers the event
          inputElement = $el.closest('.search-input-element');
        var $delIcon = inputElement.find('i.embed-delete').hide();
        var $input = inputElement.find('input.search-input').val('').focus();
      },
      invokeKeyTriggerDoFilterHandler: function (e) {
        var keycode = (e.keyCode ? e.keyCode : e.which);
        if (keycode == '13') {
          ToolbarControl.eh.invokeDoFilterHandler(e);
          e.stopPropagation();
        }
      },
      invokeDoFilterHandler: function (e) {
        var $el = $(e.currentTarget);//NOTE: 'this' is the element triggers the event
        var $inputGroup = $el.closest('.search-group');
        var inputVal = $inputGroup.find('input.search-input').val();
        var searchColumn = $inputGroup.attr('data-search-column');
        var parameter = (!!inputVal) ? ('' + searchColumn + '=' + inputVal) : '';

        var toolbar = e.data;
        toolbar.gc.loadByCriteriaParam(parameter);
      },
      invokeActionHandler: function(e){
        var gc = e.data.gc, $el = $(this), action=$el.data('action'), tc = gc.getToolbar();
        switch(action){
          case 'create':
          case 'update':
            var url = ActionGroup.getUri($el),
              isModal = $el.data('edit-in-modal'),
              editSuccessRedirect=$el.data('edit-success-redirect');
            if(isModal){
              var modal = host.modal.makeModal({}, host.entity.formModal);
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
                        gc.reload();
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
                var _url = ActionGroup.getUri($el);
                var gda = gc.da;
                var postEntityData = {
                  _csrf : gc.toolbar.getCsrf(),
                  type : gda.type(),
                  ceilingType : gda.ceilingType()
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
                        gc.reload();
                        opts.skipAjaxDefaultHandler = true;
                        gc.selectRowByIndex(-1);
                      }else{
                        var errors = (data.data)? data.data.errors : null;
                        if(errors) errors = errors.global;
                        var delErrorModal = host.modal.makeModal();
                        ModalStack.showModal(delErrorModal);
                        delErrorModal.setContentAsMessage({
                            header:host.messages.error,
                            message: errors
                        });
                        gc.reload();
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

    function HeaderControl(gc) {
      this.$ele = gc.element().find(GridSymbols.GRID_HEADER);
      this.$row = this.$ele.find(GridSymbols.GRID_HEADER__ROW);
    };
    HeaderControl.prototype = {
      element: function () {
        return this.$ele;
      },
      row:function(){return this.$row;},
      width: function () {
        return this.element().width();
      },
      columnCount: function () {
        return this.row().find('th').length;
      },
      makeColumnsAndSet: function (gridinfo) {
        var visibles = [];
        var visibleTotal = 0;
        var $cols = gridinfo.fields.map(function (fieldinfo, index, array) {
          var $col = ColumnCreator.makeElement(fieldinfo, gridinfo);
          var visi = (fieldinfo.gridVisible ? 1 : 0);
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

    function BodyControl(gc) {
      this.gc = gc;
      this.$body = gc.element().find(GridSymbols.GRID_BODY);
      this.$table = this.$body.find('table');
      this.$theadRow = this.$table.find('thead tr');
      this.$tbody = this.$table.find('tbody');
      this.$emptyCell = this.$tbody.find('td.entity-grid-no-results');
      var headerCtrl = gc.header;
      this.$emptyCell.attr('colspan', headerCtrl.columnCount());
      this.$emptyRow = this.$emptyCell.closest('tr');
    };
    BodyControl.prototype = {
      element: function () {
        return this.$body;
      },
      makeHeaderMirror: function () {
        var header = this.gc.getHeader();
        this.$emptyCell.attr('colspan', header.columnCount());
        var $row = header.$row.clone();
        $row.find('th').empty();

        this.$theadRow.html($row.html());
      },
      emptyRowReset: function (entities) {
        this.$emptyRow.toggle(entities.totalCount == 0);
      },
      clearRows: function () {
        this.$tbody.empty().append(this.$emptyRow);
      },
      makeRowsAndAppend: function (entityCtx, entities) {
        BodyControl.makeRowsAndAppend(entityCtx, entities, this.$tbody);
      },
      getRowHeight: function () {
        var $row = this.$tbody.find('tr:not(.blank-padding):not(.empty-mark):first');
        return $row.height();
      }
    };
    BodyControl.makeRowsAndAppend = function (entityCtx, entities, $tbody) {
      var $rows = entities.beans.map(function (entity, index, array) {
        var entityIndex = entities.startIndex + index;
        return RowCreator.makeRow(entityCtx, entity, entityIndex);
      });
      $tbody.append($rows);
    };

    function FooterControl(gc) {
      this.$footer = gc.element().find(GridSymbols.GRID_FOOTER);
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

    function SpinnerControl(gc) {
      this.gc = gc;
      this.$spinner = gc.element().find(GridSymbols.GRID_SPINNER);
      this.$icon = this.$spinner.find(GridSymbols.GRID_SPINNER__ITEM);
    };
    SpinnerControl.prototype = {
      element: function () {
        return this.$spinner;
      },
      setOffset : function (offsetFromBodyTop) {//in pixel
        var body = this.gc.body;
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
    var FilterHandler = function(gc){
      this.gc = gc;
      this._installation = 0;
    };
    FilterHandler.prototype={
      bindEvents : function () {
        var gc = this.gc;
        var colsRow = gc.getHeader().row();

        FilterHandlerManager.bindEventsOnFilterRow(colsRow);
        colsRow.on('click', '.filter-icon', FilterHandler.eh.popupHandler);
        colsRow.on('keypress', '.entity-filter *', gc, FilterHandler.eh.invokeKeyTriggerDoFilterHandler);
        colsRow.on('click', '.entity-filter .filter-button', gc, FilterHandler.eh.invokeDoFilterHandler);
        this._installation++;
        console.log('FilterHandler.install. [' + this._installation + ']');
      },
      unbindEvents : function () {
        var colsRow = this.gc.getHeader().row();

        FilterHandlerManager.unbindEventsOnFilterRow(colsRow);
        colsRow.off('click', '.filter-icon',FilterHandler.eh.popupHandler);
        colsRow.off('keypress', '.entity-filter *', FilterHandler.eh.invokeKeyTriggerDoFilterHandler);
        colsRow.off('click', '.entity-filter .filter-button', FilterHandler.eh.invokeDoFilterHandler);
        this._installation--;
        console.log('FilterHandler.uninstall. [' + this._installation + ']');
      },
      rebindEvents : function(grid){this.unbindEvents(grid);this.bindEvents(grid);}
    };
    FilterHandler.setHeaderValue = function (header, value) {
      $('input[type=hidden].filter-value', header).val(value);
      $('.filter-sort-container', header).toggleClass('filter-active', !!value);
      console.log('todo: FilterHandler.setHeaderValue for different filters');
    };
    FilterHandler.getHeaderValue = function (header){
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
      outsideClickHandler: function (e) {
        if (e.originalEvent == undefined) return;
        var $target = $(e.originalEvent.target);
        var checkDatePicker = $target.closest('.ui-datepicker');
        if(checkDatePicker.length != 0) return;
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
        var value = FilterHandlerManager.getValue($filter);
        FilterHandler.setHeaderValue(header, value ? value : '');
        FilterHandler.closeDropdowns();

        GridControl.eh.fireReloadEvent(header, new LoadEventData(LoadEventData.source.UI));
      },
      bindOnDocReady : function($doc){
        $doc.on('click', 'body, html', FilterHandler.eh.outsideClickHandler);
      }
    };

    var SortHandler = function(gc){
      this.gc = gc;
      this._installation = 0;
    };
    SortHandler.prototype = {
      bindEvents : function () {
        var colsRow = this.gc.getHeader().row();
        colsRow.on('click', '.sort-icon', this.gc, SortHandler.eh.sortIconHandler);
        this._installation++;
        console.log('SortHandler.install. [' + this._installation + ']');
      },
      unbindEvents : function () {
        var colsRow = this.gc.getHeader().row();
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
        GridControl.eh.fireReloadEvent(header,new LoadEventData(LoadEventData.source.UI));
      }
    };

    var ColumnResizer = function (gc){
      this.gc = gc;
      this._installation = 0;
    };
    ColumnResizer.prototype={
      rebindEvents:function(){this.unbindEvents();this.bindEvents();},
      bindEvents: function () {
        var $headerTableThead = this.gc.getHeader().element();
        $headerTableThead.on('mousedown', 'th div.resizer', ColumnResizer.eh._mousedown);

        this._installation++;
        console.log('ColumnResizer.install. [' + this._installation + ']');
      },
      unbindEvents : function(){
        var $headerTableThead = this.gc.getHeader().element();
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

  function GridDataAccess(anyEle) {
    this.$container = GridControl.findContainerElement(anyEle);
  };
  GridDataAccess.prototype = {
    element:function(){return this.$container;},

    //input
    entityQueryUri: ElementValueAccess.defineGetSet('entity-query-uri','/'),
    parameter : ElementValueAccess.defineGetSet('parameter',''),
    criteriaParameter : ElementValueAccess.defineGetSet('criteria-parameter',''),
    //input/output
    pageSize : ElementValueAccess.defineGetSet('pagesize',''),
    //output(setting)
    ceilingType :ElementValueAccess.defineGetSet('ceiling-type',''),
    type :ElementValueAccess.defineGetSet('type',''),
    actions: ElementValueAccess.defineGetSet('actions',null),
    actionUris: ElementValueAccess.defineGetSet('action-uris',null),
    entryAnchor: ElementValueAccess.defineGetSet('entry-anchor','id'),
    //output(record)
    totalRecords : ElementValueAccess.defineGetSet('totalrecords', 0),
    //client data
    recordRanges: ElementValueAccess.defineArrayAddGetSet('recordranges', Range, function(array){
      RangeArrayHelper.sort(array);
      return RangeArrayHelper.merge(array);
    }),
    selectedIndex : ElementValueAccess.defineGetSet('selected-index', -1),
    //initialized mark
    initialized : ElementValueAccess.defineGetSet('initialized', false),

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
            var vals = JSON.parse(val);
            vals.forEach(function(singleVal, index, array){
              if($.isPlainObject(singleVal)){
                singleVal = JSON.stringify(singleVal);
              }
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
    },
    splitParameter : function(paramsStr){
      var paramObj = host.url.param.stringToData(paramsStr);
      var gda = this;
      //Make sure column ui already built
      var cParamKeys = gda.gatherAllCriteriaParameterKeys();

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
    }
  };

  var ENTITY_RELOAD_EVENT = 'entity-reload';
  function LoadEventData (val, withOffset){
    this._source = LoadEventData.source.NONE;
    this._withOffset = (!!withOffset) || false;//boolean value
    this.source(val);
  };
  LoadEventData.prototype={
    source : function(src){
      if(src === undefined){return this._source;}
      this._source = src;
    },
    checkSourceIs : function(src){
      return this._source == src;
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
      this.$container = $container;
    }
    console.log('GridControl construct');
    this.ENTITY_GRID_AJAX_LOCK = 0;
    this.toolbar = new comp.Toolbar(this);
    this.header = new comp.Header(this);
    this.footer = new comp.Footer(this);
    this.body = new comp.Body(this);
    this.spinner = new comp.Spinner(this);
    this.da = new GridDataAccess(this.$container);

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
    resize:function(){},
    dataContent : function(/*optional*/val){
      var $ele = this.$container.find('.data-content p');
      if(val === undefined){
        return $ele.data('content');
      }else{
        $ele.data('content', val);
      }
    },
    initialized: function (/*optional*/val) {
      return this.da.initialized(val);
    },
    isMain : function () {
      return this.$container.data('grid-scope') == 'main';
    },
    alignHeaderAndBody: function () {
      var hTable = this.header.element().find('.header-table');
      var bTable = this.body.element().find('.body-table');
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
    updateCriteriaUi:function(parameter){
      var paramObj = host.url.param.stringToData(parameter);
      comp.Header.getAllCols(this.getHeader().row()).map(function(i,item){
        var $item = $(item);
        var filterValEle = $item.find('.filter-value');
        var keyname = $item.data('column-key');
        var sortkeyname = 'sort_' + keyname;
        var filterVal = paramObj[keyname];
        if(filterValEle.data('multi-value') && (!!filterVal)){
          filterVal = JSON.stringify(filterVal);
        }

        handlers.SortHandler.orders.setOrder($item, paramObj[sortkeyname]);
        handlers.FilterHandler.setHeaderValue($item, filterVal);

        //update filter
        var $filter = $item.find('.entity-filter');
        FilterHandlerManager.setValue($filter, filterVal);
      });
    },

    // ********************** *
    // RELOAD TRIGGERING      *
    // ********************** *
    doLoadByEvent : function(e, loadEvent){
      //build parameters
      var gda = this.da;
//      gda.entityType('');
      var params = gda.parameter();
      var fillOps = {fillrecords:true, setupui:false};
      if(loadEvent.checkSourceIs(LoadEventData.source.UI)){
        var cparams = gda.gatherCriteriaParameter();
        gda.criteriaParameter(cparams?cparams:'');
      }else if(loadEvent.checkSourceIs(LoadEventData.source.URL)){
        var url = loadEvent.url;
        fillOps.setupui = true;
        this.fillParameterByUrl(url);
        this.updateCriteriaUi(gda.criteriaParameter());
      }else if(loadEvent.checkSourceIs(LoadEventData.source.PARAMETER)){
        this.updateCriteriaUi(gda.criteriaParameter());
      }
      var cparams = gda.criteriaParameter();

      var queryUri = host.url.connectUrl(window.location.origin, gda.entityQueryUri());
      var urldata = host.url.param.connect(params, cparams);

      this._doLoadUrl(queryUri, urldata, loadEvent, fillOps);
      this.selectRowByIndex(-1);
    },

    // ********************** *
    // DATA FILL FUNCTIONS    *
    // ********************** *
    //PART, REQUIRES
    //1. toolbar: gridinfo, actions, action-links
    //2. entitys: records, range
    fill: function (ops) {
      ops = $.extend({data:undefined, fillrecords:true, setupui:true, updateUri:false, uri:''} ,ops);
      var data = ops.data || this.dataContent();
      var fillrecords = !!ops.fillrecords;
      var setupui = !!ops.setupui;

      var gda = this.da;
      var queryResponse = new QueryResponse(data);
      var entityCtx = queryResponse.entityContext();

      if (setupui) {
        var gridsetting = {
          actions: queryResponse.actions(),
          linksObj: queryResponse.linksObj()
        };
        this.setupEntityUi(entityCtx, gridsetting);
      }
      //entityQueryUri()
      //.parameter()
      //.criteriaParameter()
       if (ops.updateUri) {
         this.fillParameterByUrl(ops.uri)
       }

      if (setupui) {
        this.updateCriteriaUi(gda.criteriaParameter());
      }

      if (fillrecords) {
        this.fillContent(entityCtx, queryResponse.entities());
      }
    },
    fillContent : function(entityCtx, queryBeans){
      this.body.emptyRowReset(queryBeans);
      this.body.clearRows();
      this.body.makeRowsAndAppend(entityCtx, queryBeans);
      var range = queryBeans.range();
      this.footer.setDataRange(range.lo, range.hi, queryBeans.totalCount);

      this.da//input/output
        .pageSize(queryBeans.pageSize)
        ////output(setting)
        //.entityCeilingType(data.entityCeilingType)
        //.entityType(data.entityType)
        //.actions(actions)
        //.actionUris(linksObj)
        //output(record)
        .totalRecords(queryBeans.totalCount)
        //client data
        .recordRanges('set', range);
//        .selectedIndex(-1)
    },
    setupEntityUi : function(entityCtx, gridsetting){
      var gridinfo = entityCtx.info;
      this.toolbar.init(gridinfo, gridsetting.actions, gridsetting.linksObj);
      this.header.makeColumnsAndSet(gridinfo);
      this.body.makeHeaderMirror();
      var gda = this.da;
      gda
      //output(setting)
      .ceilingType(entityCtx.ceilingType || '')
      .type(entityCtx.type || '')
      .actions(gridsetting.actions || [])
      .actionUris(gridsetting.linksObj || {});
    },
    fillParameterByUrl:function(url){
      var gda = this.da;
      var path = host.url.getPath(url);
      var paramStr = host.url.getParameter(url);
      var params = gda.splitParameter(paramStr);

      gda.entityQueryUri(path);
      gda.parameter(params.parameter);
      gda.criteriaParameter(params.cparameter);
    },
    fillTbody: function (queryResponse, $tbody) {
      if($tbody === undefined){
        $tbody = $('<tbody>');
      }
      var entityCtx = queryResponse.entityContext();
      var queryBeans = queryResponse.entities();

      comp.Body.makeRowsAndAppend(entityCtx, queryBeans, $tbody);
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
    reload : function(){this.loadByParam();},
    loadByParam : function(withOffset){
      var gda = this.da;
      gda.pageSize('').totalRecords('');
      GridControl.eh.fireReloadEvent(this.header.element(), new LoadEventData(LoadEventData.source.PARAMETER, withOffset));
    },
    loadByUrl : function(url, parameter){
      var gda = this.da;
      gda.entityQueryUri('')
        .parameter('').criteriaParameter('').pageSize('').totalRecords('');
      var eventData = new LoadEventData(LoadEventData.source.URL);
      eventData.url = url;
      GridControl.eh.fireReloadEvent(this.header.element(), eventData);
    },
    loadByCriteriaParam : function (criteriaParameter) {
      var gda = this.da;
      var url = gda.entityQueryUri();
      var param = gda.parameter();
      gda.criteriaParameter(criteriaParameter).pageSize('').totalRecords('');

      GridControl.eh.fireReloadEvent(this.header.element(), new LoadEventData(LoadEventData.source.PARAMETER));
    },

    // ********************** *
    // AJAX FUNCTIONS         *
    // ********************** *
    _doLoadUrl : function(url, urldata, loadEvent, fillops){
      var _this = this;
      this.ajaxLoadData({
        url:url,
        data: urldata,
        ondata: function (response) {
          _this.fill($.extend({data: response.data},fillops));
        }
      });
    },
    ajaxLoadData : function(options){
      //url(value or function), canskipcheck, ondata, ondataloaded
      var gc = this;
      var optionsclone = $.extend({}, options);
      var paramsObj = host.url.param.stringToData(options.data);
      optionsclone.dataObject = paramsObj;
      var _args = arguments;

      while (!gc.acquireLock()) {
        //console.log("Couldn't acquire lock. Will try again in " + lockDebounce + "ms");
        $.doTimeout('acquirelock', lockDebounce, function () {
          var callee = gc.ajaxLoadData;
          callee.apply(gc, _args);
        });
        return false;
      }
      if(options.canskipcheck) {
        if (options.canskipcheck()) {
          gc.releaseLock();
          return false;
        }
      }
      var url = null;
      if(options.url){
        if(typeof options.url == 'function' ){ url = options.url();}
        else{ url = options.url;}
      }
      if(url){
        gc.getSpinner().show(true);
        optionsclone.url = url;
        host.debug.log(ENABLE_URL_DEBUG, 'url: ' + url + ((!optionsclone.data)? '':'?'+optionsclone.data));

        AJAX.get(optionsclone, {
          success:function (response) {
            if(options.ondata) {
              options.ondata(response);
            }

            if(gc.isMain()){
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
            gc.releaseLock();
            gc.getSpinner().show(false);
          }}
        );
      }else{
        gc.releaseLock();
      }
    },

    // ********************** *
    // EVENTS FUNCTIONS       *
    // ********************** *
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
    rebindEvents : function(){
      this.unbindEvents();
      this.bindEvents();
    },

    // ********************** *
    // OTHER FUNCTIONS       *
    // ********************** *
    selectRowByIndex : function(index){
      var grid = this;
      var gda = grid.da;
      var $tbody = grid.body.$tbody;
      var oldindex = gda.selectedIndex();
      var newindex = index;
      if (newindex == oldindex) {newindex = -1;}

      $tbody.find('tr[data-entity-index=' + oldindex + '].data-row').removeClass('selected');
      var $row = $tbody.find('tr[data-entity-index=' + newindex + '].data-row').addClass('selected');

      var selected = $row.is('.selected');
      gda.selectedIndex(newindex);
      var selectedEntity = $row.data('entity');
      this.element().trigger(SelectedIndexChangedEvent, [oldindex, newindex, selectedEntity]);

      var anchor = this.da.entryAnchor();
      var entity = selectedEntity;
      var anchorObj = {};
      if(newindex >= 0){anchorObj[anchor] = entity[anchor];}

      grid.getToolbar().selectionUpdate(anchorObj);
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
      var gda = new GridDataAccess($container);
      gda.totalRecords('');
      gda.recordRanges('set', '0-0');

      header.trigger(ENTITY_RELOAD_EVENT, reloadEvent);
    },
    reloadEventHandler : function(e, reloadEvent){
      var $el = $(this);
      var gc = e.data;
      gc.doLoadByEvent(e, reloadEvent);
    },
    rowClickHandler: function (e) {
      var $el = $(this),
        $row = $el.closest('tr.data-row'),
        grid = e.data;
      var gda = grid.da;
      var newindex = -1;
      if ($row.length == 0) {
        newindex = -1;
      }else{
        var oldindex = gda.selectedIndex();
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

  host.entity = $.extend({}, host.entity, {
    grid: GridControl,
    initOnDocReady: onDocReady
  });
})(jQuery, tallybook);
