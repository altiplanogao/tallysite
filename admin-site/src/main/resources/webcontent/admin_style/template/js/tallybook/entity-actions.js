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
     * display the specified actions, and hide others; update the action-uri
     * @param actions : array of action names
     * @param linksObj : dictionary with action name as key, url as its value
     */
    setup : function(actions, linksObj){
      linksObj = linksObj || {};
      var actionGrp = this.$grpEle;
      actionGrp.hide();
      if(actions){
        actionGrp.find('.action-control[data-action]').each(function(i,ctrl){
          var $ctrl = $(ctrl); var action = $ctrl.data('action');
          $ctrl.toggle(actions.indexOf(action) >= 0);
          if(linksObj[action]){ $ctrl.attr('data-action-uri', linksObj[action]);}
        });
        actionGrp.show();
      }
    },
    focusOnEntry: function (anchor) {
      var actionGrp = this.$grpEle;
      actionGrp.data('anchor', anchor);
      actionGrp.find('.action-control.entity-action').each(function(i,ctrl){
        var $ctrl = $(ctrl);
        var uri = $ctrl.data('action-uri');
        if(uri == null || uri == '')return;
        var template = new UriTemplate(uri);
        var missvar = template.varNames.some(function(t,i,a){
          if(anchor[t] === undefined) return true;
        });
        ctrl.disabled =missvar;
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
  ActionGroup.getUri = function ($ctrl) {
    var uri = $ctrl.data('action-uri');
    var ag = ActionGroup.findParentActionGroup($ctrl);
    var anchor = ag.element().data('anchor');
    var template = new UriTemplate(uri);
    var missvar = template.varNames.some(function(t,i,a){
      if(anchor[t] === undefined) return true;
    });
    if(missvar) return undefined;
    return template.fill(anchor);
  };
  ActionGroup.replaceMainActionGroup = function(origAg){
    var mainAgc = $('.entity-main-action-group').empty();
    if(origAg){
      origAg.toggle(false);
      var mainAgEle = origAg.element().clone();
      var mainAg = new ActionGroup(mainAgEle); mainAg.toggle(true);
      mainAgc.append(mainAgEle);
    }
    return mainAg;
  }
  ActionGroup.replaceModalFootActionGroup = function(origAg, _modal){
    var $modalFoot = _modal.element().find('.modal-footer');
    var agFoot = new ActionGroup(origAg.element().clone());
    $modalFoot.empty().append(agFoot.element());
    origAg.toggle(false);
    return agFoot;
  }
  ActionGroup.findParentActionGroup = function ($ele) {
    var $grpEle = $ele.closest('.action-group');
    if($grpEle.length == 1)
      return new ActionGroup($grpEle);
  };

  host.entity = $.extend({}, host.entity, {
    actionGroup : ActionGroup
  });
})(jQuery, tallybook);
