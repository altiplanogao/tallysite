/**
 * Created by Gao Yuan on 2015/7/1.
 */
;
(function($, host){
    host.entityOperator = (function(){
        'use strict';

        var ENTITYGRID_HEADER ='thead.entitygrid-header';
        var ENTITYGRID_BODY ='tbody.entitygrid-body';

        var EntityOps = {
            getEntities : function(entitiesText){
                //entitiesText is Json text for type: EntityQueryResponse.java
                var entities = JSON.parse(entitiesText);
                return entities;
            },
            getGridInfo : function(entities){
                return entities.infos['grid'];
            }
        };

        var GridHeaderColOps = {
            headColTemplate: function () {
                var obj = $(
                    "<th class='listgrid-column explicit-size' scope='col'>" +
                    "   <div href='#' class='split dropdown'>" +
                    "       <div class='listgrid-column-title'>" +
                    "           <span class='col-name'>Name Placeholder</span>" +
                    "           <div class='listgrid-column-filter-sort-container'>" +
                    "               <i class='col-sort fa fa-sort'></i>" +
                    "               <i class='col-filter fa fa-filter'></i>" +
                    "           </div>" +
                    "       </div>" +
                    "       <div class='resizer'>||</div>" +
                    "   </div>" +
                    "</th>");
                return obj;
            },
            makeHeadColumn: function (fieldInfo) {
                var $col = this.headColTemplate();
                $col.find('.col-name').text(fieldInfo.name);
                return $col;
            },
            fillHeadColumns : function($thead, $cols){
                var $tr = $thead.find('tr').empty();
                if($cols){
                    $tr.wrapInner($cols)                 
                }

            }
        }
        var GridHeaderOps =  {

        };

        var GridBodyOps = {

        };

        var GridCellOps = {

        }

        var GridOps = {
            autofill : function ($container) {
                var $thead = $container.find(ENTITYGRID_HEADER);
                var $tbody = $container.find(ENTITYGRID_BODY);
                GridHeaderColOps.fillHeadColumns($thead);
                var entities = $(document).find('.raw-data p').data("raw-data").entities;
                var range = {lo:entities.startIndex, hi:entities.startIndex + entities.entities.length};
                entities.range=range;
                var gridinfo = EntityOps.getGridInfo(entities);

                $tbody.attr('data-recordranges', range.lo + '-' + range.hi);
                $tbody.attr('data-totalrecords', entities.totalCount);
                $tbody.attr('data-pagesize', entities.pagesize);

                var cols = gridinfo.fields.map(function(fieldInfo, index, array){
                    var col = GridHeaderColOps.makeHeadColumn(fieldInfo);
                   return col;
                });

                GridHeaderColOps.fillHeadColumns($thead, cols);
            },
            name : function(){
                return "Grid Operators";
            }
        }

        return function() {
            return {
                grid: GridOps
            };
        };
    }())
})($, $);

;(function($){
    'use strict';

    var $doc = $(document);

    $(document).ready(function() {
        $(".entitygrid-autofill").each(function () {
            var $container = $(this);
            $.entityOperator().grid.autofill($container);
        });
    });

})(jQuery);