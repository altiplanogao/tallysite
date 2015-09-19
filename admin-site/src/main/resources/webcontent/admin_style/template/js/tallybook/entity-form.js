;
var tallybook = tallybook || {};

(function ($, window, host) {
  'use strict';

  var ActionGroup = host.entity.actionGroup;
  var TabHolder = host.tabholder;

  var MAIN_TEMPLATE = '.template.form-template';

  var FormSymbols ={
    ENTITY_FORM : 'div.entity-form-container',
    TAB_HOLDER : 'div.tab-holder'
  };

//var formElementExample={
  //  data-form-field-type : string, integer-range, decimal range, foreign-key
  //  data-support-field-types : string, email, phone, boolean
  //}
  var ElementHandler = function(initializer, valuehandler){
    this.initializer = initializer;
    this.valuehandler = valuehandler;
  }
  var ElementTemplates = {
    handlers : { // keys are element-types
      string : new ElementHandler(
        function(element, fieldInfo){
          var fieldName = fieldInfo.name;
          var input = $('input', element).attr('name', fieldName);
        },
        {
          get : function(element) {return element.find('input').val();},
          set : function(element, val){return  element.find('input').val(val);}
        }
      ),
      enum : new ElementHandler(
        function(element, fieldInfo){
          var optionsContainer = $('select.options', element).attr('name', fieldInfo.name);
          var options = fieldInfo.facets.Enum.options;
          var friendlyNames = fieldInfo.facets.Enum.friendlyNames;
          var opElems = options.map(function(t){
            var $opE = $('<option>', {'value' : t} ).text(friendlyNames[t]);
            return $opE;
          });
          optionsContainer.empty().wrapInner(opElems);
        },
        {
          get : function(element) {
            var optionsContainer = $('select.options', element);
            return optionsContainer.val();
          },
          set : function(element, val){
            var optionsContainer = $('select.options', element);
            return  optionsContainer.val(val);
          }
        }
      )
    },
    /**
     * Get the element template by field type
     * @param fieldType : the field type of the template
     */
    _getFieldTemplate : (function () {
      var elementMap = {};
      var $elements = $(MAIN_TEMPLATE + ' table.entity-field-template-table > tbody div.field-box');
      $elements.each(function(index, element){
        var $ele = $(element);
        $ele.attr('data-support-field-types').split(',').forEach(function (fldtp) {
          elementMap[fldtp.toLowerCase()] = $ele;
        })
      });
      return function (fieldType) {
        var $ele = elementMap[fieldType];
        $ele = $ele ? $ele : elementMap['default'];
        return $ele.clone();
      }
    })(),
    /**
     * Create an html element for a field
     * @param fieldInfo
     * @param entity
     * @returns the html element
     */
    createElementByFieldInfo: function (fieldInfo, entity) {
      var fieldType = fieldInfo.fieldType.toLowerCase();
      var fieldName = fieldInfo.name;
      var element = ElementTemplates._getFieldTemplate(fieldType);
      element.attr('data-field-name', fieldName);
      element.find('div.field-label').text(fieldInfo.friendlyName);
      var eleType = element.data('form-field-type');

      var handler = ElementTemplates.handlers[eleType];
      if(handler){
        handler.initializer && handler.initializer(element, fieldInfo);
        handler.valuehandler && handler.valuehandler.set(element, entity[fieldName]);
      }
      return element;
    }
  };
  
  function EntityDataAccess(form){
    this.form = form;
  }
  EntityDataAccess.prototype={
  }

  function EntityForm ($formContainer){
    this.$container = $formContainer;
    this.$tabholder = $formContainer.find(FormSymbols.TAB_HOLDER);
  }
  EntityForm.prototype = {
    element : function(){return this.$container},
    initialized : host.elementValueAccess.defineGetSet('initialized', false),
    dataContent: function(){
      return this.$container.find('.data-content p').data("content");
    },
    createGroupContent : function(groupInfo, fields, entity){
      var $group = $('<fieldset>', {'class':'entity-group', 'data-group-name': groupInfo.name});
      var $groupTitle = $('<legend>').text(groupInfo.friendlyName);
      $group.append($groupTitle);
      var fieldEles = groupInfo.fields.map(function(fieldName){
        var field = fields[fieldName];
        if(field.formVisible){
          var fieldEle = ElementTemplates.createElementByFieldInfo(field, entity);
          return fieldEle;
        }else{return '';}
      });
      $group.append(fieldEles);
      return $group;
    },
    createTabContent : function (tabInfo, fields, entity){
      var _this = this;
      var $div = $('<div>', {'class':'entity-tab', 'data-tab-name': tabInfo.name});
      var $groups = tabInfo.groups.map(function(group, index, array){
        var $group = _this.createGroupContent(group, fields, entity);
        return $group;
      });
      $div.html($groups);
      return $div;
    },
    buildUpForm : function(fillData){
      if(this.initialized()){return;}
      var _this = this;
      var rawData = this.dataContent();
      var data = this.entityData.processData(rawData);
      var entity = data.entity.data;
      var formInfo = this.entityData.formInfo(data);
      var tabHolder = new TabHolder(this.$tabholder);
      formInfo.tabs.forEach(function(tab, index, array){
        var $div = _this.createTabContent(tab, formInfo.fields, entity);
        tabHolder.addTab(tab.name, tab.friendlyName, $div);
      });
      tabHolder.activeByIndexOrName(0);
      var ag = ActionGroup.findEntityActionGroup(document);
      ag.switchAllActions(false);
      ag.switchElementActionUrl(data.baseUrl);
      ag.switchAction(data.actions, true);
      this.initialized(true);
    },
    entityData :{
      processData : function(rawData){
        return rawData;
      },
      formInfo : function(data){
        return data.info.details['form'];
      }
    }
  }

  EntityForm.findFromPage= function($page){
    var $ctrls = $page.find(FormSymbols.ENTITY_FORM);
    var fms = $ctrls.map(function(index, ctrl, array){
      var fm = new EntityForm($(ctrl));
      return fm;
    });
    return fms;
  }
  EntityForm.findFirstFromPage= function($page){
    var $ctrls = $page.find(FormSymbols.ENTITY_FORM);
    if($ctrls.length >= 1){
      var fm = new EntityForm($($ctrls[0]));
      return fm;
    }
    return null;
  };

  EntityForm.makeRawHtmlFormElement = (function () {
    var $template = $(MAIN_TEMPLATE + ' .entity-form-container-template').clone();
    $template.removeClass('entity-form-container-template').addClass('entity-form-container');
    return function () {return $template.clone();}
  })()
  EntityForm.initOnDocReady = function ($doc) {
    var $ctrls = $doc.find(FormSymbols.ENTITY_FORM).each(function () {
      var $container = $(this);
      var fm = new EntityForm($container);
      fm.buildUpForm(true);
    });
  }

  host.entity.form = EntityForm;

})(jQuery, this, tallybook);

