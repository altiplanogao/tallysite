/**
 * Created by Gao Yuan on 2015/9/10.
 */
;
var tallybook = tallybook || {};

(function ($, window, host) {
  var stackedModalOptions = {
    left: 20,
    top: 20
  };

  function Modal($modal){
    this.$modal = $modal;
  };
  Modal.prototype={
    _template : (function () {
      var $modal = $('<div>', {'class':'modal fade'});

      var $modalHeader = $('<div>', {'class' : 'modal-header'});
      $modalHeader.append($('<button>', {
        'type':'button',
        'class': 'close',
        'data-dismiss': 'modal'}));
      $modalHeader.append($('<h4>', {'class':'modal-title'}));

      var $modalBody = $('<div>', {'class' : 'modal-body'});

      var $modalFooter = $('<div>', {'class' : 'modal-footer'});

      $modal.append($modalHeader);
      $modal.append($modalBody);
      $modal.append($modalFooter);

      return function () {
        return $modal.clone();
      }
    })(),
    setContentAsBlank : function () {
      this.$modal = this._template();
      return this;
    },
    setContentAsLoading : function () {
      this.$modal.addClass('loading');
      //  this.$modal.
      return this;
    },
    setContentByLink : function (link) {
      return this;
    },
    setContentAsMessage : function(header, message){
      var $modal = this.$modal;

      $modal.find('.modal-header h3').text(header);
      $modal.find('.modal-body').text(message);
      $modal.find('.modal-body').css('padding-bottom', '20px');
    },
    showLink : function (link) {
      $.ajax({
        url:link,
        headers :{RequestInModal:'true'}
      }, function (data) {
        var $data = $(data);

      });
      var $modal = this.template();
    }
  };
  Modal.manager={
    modals : [],
    makeModal : function () {
      var modal = new Modal().setContentAsBlank();
      return modal;
    },
    currentModal : function () {
      return this.modals.last();
    },
    hideCurrentModal : function() {
      if (this.currentModal()) {
        this.currentModal().modal('hide');
      }
    },
    showModal : function ($data, onModalHide, onModalHideArgs) {
      if (this.currentModal() != null && this.currentModal().hasClass('loading-modal')) {
        this.hideCurrentModal();
      }

      $('body').append($element);
      this.takeOverModal($data, onModalHide, onModalHideArgs);
    },
    takeOverModal : function($data, onModalHide, onModalHideArgs){
      var modals = this.modals;
      $data.modal({
        backdrop : (modals.length < 1),
        keyboard : false
      });

      // If we already have an active modal, we need to modify its z-index so that it will be
      // hidden by the current backdrop
      if (modals.length > 0) {
        modals.last().css('z-index', '1040');
        var $backdrop = $('.modal-backdrop');
        $backdrop.css('z-index', parseInt($backdrop.css('z-index')) + 1);

        // We will also offset modals by the given option values
        $data.css('left', $data.position().left + (stackedModalOptions.left * modals.length) + 'px');
        $data.css('top', $data.position().top + (stackedModalOptions.top * modals.length) + 'px');
      }
      // Save our new modal into our stack
      modals.push($data);
      // Bind a callback for the modal hidden event...
      $data.on('hidden', function() {

        // Allow custom callbacks
        if (onModalHide != null) {
          onModalHide(onModalHideArgs);
        }

        // Remove the modal from the DOM and from our stack
        $(this).remove();
        modals.pop();

        // If this wasn't the only modal, take the last modal and put it above the backdrop
        if (modals.length > 0) {
          modals.last().css('z-index', '1050');
        }

        if (this.currentModal()) {
          this.currentModal().find('.submit-button').show();
          this.currentModal().find('img.ajax-loader').hide();
        }
      });

    }
  };
  Modal.makeModal = Modal.manager.makeModal;

  host.modal = Modal;

})(jQuery, this, tallybook);
