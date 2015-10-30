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
  var EmptyFieldHandler = {
    initializer : function (element, fieldInfo, formData) {},
    get : function (element) {return '';},
    set : function(element, val){}
  };

  function FieldHandler(handler){
    this.innerhandler = $.extend({}, EmptyFieldHandler, handler);
  };
  FieldHandler.prototype= {
    constructor : FieldHandler,
    initializer : function (element, fieldInfo, formData) {return this.innerhandler.initializer(element, fieldInfo, formData);},
    get : function (element) {return this.innerhandler.get(element);},
    set : function(element, val){return this.innerhandler.set(element, val);},
    limitDepth: function (obj, /*zero based*/currentDepth, depthLimit) {
      if (currentDepth > depthLimit) return null;
      var objc = {};
      for (var p in obj) {
        var v = obj[p];
        if ($.isPlainObject(v)) {
          var vc = null;
          if (currentDepth + 1 >= depthLimit) {
            vc = null;
          }else{
            vc = this.limitDepth(v, currentDepth + 1, depthLimit);
          }
          objc[p] = vc;
        } else if ($.isArray(v)) {
          if (currentDepth + 1 >= depthLimit) {
            objc[p] = null;
          } else {
            var vc = [];
            v.forEach(function (i, t) {
              var vci = this.limitDepth(t, currentDepth + 1, depthLimit);
              vc.push(vci);
            });
            return vc;
          }
        } else {
          objc[p] = v;
        }
      }
      return objc;
    },
    getAsString: function (element) {
      var rawGet = this.get(element);
      if ($.isPlainObject(rawGet)) {
        var depth1Obj = this.limitDepth(rawGet, 0, 1);
        return JSON.stringify(depth1Obj);
      }
      return rawGet;
    }
  };

  var fieldNameInForm = function(fieldName){return 'entity[' + fieldName + ']';};
  var FieldTemplates = {
    handlers : { // keys are element-types
      string : new FieldHandler({
        initializer: function (element, fieldInfo) {
          var fieldName = fieldInfo.name;
          var input = $('input', element).attr('name', fieldNameInForm(fieldName));
        },
        get: function (element) {
          return element.find('input').val();
        },
        set: function (element, val) {
          return element.find('input').val(val);
        }}),
      enum : new FieldHandler({
        initializer : function(element, fieldInfo){
          var optionsContainer = $('select.options', element).attr('name', fieldNameInForm(fieldInfo.name));
          var options = fieldInfo.options;
          var friendlyNames = fieldInfo.optionsFriendly;
          var opElems = options.map(function(t){
            var $opE = $('<option>', {'value' : t} ).text(friendlyNames[t]);
            return $opE;
          });
          optionsContainer.empty().wrapInner(opElems);
        },
        get : function(element) {
          var optionsContainer = $('select.options', element);
          return optionsContainer.val();
        },
        set : function(element, val){
          var optionsContainer = $('select.options', element);
          return  optionsContainer.val(val);
        }}),
      boolean : new FieldHandler({
        initializer : function (element, fieldInfo) {
          var fieldName = fieldInfo.name;
          var input = $('.option input[type=radio]', element).attr('name', fieldNameInForm(fieldName));

          var trOpts = fieldInfo.options;
          element.find('input[type=radio][value=true]+span').text(trOpts.t);
          element.find('input[type=radio][value=false]+span').text(trOpts.f);
        },
        get : function (element) {
          var valStr = element.find('input[type=radio]:checked').val();
          if(!!valStr){
            return ('true' == valStr.toLowerCase());
          }else{
            return null;
          }
        },
        set : function(element, val){
          var trueRadio = element.find('input[type=radio][value=true]');
          var falseRadio = element.find('input[type=radio][value=false]');
          if(val === undefined || val === null){
            trueRadio[0].checked=false;
            falseRadio[0].checked=false;
          }else{
            val = !!val;
            trueRadio[0].checked=val;
            falseRadio[0].checked=!val;
          }
        }}),
      html : new FieldHandler({
        initializer:function(element, fieldInfo){
          var $editor = $('.html-editor', element).summernote({
            height : 150,
            minHeight: 150,             // set minimum height of editor
            maxHeight: 300             // set maximum height of editor
          });
        },
        get:function(element){
          return $('.html-editor', element).code();
        },
        set:function(element, val){
          $('.html-editor', element).code(val);
        }}),
      foreign_key : new FieldHandler({
        initializer:function(element, fieldInfo, formData){
          var selectUrl = host.url.connectUrl(formData.entityUrl, fieldInfo.name, 'select');
          element.find('button.to-one-lookup').attr('data-select-url', selectUrl);
          var fkvContainer = element.find('.foreign-key-value-container');
          fkvContainer.attr('data-entity-type',fieldInfo.entityType)
          .attr('data-id-field', fieldInfo.idFieldName)
          .attr('data-display-field', fieldInfo.displayFieldName);
        },
        get:function(element){
          var val = element.data('entity');
          return val;
        },
        set:function(element, val){
          var hasVal = !!val;
          var varStr = "";
          var link="";
          element.data('entity', val);
          if(hasVal){
            var fkvContainer = element.find('.foreign-key-value-container');
            var entityType = fkvContainer.attr('data-entity-type');
            var displayField = fkvContainer.attr('data-display-field');
            var idField = fkvContainer.attr('data-id-field');
            varStr = val[displayField];
            link='/' + host.url.connectUrl(entityType, '' + val[idField]);
          }
          element.find('.display-value-none-selected').toggle(!hasVal);
          element.find('.display-value').toggle(hasVal).text(varStr);
          element.find('.drop-entity').toggle(hasVal);
          element.find('.external-link-container').toggle(hasVal).find('a')
          .attr('data-foreign-key-link', link).attr('href', link);
        }})
    },
    getHandlerByFormFieldType: function (formFieldType) {
      return this.handlers[formFieldType];
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
        var $fieldLabel = $ele.find('.field-label-group');
        if($fieldLabel.length == 0){
          $fieldLabel = $('<div class="field-label-group"><label class="field-label control-label">Label</label></div>');
          $fieldLabel.prependTo(element);
        }
        $ele.attr('data-support-field-types').split(',').forEach(function (fldtp) {
          elementMap[fldtp.toLowerCase()] = $ele;
        })
      });
      return function (fieldType) {
        var $ele = elementMap[fieldType] || elementMap['default'];
        return $ele.clone();
      }
    })(),
    /**
     * Create an html element for a field
     * @param fieldInfo
     * @param entity
     * @returns the html element
     */
    createElementByFieldInfo: function (fieldInfo, entity, errors, formData) {
      var fieldType = fieldInfo.fieldType.toLowerCase();
      var fieldName = fieldInfo.name;
      var fieldErrors = null;
      if(errors && errors.fields){
        fieldErrors = errors.fields[fieldName];
      }
      var element = FieldTemplates._getFieldTemplate(fieldType).attr({'data-field-name': fieldName,'data-field-type': fieldType});
      var $fieldLabel = element.find('.field-label-group');
      if(fieldErrors){
        element.addClass('has-error');
        var errorSpans = fieldErrors.map(function(item, i){
          var es = $('<span class="error control-label">').text(item);
          return es;
        });
        $fieldLabel.append(errorSpans);
      }
      element.find('label.field-label').text(fieldInfo.friendlyName).toggleClass('required', !!fieldInfo.required);
      var formFieldType = element.data('form-field-type');

      var handler = FieldTemplates.getHandlerByFormFieldType(formFieldType);
      if(handler){
        handler.initializer && handler.initializer(element, fieldInfo, formData);
        handler.set && handler.set(element, host.entity.entityProperty(entity, fieldName));
      }
      return element;
    }
  };
  
  function EntityDataAccess(form){
    this.form = form;
  }
  EntityDataAccess.prototype={
    element : function(){return this.form;},
    entityUrl: ElementValueAccess.defineGetSet('entity-url','/'),
    entityRecordUrl: ElementValueAccess.defineGetSet('entity-record-url','/'),
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
    this._inModal = false;
  }
  EntityForm.prototype = {
    element : function(){return this.$container},
    form : function(){return this.$form;},
    initialized : host.elementValueAccess.defineGetSet('initialized', false),
    isMain : function () {
      return this.$container.data('form-scope') == 'main';
    },
    inModal : function(_modal){
      if(_modal === undefined)return this._inModal;
      this._inModal = _modal;
    },
    dataContent : function(/*optional*/val){
      var $ele = this.$container.find('.data-content p');
      if(val === undefined){
        return $ele.data('content');
      }else{
        $ele.data('content', val);
      }
    },
    createGroupContent : function(groupInfo, fields, entity, errors, formData){
      var $group = $('<fieldset>', {'class':'entity-group', 'data-group-name': groupInfo.name});
      var $groupTitle = $('<legend>').text(groupInfo.friendlyName);
      $group.append($groupTitle);
      var fieldEles = groupInfo.fields.map(function(fieldName){
        var field = fields[fieldName];
        var fieldEle = FieldTemplates.createElementByFieldInfo(field, entity, errors, formData);
        if(!field.formVisible){
          fieldEle.hide();
        }
        return fieldEle;
      });
      $group.append(fieldEles);
      return $group;
    },
    createTabContent : function (tabInfo, fields, entity, errors, formData){
      var _this = this;
      var $div = $('<div>', {'class':'entity-tab', 'data-tab-name': tabInfo.name});
      var $groups = tabInfo.groups.map(function(group, index, array){
        var $group = _this.createGroupContent(group, fields, entity, errors, formData);
        return $group;
      });
      $div.html($groups);
      return $div;
    },
    appendGlobalError : function(errorStr, dropExisting){
      var $errors = this.$form.find('.entity-errors');
      if($errors.length == 0){
        $errors = $('<div class="entity-errors form-group has-error">').prependTo(this.$form);
      }
      if(dropExisting)$errors.empty();
      if(errorStr) {
        var $err = $('<span class="entity-error control-label">').text(errorStr);
        $errors.append($err);
      }
      var errorCnt = $errors.children().length;
      $errors.toggle(errorCnt > 0);
    },
    _fillEntityContext : function (data){
      this.appendGlobalError('', true);
      if(data.errors && data.errors.global){
        var _this = this;
        var $globalErrors = data.errors.global.map(function(item, i){
          return _this.appendGlobalError(item);
        });
      }

      //<input type="hidden" id="ceilingEntityClassname" name="ceilingEntityClassname" value="org.broadleafcommerce.core.catalog.domain.ProductOption">
      var $entityCeilingType = $('<input>', {type:'hidden', name:'entityCeilingType', value:data.entityCeilingType});
      var $entityType = $('<input>', {type:'hidden', name:'entityType', value:data.entityType});
      
      this.$entityCxt.append($entityCeilingType).append($entityType);
    },
    reset : function(){
      this.initialized(false);
      this.$entityCxt.empty();
      this.$tabholder.empty();
      this.$form.find('.entity-errors').remove();
    },
    fill : function(rawData, force){
      if(!!force)
        this.reset();
      if(this.initialized())
        return;
      var _this = this;
      if(rawData === undefined){
        rawData = this.dataContent();
      }else{
        this.dataContent(rawData);
      }
      var data = this.entityData.processData(rawData);
      this.data = data;
      this._fillEntityContext(data);
      this.dataAccess.entityUrl(data.entityUrl).entityRecordUrl(data.baseUrl);
      if(data.entity){
        var entity = data.entity.data;
        var errors = data.errors;
        var formInfo = this.entityData.formInfo(data);
        var tabHolder = new TabHolder(this.$tabholder);
        formInfo.tabs.forEach(function(tab, index, array){
          var $div = _this.createTabContent(tab, formInfo.fields, entity, errors, data);
          tabHolder.addTab(tab.name, tab.friendlyName, $div);
        });
        tabHolder.activeByIndexOrName(0);
      }
      this.setupActionGroup();
      this.initialized(true);
      this.element().trigger(EntityForm.event.filled);
    },
    setupActionGroup : function () {
      var _this = this;
      var data = _this.data;
      var insideAg = ActionGroup.findChildActionGroup(this.$container);
      if(insideAg != null){
        insideAg.switchAllActions(false);
        insideAg.switchElementActionUrl(data.baseUrl);
        insideAg.switchAction(data.actions, true);
      }

      if(this.isMain()){
        if(!data.entity){
          insideAg.toggle(false);
          insideAg = null;
        }
        ActionGroup.replaceMainActionGroup(insideAg);
      }else{
        var _modal = _this.inModal();
        if(_modal){
          if(data.entity){
            var agFoot = new ActionGroup(insideAg.element().clone());
            var $modalFoot = _modal.element().find('.modal-footer');
            $modalFoot.empty().append(agFoot.element());
            insideAg.toggle(false);
          }
        }else{
          //do nothing, just display the inside action group
        }
      }
    },
    entityData :{
      processData : function(rawData){
        return rawData;
      },
      formInfo : function(data){
        return data.info.details['form'];
      }
    },
    defaultSubmitHandler: function (idata) {
      var success = idata.success;
      var data = idata.data;
      if(success == false){
        this.fill(data, true);
        return true;
      }
      return false;
    },
    action : function(friendly){
      return friendly ? this.dataAccess.currentFriendlyAction() : this.dataAccess.currentAction();
    },
    fullAction : function(friendly){
      var act = friendly ? this.dataAccess.currentFriendlyAction() : this.dataAccess.currentAction();
      if(this.data){
        act = act + ' ' + this.entityData.formInfo(this.data).friendlyName;
      }
      return act;
    },
    setSubmitHandler : function (handlers) {
      this.submitHandlers = $.extend({}, handlers);
    },
    serialize : function(){
      var paramsObj = {};
      var $gInputs = this.$form.find('input:not(.entity-box input)');
      $gInputs.map(function(i, item){
        paramsObj[item.name] = item.value;
      });
      var $fieldBoxes = this.$form.find('.entity-box .field-box');
      $fieldBoxes.each(function(i, item){
        var $item = $(item);
        var formFieldType = $item.data('form-field-type');
        var fieldName = $item.data('field-name');
        var fieldHandler = FieldTemplates.getHandlerByFormFieldType(formFieldType);
        var pk = 'entity['+fieldName+']';
        var pv = fieldHandler.getAsString($item);
        paramsObj[pk] = pv;
      });

      var ref = this.$form.serialize();
      var toRet = $.param(paramsObj);
      return toRet;
    },
    handleDelete : function () {
      var _thisEntityForm = this;
      var formdata = _thisEntityForm.form().serialize();
      var delConfirmModal = host.modal.makeModal();
      ModalStack.showModal(delConfirmModal);
      delConfirmModal.setContentAsInteractiveDialog({
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
              console.log('todo: Handle deleting error');
              _thisEntityForm.defaultSubmitHandler(data);
              doDelModal.hide();
            },
            error: function (data) {
              console.log('todo: Handle deleting error');
            }
          });
        }
      });
    }
  }
  EntityForm.event={
    filled:'filled'
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
  })();

  EntityForm.getEntityForm = function ($container) {
    if(!$container.is(FormSymbols.ENTITY_FORM))
      return null;
    var existingForm = $container.data(ENTITY_FORM_KEY);
    if(!existingForm){
      existingForm = new EntityForm($container);
      $container.data(ENTITY_FORM_KEY, existingForm);
    }
    return existingForm;
  };
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
  };
  EntityForm.initOnDocReady = function ($doc) {
    var $ctrls = $doc.find(FormSymbols.ENTITY_FORM).each(function (i, item) {
      var fm = EntityForm.getEntityForm($(item));
      fm.fill();
    });
    $('body').on('click',  '.entity-action[data-action=delete]', function(event){
      var $el = $(this);
      var entityForm = EntityForm.getEntityFormFromAny($el);
      if(entityForm) {
        var formdata = entityForm.form().serialize();
        var delConfirmModal = host.modal.makeModal();
        ModalStack.showModal(delConfirmModal);
        delConfirmModal.setContentAsInteractiveDialog({
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
                console.log('todo: Handle deleting error');
                entityForm.defaultSubmitHandler(data);
                doDelModal.hide();
              },
              error: function (data) {
                console.log('todo: Handle deleting error');
              }
            });
          }
        });
      }
    });

    $('body').on('click', '.entity-btn', function(event){
      var $bt = $(this);
      var entityForm = EntityForm.getEntityFormFromAny($bt);
      if(entityForm){
        var fieldBox = $bt.closest('.field-box');
        var formFieldType = fieldBox.attr('data-form-field-type');
        var formFieldHandler = FieldTemplates.getHandlerByFormFieldType(formFieldType);
        if($bt.hasClass('to-one-lookup')) {
          var fieldName = $bt.closest('.field-box').find('.field-label').text();
          var url = $bt.attr('data-select-url');
          var doSelectModal = host.modal.makeModal({target: fieldName}, host.entity.gridModal);
          doSelectModal.addOnHideCallback(function (modal) {
            var entity = modal.selectedEntity();
            formFieldHandler.set(fieldBox, entity);
          })
          ModalStack.showModal(doSelectModal);
          doSelectModal.setContentByLink(url);
        }
        if($bt.hasClass('drop-entity')){
          formFieldHandler.set(fieldBox, null);
        }
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
      var data = entityForm.serialize();

      host.ajax({
        url:this.action,
        type: 'POST',
        data : data
      }, {
        success: function(data, textStatus, jqXHR, opts){
          var handler = entityForm.submitHandlers.success;
          if(handler){
            handler.apply(entityForm, arguments);
          }
          entityForm.defaultSubmitHandler(data);
        },
        error : function(jqXHR, textStatus, errorThrown, opts){
          var handler = entityForm.submitHandlers.error;
          if(handler){
            handler.apply(entityForm, arguments);
          }else{
            entityForm.setupActionGroup();
            entityForm.appendGlobalError(errorThrown, true);
          }
        }
      });
      event.preventDefault();
    });
  }

  var EntityFormModalOptions = {
    postSetUrlContent:function(content, _modal){
      var mform = host.entity.form.findFirstFromPage(content);
      var mformEle = mform.element();
      mformEle.off(EntityForm.event.filled, EntityFormModal.filledHandler);
      mformEle.on(EntityForm.event.filled,_modal, EntityFormModal.filledHandler);
      mform.inModal(_modal);
      _modal.addOnHideCallback(function () {
        mformEle.off(EntityForm.event.filled, EntityFormModal.filledHandler);
      });
      mform.fill();

      mform.setSubmitHandler(_modal.formSubmitHandlers);
      _modal._doSetTitle(mform.fullAction(true));
    }
  }
  var Modal = host.modal;
  function EntityFormModal(options){
    var newOpts = $.extend({}, EntityFormModalOptions, options);
    var getargs = Array.prototype.slice.call(arguments);getargs[0] = newOpts;
    Modal.apply(this, getargs);
    this.formSubmitHandlers = {};
  }
  EntityFormModal.prototype = Object.create(Modal.prototype, {
    constructor:{value:EntityFormModal},
    setFormSubmitHandlers:{value:function(handlers){
      this.formSubmitHandlers = handlers;
    }}
  });

  EntityFormModal.filledHandler = function(e){
    var _modal = e.data;
    var modalBody = _modal.element().find('.modal-body');
    var modalBodyHeight = modalBody.height();
    var contentBody = modalBody.find('.tab-content');
    var tabHeight = modalBody.find('.tab-holder .nav-tabs').outerHeight();
    var errorHeight = modalBody.find('.entity-errors').outerHeight();
    var heightRemain = modalBodyHeight - tabHeight - errorHeight;
    var contentBodyHeight = contentBody.height();
    if(contentBodyHeight > heightRemain){
      contentBody.css('max-height', heightRemain);
    }
  }

  $('body').on('click', 'a.entity-form-modal-view', function (event) {
    var a = event.currentTarget;
    var url = a.href;
    var modal = host.modal.makeModal({}, host.entity.formModal);
    ModalStack.showModal(modal);
    modal.setContentByLink(url);//set mod
    event.preventDefault();
  })

  host.entity = $.extend({}, host.entity, {
    form : EntityForm,
    formModal : EntityFormModal
  });

})(jQuery, this, tallybook);

