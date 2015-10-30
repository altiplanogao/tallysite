/**
 * Created by Gao Yuan on 2015/7/1.
 */
;
var tallybook = tallybook || {};

(function ($, host) {
  'use strict';

  /**
   * ActionGroup is a utility class for Action Element handling
   * @param grpEle: the html element
   * @constructor
   */
  var ActionGroup = function(grpEle){
    this.$grpEle = $(grpEle);
  }
  ActionGroup.prototype={
    element: function(){return this.$grpEle; },
    /**
     * display the specified actions, and hide others; update the action-url
     * @param actions : array of action names
     * @param linksObj : dictionary with action name as key, url as its value
     */
    setup : function(actions, linksObj){
      var actionGrp = this.$grpEle;
      actionGrp.hide();
      if(actions){
        actionGrp.find('.action-control[data-action]').each(function(i,ctrl){
          var $ctrl = $(ctrl); var action = $ctrl.data('action');
          $ctrl.toggle(actions.indexOf(action) >= 0);
          if(linksObj[action]){ $ctrl.attr('data-action-url', linksObj[action]);}
        });
        actionGrp.show();
      }
    },
    /**
     * Update the action-url for entity-action buttons (ONLY for entity button)
     * @param entityUrl : the new entity-url
     */
    switchElementActionUrl: function(entityUrl){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control.entity-action').each(function(i,ctrl){
        var $ctrl = $(ctrl);
        $ctrl.attr('data-action-url', entityUrl).data('action-url', entityUrl);
        ctrl.disabled = (!entityUrl);
      });
    },
    /**
     * Show all / Hide all
     * @param on : whether to show
     */
    switchAllActions : function(on){
      var actionGrp = this.$grpEle;
      actionGrp.hide();
      actionGrp.find('.action-control[data-action]').toggle(!!on);
      actionGrp.show();
    },
    /**
     * For the specified action buttons, show all / hide all
     * @param actions : specify actions
     * @param on : whether to show or hide
     */
    switchAction : function(actions, on){
      if(!actions)
        return;
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control[data-action]').each(function(i,ctrl){
        var $ctrl = $(ctrl); var action = $ctrl.data('action');
        if(actions.indexOf(action) >= 0){
          $ctrl.toggle(!!on);
        }
      });
    },
    switchSaveAction : function(saving){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control[data-action=save]').each(function(i,ctrl){
        var $ctrl = $(ctrl);
        if(!$ctrl.is(':visible'))return;
        $('.btn', ctrl).toggle(!saving);
        $('.spinner', ctrl).toggle(!!saving);
      })
    },
    /**
     * set whether the edit-action should be in modal or new page?
     * @param isModal : true: in modal; false: in new page
     */
    updateEditMethod : function(isModal){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control[data-action][data-edit-in-modal]').each(function(i, btn){
        var $btn = $(btn); $btn.attr('data-edit-in-modal', (!!isModal)?'true':'false');
      });
    },
    updateEditSuccessRedirect : function(redirect, action){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control[data-action='+action+'][data-edit-success-redirect]')
        .attr('data-edit-success-redirect', (!!redirect)?'true':'false');
    },
    dropActionControl : function(action){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control').remove('[data-action='+action+']');
      return this;
    },
    dropActionControlExcept : function(except){
      var actionGrp = this.$grpEle;
      actionGrp.find('.action-control').remove(':not([data-action='+except+'])');
      return this;
    },
    hasAction:function(action){
      var actionGrp = this.$grpEle;
      return !!(actionGrp.find('.action-control[data-action='+action+']').is(':visible'));
    },
    toggle : function(val){
      this.$grpEle.toggle(val);
    }
  };
  ActionGroup.replaceMainActionGroup = function(actionGroup){
    if(actionGroup){
      actionGroup.toggle(false);
      var mainAgEle = actionGroup.element().clone();
      var mainAg = new ActionGroup(mainAgEle);mainAg.toggle(true);
      $('.entity-main-action-group').empty().append(mainAgEle);
    }else{
      $('.entity-main-action-group').empty();
    }
  }
  ActionGroup.findChildActionGroup = function ($ele) {
    var $grpEle = $('.action-group', $ele);
    return new ActionGroup($grpEle);
  };
  ActionGroup.findParentActionGroup = function ($ele) {
    var $grpEle = $ele.closest('.action-group');
    if($grpEle.length == 1)
      return new ActionGroup($grpEle);
  };

  function makeUrl(idField, entity, entityUrl) {
    return entityUrl + '/' + entity[idField];
  }

  function entityProperty(entity, propertyPath){
    var pieces = propertyPath.split('.');
    var pro = entity;
    pieces.some(function(t,i){
      if(t){
        pro = pro[t];
        if(pro == null)
        return true;
        }
    });
    return pro;
  }

  host.entity = $.extend({}, host.entity, {
    actionGroup : ActionGroup,
    makeUrl : makeUrl,
    entityProperty : entityProperty
  });
})(jQuery, tallybook);
