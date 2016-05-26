define(["jquery", "underscore", "i18n!nls/entitytext"],
  function ($, _, entitytext) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var FilterWrapper = React.createClass({
      render : function(){
        var fieldinfo = this.props.fieldinfo;
        var filter = this.props.filter;
        return (<th className="column explicit-size" scope="col">
          <div href="#" className="column-header dropdown" data-column-key="name">
            <input type="hidden" className="filter-value" name="name" data-multi-value="false" value=""/>
            <input type="hidden" className="sort-value" name="sort_name" value=""/>
            <div className="title">
              <span className="col-name">{fieldinfo.friendlyName}</span>

              <div className="filter-sort-container">
                <i className="sort-icon fa fa-sort"></i>
                <i className="filter-icon fa fa-filter"></i>
                <ul className="entity-filter string-filter no-hover" data-filter-type="string" data-support-field-types="basic,string,name,email,mobile,phone,default">
                  {filter}
                  </ul>
                </div>
              </div>
              <div className="resizer">||</div>
            </div>
          </th>);
          }});

    var StringFilter = React.createClass({
      render : function(){
        return (<li>
          <div className="filter-fields" data-action="">

            <div className="text-filter-control">
              <button className="filter-button btn btn-info">
                <i className="fa fa-filter"></i>
              </button><span className="input-line">
                <span className="input-element">
                  <i className="fa fa-search embed-hint"></i>
                  <input className="filter-input" data-name="resource" placeholder="Resource" type="text"/>
                    <i className="fa fa-times-circle  embed-delete" style="display: none;"></i>
                  </span></span>
                </div>

            </div>
          </li>);
      }
    });
    var EnumFilter = React.createClass({
      render : function(){
        return (<li/>);
      }
    });

    var Filters = [StringFilter, EnumFilter];

    function makeFilter(fieldinfo, gridinfo){
      var fi = fieldinfo;
      var fieldType = fi.fieldType;
      var fieldName = fi.name;
      var fieldFriendlyName = fi.friendlyName;
      var filter = <li/>;

      

      var x = React;
      var y = ReactDOM;

      return (<FilterWrapper key={fieldName} fieldinfo={fieldinfo} filter={filter}>

      </FilterWrapper>);

    }
    return {
      makeFilter : makeFilter
    };
  }
);
