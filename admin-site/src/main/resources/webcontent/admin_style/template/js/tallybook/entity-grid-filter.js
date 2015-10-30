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
          initializer : function (filter, fieldInfo, gridInfo, valElem) {
              valElem.attr("data-multi-value", "true");
              valElem.data("multi-value", true);

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
            }}}),
        foreignkey : FilterHandler({
          initializer : function (filter, fieldInfo, gridinfo, valElem){
            valElem.attr("data-multi-value", "true");
            valElem.data("multi-value", true);

            var fieldFriendlyName = fieldInfo.friendlyName;
            var selectUrl = host.url.connectUrl(gridinfo.entityUrl, fieldInfo.name, 'select');
            var lookup = filter.find('.lookup-entity');
            lookup.attr({'data-field-name':fieldInfo.name,
              'data-field-friendly-name':fieldInfo.friendlyName,
              'data-display-field':fieldInfo.displayFieldName,
              'data-id-field':fieldInfo.idFieldName,
              'data-select-url':selectUrl
            });
            filter.attr('data-entity-type', fieldInfo.entityType);
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
              var entityType = $filter.attr('data-entity-type');
              var url = host.url.connectUrl('/',entityType, id); 
              var newEle = $('<div class="chosen-entity" data-entity-id=""><i class="fa fa-times-circle drop-entity"></i><span class="entity-name"></span></div>');
              var a = $('<a class="entity-form-modal-view" href=""><i class="fa fa-external-link"></i></a>').attr('href', url);
              newEle.append(a);

              newEle.attr('data-entity-id', id);
              newEle.find('.entity-name').text(name);
              $chosens.append(newEle);
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
      createFilterByFieldInfo : function(fieldInfo, gridinfo, valElem){
        var fieldType = fieldInfo.fieldType.toLowerCase();
        var filter = FilterHandlerManager._getFilterTemplate(fieldType);
        var filterType = filter.data('filter-type');
        $('input.filter-property', filter).val(fieldInfo.name);
        $('input.sort-property', filter).val('sort_' + fieldInfo.name);

        var fHandler = this._handlers[filterType];
        if(fHandler){
          fHandler.initializer && fHandler.initializer(filter, fieldInfo, gridinfo, valElem);
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
