;
var tallybook = tallybook || {};

(function ($, window, host) {
  'use strict';

  var ActionGroup = host.entity.actionGroup;
  var TabHolder = host.tabholder;
  var ElementValueAccess = host.elementValueAccess;
  var ModalStack = host.modal.stack;
  var GridControl = host.entity.grid;
  var ScrollGrid = host.entity.scrollGrid;
  var BeanResponse = host.entity.beanResponse;
  var EntityContext = host.entity.entityContext;
  var BeanContext = host.entity.beanContext;

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
    initializer : function (element, entityCtx, fieldinfo) {
      element.data('entity-context', entityCtx);
      element.data('form-info', entityCtx.info);
      element.data('field-info', fieldinfo);
      return this._doInitialize(element, entityCtx, fieldinfo);
    },
    //return typed-value
    get : function (element) {return this._doGet(element);},
    //set ui by typed-value
    set : function(element, val, bean){return this._doSet(element, val, bean);}
  };

  function FieldHandler(handler){
    $.extend(this, EmptyFieldHandler, handler);
  };
  FieldHandler.prototype= {
    constructor : FieldHandler,
    getFieldType:function(element){
      return element.attr('data-field-type');
    },
    getFieldInfo:function(element){return element.data('field-info');},
    getEntityContext:function(element){return element.data('entity-context');},
    getFormInfo:function(element){return element.data('form-info');},
    _doInitialize : function (element, entityCtx, fieldinfo) {},
    _doGet : function (element) {return '';},
    _doSet : function(element, val){},
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
      if(element.data('readonly')){
        return element.data('readonly.data');
      }
      var rawGet = this.get(element);
      if ($.isPlainObject(rawGet)) {
        var depth1Obj = this.limitDepth(rawGet, 0, 1);
        return JSON.stringify(depth1Obj);
      }
      return rawGet;
    }
  };

  var fieldNameInForm = function(fieldName){return 'props[' + fieldName + ']';};
  /**
   build Map
   */
  var __buildFieldTemplateMap = function(boxtype){
    var fieldsTemplatePrefix = MAIN_TEMPLATE + ' table.entity-field-template-table > tbody ';
    var elementMap = {};
    var $elements = $(fieldsTemplatePrefix + boxtype);
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
    return elementMap;
  };
  var FieldTemplates = {
    handlers : { // keys are element-types
      string : new FieldHandler({
        _doInitialize: function (element, entityCtx, fieldinfo) {
          var fieldName = fieldinfo.name;
          var input = $('.content', element).attr('name', fieldNameInForm(fieldName));
        },
        _doGet: function (element) {
          return element.find('.content').val();
        },
        _doSet: function (element, val) {
          return element.find('.content').val(val);
        }}),
      enum : new FieldHandler({
        _doInitialize : function(element, entityCtx, fieldinfo){
          var optionsContainer = $('select.options', element).attr('name', fieldNameInForm(fieldinfo.name));
          var options = fieldinfo.options;
          var friendlyNames = fieldinfo.optionsFriendly;
          var opElems = options.map(function(t){
            var $opE = $('<option>', {'value' : t} ).text(friendlyNames[t]);
            return $opE;
          });
          optionsContainer.empty().wrapInner(opElems);
        },
        _doGet : function(element) {
          var optionsContainer = $('select.options', element);
          return optionsContainer.val();
        },
        _doSet : function(element, val){
          var optionsContainer = $('select.options', element);
          return  optionsContainer.val(val);
        }}),
      boolean : new FieldHandler({
        _doInitialize : function (element, entityCtx, fieldinfo) {
          var fieldName = fieldinfo.name;
          var input = $('.option input[type=radio]', element).attr('name', fieldNameInForm(fieldName));

          var trOpts = fieldinfo.options;
          element.find('input[type=radio][value=true]+span').text(trOpts.t);
          element.find('input[type=radio][value=false]+span').text(trOpts.f);
        },
        _doGet : function (element) {
          var valStr = element.find('input[type=radio]:checked').val();
          if(!!valStr){
            return ('true' == valStr.toLowerCase());
          }else{
            return null;
          }
        },
        _doSet : function(element, val){
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
        _doInitialize:function(element, entityCtx, fieldinfo){
          var $editor = $('.html-editor', element).summernote({
            height : 150,
            minHeight: 150,             // set minimum height of editor
            maxHeight: 300             // set maximum height of editor
          }).attr('name', fieldNameInForm(fieldinfo.name));
        },
        _doGet:function(element){
          return $('.html-editor', element).code();
        },
        _doSet:function(element, val){
          $('.html-editor', element).code(val);
        }}),
      date : new FieldHandler({
        _doInitialize:function(element, entityCtx, fieldinfo){
          //http://trentrichardson.com/examples/timepicker/
          var fieldName = fieldinfo.name;
          var model = fieldinfo.model;
          var method = null;
          var input = $('.date-input', element).attr({'name': fieldNameInForm(fieldName),'data-time-model':model});
          var datepickerops = JSON.parse(host.messages.datepicker_localization);
          var exOpts = {dateFormat: host.messages.datepicker_format_date};
          switch(model){
            case 'date':
              method = 'datepicker';
              break;
            case 'datetime':
              method = 'datetimepicker';
              $.extend(exOpts, {showSecond: true,timeFormat : host.messages.datepicker_format_time});
              break;
            case 'datetimez' :
              method = 'datetimepicker';
              $.extend(exOpts, {showSecond: true,timeFormat : host.messages.datepicker_format_timez});
              break;
          }
          if(method){
            var mergedOpts = $.extend(exOpts, datepickerops);
            if(element.data('readonly')){
              var hiddenInput = $('<input class="hidden-helper" style="">');
              hiddenInput[method](mergedOpts);
              element.append(hiddenInput);
            }else{
              input[method](mergedOpts);
            }
          }
          input.attr('data-date-method', method);
        },
        _doGet:function(element){
          var input = $('.date-input', element);
          if(!input.val()){
            return null;
          }
          var model = input.attr('data-time-model');
          var method = input.attr('data-date-method');
          var date = input.datepicker('getDate');

          return date.getTime();
        },
        setreadonly:function(element, val){
          var input = $('.date-input', element);
          if(!val){
            input.val('');
            return;
          }
          var hiddenInput = $('.hidden-helper', element);
          var model = input.attr('data-time-model');
          var method = input.attr('data-date-method');
          var date = new Date(val);
          hiddenInput[method]('setDate', date);
          var iv = hiddenInput.val();
          hiddenInput.remove();
          input.text(iv);
        },
        _doSet:function(element, val){
          var input = $('.date-input', element);
          if(!val){
            input.val('');
            return;
          }
          var model = input.attr('data-time-model');
          var method = input.attr('data-date-method');
          var date = new Date(val);
          input[method]('setDate', date);

          //$('.date-input', element).code(val);
        }}),
      foreign_key : new FieldHandler({
        external : function(element){
          var ft = this.getFieldType(element);
          return (ft == 'external_foreign_key');
        },
        externalEntityField : function(element, val){
          if(val === undefined){//get
            return element.attr('data-external-fk-entity-field');
          }else{//set
            return element.attr('data-external-fk-entity-field', val);
          }
        },
        _doInitialize:function(element, entityCtx, fieldinfo){
          var selectUrl = fieldinfo.selectUri;
          element.find('button.to-one-lookup').attr('data-select-url', selectUrl);
          var fkvContainer = element.find('.foreign-key-value-container');
          fkvContainer.attr({'data-entity-type':fieldinfo.entityType,
          'data-id-field':fieldinfo.idFieldName,
          'data-display-field': fieldinfo.displayFieldName});
          var ft = this.getFieldType(element);
          if(this.external(element)){
            this.externalEntityField(element,fieldinfo.entityFieldName);
          }
        },
        _doGet:function(element){
          var val = element.data('entity');
          var realVal = null;
          if(this.external(element)){
            var idField = element.find('.foreign-key-value-container').attr('data-id-field');
            realVal = val[idField];
          }else{
            realVal = val;
          }
          if(realVal == null)
            return null;
          var fieldinfo = this.getFieldInfo(element);
          var obj = {"id" : realVal[fieldinfo.idFieldName], "display": realVal[fieldinfo.displayFieldName]};
          return obj;
        },
        _doSet:function(element, val, bean){
          var fbean = val;
          if(!$.isPlainObject(val)){
            if(this.external(element)){
              var fef = this.externalEntityField(element);
              if(bean != null)
                fbean = bean[fef];
            }
          }
          var hasVal = !!fbean;
          var varStr = "";
          var fieldinfo = this.getFieldInfo(element);
          var link="";
          element.data('entity', fbean);
          if(hasVal){
            var fkvContainer = element.find('.foreign-key-value-container');
            var displayField = fkvContainer.attr('data-display-field');
            var idField = fkvContainer.attr('data-id-field');
            var template = new UriTemplate(fieldinfo.recordUri);
            link=template.fill(fbean);
            varStr = fbean[displayField];
          }
          element.find('.display-value-none-selected').toggle(!hasVal);
          element.find('.display-value').toggle(hasVal).text(varStr);
          element.find('.drop-entity').toggle(hasVal);
          element.find('.external-link-container').toggle(hasVal).find('a')
          .attr('data-foreign-key-link', link).attr('href', link);
        }}),
      collection : new FieldHandler({
        _doInitialize: function (element, entityCtx, fieldinfo) {
          var gridContainer = GridControl.makeRawHtmlGridElement();
          element.find('.grid-slot').html(gridContainer);
          var scrollGrid = ScrollGrid.getScrollGrid(gridContainer);
          element.data('grid', scrollGrid);
        },
        _doGet: function (element) {
          var scrollGrid = element.data('grid');
          return element.find('.content').val();
        },
        _doSet: function (element, val, bean) {
          var scrollGrid = element.data('grid');
          var entityCxt = this.getEntityContext(element);
          var fieldinfo = this.getFieldInfo(element);
          var forminfo = this.getFormInfo(element);
          var entryName = fieldinfo.instanceType;
          var entryGridinfo = forminfo.referencing[entryName];
          var beanUri = entityCxt.makeUri(bean);
          var links = $.extend({}, fieldinfo.links);
          for(var a in fieldinfo.links){
            links[a] = host.url.connectUrl(beanUri, fieldinfo.name, fieldinfo.links[a]);
          }
          //fieldinfo.links

          scrollGrid.fillParameterByUrl(host.url.connectUrl(beanUri, fieldinfo.name));
          var gridsetting = {
            type: fieldinfo.instanceType,
            ceilingType: fieldinfo.instanceType,
            actions: fieldinfo.actions,
            linksObj: links
          };

          scrollGrid.setupEntityUi(new EntityContext(entryGridinfo), gridsetting);
          return element.find('.content').val(val);
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
      var elementMap = __buildFieldTemplateMap('.field-box');
      var readonlyElementMap = __buildFieldTemplateMap('.readonly-field-box');
      return function (fieldType, readonly) {
        var eleMap = (!!readonly) ? readonlyElementMap : elementMap;
        var $ele = eleMap[fieldType] || eleMap['default'];
        return $ele.clone();
      }
    })(),
    /**
     * Create an html element for a field
     * @param fieldinfo
     * @param entity
     * @returns the html element
     */
    createElementByFieldInfo: function (entityCxt, beanCxt, fieldinfo) {
      var readonly = !fieldinfo.editable;
      var fieldType = fieldinfo.fieldType.toLowerCase();
      var fieldName = fieldinfo.name;
      var fieldErrors = null;
      var bean = beanCxt.bean, errors=beanCxt.errors;
      if(errors && errors.fields){
        fieldErrors = errors.fields[fieldName];
      }
      var element = FieldTemplates._getFieldTemplate(fieldType, readonly).attr({'data-field-name': fieldName,'data-field-type': fieldType});
      element.data('readonly', readonly);

      var $fieldLabel = element.find('.field-label-group');
      if(fieldErrors){
        element.addClass('has-error');
        var errorSpans = fieldErrors.map(function(item, i){
          var es = $('<span class="error control-label">').text(item);
          return es;
        });
        $fieldLabel.append(errorSpans);
      }
      element.find('label.field-label').text(fieldinfo.friendlyName).toggleClass('required', !!fieldinfo.required);
      var formFieldType = element.data('form-field-type');

      var handler = FieldTemplates.getHandlerByFormFieldType(formFieldType);
      if(handler){
        handler.initializer(element, entityCxt, fieldinfo);
        var propVal = host.entity.entityProperty(bean, fieldName);
        if(readonly){
          element.data('readonly.data', propVal);
          if(handler.setreadonly){
            handler.setreadonly(element, propVal, bean);
            return element;
          }
        }
        handler.set(element, propVal, bean);
      }
      return element;
    }
  };
  
  function EntityDataAccess(form){
    this.form = form;
  }
  EntityDataAccess.prototype={
    element : function(){return this.form;},
    entityFriendlyName : ElementValueAccess.defineGetSet('entity-friendly-name', null),
    currentAction : ElementValueAccess.defineGetSet('current-action', null),
    currentFriendlyAction : ElementValueAccess.defineGetSet('current-friendly-action', null)
  }

  function EntityForm ($container){
    this.$container = $container;
    this.$tabholder = $container.find(FormSymbols.TAB_HOLDER);
    this.$form = $container.find('form');
    this.$entityCxt = this.$form.find('.entity-context');
    this.da = new EntityDataAccess($container);
    var $grpEle = $('.form-action-group-container .action-group', this.$container);
    this.actionGroup = new ActionGroup($grpEle);

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
    createGroupContent : function(entityCxt, beanCxt, groupinfo){
      var $group = $('<fieldset>', {'class':'entity-group', 'data-group-name': groupinfo.name});
      var $groupTitle = $('<legend>').text(groupinfo.friendlyName);
      var fis = entityCxt.info.fields;
      $group.append($groupTitle);
      var fieldEles = groupinfo.fields.map(function(fieldName){
        var fieldinfo = fis[fieldName];
        var handle = true;
        if(fieldinfo.collection){
          handle = beanCxt.handleCollection;
        }
        if(!handle) return null;
        var fieldEle = FieldTemplates.createElementByFieldInfo(entityCxt, beanCxt, fieldinfo);
        if(!fieldinfo.formVisible){
          fieldEle.hide();
        }
        return fieldEle;
      });
      $group.append(fieldEles);
      return $group;
    },
    createTabContent : function (entityCxt, beanCxt, tabinfo){
      var _this = this;
      var $div = $('<div>', {'class':'entity-tab', 'data-tab-name': tabinfo.name});
      var $groups = tabinfo.groups.map(function(groupinfo, i){
        return _this.createGroupContent(entityCxt, beanCxt, groupinfo);
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
    _fillEntityGeneralContext : function (entityCxt, beanCxt){
      this.appendGlobalError('', true);
      var errors = beanCxt.errors;
      if(errors && errors.global){
        var _this = this;
        var $globalErrors = errors.global.map(function(item, i){
          return _this.appendGlobalError(item);
        });
      }

      //<input type="hidden" id="ceilingEntityClassname" name="ceilingEntityClassname" value="org.broadleafcommerce.core.catalog.domain.ProductOption">
      var timezoneOffset = (new Date()).getTimezoneOffset();
      var $timezoneOffset = $('<input>', {type:'hidden', name:'timezoneOffset', value:timezoneOffset});
      var $entityCeilingType = $('<input>', {type:'hidden', name:'ceilingType', value:entityCxt.ceilingType});
      var $entityType = $('<input>', {type:'hidden', name:'type', value:entityCxt.type});
      
      this.$entityCxt.append($timezoneOffset).append($entityCeilingType).append($entityType);
    },
    reset : function(){
      this.initialized(false);
      this.$entityCxt.empty();
      this.$tabholder.empty();
      this.$form.find('.entity-errors').remove();
    },
    fill : function(ops){
      ops = $.extend({data:undefined,force:false}, ops);
      if(!!(ops.force))
        this.reset();
      if(this.initialized())
        return;
      var data = ops.data || this.dataContent();
      this.dataContent(data);
      var beanResponse = new BeanResponse(data);

      var entityCxt = beanResponse.entityContext();
      var beanCxt = beanResponse.entity();
      this.fillContent(entityCxt, beanCxt);
      $(window).resize();
      this.initialized(true);
      this.element().trigger(EntityForm.event.filled);
    },
    fillContent:function(entityCxt, beanCxt){
      var anchor = beanCxt.anchor;
      this._fillEntityGeneralContext(entityCxt, beanCxt);
//      this.da.entityUri(entityCxt.entityUri);
      this.da.entityFriendlyName(entityCxt.info.friendlyName);

      var _this = this;
      var tabHolder = new TabHolder(this.$tabholder);
      entityCxt.info.tabs.forEach(function(tab, i){
        var $div = _this.createTabContent(entityCxt, beanCxt, tab);
        tabHolder.addTab(tab.name, tab.friendlyName, $div);
      });
      tabHolder.activeByIndexOrName(0);

      var rag = this.setupActionGroup(beanCxt);
      rag.focusOnEntry(anchor);
    },
    setupActionGroup : function (beanCxt) {
      var insideAg = this.actionGroup;
      var bean = beanCxt.bean;

      if(insideAg != null){
        insideAg.setup(beanCxt.actions, beanCxt.linksObj);
        insideAg.switchAllActions(false);
        insideAg.switchAction(beanCxt.actions, true);
      }

      var resultAg = insideAg;
      if(this.isMain()){
        if(!bean){
          insideAg.toggle(false);
        }
        resultAg = ActionGroup.replaceMainActionGroup(insideAg);
      }else{
        var _modal = this.inModal();
        if(_modal){
          if(bean){
            resultAg = ActionGroup.replaceModalFootActionGroup(insideAg, _modal);
          }
        }else{
          //do nothing, just display the inside action group
        }
      }
      return resultAg;
    },
    defaultSubmitHandler: function (idata) {
      var success = idata.success;
      var data = idata.data;
      if(success == false){
        this.fill({data:data, force:true});
        return true;
      }
      return false;
    },
    action : function(friendly){
      return friendly ? this.da.currentFriendlyAction() : this.da.currentAction();
    },
    fullAction : function(friendly){
      var act = friendly ? this.da.currentFriendlyAction() : this.da.currentAction();
      act = act + ' ' + this.da.entityFriendlyName();
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
        var pk = 'props['+fieldName+']';
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
          var _url = ActionGroup.getUri($el);
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
            var _url = ActionGroup.getUri($el);
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
      var formdata = entityForm.serialize();

      host.ajax({
        url:this.action,
        type: 'POST',
        data : formdata
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

