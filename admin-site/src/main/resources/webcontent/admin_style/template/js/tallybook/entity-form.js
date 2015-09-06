;
var tallybook = tallybook || {};

(function ($, window, host) {
  'use strict';

  var ActionGroup = host.entity.actionGroup;
  var TabHolder = host.tabholder;

  var PageSymbols ={
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
            var $opE = $('<option>').attr('value', t).text(friendlyNames[t]);
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
    _elementTemplateByFieldInfo : (function () {
      var $elements = $('.template.form-template table.entity-field-template-table > tbody div.field-box');
      var elementMap = {};
      $elements.each(function(index, element){
        var $ele = $(element);
        var fldtypes = $ele.attr('data-support-field-types').split(',');
        fldtypes.forEach(function (fldtp) {
          elementMap[fldtp.toLowerCase()] = $ele;
        })
      });
      return function (fieldType) {
        var $ele = elementMap[fieldType];
        $ele = $ele ? $ele : elementMap['default'];
        return $ele.clone();
      }
    })(),
    createElementByFieldInfo: function (fieldInfo, entity) {
      var fieldType = fieldInfo.fieldType.toLowerCase();
      var element = ElementTemplates._elementTemplateByFieldInfo(fieldType);
      var fieldName = fieldInfo.name;
      element.attr('data-field-name', fieldName);
      $('div.field-label', element).text(fieldInfo.friendlyName);
      var input = $('input', element).attr('name', fieldName);
      var eleType = element.data('form-field-type');
      var handler = ElementTemplates.handlers[eleType];
      if(handler.initializer){
        handler.initializer(element, fieldInfo);
      }
      var valuehandler = handler.valuehandler;
      valuehandler.set(element, entity[fieldName]);

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
    this.$tabholder = $formContainer.find(PageSymbols.TAB_HOLDER);
  }
  EntityForm.prototype = {
    dataContent: function(){
      return this.$container.find('.data-content p').data("content");
    },
    createGroupContent : function(groupInfo, fields, entity){
      var $group = $('<fieldset>').addClass('entity-group').attr('data-group-name', groupInfo.name);
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
      var $div = $('<div>').addClass('entity-tab').attr('data-tab-name', tabInfo.name);
      var $groups = tabInfo.groups.map(function(group, index, array){
        var $group = _this.createGroupContent(group, fields, entity);
        return $group;
      });
      $div.html($groups);
      return $div;
    },
    buildUpForm : function(fillData){
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
      ag.switchAction(data.actions, true);
    },
    dataWithName : function(name, defVal){
      var _this = this;
      var $ele = this.$container;
      var dataname = 'data-' + name;
      return function(val){
        if(val === undefined){/*get*/
          var existing = $ele.data(name);
          if(existing === undefined){
            return defVal;
          }else{
            return existing;
          }
        }else{/*set*/
          $ele.attr(dataname, val);
          $ele.data(name, val);
          return _this;
        }
      }
    },
    data : {

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
    var $ctrls = $page.find(PageSymbols.ENTITY_FORM);
    var fms = $ctrls.map(function(index, ctrl, array){
      var fm = new EntityForm($(ctrl));
      return fm;
    });
    return fms;
  }
  EntityForm.findFirstFromPage= function($page){
    var $ctrls = $page.find(PageSymbols.ENTITY_FORM);
    if($ctrls.length >= 1){
      var fm = new EntityForm($($ctrls[0]));
      return fm;
    }
    return null;
  };
  EntityForm.initOnDocReady = function ($doc) {
    var $ctrls = $doc.find(PageSymbols.ENTITY_FORM).each(function () {
      var $container = $(this);
      var fm = new EntityForm($container);
      fm.buildUpForm(true);
    });
  }

  host.entity.form = EntityForm;

})(jQuery, this, tallybook);

