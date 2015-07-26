/**
 * Created by Gao Yuan on 2015/7/1.
 */
;
var tallybook;
if (!tallybook)
  tallybook = {};

(function ($, host) {
  'use strict';

  var Data = {
    getPageData: function (/* optional */ $page) {
      if (!$page) {
        $page = $(document);
      }
      var rawdata = $page.find('.raw-data p').data("raw-data");
      return rawdata;
    },
    processGridData: function (data) {
      var entities = data.entities;
      var range = {lo: entities.startIndex, hi: entities.startIndex + entities.details.length};
      entities.range = range;

      var entityInfos = data.entityInfos;
      var gridinfo = this.processGridInfo(entityInfos);

      return data;
    },
    processGridInfo: function (entityInfos) {
      var gridInfo = entityInfos.details['grid'];
      gridInfo.fields.map(function (field, index, array) {
        switch (field.fieldType) {
          case 'ID':
            gridInfo.idField = field.name;
            break;
          case 'NAME':
            gridInfo.nameField = field.name;
            break;
          default:
        }
      });
      return gridInfo;
    },
    makeUrl: function (gridInfo, entity, baseUrl) {
      var idField = gridInfo.idField;
      return baseUrl + entity[idField];
    }
  };

  var Template = {
    filterTemplateMapByType : (function(){
      var $templates = $('.template.grid-template table.entity-filters-table > tbody ul.entity-filter');
      var templateMap = {};
      $templates.each(function(index, template){
        var $template = $(template);
        var types = $template.attr('data-entity-filter-type').split(',');
        types.forEach(function (type) {
          templateMap[type] = $template;
        })
      });
      return function(){return templateMap;}
    })(),
    columnHeader : (function(){
      var template = $('.template.grid-template .column-header-template');
      template.removeClass('column-header-template');
      return function(){
        return template.clone();};
    })(),
    cell : function(fieldname, fieldvalue) {
      var obj = $("<td>");
      obj.attr("data-fieldname", fieldname);
      obj.attr("data-fieldvalue", fieldvalue);
      return obj;
    },
    row: function (gridinfo, entity, entityIndex) {
      var $row = $('<tr class="data-row">');
      $row.attr('data-id', entity[gridinfo.idField]);
      $row.attr('data-name', entity[gridinfo.nameField]);
      $row.attr('data-entity-index', entityIndex);
      return $row;
    }
  };

  function makeColumnFilter(fieldInfo){
    var templateMap = Template.filterTemplateMapByType();
    var f = {
      makeCellAsGeneral : function(){
        var template = templateMap['default'].clone();
        $('input.filter-property', template).val(fieldInfo.name);
        $('input.sort-property', template).val('sort_' + fieldInfo.name);
        var $input = $('input.filter-input', template);
        $input.attr('data-name', fieldInfo.name);
        $input.attr('placeholder', fieldInfo.friendlyName);
        return template;
      }
    };

    var content = null;
    switch (fieldInfo.fieldType) {
      case 'ID':
        content = f.makeCellAsGeneral();
        break;
      default :
        content = f.makeCellAsGeneral();
    }
    
    return content;
  };
  function fillCellContent(gridInfo, $cell, entity, field, fieldvalue, baseUrl) {
    var m = {
      makeCellAsGeneral: function () {
        return fieldvalue;
      },
      makeCellAsEmail: function () {
        var $content = $('<a>').attr('href', 'mailto:' + fieldvalue).text(fieldvalue);
        return $content;
      },
      makeCellAsPhone: function () {
        var segLen = 4;
        var formatedPhone = '';
        if (fieldvalue.length <= segLen) {
          formatedPhone = fieldvalue;
        } else {
          var segCount = Math.ceil(fieldvalue.length / segLen);
          var start = 0;
          var end = fieldvalue.length % segLen;
          end = (end == 0) ? segLen : end;
          var segs = [];
          for (var i = 0; i < segCount; ++i) {
            segs[i] = fieldvalue.substring(start, end);
            start = end;
            end = start + segLen;
          }
          formatedPhone = segs.join('-');
        }
        var $content = $('<a>').attr('href', 'tel:' + fieldvalue).text(formatedPhone);
        return $content;
      },
      makeCellAsMainEntry: function () {
        var url = Data.makeUrl(gridInfo, entity, baseUrl);
        var $content = $('<a>').attr('href', url).text(fieldvalue);
        return $content;
      }

    };

    var content = null;
    switch (field.fieldType) {
      case 'ID':
        content = m.makeCellAsGeneral();
        break;
      case 'NAME':
        content = m.makeCellAsMainEntry();
        break;
      case 'EMAIL':
        content = m.makeCellAsEmail();
        break;
      case 'PHONE':
        content = m.makeCellAsPhone();
        break;
      default :
        content = m.makeCellAsGeneral();
    }

    $cell.html(content);
  };


  var Grid = {
    header: {
      makeCol: function (fieldInfo) {
        var $col = Template.columnHeader();
        $col.find('.col-name').text(fieldInfo.friendlyName);
        if (!fieldInfo.gridVisible) {
          $col.css('display', 'none');
        }
        $col.find('.column-header').attr('data-column-key', fieldInfo.name);
        var iconSort = $col.find('.sort-icon');
        var iconFilter=$col.find('.filter-icon');
        if(fieldInfo.supportSort){
          var sortValEle = $col.find('.sort-value');
          sortValEle.attr('data-key', 'sort_'+fieldInfo.name);
        }else{
          iconSort.hide();
        }
        if(fieldInfo.supportFilter){
          var filterValEle = $col.find('.filter-value');
          filterValEle.attr('data-key', fieldInfo.name);

          var filter = makeColumnFilter(fieldInfo);
          $col.find('.entity-filter').replaceWith(filter);
        }else{
          iconFilter.hide();
        }
        return $col;
      },
      makeCols: function (gridinfo) {
        var _head = this;

        var $cols = gridinfo.fields.map(function (fieldInfo, index, array) {
          var $col = _head.makeCol(fieldInfo);
          return $col;
        });
        return $cols;
      },
      setCols: function ($thead, $cols) {
        var $tr = $thead.find('tr').empty();
        if ($cols) {
          $tr.wrapInner($cols)
        }
      }
    },

    body: {
      row: {
        makeCell: function (gridInfo, field, entity, baseUrl) {
          var fieldname = field.name;
          var fieldvalue = entity[fieldname];
          var $cell = Template.cell(fieldname, fieldvalue);
          fillCellContent(gridInfo, $cell, entity, field, fieldvalue, baseUrl);
          if (!field.gridVisible) {
            $cell.css('display', 'none');
          }
          return $cell;
        },
        makeCells: function (gridInfo, entity, baseUrl) {
          var fields = gridInfo.fields;
          var _this = this;
          var $cells = fields.map(function (field, index, array) {
            var $cell = _this.makeCell(gridInfo, field, entity, baseUrl);
            return $cell;
          });
          return $cells;
        }
      },
      initEmptyRow: function ($tbody, fields, entities) {
        var $emptyRow = $tbody.find('td.entity-grid-no-results');
        if (entities.totalCount == 0) {
          $emptyRow.attr('colspan', fields.length);
        } else {
          $emptyRow.remove();
        }
      },
      makeRow: function (gridinfo, entity, entityIndex, baseUrl) {
        var $row = Template.row(gridinfo, entity, entityIndex);
        var $cells = this.row.makeCells(gridinfo, entity, baseUrl);
        $row.html($cells);
        return $row;
      },
      makeRows: function (gridinfo, entities) {
        var _this = this;
        var baseUrl = entities.baseUrl;
        var rows = entities.details.map(function (entity, index, array) {
          var entityIndex = entities.startIndex + index;
          var row = _this.makeRow(gridinfo, entity, entityIndex, baseUrl);
          return row;
        });
        return rows;
      },
      addRows: function ($tbody, $rows) {
        $tbody.append($rows);
      }
    },
    tryToFill: function ($page) {
      var rawdata = Data.getPageData($page);
      if (rawdata) {
        var $container = $page.find(".entity-grid-autofill");
        if ($container.length) {
          this.fillContainer($container, rawdata);
          return true;
        }
      }
      return false;
    },
    fillContainer: function ($container, $data) {
      var ENTITYGRID_HEADER = '.header thead';
      var ENTITYGRID_BODY = '.body tbody';

      var $thead = $container.find(ENTITYGRID_HEADER);
      var $tbody = $container.find(ENTITYGRID_BODY);
      this.header.setCols($thead);
      if (!$data) {
        $data = Data.getPageData();
      }
      if($data){
        this.fillTable($thead, $tbody, $data);
      }
    },
    fillTable: function ($thead, $tbody, data) {
      Data.processGridData(data);
      var entityInfos = data.entityInfos;
      var gridinfo = entityInfos.details['grid'];

      if ($thead) {
        var cols = this.header.makeCols(gridinfo);
        this.header.setCols($thead, cols);
      }

      if ($tbody) {
        var entities = data.entities;
        var range = entities.range;

        $tbody.attr('data-recordranges', range.lo + '-' + range.hi);
        $tbody.attr('data-totalrecords', entities.totalCount);
        $tbody.attr('data-pagesize', entities.pageSize);
        $tbody.attr('data-baseurl', entities.baseUrl);

        this.body.initEmptyRow($tbody, gridinfo.fields, entities);
        var $rows = this.body.makeRows(gridinfo, entities);
        this.body.addRows($tbody, $rows);
      }
    },
    initOnDocReady: function ($doc) {
      $(".entity-grid-autofill").each(function () {
        var $container = $(this);
        Grid.fillContainer($container);
      });
    }
  }

  var Filter = {
    closeDropdowns: function(header){
      $('.column-header.dropdown').not(header).removeClass('show-filter');
    },
    setValue : function(header, value){
      $('input.filter-value', header).val(value);
      $('.filter-sort-container', header).toggleClass('filter-active', !!value);
    },
    initOnDocReady: function($doc){
      //Init filter dropdown
      $doc.on('click','.column-header.dropdown .filter-icon', function(e){
        var $el = $(this),
        header = $el.closest('.column-header.dropdown'),
        dropdown = $('> ul', header);

        setTimeout(function () {
            header.toggleClass('show-filter');
            Filter.closeDropdowns(header);
        }, 0);
      });

      $doc.on('click','body, html', function(e){
        if(e.originalEvent == undefined) return;
        var $target = $(e.originalEvent.target);
        if(!($target.parents().is('.column-header.dropdown'))){
         Filter.closeDropdowns();
        }
      });

      //Init input element
      $('span.input-element').each(function () {
        var $inputEle = $(this);
        var $delIcon = $inputEle.find('i.embed-delete');
        var $input = $inputEle.find('input.filter-input');

        $delIcon.hide();
        $delIcon.click(function(){
          $input.val('');
          $delIcon.hide();});
        var invalidDelIcon = function (event) {
          var newVal = $input.val();
          (!!newVal) ? $delIcon.show() : $delIcon.hide();
        }
        $input.keyup(invalidDelIcon);
        $input.change(invalidDelIcon);
      })
    }
  };

  var Sorter ={
    getOrderInInt : function(header){
      var $el = header.find('i.sort-icon');
        if($el.is('.fa-sort-amount-asc'))
          return 1;
        if($el.is('.fa-sort-amount-desc'))
          return -1;
        return 0;
    },
    getNextOrder : function(intOrder){
      intOrder = -(-intOrder);
      return ((intOrder+1 +1) % 3) - 1;
    },
    setOrderClass: function(header, intOrder){
      var $el = header.find('i.sort-icon');
      $el.removeClass('fa-sort-amount-desc');
      $el.removeClass('fa-sort-amount-asc');
      var $container = $el.parent('.filter-sort-container');
      var $valEle = header.find('.sort-value');
      var sortKey = $valEle.attr('data-key');
      var sortVal = null;
      switch(intOrder){
        case -1:
          $el.addClass('fa-sort-amount-desc');
          $container.addClass('sort-active');
          sortVal = 'desc';
          break;
        case 1:
          $el.addClass('fa-sort-amount-asc');
          $container.addClass('sort-active');
          sortVal = 'asc';
          break;
        case 0:
          $container.removeClass('sort-active');
          sortVal = null;
          break;
      }
      $valEle.val(sortVal);
      var url = '';
    },
    clearActiveOrder : function ($thead) {
      var $headers = $thead.find('.column-header.dropdown');
      $headers.find('.sort-value').val('');
      $headers.find('.filter-sort-container').removeClass('sort-active')
        .find('i.sort-icon')
        .removeClass('fa-sort-amount-desc fa-sort-amount-asc');
      var params = host.history.getUrlParameters();
      if(params){
        for(var key in params){
          if(key.startWith('sort_')){
            host.history.replaceUrlParameter(key, null);
          }
        }
      }
    },
    initOnDocReady: function($doc){
      var params = host.history.getUrlParameters();
      
      var sorter = this;
      //Init sorter
      $doc.on('click','.column-header.dropdown .sort-icon', function(e){
        var $el = $(this),
          header = $el.closest('.column-header.dropdown'),
          dropdown = $('> ul', header);

        var currentOrder = sorter.getOrderInInt(header);
        var nextOrder = sorter.getNextOrder(currentOrder);

        var $thead = $el.closest('.thead');
        sorter.clearActiveOrder($thead);

        sorter.setOrderClass(header, nextOrder);

      });
    }
  };

  host.entity = {
    data: Data,
    grid: Grid,
    filter: Filter,
    sorter : Sorter
  };
})($, tallybook);
