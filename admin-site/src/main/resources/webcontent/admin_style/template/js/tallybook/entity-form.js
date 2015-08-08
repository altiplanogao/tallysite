;
var tallybook = tallybook || {};

(function ($, window, host) {
  'use strict';

  var TabHolder = host.tabholder;

  var PageSymbols ={
    ENTITY_FORM : 'div.entity-form-container',
    TAB_HOLDER : 'div.tab-holder'
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
    buildUpForm : function(fillData){
      var rawData = this.dataContent();
      var data = this.entityData.processData(rawData);
      var formInfo = this.entityData.formInfo(data);
      var tabHolder = new TabHolder(this.$tabholder);
      formInfo.tabs.forEach(function(item, index, array){
        tabHolder.addTab(item.name, item.friendlyName, '');
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

