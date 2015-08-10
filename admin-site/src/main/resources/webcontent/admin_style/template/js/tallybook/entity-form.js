;
var tallybook = tallybook || {};

(function ($, window, host) {
  'use strict';

  var TabHolder = host.tabholder;

  var PageSymbols ={
    ENTITY_FORM : 'div.entity-form-container',
    TAB_HOLDER : 'div.tab-holder'
  };

//var formElementExample={
  //  data-form-field-type : string, integer-range, decimal range, foreign-key
  //  data-support-field-types : string, email, phone, boolean
  //}
  var ElementTemplates = {
    _elementTemplateByFieldInfo : (function () {
      
    })(),
    createElementByFieldInfo: function (fieldInfo) {
      
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
    createGroupContent : function(groupInfo, fields){
      var $group = $('<fieldset>').attr('data-group-name', groupInfo.name);
      var $groupTitle = $('<legend>').text(groupInfo.friendlyName);
      $group.append($groupTitle);

      return $group;
    },
    createTabContent : function (tabInfo, fields){
      var _this = this;
      var $div = $('<div>').attr('data-tab-name', tabInfo.name);
      var $groups = tabInfo.groups.map(function(group, index, array){
        var $group = _this.createGroupContent(group, fields);
        return $group;
      });
      $div.html($groups);
      return $div;
    },
    buildUpForm : function(fillData){
      var _this = this;
      var rawData = this.dataContent();
      var data = this.entityData.processData(rawData);
      var formInfo = this.entityData.formInfo(data);
      var tabHolder = new TabHolder(this.$tabholder);
      formInfo.tabs.forEach(function(item, index, array){
        var $div = _this.createTabContent(item, formInfo.fields);
        tabHolder.addTab(item.name, item.friendlyName, $div);
      });
      tabHolder.activeByIndexOrName(0);

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
    var form = EntityForm.findFirstFromPage($doc);
    form.buildUpForm(true);
  }



  host.entity.form = EntityForm;

})(jQuery, this, tallybook);

