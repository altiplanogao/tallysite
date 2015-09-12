/**
 * Created by Gao Yuan on 2015/9/10.
 */
;
var tallybook = tallybook || {};

(function ($, window, host) {
  var modals = [];

  function ModalHelper(modal){
    this.$modal = $(modal);
  }
  ModalHelper.prototype={
    asLoading : function () {
      this.$modal.addClass('loading');
    //  this.$modal.
    },
    showLink : function (link) {

    }
  }
  ModalHelper.template = function () {
    var $modal = $('<div>', {'class':'modal fade'});

    var $modalHeader = $('<div>', {'class' : 'modal-header'});
    $modalHeader.append($('<button', {
      'type':'button',
      'class': 'close',
      'data-dismiss': 'modal'}));
    $modalHeader.append($('<h4>', {'class':'modal-title'}));

    var $modalBody = $('<div>', {'class' : 'modal-body'});

    var $modalFooter = $('<div>', {'class' : 'modal-footer'});

    $modal.append($modalHeader);
    $modal.append($modalBody);
    $modal.append($modalFooter);

    return $modal;
  }

  Modal = {
    showLink : function (link) {
      var $modal = ModalHelper.template();
    }
  }

  host.modal = Modal;

})(jQuery, this, tallybook);
