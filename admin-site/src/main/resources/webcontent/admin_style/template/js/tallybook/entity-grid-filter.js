;
var tallybook = tallybook || {};

(function ($, host) {
  'use strict';
  var GridSymbols = {
    GRID_MAIN_TEMPLATE: ".template.grid-template"
  }
  var ModalStack = host.modal.stack;
  var entityProperty = host.entity.entityProperty;

  var FilterEventHandler = {
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
      FilterHandlerManager.setValue($filter, '');
    },
    toOneEntityBtnHandler : function (e) {
      var $el = $(e.currentTarget);
      var header = $el.closest('.column-header.dropdown');
      var $filter = header.find('.entity-filter');
      if($filter.size() == 0)
        return;
      var url = $el.attr('data-select-url');
      var fieldFriendlyName = $el.attr('data-field-friendly-name');
      var doSelectModal = host.modal.makeModal({target: fieldFriendlyName}, host.entity.gridModal);
      doSelectModal.addOnHideCallback(function(modal){
        var entity = modal.selectedEntity();
        if(entity == null)
          return;
        var displayField = $el.attr('data-display-field');
        var idField = $el.attr('data-id-field');
        var id = entityProperty(entity,idField);
        var name = entityProperty(entity,displayField);
        var handler = host.entity.filterHandlerManager.getHandler('foreignkey');
        handler.addEntity($filter, id, name);
      })
      ModalStack.showModal(doSelectModal);
      doSelectModal.setContentByLink(url);
    },
    dropEntityBtnHandler : function (e) {
      var $el = $(e.currentTarget);
      var chosen = $el.closest('.chosen-entity');
      chosen.remove();
    }
  }

  var FilterHandlerManager = (function(){
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
    var EmptyFilterHandler = {
      initializer : function (filter, fieldinfo){},
      //get: ui value -> string; set: string -> ui value
      get: function (entityFilter){return ""},
      set: function (entityFilter, val){}
    };
    function FilterHandler(handler) {
      $.extend(this, EmptyFilterHandler, handler);
    }
    FilterHandler.prototype={
      preInitialize : function(filter, fieldinfo, gridinfo){
        filter.data('grid-info', gridinfo);
        filter.data('field-info', fieldinfo);
      },
      getGridInfo : function(filter){return filter.data('grid-info');},
      getFieldInfo : function(filter){return filter.data('field-info');}
    }

    return {
      _handlers : { // keys are filter-types
        string: new FilterHandler({
          initializer : function (filter, fieldinfo) {
            var $input = $('input.filter-input', filter);
            $input.attr({'data-name': fieldinfo.name, 'placeholder': fieldinfo.friendlyName});
          },
          get: function (entityFilter) {
            return entityFilter.find('.filter-input').val();
          },
          set: function (entityFilter, val) {
            entityFilter.find('i.embed-delete').toggle(!!val);
            return entityFilter.find('.filter-input').val(val);
          }}),
        enumeration : new FilterHandler({
          initializer : function (filter, fieldinfo, gridinfo, valElem) {
              valElem.attr("data-multi-value", "true");
              valElem.data("multi-value", true);

            var $options = $('div.options', filter);
            var optionsVals = fieldinfo.options;
            var optionsNames = fieldinfo.optionsFriendly;
            optionsVals.forEach(function(opv){
//<label class="option"><input type="checkbox" name="gender" value="male"><span>Male</span></label>
              var opName = optionsNames[opv];
              var opipt = $('<input>', { 'type':"checkbox", 'name': fieldinfo.name, 'value': opv});
              var opspan = $('<span>').text(opName);
              var op = $('<label>',{ 'class':"option"}).append(opipt).append(opspan);
              $options.append(op);

            });
          },
          get: function (entityFilter) {
            var $options = $('.options .option input[type=checkbox]', entityFilter);
            var checkedVals = [];
            $options.filter(function(index, item){return item.checked;})
              .each(function(index, item){checkedVals.push($(item).attr('value'));});
            if(checkedVals.length == 0) return '';
            return JSON.stringify(checkedVals);
          },
          set: function (entityFilter, val) {
            var selectedVals = [];
            if(val){
              selectedVals = JSON.parse(val);
            }
            var $options = $('.options .option input[type=checkbox]', entityFilter);
            $options.each(function(index, item){
              var $item = $(item);
              var val = $item.attr('value');
              item.checked = !!(selectedVals.indexOf(val) >= 0);
            })
          }}),
        boolean : new FilterHandler({
          initializer : function (filter, fieldinfo){
            var trOpts = fieldinfo.options;
            filter.find('input[type=radio]').attr({'name' : fieldinfo.name});
            filter.find('input[type=radio][value=true]+span').text(trOpts.t);
            filter.find('input[type=radio][value=false]+span').text(trOpts.f);
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
            }}}),
        foreignkey : new FilterHandler({
          initializer : function (filter, fieldinfo, gridinfo, valElem){
            valElem.attr("data-multi-value", "true");
            valElem.data("multi-value", true);

            var fieldFriendlyName = fieldinfo.friendlyName;
            var selectUrl = fieldinfo.selectUri;
            var lookup = filter.find('.lookup-entity');
            lookup.attr({'data-field-name':fieldinfo.name,
              'data-field-friendly-name':fieldinfo.friendlyName,
              'data-display-field':fieldinfo.displayFieldName,
              'data-id-field':fieldinfo.idFieldName,
              'data-select-url':selectUrl
            });
            filter.attr('data-entity-type', fieldinfo.entityType);
            lookup.find('.with').text(fieldFriendlyName);
          },
          //get: ui value -> string; set: string -> ui value
          get: function (filter){
            var $chosens = filter.find('.chosen-entity');
            if($chosens.length == 0)
              return '';
            var chosenArray = [];
            $chosens.each(function(i,t){
              var $t = $(t);
              var id = $t.attr('data-entity-id');
              var name = $t.find('.entity-name').text();
              chosenArray.push({id:id, name : name});
            });
            return JSON.stringify(chosenArray);
          },
          set: function ($filter, val){
            var $chosens = $filter.find('.chosen-entity');
            $chosens.remove();
            if(null == val || '' == val)
              return;
            var selectedVals = [];
            if(val){
              selectedVals = JSON.parse(val);
            }
            var _this = this;
//            var arr = JSON.parse(val);
            selectedVals.forEach(function(tj,i){
              var t = JSON.parse(tj);
              var id = t.id;
              var name = t.name;
              _this.addEntity($filter, id, name);
            });
          },
          addEntity:function($filter, id, name){
            var $chosens = $filter.find('.chosen-entities');
            var exist = $chosens.find('.chosen-entity[data-entity-id='+id+']').length > 0;
            if(!exist){
              var fieldinfo = this.getFieldInfo($filter);
              var template = new UriTemplate(fieldinfo.recordUri);
              var entity4Tmp = {}; entity4Tmp[fieldinfo.idFieldName]=id;
              var url =template.fill(entity4Tmp);

              var newEle = $('<div class="chosen-entity" data-entity-id=""><i class="fa fa-times-circle drop-entity"></i><span class="entity-name"></span></div>');
              var a = $('<a class="entity-form-modal-view" href=""><i class="fa fa-external-link"></i></a>').attr('href', url);
              newEle.append(a);

              newEle.attr('data-entity-id', id);
              newEle.find('.entity-name').text(name);
              $chosens.append(newEle);
            }
          }}),
        dateRange : new FilterHandler({
          initializer : function (filter, fieldinfo){
            var datapickerops = $.extend({changeMonth: true,changeYear:true},JSON.parse(host.messages.datepicker_localization));
            var fromTb = $('.from', filter);
            var toTb = $('.to', filter);
            var fromOps = $.extend({onClose:function(selectedDate){
              toTb.datepicker('option', 'minDate', selectedDate);} }, datapickerops);
            var toOps = $.extend({onClose:function(selectedDate){
              fromTb.datepicker('option', 'maxDate', selectedDate);} }, datapickerops);

            $.timepicker.datetimeRange(
              fromTb,
              toTb,
              {
                minInterval: (1000*60*60), // 1hr
                dateFormat: host.messages.datepicker_format_date,
                timeFormat: host.messages.datepicker_format_timez,
                start: fromOps, // start picker options
                end: toOps // end picker options
              }
            );
          },
          dateToStr:function(date){
            if(date){return '' + date.getTime()}
            return '';},
          strToDate:function(dateStr){
            if(dateStr){return new Date(new Number(dateStr))}
            return null;
          },
          //get: ui value -> string; set: string -> ui value
          get: function (filter){
            var fromTb = $('.from', filter);
            var toTb = $('.to', filter);
            var fromDate = fromTb.datetimepicker('getDate')
            var toDate = toTb.datetimepicker('getDate')
            if(fromDate == null && toDate == null)
              return '';
            var vals = [];
            vals.push(this.dateToStr(fromDate));
            vals.push(this.dateToStr(toDate));
            return 'R' + vals.join('n') + 'G';
//            return JSON.stringify(['[' + vals.join(',') + ']']);
          },
          set: function (filter, val){
            if(val === undefined || val === null || '' == val){val = ['RnG'];}
            val=val[0];
            val = val.substr(1,val.length-2);
            var dateStrs = val.split('n');
            var fromDate = this.strToDate(dateStrs[0]);
            var toDate = this.strToDate(dateStrs[1]);

            var fromTb = $('.from', filter);
            var toTb = $('.to', filter);

            if(fromDate != null){
              fromTb.datetimepicker('setDate', fromDate);
            } else {
                fromTb.val('');
            }
            if(toDate != null){
                toTb.datetimepicker('setDate', toDate);
            }else{
                toTb.val('');
            }

            }})
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
            filterMap[fldtp.trim().toLowerCase()] = $filter;
          })
        });
        return function (fieldType) {
          var filterTmplt = filterMap[fieldType];
          filterTmplt = filterTmplt? filterTmplt : filterMap['default'];
          return filterTmplt.clone();
        }
      })(),
      createFilterByFieldInfo : function(fieldinfo, gridinfo, valElem){
        var fieldType = fieldinfo.fieldType.toLowerCase();
        var filter = FilterHandlerManager._getFilterTemplate(fieldType);
        var filterType = filter.data('filter-type');
        $('input.filter-property', filter).val(fieldinfo.name);
        $('input.sort-property', filter).val('sort_' + fieldinfo.name);

        var fHandler = this._handlers[filterType];
        if(fHandler){
          fHandler.preInitialize && fHandler.preInitialize(filter, fieldinfo, gridinfo);
          fHandler.initializer && fHandler.initializer(filter, fieldinfo, gridinfo, valElem);
        }
        return filter;
      },
      getHandler : function(filterType){
        return this._handlers[filterType];
      },
      getValue : function($filter){
        var filterType = $filter.data('filter-type');
        if(filterType){
          var handler = this.getHandler(filterType);
          return handler.get($filter);
        }
      },
      setValue : function($filter, val){
        var filterType = $filter.data('filter-type');
        if(filterType){
          var handler = this.getHandler(filterType);
          return handler.set($filter, val);
        }
      },
      bindEventsOnFilterRow : function($row){
        $row.on('keyup change focusin', '.entity-filter span.input-element input.filter-input', FilterEventHandler.inputChangeHandler);
        $row.on('click', '.entity-filter span.input-element i.embed-delete', FilterEventHandler.inputDelClickHandler);
        $row.on('click', '.entity-filter .filter-reset-button', FilterEventHandler.resetFilterHandler);
        $row.on('click', '.entity-filter .lookup-entity', FilterEventHandler.toOneEntityBtnHandler);
        $row.on('click', '.entity-filter .chosen-entities .drop-entity', FilterEventHandler.dropEntityBtnHandler);
      },
      unbindEventsOnFilterRow : function($row){
        $row.off('keyup change focusin', '.entity-filter span.input-element input.filter-input', FilterEventHandler.inputChangeHandler);
        $row.off('click', '.entity-filter span.input-element i.embed-delete', FilterEventHandler.inputDelClickHandler);
        $row.off('click', '.entity-filter .filter-reset-button', FilterEventHandler.resetFilterHandler);
        $row.off('click', '.entity-filter .lookup-entity', FilterEventHandler.toOneEntityBtnHandler);
        $row.off('click', '.entity-filter .chosen-entities .drop-entity', FilterEventHandler.dropEntityBtnHandler);
      }
    }
  })();

  host.entity = $.extend({}, host.entity, {
    filterHandlerManager: FilterHandlerManager
  });

})(jQuery, tallybook);
