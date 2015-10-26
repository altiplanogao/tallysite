;
var tallybook = tallybook || {};

(function ($, host) {
  'use strict';

  var CellTemplates = {
    CellCreationContext : function(idField, entityUrl, baseUrl){
      this.idField = idField;
      this.entityUrl = entityUrl;
      this.baseUrl = baseUrl;
    },
    /**
     * Get Cell Maker by field Type
     * @params fieldType: the field type
     */
    _cellTemplateByFieldType : (function(){
      /**
       * @param celltype :
       * @param supportedFieldTypes
       * @param cellmaker
       * @constructor
       *
       * Example={
       *   data-cell-type : string, integer, decimal, foreign-key
       *   data-support-field-types : string, email, phone, boolean
       * }
       */
      var CellTemplateEntry = function(celltype, supportedFieldTypes, cellmaker){
        this.celltype = celltype;
        this.supportedFieldTypes = supportedFieldTypes.split(',');
        this.cellmaker = cellmaker;
      };
      var cellentries = [
        new CellTemplateEntry('default', 'default', function (entity, fieldInfo, cellCreationContext) {
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname];
          return fieldvalue;
        }),
        new CellTemplateEntry('name', 'name', function(entity, fieldInfo, cellCreationContext) {
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname];
          var url = host.entity.makeUrl(cellCreationContext.idField, entity, cellCreationContext.entityUrl);
          var $content = $('<a>', {'href': url}).text(fieldvalue);
          return $content;
        }),
        new CellTemplateEntry('email', 'email', function(entity, fieldInfo, cellCreationContext){
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname];
          var $content = $('<a>', {'href': 'mailto:' + fieldvalue}).text(fieldvalue);
          return $content;
        }),
        new CellTemplateEntry('enumeration', 'enumeration', function(entity, fieldInfo, cellCreationContext){
          var options = fieldInfo.options;
          var optionNames = fieldInfo.optionsFriendly;
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname];
          return optionNames[fieldvalue];
        }),
        new CellTemplateEntry('boolean', 'boolean', function(entity, fieldInfo, cellCreationContext) {
          var fieldname = fieldInfo.name;
          var options = fieldInfo.options;
          var fieldvalue = entity[fieldname];
          if(fieldvalue === "" || fieldvalue === null || fieldvalue === undefined)
            return '';
          return options[fieldvalue?'t':'f'];
        }),
        new CellTemplateEntry('phone', 'phone', function (entity, fieldInfo, cellCreationContext) {
          var fieldname = fieldInfo.name;
          var fieldvalue = entity[fieldname]; if(fieldvalue == null) fieldvalue = '';
          var segLen = 4;
          var formatedPhone = '';
          if (fieldvalue.length <= segLen) {
            formatedPhone = fieldvalue;
          } else {
            var segCount = Math.ceil(fieldvalue.length / segLen);
            var start = 0; var end = fieldvalue.length % segLen;
            end = (end == 0) ? segLen : end;
            var segs = [];
            for (var i = 0; i < segCount; ++i) {
              segs[i] = fieldvalue.substring(start, end);
              start = end; end = start + segLen;
            }
            formatedPhone = segs.join('-');
          }
          var $content = $('<a>', {'href' : 'tel:' + fieldvalue}).text(formatedPhone);
          return $content;
        }),
        new CellTemplateEntry('foreign_key', 'foreign_key', function(entity, fieldInfo, cellCreationContext) {
          var fieldname = fieldInfo.name;
          var displayFieldName = fieldInfo.displayFieldName;
          var idFieldName = fieldInfo.idFieldName;
          var entityType = fieldInfo.entityType;

          var fieldvalue = entity[fieldname];
          if(!!fieldvalue){
            var idVal = fieldvalue[idFieldName];
            var nameVal = fieldvalue[displayFieldName];
            var url = host.url.connectUrl('/', entityType, idVal);
            var $span = $('<span>').text(nameVal);
            var $a = $('<a>', {class: "entity-form-modal-view", href : url}).append($('<i>', {class:"fa fa-external-link"}));
            return $span.append($a);
          }
          return '';
        })
      ];
      var fieldType2CellType = {};
      var cellType2CellMaker = {};
      cellentries.forEach(function(ce){
        if(ce.supportedFieldTypes){
          ce.supportedFieldTypes.forEach(function(fieldType){
            fieldType2CellType[fieldType] = ce.celltype;
          });
        }
        cellType2CellMaker[ce.celltype] = ce.cellmaker;
      });
      return function(fieldType){
        var cellType = fieldType2CellType[fieldType];
        cellType = (cellType ? cellType : 'default');
        return cellType2CellMaker[cellType];
      }
    })(),
    createCell : function(entity, fieldInfo, cellCreationContext){
      var fieldType = fieldInfo.fieldType.toLowerCase();
      var cellmaker = this._cellTemplateByFieldType(fieldType);
      var cellcontent = cellmaker(entity, fieldInfo, cellCreationContext);
      return cellcontent;
    }
  }

  host.entity = $.extend({}, host.entity,  {
    gridCellTemplates: CellTemplates
  });
})(jQuery, tallybook);
