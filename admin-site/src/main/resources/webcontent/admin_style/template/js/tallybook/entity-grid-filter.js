;
var tallybook = tallybook || {};

(function ($, host) {
  'use strict';
  var GridSymbols = {
    GRID_MAIN_TEMPLATE: ".template.grid-template"
  }

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
      initializer : function (filter, fieldInfo){},
      //get: ui value -> string; set: string -> ui value
      get: function (entityFilter){return ""},
      set: function (entityFilter, val){}
    };
    function FilterHandler(handler) {
      return $.extend({}, EmptyFilterHandler, handler);
    }
    FilterHandler.prototype={
    }

    return {
      _handlers : { // keys are filter-types
        string: FilterHandler({
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
          }}),
        enumeration : FilterHandler({
          initializer : function (filter, fieldInfo) {
            var $options = $('div.options', filter);
            var optionsVals = fieldInfo.options;
            var optionsNames = fieldInfo.optionsFriendly;
            optionsVals.forEach(function(opv){
//<label class="option"><input type="checkbox" name="gender" value="male"><span>Male</span></label>
              var opName = optionsNames[opv];
              var opipt = $('<input>', { 'type':"checkbox", 'name': fieldInfo.name, 'value': opv});
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
            return checkedVals.join(',');
          },
          set: function (entityFilter, val) {
            var selectedVals = [];
            if(val){
              selectedVals = val.split(',');
            }
            var $options = $('.options .option input[type=checkbox]', entityFilter);
            $options.each(function(index, item){
              var $item = $(item);
              var val = $item.attr('value');
              item.checked = !!(selectedVals.indexOf(val) >= 0);
            })
          }}),
        boolean : FilterHandler({
          initializer : function (filter, fieldInfo){
            var trOpts = fieldInfo.options;
            filter.find('input[type=radio]').attr({'name' : fieldInfo.name});
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
        var filter = FilterHandlerManager._getFilterTemplate(fieldType);
        var filterType = filter.data('filter-type');
        $('input.filter-property', filter).val(fieldInfo.name);
        $('input.sort-property', filter).val('sort_' + fieldInfo.name);

        var fHandler = this._handlers[filterType];
        if(fHandler){
          fHandler.initializer && fHandler.initializer(filter, fieldInfo);
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
      },
      unbindEventsOnFilterRow : function($row){
        $row.off('keyup change focusin', '.entity-filter span.input-element input.filter-input', FilterEventHandler.inputChangeHandler);
        $row.off('click', '.entity-filter span.input-element i.embed-delete', FilterEventHandler.inputDelClickHandler);
        $row.off('click', '.entity-filter .filter-reset-button', FilterEventHandler.resetFilterHandler);
      }
    }
  })();

  host.entity = $.extend({}, host.entity, {
    filterHandlerManager: FilterHandlerManager
  });

})(jQuery, tallybook);
