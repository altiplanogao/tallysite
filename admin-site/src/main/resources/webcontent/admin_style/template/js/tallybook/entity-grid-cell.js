;
var tallybook = tallybook || {};

(function ($, host) {
  'use strict';

  var entityProperty = host.entity.entityProperty;

  var CellTemplates = {
    CellCreationContext : function(idField, entityUri, baseUrl){
      this.idField = idField;
      this.entityUri = entityUri;
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
        new CellTemplateEntry('default', 'default', function (entity, fieldinfo, cellCreationContext) {
          var fieldname = fieldinfo.name;
          var fieldvalue = entityProperty(entity, fieldname);
          return fieldvalue;
        }),
        new CellTemplateEntry('name', 'name', function(entity, fieldinfo, cellCreationContext) {
          var fieldname = fieldinfo.name;
          var fieldvalue = entityProperty(entity, fieldname);
          var url = host.entity.makeUri(cellCreationContext.idField, entity, cellCreationContext.entityUri);
          var $content = $('<a>', {'href': url}).text(fieldvalue);
          return $content;
        }),
        new CellTemplateEntry('email', 'email', function(entity, fieldinfo, cellCreationContext){
          var fieldname = fieldinfo.name;
          var fieldvalue = entityProperty(entity, fieldname);
          var $content = $('<a>', {'href': 'mailto:' + fieldvalue}).text(fieldvalue);
          return $content;
        }),
        new CellTemplateEntry('enumeration', 'enumeration', function(entity, fieldinfo, cellCreationContext){
          var options = fieldinfo.options;
          var optionNames = fieldinfo.optionsFriendly;
          var fieldname = fieldinfo.name;
          var fieldvalue = entityProperty(entity, fieldname);
          return optionNames[fieldvalue];
        }),
        new CellTemplateEntry('boolean', 'boolean', function(entity, fieldinfo, cellCreationContext) {
          var fieldname = fieldinfo.name;
          var options = fieldinfo.options;
          var fieldvalue = entityProperty(entity, fieldname);
          if(fieldvalue === "" || fieldvalue === null || fieldvalue === undefined)
            return '';
          return options[fieldvalue?'t':'f'];
        }),
        new CellTemplateEntry('date', 'date', function(entity, fieldinfo, cellCreationContext) {
          var fieldname = fieldinfo.name;
          var fieldvalue = entityProperty(entity, fieldname);
          if(!fieldvalue) return '';
          var dateVal = new Date(fieldvalue);
          var celldisplaymodel = fieldinfo.cellModel;
          var tStr = [];
          if(celldisplaymodel.indexOf('date') >= 0){
            var format = host.messages.datepicker_format_date;
            var d = $.datepicker.formatDate(format, dateVal, {});
            tStr.push(d);
          }
          if(celldisplaymodel.indexOf('time') >= 0){
            var format = host.messages.datepicker_format_time;
            var d = $.datepicker.formatTime(format, { hour:dateVal.getHours(), minute:dateVal.getMinutes(), second:dateVal.getSeconds()}, {});
            tStr.push(d);
          }
          return tStr.join(' ');
        }),
        new CellTemplateEntry('phone', 'phone', function (entity, fieldinfo, cellCreationContext) {
          var fieldname = fieldinfo.name;
          var fieldvalue = entityProperty(entity, fieldname); if(fieldvalue == null) fieldvalue = '';
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
        new CellTemplateEntry('foreign_key', 'foreign_key', function(entity, fieldinfo, cellCreationContext) {
          var fieldname = fieldinfo.name;
          var displayFieldName = fieldinfo.displayFieldName;
          var idFieldName = fieldinfo.idFieldName;
          var entityType = fieldinfo.entityType;

          var fieldvalue = entityProperty(entity, fieldname);
          if(!!fieldvalue){
            var idVal = fieldvalue[idFieldName];
            var nameVal = fieldvalue[displayFieldName];
            var url = host.url.connectUrl('/', entityType, idVal);
            var $span = $('<span>').text(nameVal);
            var $a = $('<a>', {class: "entity-form-modal-view", href : url}).append($('<i>', {class:"fa fa-external-link"}));
            return $span.append($a);
          }
          return '';
        }),
        new CellTemplateEntry('external_foreign_key', 'external_foreign_key', function(entity, fieldinfo, cellCreationContext) {
          var fieldname = fieldinfo.name;
          var entityFieldName = fieldinfo.entityFieldName;
          var entityFieldDisplayProperty = fieldinfo.displayFieldName;
          var entityType = fieldinfo.entityType;

          var fieldvalue = entityProperty(entity, fieldname);
          if(!!fieldvalue){
            var refForeignEntity = entity[entityFieldName];
            var idVal = fieldvalue;
            var nameVal = refForeignEntity[entityFieldDisplayProperty];
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
    createCell : function(entity, fieldinfo, cellCreationContext){
      var fieldType = fieldinfo.fieldType.toLowerCase();
      var cellmaker = this._cellTemplateByFieldType(fieldType);
      var cellcontent = cellmaker(entity, fieldinfo, cellCreationContext);
      return cellcontent;
    }
  }

  host.entity = $.extend({}, host.entity,  {
    gridCellTemplates: CellTemplates
  });
})(jQuery, tallybook);
