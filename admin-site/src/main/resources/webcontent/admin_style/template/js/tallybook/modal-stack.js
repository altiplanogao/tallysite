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
    preHide:function(){},
    preSetUrlContent:function(content, _modal){return $(content);},
    setUrlContent:function(content, _modal){
      _modal.element().find('.modal-body').empty().append(content);
    },
    postSetUrlContent:function(content, _modal){
    }
  };


  function Modal(options){
    this.$ele = null;
    this.options = $.extend({},ModalDefaultOptions,options);
  };
  Modal.prototype={
    _template : (function () {
      var $ele = $(
      '<div class="modal fade" role="dialog" style="display: block;"> \
      <div class="modal-dialog"><div class="modal-content">\
        <div class="modal-header">\
          <button type="button" class="close" data-dismiss="modal">×</button>\
          <div class="modal-title"><h4 class="title"></h4><div class="title-tools"></div></div>\
        </div>\
        <div class="modal-body"></div>\
        <div class="modal-footer">\
          <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\
        </div>\
      </div></div>\
      </div>');
      return function () {
        return $ele.clone();
      }})(),
    element:function(){return this.$ele;},
    updateMaxHeight:function(){
      var $ele = this.$ele;
      var availableHeight = $(window).height() * 0.9
        - $ele.find('.modal-header').outerHeight()
        - $ele.find('.modal-footer').outerHeight();
      
      $ele.find('.modal-body').css('max-height', availableHeight);
    },
    _makeEmptyContent : function () {
      if(this.$ele != null){this.$ele.data(MODAL_DATA_KEY, null);}
      this.$ele = this._template();this.$ele.data(MODAL_DATA_KEY, this);
      return this;
    },
    setupContextIfNot:function(){
      if(this.$ele == null)this._makeEmptyContent();
      return this;
    },
    setTitle:function(title){
      var $ele = this.$ele;
      $ele.find('.modal-title .title').text(title);
    },
    setContentAsLoading : function () {
      this.setupContextIfNot();
      var $ele = this.$ele;
      $ele.addClass('loading');
      $ele.find('.modal-title .title').text(host.messages.loading);
      $ele.find('.modal-body').empty().append($('<i>', { 'class' : 'fa fa-spin fa-spinner' }));
      $ele.find('.modal-body').css({'text-align': 'center', 'font-size': '24px', 'padding-bottom': '15px'});
      //  this.$ele.
      return this;
    },
    isLoading : function(){this.$ele.hasClass('loading-modal');},
    setContentByLink : function (link) {
      this.setupContextIfNot();
      var $ele = this.$ele;
      var _modal = this;

      host.ajax.get({url : link, headers : {RequestInModal:'true'}}, function(data){
        _modal.doSetUrlContent(data);
      });
      $ele.removeClass('loading');
      return this;
    },
    setContentByMessage : function(header, message){
      this.setupContextIfNot();
      var $ele = this.$ele;
      $ele.find('.modal-header .title').text(header);
      $ele.find('.modal-body').text(message);
      $ele.find('.modal-body').css('padding-bottom', '20px');
    },
    doSetUrlContent: function (content) {
      var _options = this.options
      content = _options.preSetUrlContent(content, this);
      _options.setUrlContent(content, this);
      _options.postSetUrlContent(content, this);
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
    makeModal : function (options, modalType) {
      if(modalType === undefined)
        modalType = Modal;
      var modal = new modalType(options).setContentAsLoading();
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
      this._doShowModal($data);
      $data.updateMaxHeight();
    },
    _doShowModal : function($data){
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
      $element.on('hidden.bs.modal', function(event) {
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
    }
  };
  Modal.makeModal = Modal.manager.makeModal;

  host.modal = Modal;

})(jQuery, this, tallybook);
