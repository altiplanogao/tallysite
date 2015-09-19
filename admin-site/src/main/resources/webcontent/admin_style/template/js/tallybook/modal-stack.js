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

  var MODAL_DATA_KEY = 'tallybook.modal.key';

  var ModalDefaultOptions = {
    preShow:function(){},
    preShowData:function(data){},
    preHide:function(){}
  };

  function Modal(options){
    this.$ele = null;
    this.options = $.extend({},ModalDefaultOptions,options);
  };
  Modal.prototype={
    _template : (function () {
      var modal = 
      '<div class="modal fade" role="dialog" style="display: block;"> \
      <div class="modal-dialog">\
      <div class="modal-content">\
        <div class="modal-header">\
          <button type="button" class="close" data-dismiss="modal">×</button>\
          <h4 class="modal-title"></h4>\
        </div>\
        <div class="modal-body"></div>\
        <div class="modal-footer">\
          <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\
        </div>\
      </div>\
      </div>\
      </div>';
      var $ele = $(modal);

      return function () {
        return $ele.clone();
      }
    })(),
    element:function(){return this.$ele;},
    updateMaxHeight:function(){
      var $ele = this.$ele;
      var availableHeight = $(window).height()
        - $ele.find('.modal-header').outerHeight()
        - $ele.find('.modal-footer').outerHeight()
        - ($(window).height() * .1);
      
      $ele.find('.modal-body').css('max-height', availableHeight);
    },
    setContentAsBlank : function () {
      if(this.$ele != null){this.$ele.data(MODAL_DATA_KEY, null);}
      this.$ele = this._template();this.$ele.data(MODAL_DATA_KEY, this);
      return this;
    },
    setContentAsLoading : function () {
      var $ele = this.$ele;
      $ele.addClass('loading');
      $ele.find('.modal-title').text(host.messages.loading);
      $ele.find('.modal-body').append($('<i>', { 'class' : 'icon-spin icon-spinner' }));
      $ele.find('.modal-body').css({'text-align': 'center', 'font-size': '24px', 'padding-bottom': '15px'});
      //  this.$ele.
      return this;
    },
    isLoading : function(){this.$ele.hasClass('loading-modal');},
    setContentByLink : function (link) {
      var $ele = this.$ele;
      $ele.removeClass('loading');
      return this;
    },
    setContentAsMessage : function(header, message){
      var $ele = this.$ele;

      $ele.find('.modal-header h3').text(header);
      $ele.find('.modal-body').text(message);
      $ele.find('.modal-body').css('padding-bottom', '20px');
    },
    showLink : function (link) {
      $.ajax({
        url:link,
        headers :{RequestInModal:'true'}
      }, function (data) {
        var $data = $(data);

      });
      var $ele = this.template();
    },
    onShow:function(){
      // Allow custom callbacks
      this.options.preShow();

    },
    onHide:function(){
      // Allow custom callbacks
      this.options.preHide();

    }
  };
  Modal.manager={
    modals : [],
    makeModal : function (options) {
      var modal = new Modal(options).setContentAsBlank().setContentAsLoading();
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
    showModal : function ($data) {
      if (this.currentModal() != null && this.currentModal().isLoading()) {
        this.hideCurrentModal();
      }

      $('body').append($data.element());
      $data.onShow();
      this.takeOverModal($data);
    },
    takeOverModal : function($data){
      var modals = this.modals, $element = $data.element();
      $element.modal({
        backdrop : (modals.length < 1),
        keyboard : false
      });

      // If we already have an active modal, we need to modify its z-index so that it will be
      // hidden by the current backdrop
      if (modals.length > 0) {
        var lastModal = modals.last();
        lastModal.css('z-index', '1040');
        var $backdrop = $('.modal-backdrop');
        $backdrop.css('z-index', parseInt($backdrop.css('z-index')) + 1);

        // We will also offset modals by the given option values
        $element.css('left', $data.position().left + (stackedModalOptions.left * modals.length) + 'px');
        $element.css('top', $data.position().top + (stackedModalOptions.top * modals.length) + 'px');
      }
      // Save our new modal into our stack
      modals.push($data);
      // Bind a callback for the modal hidden event...
      $element.on('hide.bs.modal', function(event) {
        var $ele = $(event.delegateTarget);
        var modal = $ele.data(MODAL_DATA_KEY);
        modal.onHide();

        // Remove the modal from the DOM and from our stack
        $(this).remove();
        modals.pop();

        // If this wasn't the only modal, take the last modal and put it above the backdrop
        if (modals.length > 0) {
          modals.last().css('z-index', '1050');
        }

        var topModal = this.currentModal;
        if (topModal) {
          var $topEle = topModal.element();
          $topEle.find('.submit-button').show();
          $topEle.find('img.ajax-loader').hide();
        }
      });
      $data.updateMaxHeight();
    }
  };
  Modal.makeModal = Modal.manager.makeModal;

  host.modal = Modal;

})(jQuery, this, tallybook);
