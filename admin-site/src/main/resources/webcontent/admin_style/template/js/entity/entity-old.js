/**
 * Created by Gao Yuan on 2015/7/1.
 */
;
(function ($, host) {
  host.entityOperator = (function () {
    'use strict';

    var ENTITYGRID_HEADER = 'thead.entitygrid-header';
    var ENTITYGRID_BODY = 'tbody.entitygrid-body';

    var EntityOps = {
      getEntities: function (entitiesText) {
        //entitiesText is Json text for type: EntityQueryResponse.java
        var entities = JSON.parse(entitiesText);
        return entities;
      },
      getGridInfo: function (entityInfos) {
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
    };

    var GridHeaderColOps = {
      headColTemplate: function () {
        var obj = $(
          "<th class='listgrid-column explicit-size' scope='col'>" +
          " <div href='#' class='split dropdown'>" +
          "  <div class='listgrid-column-title'>" +
          "   <span class='col-name'>Name Placeholder</span>" +
          "   <div class='listgrid-column-filter-sort-container'>" +
          "    <i class='col-sort fa fa-sort'></i>" +
          "    <i class='col-filter fa fa-filter'></i>" +
          "   </div>" +
          "  </div>" +
          "  <div class='resizer'>||</div>" +
          " </div>" +
          "</th>");
        return obj;
      },
      makeHeadColumn: function (fieldInfo) {
        var $col = this.headColTemplate();
        $col.find('.col-name').text(fieldInfo.friendlyName);
        return $col;
      },
      fillHeadColumns: function ($thead, $cols) {
        var $tr = $thead.find('tr').empty();
        if ($cols) {
          $tr.wrapInner($cols)
        }
      }
    }
    var GridHeaderOps = {};

    var GridBodyOps = {
      addDataRows: function ($tbody, gridinfo, entities) {
        var rows = entities.details.map(function (entity, index, array) {
          var row = GridRowOps.makeDataRow(gridinfo, entity);
          return row;
        });
        $tbody.append(rows);
      }
    };

    var GridCellOps = {
      cellTemplate: function (fieldname, fieldvalue) {
        var obj = $("<td>");
        obj.attr("data-fieldname", fieldname);
        obj.attr("data-fieldvalue", fieldvalue);
        return obj;
      },
      makeCell: function (field, entity) {
        var fieldname = field.name;
        var fieldvalue = entity[fieldname];
        var $cell = this.cellTemplate(fieldname, fieldvalue);
        switch (field.fieldType) {
          case '':
            makeCell4Email($cell, field, fieldvalue);
            break;
          default:
            this.makeCell4General($cell, field, fieldvalue);
        }
        return $cell;
      },
      makeCell4Email: function ($cell, field, fieldvalue) {

      },
      makeCell4MainEntry: function ($cell, field, fieldvalue) {

      },
      makeCell4General: function ($cell, field, fieldvalue) {
        $cell.html(fieldvalue);
      }
    }
    var GridRowOps = {
      rowTemplate: function (gridinfo, entity) {
        var $row = $("<tr>");
        $row.attr('data-id', entity[gridinfo.idField]);
        $row.attr('data-name', entity[gridinfo.nameField]);
        return $row;
      },
      initEmptyRow: function ($tbody, fields, entities) {
        var $emptyRow = $tbody.find('td.list-grid-no-results');
        if (entities.totalCount == 0) {
          $emptyRow.attr('colspan', fields.length);
        } else {
          $emptyRow.remove();
        }
      },
      makeDataRow: function (gridinfo, entity) {
        var $row = this.rowTemplate(gridinfo, entity);
        var $cells = gridinfo.fields.map(function (field, index, array) {
          var cell = GridCellOps.makeCell(field, entity);
          return cell;
        });
        $row.html($cells);
        return $row;
      }
    }

    var GridOps = {
      autofill: function ($container) {
        var $thead = $container.find(ENTITYGRID_HEADER);
        var $tbody = $container.find(ENTITYGRID_BODY);
        GridHeaderColOps.fillHeadColumns($thead);
        var rawdata = $(document).find('.raw-data p').data("raw-data");
        var entities = rawdata.entities;
        var entityInfos = rawdata.entityInfos;
        var range = {lo: entities.startIndex, hi: entities.startIndex + entities.details.length};
        entities.range = range;
        var gridinfo = EntityOps.getGridInfo(entityInfos);

        $tbody.attr('data-recordranges', range.lo + '-' + range.hi);
        $tbody.attr('data-totalrecords', entities.totalCount);
        $tbody.attr('data-pagesize', entities.pageSize);

        var cols = gridinfo.fields.map(function (fieldInfo, index, array) {
          var col = GridHeaderColOps.makeHeadColumn(fieldInfo);
          return col;
        });

        GridHeaderColOps.fillHeadColumns($thead, cols);
        GridRowOps.initEmptyRow($tbody, gridinfo.fields, entities);
        GridBodyOps.addDataRows($tbody, gridinfo, entities);
      },
      name: function () {
        return "Grid Operators";
      }
    }


    return function () {
      return {
        grid: GridOps
      };
    };
  }())
})($, $);

;
(function ($) {
  'use strict';
  var $doc = $(document);

  $(document).ready(function () {
    $(".entitygrid-autofill").each(function () {
      var $container = $(this);
      $.entityOperator().grid.autofill($container);
    });
  });
})(jQuery);