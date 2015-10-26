;var tallybook = tallybook || {};

(function ($, window, host) {
  var stackedModalOptions = {
    left: 20,
    top: 20
  };

  var BootstrapModal = $.fn.modal.Constructor;

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

  var ModalDialogDefaultOptions = {
    header : '',
    message : '',
    positiveMsg : 'yes',
    negativeMsg : 'no',
    callback : null //callback for positive button
  };

  var ModalProcessingDefaultOptions = {
    header : '',
    message : '',
    url : '',
    method : 'GET',
    success : null,
    error : null
  };

  function Modal(options){
    this.$ele = null;
    this.options = $.extend({},ModalDefaultOptions,options);
    this.positiveHandler = null;
    this.onHideCallbacks = [];
  };
  Modal.prototype={
    _template : (function () {
      var $ele = $('<div class="modal fade" role="dialog" style="display: block;"><div class="modal-dialog"><div class="modal-content">\
        <div class="modal-header">\
          <button type="button" class="close" data-dismiss="modal">×</button>\
          <div class="modal-title"><h4 class="title"></h4><div class="title-tools"></div></div>\
        </div>\
        <div class="modal-body"></div>\
        <div class="modal-footer">\
          <button type="button" class="btn btn-default btn-positive">ok</button>\
          <button type="button" class="btn btn-default btn-negative" data-dismiss="modal">cancel</button>\
          <button type="button" class="btn btn-default btn-close" data-dismiss="modal">close</button>\
        </div>\
      </div></div></div>');
      var msgs = host.messages;
      $ele.find('.btn-positive').text(msgs.ok);
      $ele.find('.btn-negative').text(msgs.cancel);
      $ele.find('.btn-close').text(msgs.close);
      return function () {
        return $ele.clone();
      }})(),
    _makeEmptyContent : function () {
      if(this.$ele != null){
        this.$ele.data(MODAL_DATA_KEY, null);
        this.$ele.off('click', 'button.btn', this._buttonHandlerDelegate);
      }
      this.$ele = this._template();this.$ele.data(MODAL_DATA_KEY, this);
      this.$ele.on('click', 'button.btn', this, this._buttonHandlerDelegate);
      return this;
    },
    _setupContextIfNot:function(){
      if(this.$ele == null)this._makeEmptyContent();
      return this;
    },
    _buttonHandlerDelegate : function(event){
      var $ele = $(this);
      var _modal = event.data;
      Modal.prototype._buttonHandler.apply(_modal, arguments);
    },
    _buttonHandler : function(event){
      var $ele = $(this);
      if($(event.currentTarget).is('.btn.btn-positive')){
        if(this.positiveHandler){
          this.positiveHandler();
        }
      }
    },
    _doSetUrlContent: function (content) {
      var _options = this.options
      content = _options.preSetUrlContent(content, this);
      _options.setUrlContent(content, this);
      _options.postSetUrlContent(content, this);
    },
    _doSetTitle:function(title){
      var $ele = this.$ele;
      $ele.find('.modal-title .title').text(title);
    },
    _doSetBodyMessage: function (msg, emptyBody){
      var $ele = this.$ele;
      var $body = $ele.find('.modal-body');
      if(emptyBody)
        $body.empty();
      var msgs = $.isArray(msg) ? msg : [msg];
      var $fmsgs = msgs.map(function(item, i){
        $msg = $('<div class="message">').text(item);
        return $msg;
      });
      $body.find('.message').remove();
      $body.append($fmsgs);
    },
    _doSetBodyProgress:function(visible){
      var $ele = this.$ele;
      var $progress = $ele.find('.modal-body .progress');
      if(visible){
        if($progress.length == 0){
          $progress = $('<div class="progress"><div class="progress-bar progress-bar-striped active" style="width: 100%"></div></div>');
          $ele.find('.modal-body').append($progress);
        }
      }
      $progress.toggle(visible);
    },
    element:function(){return this.$ele;},
    hide:function(){this.element().modal('hide');},
    updateMaxHeight:function(){
      var $ele = this.$ele;
      var availableHeight = $(window).height() * 0.9 - $ele.find('.modal-header').outerHeight() - $ele.find('.modal-footer').outerHeight();
      $ele.find('.modal-body').css('max-height', availableHeight);
    },
    updateButtonsVisibility : function(positive, negative, close){
      var $footer = this.$ele.find('.modal-footer');
      $footer.find('.btn-positive').toggle(!!positive);
      $footer.find('.btn-negative').toggle(!!negative);
      $footer.find('.btn-close').toggle(!!close);
      return this;
    },
    setContentAsLoading : function () {
      this._setupContextIfNot();
      var $ele = this.$ele;
      $ele.addClass('loading');
      this._doSetTitle(host.messages.loading);
      var $spinner = $('<div>', {style:"text-align: center; font-size: 24px;"}).append($('<i>', { 'class' : 'fa fa-spin fa-spinner' }));
      $ele.find('.modal-body').empty().append($spinner);
      this.updateButtonsVisibility(false, false, true);
      return this;
    },
    isLoading : function(){this.$ele.hasClass('loading');},
    setContentByLink : function (link) {
      this._setupContextIfNot();
      var $ele = this.$ele;
      var _modal = this;

      $ele.addClass('loading');
      host.ajax.get({
        timeout : 120000,
        url : link,
        headers : {RequestInSimpleView:'true'},
        success: function(data, textStatus, jqXHR){
          _modal._doSetUrlContent(data);
          $ele.removeClass('loading');
        },
        error : function(jqXHR, textStatus, errorThrown){
          var msg = textStatus;
          var status = jqXHR.status;
          var readyState = jqXHR.readyState;
          var state = jqXHR.state();
          if(readyState == 0 && status == 0){
            if(textStatus == 'timeout'){
              msg = host.messages.error_network_timeout;
            }else{
              msg = host.messages.error_network;
            }
          }

          _modal.setContentAsMessage({
            header:host.messages.error,
            message:msg
          });
          $ele.removeClass('loading');
        }
      });
//      $ele.removeClass('loading');
      return this;
    },
    setContentAsMessage : function(options) {
      this._setupContextIfNot();
      this._doSetTitle(options.header);
      this._doSetBodyMessage(options.message, true);
      this.updateButtonsVisibility(false, false, true);
    },
    setContentAsInteractiveDialog : function(options){
      this._setupContextIfNot();
      options = $.extend({}, ModalDialogDefaultOptions, options);
      var $ele = this.$ele;
      this._doSetTitle(options.header);
      this._doSetBodyMessage(options.message, true);
      var callback = options.callback;
      if(callback){
        this.updateButtonsVisibility(true, true, false);
        this.positiveHandler = callback;
      }else{
        this.updateButtonsVisibility(true, false, false);
      }
      $ele.removeClass('loading');
    },
    setContentAsProcessing: function (options) {
      this._setupContextIfNot();
      options = $.extend({}, ModalProcessingDefaultOptions, options);
      this._doSetTitle(options.header);
      this._doSetBodyMessage(options.message);
      this._doSetBodyProgress(true);
      this.updateButtonsVisibility(false, false, false);
      var ajaxOptions = {
        url : options.url,
        type:options.type,
        data : options.data,
        success:function(data, textStatus, jqXHR, opts){
          if(options.success) options.success(data, textStatus, jqXHR, opts);
        },
        error : function(jqXHR, textStatus, errorThrown){
          if(options.error) options.error(jqXHR, textStatus, errorThrown);
        }};
      host.ajax(ajaxOptions);
    },
    addOnHideCallback: function (func, argsObj) {
      this.onHideCallbacks.push({callback:func, args: argsObj});
    },
    clearOnHideCallbacks:function(){
      this.onHideCallbacks = [];
    },
    onShow:function(){
      // Allow custom callbacks
      this.options.preShow();

    },
    onHide:function(){
      var _this = this;
      this.onHideCallbacks.forEach(function(item, i, array){
        var cb = item.callback;
        var args = item.args;
        if(cb){cb(_this, args);}
      });
      // Allow custom callbacks
      this.options.preHide();

    }
  };
  Modal.stack={
    modals : [],
    baseZIndex : 2000,
    _updateZIndex : function () {
      var modals = this.modals;
      var last = modals.length - 1;
      var lastBehind = last - 1;
      if(last >= 0){
        var topModalZIndex = this.baseZIndex + last + 9;
        var $backdrop = $('.modal-backdrop');
        $backdrop.css('z-index', topModalZIndex);
        modals[last].element().css('z-index', topModalZIndex + 1);
      }
      if(lastBehind >= 0){
        modals[lastBehind].element().css('z-index', this.baseZIndex + lastBehind);
      }
    },
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
    showModal : function (modal) {
      if (this.currentModal() != null && this.currentModal().isLoading()) {
        this.hideCurrentModal();
      }

      $('body').append(modal.element());
      modal.onShow();
      this._doShowModal(modal);
      modal.updateMaxHeight();
    },
    _doShowModal : function(modal){
      var modals = this.modals,
        $element = modal.element();
      $element.modal({
        backdrop : (modals.length < 1),
        keyboard : false
      });

      // If we already have an active modal, we need to modify its z-index so that it will be
      // hidden by the current backdrop
      if (modals.length > 0) {
        // We will also offset modals by the given option values
        $element.css('left', modal.element().position().left + (stackedModalOptions.left * modals.length) + 'px');
        $element.css('top', modal.element().position().top + (stackedModalOptions.top * modals.length) + 'px');
      }
      // Save our new modal into our stack
      modals.push(modal);

      this._updateZIndex();
      var _stack = this;

      // Bind a callback for the modal hidden event...
      $element.on('hide.bs.modal', function(event) {
        var $ele = $(event.delegateTarget);
        var modal = $ele.data(MODAL_DATA_KEY);
        modal.onHide();

        // Remove the modal from the DOM and from our stack
        $(this).remove();
        modals.pop();

        _stack._updateZIndex();

        var topModal = this.currentModal;
        if (topModal) {
          var $topEle = topModal.element();
          $topEle.find('.submit-button').show();
          $topEle.find('img.ajax-loader').hide();
        }
      });
    }
  };
  Modal.makeModal = Modal.stack.makeModal;

  host.modal = Modal;

})(jQuery, this, tallybook);
