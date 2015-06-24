;
(function($, window, undefined) {
    'use strict';

    var LISTGRID_CONTAINER_CLASS = "listgrid-container";
    var LISTGRID_SEL_CONTAINER_CLASS = "div.listgrid-container";
    var LISTGRID_CONTAINER_INITIALIZED_FLAG = "listgrid-container-initialized";
    var LISTGRID_SEL_HEADER_TABLE = "div.listgrid-header-wrapper > table";
    var LISTGRID_CONTAINER_CLASS = "listgrid-container";

    function createListGrid($container) {
        var listGrid = {
            headerTable: undefined,
            bodyWrapper: undefined,
            bodyTable: undefined,
            footer: undefined,
            spinner: undefined,

            updateHeaderWidth : function(){
                var bodyTabelWidth = this.bodyTable.width();
                this.headerTable.css('width', bodyTabelWidth);
            },

            updateBodyHeight : function(){
                var alignType = $container.data("listgrid-align-type");
                switch(alignType){
                    case "window":{
                        var $window = $(window);
                        var offset = $container.data("listgrid-align-offset");
                        var wrapperMaxHeight = $window.innerHeight() - (this.bodyWrapper.offset().top) - offset;
                        this.bodyWrapper.css('max-height', wrapperMaxHeight);
                        this.bodyWrapper.css('height', wrapperMaxHeight);
                        break;
                    }
                }
            }
        };

        return (function () {
            if ($container.hasClass(LISTGRID_CONTAINER_CLASS)) {
                if ($container.hasClass(LISTGRID_CONTAINER_INITIALIZED_FLAG)) {
                    return;
                }

                listGrid.headerTable = $container.find(LISTGRID_SEL_HEADER_TABLE);
                listGrid.bodyWrapper = $container.find("div.listgrid-body-wrapper");
                listGrid.bodyTable = $container.find("div.listgrid-body-wrapper > table");
                listGrid.footer = $container.find("div.listgrid-footer-wrapper");
                listGrid.spinner = $container.find("span.listgrid-table-spinner-container");

                listGrid.updateHeaderWidth();
                listGrid.updateBodyHeight();

                listGrid.bodyWrapper.customScrollbar();

                $container.listGrid = listGrid;
                $container.addClass(LISTGRID_CONTAINER_INITIALIZED_FLAG);
            } else {
                throw "ListGrid should contains class 'listgrid-container'";
            }
        })($container);
    };


    $.fn.listGridInit = function (options){
        ($(LISTGRID_SEL_CONTAINER_CLASS)).each(function(){
            var $container = $(this);
            createListGrid($container);
        });
    }
})(jQuery, this);