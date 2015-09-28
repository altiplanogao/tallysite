;
var tallybook = tallybook || {};

(function ($, window, host) {
  'use strict';

  var ActionGroup = host.entity.actionGroup;
  var TabHolder = host.tabholder;
  var ElementValueAccess = host.elementValueAccess;
  var ModalStack = host.modal.stack;

  var ENTITY_FORM_KEY = 'tallybook.entity.form';

  var MAIN_TEMPLATE = '.template.form-template';

  var FormSymbols ={
    ENTITY_FORM : '.entity-form-container',
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
  var fieldNameInForm = function(fieldName){return 'entity[' + fieldName + ']';};
  var ElementTemplates = {
    handlers : { // keys are element-types
      string : new ElementHandler(
        function(element, fieldInfo){
          var fieldName = fieldInfo.name;
          var input = $('input', element).attr('name', fieldNameInForm(fieldName));
        },
        {
          get : function(element) {return element.find('input').val();},
          set : function(element, val){return  element.find('input').val(val);}
        }
      ),
      enum : new ElementHandler(
        function(element, fieldInfo){
          var optionsContainer = $('select.options', element).attr('name', fieldNameInForm(fieldInfo.name));
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
    element : function(){return this.form;},
    currentAction : ElementValueAccess.defineGetSet('current-action', null),
    currentFriendlyAction : ElementValueAccess.defineGetSet('current-friendy-action', null)
  }

  function EntityForm ($container){
    this.$container = $container;
    this.$tabholder = $container.find(FormSymbols.TAB_HOLDER);
    this.$form = $container.find('form');
    this.$entityCxt = this.$form.find('.entity-context');
    this.dataAccess = new EntityDataAccess($container);
    this.data = null;
    this.submitHandlers = {};
  }
  EntityForm.prototype = {
    element : function(){return this.$container},
    form : function(){return this.$form;},
    initialized : host.elementValueAccess.defineGetSet('initialized', false),
    isMain : function () {
      return this.$container.data('form-scope') == 'main';
    },
    dataContent : function(/*optional*/val){
      var $ele = this.$container.find('.data-content p');
      if(val === undefined){
        return $ele.data('content');
      }else{
        $ele.data('content', val);
      }
    },
    createGroupContent : function(groupInfo, fields, entity){
      var $group = $('<fieldset>', {'class':'entity-group', 'data-group-name': groupInfo.name});
      var $groupTitle = $('<legend>').text(groupInfo.friendlyName);
      $group.append($groupTitle);
      var fieldEles = groupInfo.fields.map(function(fieldName){
        var field = fields[fieldName];
          var fieldEle = ElementTemplates.createElementByFieldInfo(field, entity);
        if(!field.formVisible){
          fieldEle.hide();
        }
          return fieldEle;
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
    _fillEntityContext : function (data){
      //<input type="hidden" id="ceilingEntityClassname" name="ceilingEntityClassname" value="org.broadleafcommerce.core.catalog.domain.ProductOption">
      var $entityCeilingType = $('<input>', {type:'hidden', name:'entityCeilingType', value:data.entityCeilingType});
      var $entityType = $('<input>', {type:'hidden', name:'entityType', value:data.entityType});
      
      this.$entityCxt.append($entityCeilingType).append($entityType);
    },
    fill : function(rawData){
      if(this.initialized()){return;}
      var _this = this;
      if(rawData === undefined){
        rawData = this.dataContent();
      }else{
        this.dataContent(rawData);
      }
      var data = this.entityData.processData(rawData);
      this.data = data;
      this._fillEntityContext(data);
      var entity = data.entity.data;
      var formInfo = this.entityData.formInfo(data);
      var tabHolder = new TabHolder(this.$tabholder);
      formInfo.tabs.forEach(function(tab, index, array){
        var $div = _this.createTabContent(tab, formInfo.fields, entity);
        tabHolder.addTab(tab.name, tab.friendlyName, $div);
      });
      tabHolder.activeByIndexOrName(0);

      var insideAg = ActionGroup.findChildActionGroup(this.$container);
      if(insideAg != null){
        insideAg.switchAllActions(false);
        insideAg.switchElementActionUrl(data.baseUrl);
        insideAg.switchAction(data.actions, true);
      }

      if(this.isMain()){
        ActionGroup.replaceMainActionGroup(insideAg);
      }
      this.initialized(true);
    },
    entityData :{
      processData : function(rawData){
        return rawData;
      },
      formInfo : function(data){
        return data.info.details['form'];
      }
    },
    action : function(friendly){
      return friendly ? this.dataAccess.currentFriendlyAction() : this.dataAccess.currentAction();
    },
    fullAction : function(friendly){
      var act = friendly ? this.dataAccess.currentFriendlyAction() : this.dataAccess.currentAction();
      var data = this.data;
      if(data){
        act = act + ' ' + this.entityData.formInfo(data).friendlyName;
      }
      return act;
    },
    setSubmitHandler : function (handlers) {
      this.submitHandlers = $.extend({}, handlers);
    }
  }

  EntityForm.findFromPage= function($page){
    var $ctrls = $page.find(FormSymbols.ENTITY_FORM);
    var fms = $ctrls.map(function(index, ctrl, array){
      var fm = EntityForm.getEntityForm($(ctrl));
      return fm;
    });
    return fms;
  }
  EntityForm.findFirstFromPage= function($page){
    var $ctrls = $page.find(FormSymbols.ENTITY_FORM);
    if($ctrls.length >= 1){
      var fm = EntityForm.getEntityForm($($ctrls[0]));
      return fm;
    }
    return null;
  };

  EntityForm.makeRawHtmlFormElement = (function () {
    var $template = $(MAIN_TEMPLATE + ' .entity-form-container-template').clone();
    $template.removeClass('entity-form-container-template').addClass('entity-form-container');
    return function () {return $template.clone();}
  })()

  EntityForm.getEntityForm = function ($container) {
    if(!$container.is(FormSymbols.ENTITY_FORM))
      return null;
    var existingForm = $container.data(ENTITY_FORM_KEY);
    if(!existingForm){
      existingForm = new EntityForm($container);
      $container.data(ENTITY_FORM_KEY, existingForm);
    }
    return existingForm;
  }
  EntityForm.getEntityFormFromAny = function(anyEle){
    var $anyEle = $(anyEle);
    var $container = null;
    if($anyEle.is(FormSymbols.ENTITY_FORM)){
      $container = $anyEle;
    }else{
      var $candi = $anyEle.closest(FormSymbols.ENTITY_FORM);
      if($candi.length == 0){
        $candi = $anyEle.closest('.modal').find(FormSymbols.ENTITY_FORM);
      }
      if($candi.length == 0){
        var $mainCandi = $anyEle.closest('#contentContainer').find(FormSymbols.ENTITY_FORM);
        if($mainCandi.length == 1){
          $candi = $mainCandi;
        }
      }
      if($candi.length == 1){
        $container = $candi;
      }
    }
    if($container) return EntityForm.getEntityForm($container);
  }
  EntityForm.initOnDocReady = function ($doc) {
    var $ctrls = $doc.find(FormSymbols.ENTITY_FORM).each(function (i, item) {
      var fm = EntityForm.getEntityForm($(item));
      fm.fill();
    });
    $('body').on('click',  '.entity-action[data-action=delete]', function(event){
      var delConfirmModal = host.modal.makeModal();
      var $el = $(this);
      var entityForm = EntityForm.getEntityFormFromAny($el);
      if(entityForm) {
        var formdata = entityForm.form().serialize();
        ModalStack.showModal(delConfirmModal);
        delConfirmModal.setContentAsDialog({
          header: host.messages.delete,
          message: host.messages.deleteConfirm,
          callback: function () {
            delConfirmModal.hide();
            var doDelModal = host.modal.makeModal();
            ModalStack.showModal(doDelModal);
            var _url = $el.data('action-url') + '/delete';
            doDelModal.setContentAsProcessing({
              url: _url,
              data: formdata,
              type: 'POST',
              header: host.messages.delete,
              message: host.messages.deleting,
              success: function (data, textStatus, jqXHR, opts) {
                doDelModal.hide();
              },
              error: function () {
                console.log('todo: Handle deleting error');
              }
            });
          }
        });
      }
    });

    $('body').on('click',  '.submit-entity', function(event){
      var $bt = $(this);
      var entityForm = EntityForm.getEntityFormFromAny($bt);
      if(entityForm){
        entityForm.form().submit();
        var ag = ActionGroup.findParentActionGroup($bt);
        ag.switchSaveAction(true);
      }
    });

    $('body').on('submit', FormSymbols.ENTITY_FORM + ' form', function(event){
      var $form = $(this);
      var entityForm = EntityForm.getEntityFormFromAny($form);
      var data = $form.serialize();

      host.ajax({
        url:this.action,
        type: 'POST',
        data : data
      }, {
        success: function(){
          var handler = entityForm.submitHandlers.success;
          if(handler)handler.apply(entityForm, arguments);
        },
        error : function(){
          var handler = entityForm.submitHandlers.error;
          if(handler)handler.apply(entityForm, arguments);
        }
      });
      event.preventDefault();
    });
  }

  host.entity.form = EntityForm;

})(jQuery, this, tallybook);

