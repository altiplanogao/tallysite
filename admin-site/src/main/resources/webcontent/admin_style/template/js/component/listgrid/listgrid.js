;
(function($, window, undefined) {
    'use strict';

    var LISTGRID_SEL_CONTAINER_CLASS = "div.listgrid-container";

    $.fn.initListGrid = function (){
        var LISTGRID_CONTAINER = "listgrid-container";
        var LISTGRID_CONTAINER_INITIALIZED_FLAG = "listgrid-container-initialized";
        var LISTGRID_HEADER_TABLE = "div.listgrid-header-wrapper > table";
        var LISTGRID_BODY = "div.listgrid-body-wrapper";
        var LISTGRID_BODY_TABLE = "div.listgrid-body-wrapper table";

        var tableColumnResizing = {
            active : false,
            container : undefined,
            headerTableThead : undefined,
            bodyTableThead : undefined,
            columnIndex : 0,
            startX : undefined,
            startWidths : undefined,
            totalWidth : 0
        };

        var ListGrid = function (container){
            this.$container = $(container);
            this.initialize();
        };

        ListGrid.prototype = {
            updateGridSize : function(){
                this.updateBodyHeight();
                this.addScrollableSupport();
                this.updateHeaderWidth();
            },

            updateHeaderWidth: function () {
                var bodyTable = this.$container.find(LISTGRID_BODY_TABLE);
                var headerTable = this.$container.find(LISTGRID_HEADER_TABLE);
                var bodyTabelWidth = bodyTable.parent().width();
                headerTable.css('width', bodyTabelWidth);
                bodyTable.css('width', bodyTabelWidth);
                headerTable.closest(LISTGRID_CONTAINER).find('th').css('width', '');

                var headerTableThs = headerTable.find('thead tr th');
                var bodyTableThs = bodyTable.find('thead tr th');
                for(var i = 0 ; i < headerTableThs.length; i++){
                    $(bodyTableThs[i]).outerWidth( $(headerTableThs[i]).outerWidth());
                }
            },

            updateBodyHeight: function () {
                var containerHolder = this.$container.parent();
                var alignType = containerHolder.data("listgrid-align-type");
                switch (alignType) {
                    case "window":
                    {
                        var $window = $(window);
                        var offset = containerHolder.data("listgrid-align-offset");
                        var bodyWrapper = this.$container.find(LISTGRID_BODY);
                        var wrapperMaxHeight = $window.innerHeight() - (bodyWrapper.offset().top) - offset;
                        bodyWrapper.css('max-height', wrapperMaxHeight);
                        bodyWrapper.css('height', wrapperMaxHeight);
                        break;
                    }
                }
            },

            addScrollableSupport: function () {
                var bodyWrapper = this.$container.find(LISTGRID_BODY);
                bodyWrapper.customScrollbar();
            },

            resize : function(){
                this.updateGridSize();
            },

            initialize: function () {
                if (this.$container.hasClass(LISTGRID_CONTAINER)) {
                    if (this.$container.hasClass(LISTGRID_CONTAINER_INITIALIZED_FLAG)) {
                        return;
                    }
                    this.updateGridSize();

                    this.paging = new Paging(this);
                    this.paging.initialize();

                    this.resizer = new ColumnResizer(this);
                    this.resizer.initialize();

                    this.$container.ListGrid = this;
                    this.$container.addClass(LISTGRID_CONTAINER_INITIALIZED_FLAG);
                } else {
                    throw "ListGrid should contains class 'listgrid-container'";
                }
            }
        };


        var Paging = function(listGrid){
            this.listGrid = listGrid;
            this.$container = listGrid.$container;

        };

        Paging.prototype = {
            getRange : function(rangeDescription) {
                var range = rangeDescription.split('-');
                var rangeObj = {lo : parseInt(range[0]), hi : parseInt(range[1])};
                return rangeObj;
            },

            getRowHeight : function($tbody){
                var $row = $tbody.find('tr:not(.blank-padding):first');
                return $row.height();
            },

            createPadding : function($tbody, startRange, endRange){
                var rowHeight = this.getRowHeight($tbody);
                var recordsCount = endRange - startRange;
                var $pad = $('<tr>', {
                    'class' : 'blank-padding',
                    'css' : {
                        'height' : recordsCount * rowHeight
                    },
                    'data-range' : startRange + '-' + endRange
                });

                return $pad;
            },

            getTotalRecords : function($container){
                return $container.data('totalrecords');
            },

            getLoadedRecordRange : function($container){
                var rangeDescriptions = $container.data('recordranges').split(',');
                var ranges = [];

                for (var i = 0; i < rangeDescriptions.length; i++) {
                    ranges[i] = this.getRange(rangeDescriptions[i]);
                }

                return ranges;
            },

            scrollToIndex : function($tbody, index){
                var offset = index * this.getRowHeight($tbody);
                //console.log('scrolling to ' + offset);

                var bodyWrapper = this.$container.find(LISTGRID_BODY);
                bodyWrapper.customScrollbar("scrollToY", offset);
            },

            initialize : function(){
                var headerTable = this.$container.find(LISTGRID_HEADER_TABLE);
                headerTable.find('th').css('width', '');
                headerTable.find('th').each(function(index, thElement) {
                    var $th = $(thElement);
                    var width = $th.width();
                    $th.css('width', width);
//                    thWidths[index] = width;
                });
                var bodyTable = this.$container.find(LISTGRID_BODY_TABLE);

                var headerTableThead = headerTable.find("thead").clone();
                headerTableThead.addClass("width-control-header").find('th').empty();

                var bodyTableThead = bodyTable.find("thead");
                bodyTableThead.replaceWith(headerTableThead);

                var $tbody = bodyTable.find('tbody');

                var range = this.getLoadedRecordRange(this.$container)[0];
                var recordsAbove = range.lo;
                var recordsBelow = this.getTotalRecords(this.$container) - range.hi;
                var rowHeight = this.getRowHeight($tbody);

                if(recordsAbove) {
                    var $pad = this.createPadding($tbody, 0, recordsAbove);
                    $tbody.find('tr:first').before($pad);
                    // Update the height so that the user doesn't see a scroll action
                    this.scrollToIndex($tbody, range.lo);
                }
                if (recordsBelow) {
                    var $pad = this.createPadding($tbody, range.hi, this.getTotalRecords(this.$container));
                    $tbody.find('tr:last').after($pad);
                }

                var bodyWrapper = this.$container.find(LISTGRID_BODY);
                bodyWrapper.customScrollbar("resize", true);

                this.scrollToIndex($tbody, range.lo);
            }
        };

        var ColumnResizer = function (listGrid) {
            this.listGrid = listGrid;
            this.$container = listGrid.$container;

        };

        ColumnResizer.prototype = {
            initialize : function () {
                var container = this.$container;
                var $headerTableThead = this.$container.find(LISTGRID_HEADER_TABLE).find('thead');
                var $bodyTableThead = this.$container.find(LISTGRID_BODY_TABLE).find('thead');
                $headerTableThead.find('th div.resizer').mousedown(function(e){
                    var $this = $(this).closest('th');
                    tableColumnResizing.active = true;
                    tableColumnResizing.container = container;
                    tableColumnResizing.headerTableThead = $headerTableThead;
                    tableColumnResizing.bodyTableThead = $bodyTableThead;
                    tableColumnResizing.columnIndex = $this.index();
                    tableColumnResizing.startX = e.pageX;
                    tableColumnResizing.startWidths = [];
                    tableColumnResizing.totalWidth = 0;

                    tableColumnResizing.headerTableThead.find('th').each(function(index, element) {
                        tableColumnResizing.startWidths.push($(this).outerWidth());
                        tableColumnResizing.totalWidth += $(this).outerWidth();
                    });
                    $(document).disableSelection();
                });

                $(document).mousemove(function(e){
                    if(tableColumnResizing.active){
                        var headerTableThead = tableColumnResizing.headerTableThead;
                        var headerTableOffset = headerTableThead.offset();
                        if(e.pageX < (headerTableOffset.left - 100) || e.pageX > (headerTableOffset.left + headerTableThead.width() + 100) ||
                            (e.pageY < (headerTableOffset.top - 100)) || (e.pageY > (headerTableOffset.top + headerTableThead.height() + 100))){
                            tableColumnResizing.active = false;
                            $(document).enableSelection();
                            return;
                        }

                        var minColumnWidth = 30;
                        var index = tableColumnResizing.columnIndex;
                        var widthDiff = (e.pageX - tableColumnResizing.startX);
                        var minAllow = -tableColumnResizing.startWidths[index] + minColumnWidth;
                        var maxAllow = tableColumnResizing.startWidths[index + 1] - minColumnWidth;

                        if(widthDiff < minAllow){
                            widthDiff = minAllow;
                        }else if(widthDiff > maxAllow){
                            widthDiff = maxAllow;
                        }

                        var newLeftWidth = tableColumnResizing.startWidths[index] + widthDiff;
                        var newRightWidth = tableColumnResizing.startWidths[index + 1] - widthDiff;

                        var newWidths = [];
                        for(var i = 0 ; i < tableColumnResizing.startWidths.length; i++){
                            newWidths[i] = tableColumnResizing.startWidths[i];
                        }
                        newWidths[index] = newLeftWidth;
                        newWidths[index + 1] = newRightWidth;

                        var headerTableThs = tableColumnResizing.headerTableThead.find('tr th');
                        var bodyTableThs = tableColumnResizing.bodyTableThead.find('tr th');

                        for(var i = 0 ; i < tableColumnResizing.startWidths.length; i++){
                            $(headerTableThs[i]).outerWidth(newWidths[i]);
                            $(bodyTableThs[i]).outerWidth(newWidths[i]);
                        }
                    }
                });
                $(document).mouseup(function(){
                    if (tableColumnResizing.active) {
                        tableColumnResizing.active = false;
                        $(document).enableSelection();
                }});
            }
        }

        return this.each(function(){
            var listGrid = new ListGrid($(this));
            $(document).ready(function () {
                $(window).resize(function(){
                    setTimeout(function () {
                        listGrid.resize();
                    }, 200);
                });
            });

        });
    }


    $.fn.listGridInit = function (options){
        ($(LISTGRID_SEL_CONTAINER_CLASS)).each(function(){
            var $container = $(this);
            $container.initListGrid();
        });
    };

})(jQuery, this);

