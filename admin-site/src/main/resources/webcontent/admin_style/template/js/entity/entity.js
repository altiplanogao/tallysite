/**
 * Created by Gao Yuan on 2015/7/1.
 */
;
(function ($, host) {
  host.entityOperation = (function () {
    'use strict';

    var ENTITYGRID_HEADER = '.header thead';
    var ENTITYGRID_BODY = '.body tbody';

    var Entity = {
      makeUrl : function(gridInfo, entity, baseUrl){
        var idField = gridInfo.idField;
        return baseUrl + entity[idField];
      }
    };

    function fillCellContent(gridInfo, $cell, entity, field, fieldvalue, baseUrl){
      var m = {
        makeCellAsGeneral : function(){
          return fieldvalue;
        },
        makeCellAsEmail : function () {
            var $content = $('<a>').attr('href', 'mailto:' + fieldvalue).text(fieldvalue);
            return $content;
        },
        makeCellAsPhone : function () {
            var segLen = 4;
            var formatedPhone = '';
            if(fieldvalue.length <= segLen){
                formatedPhone = fieldvalue;
            }else{
            var segCount = Math.ceil(fieldvalue.length / segLen);
            var start = 0;
            var end = fieldvalue.length % segLen;
            end = (end == 0)? segLen : end;
            var segs = [];
            for(var i = 0; i < segCount ; ++ i){
                segs[i] = fieldvalue.substring(start, end);
                start = end;
                end = start + segLen;
            }
            formatedPhone = segs.join('-');
            }
            var $content = $('<a>').attr('href', 'tel:' + fieldvalue).text(formatedPhone);
            return $content;
        },
        makeCellAsMainEntry : function () {
          var url = Entity.makeUrl(gridInfo, entity, baseUrl);
          var $content = $('<a>').attr('href', url).text(fieldvalue);
          return $content;
        }

      };

      var content = null;
      switch(field.fieldType){
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
      dataAccess : {
        process : function(data){
          var entities = data.entities;
          var range = {lo: entities.startIndex, hi: entities.startIndex + entities.details.length};
          entities.range = range;

          var entityInfos = data.entityInfos;
          var gridinfo = this.processInfo(entityInfos);

          return data;
        },
        processInfo: function (entityInfos) {
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
        }
      },

      header : {
        col:{
          template : function(){
            var obj = $(
              "<th class='column explicit-size' scope='col'>" +
              " <div href='#' class='split dropdown'>" +
              "  <div class='title'>" +
              "   <span class='col-name'>Name Placeholder</span>" +
              "   <div class='filter-sort-container'>" +
              "    <i class='col-sort fa fa-sort'></i>" +
              "    <i class='col-filter fa fa-filter'></i>" +
              "   </div>" +
              "  </div>" +
              "  <div class='resizer'>||</div>" +
              "  <ul class='entity-filter'>" +
              "  </ul>"+
              " </div>" +
              "</th>");
            return obj;
          }
        },
        makeCol : function(fieldInfo){
          var $col = this.col.template();
          $col.find('.col-name').text(fieldInfo.friendlyName);
          if(!fieldInfo.gridVisible){
                $col.css('display', 'none');
            }
          return $col;
        },
        makeCols : function(gridinfo){
          var _head = this;
          var $cols = gridinfo.fields.map(function (fieldInfo, index, array) {
            var $col = _head.makeCol(fieldInfo);
            return $col;
          });
          return $cols;
        },
        setCols : function($thead, $cols){
          var $tr = $thead.find('tr').empty();
          if ($cols) {
            $tr.wrapInner($cols)
          }
        }
      },

      body : {
        row : {
          template : function(gridinfo, entity, entityIndex){
            var $row = $('<tr class="data-row">');
            $row.attr('data-id', entity[gridinfo.idField]);
            $row.attr('data-name', entity[gridinfo.nameField]);
            $row.attr('data-entity-index', entityIndex);
            return $row;
          },
          cell : {
            template : function (fieldname, fieldvalue) {
              var obj = $("<td>");
              obj.attr("data-fieldname", fieldname);
              obj.attr("data-fieldvalue", fieldvalue);
              return obj;
            }
          },
          makeCell : function (gridInfo, field, entity, baseUrl) {
            var fieldname = field.name;
            var fieldvalue = entity[fieldname];
            var $cell = this.cell.template(fieldname, fieldvalue);
            fillCellContent(gridInfo, $cell, entity, field, fieldvalue, baseUrl);
            if(!field.gridVisible){
                $cell.css('display', 'none');
            }
            return $cell;
          },
          makeCells : function (gridInfo, entity, baseUrl) {
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
          var $row = this.row.template(gridinfo, entity, entityIndex);
          var $cells =this.row.makeCells(gridinfo, entity, baseUrl);
          $row.html($cells);
          return $row;
        },
        makeRows : function(gridinfo, entities){
          var _this = this;
          var baseUrl = entities.baseUrl;
          var rows = entities.details.map(function (entity, index, array) {
            var entityIndex = entities.startIndex + index;
            var row = _this.makeRow(gridinfo, entity, entityIndex, baseUrl);
            return row;
          });
          return rows;
        },
        addRows : function($tbody, $rows){
          $tbody.append($rows);
        }
      },

      getPageData : function (/* optional */ $page) {
        if(!$page){
          $page = $(document);
        }
        var rawdata = $page.find('.raw-data p').data("raw-data");
        return rawdata;
      },
      tryToFill : function ($page) {
        var rawdata = this.getPageData($page);
        if(rawdata){
          var $container = $page.find(".entity-grid-autofill");
          if($container.length){
            this.fillContainer($container, rawdata);
            return true;
          }
        }
        return false;
      },
      fillContainer: function ($container, $data) {
        var $thead = $container.find(ENTITYGRID_HEADER);
        var $tbody = $container.find(ENTITYGRID_BODY);
        this.header.setCols($thead);
        if(!$data){
          $data = this.getPageData();
        }
        this.fillTable($thead, $tbody, $data);
      },
      fillTable : function($thead, $tbody, data){
        this.dataAccess.process(data);
        var entityInfos = data.entityInfos;
        var gridinfo = entityInfos.details['grid'];

        if($thead) {
          var cols = this.header.makeCols(gridinfo);
          this.header.setCols($thead, cols);
        }

        if($tbody) {
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
      }
    }

    var Filter = {

    }

    return {
      grid: Grid,
      entity: Entity,
      filter: Filter
    };
  }())
})($, $);

;
(function ($) {
  'use strict';
  var $doc = $(document);

  $(document).ready(function () {
    $(".entity-grid-autofill").each(function () {
      var $container = $(this);
      $.entityOperation.grid.fillContainer($container);
    });
  });
})(jQuery);