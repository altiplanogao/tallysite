define(["jquery", "underscore", 'jsx!../modules/tgrid-filter', "i18n!nls/entitytext"],
  function ($, _, TGridFilter, entitytext) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var Grid = React.createClass({
      getDefaultProps: function () {
        return {
          maxVisibleRows: undefined,
          enableScroll: true
        };
      },
      render: function () {
        var queryResult = this.props.queryResult;
        return (
          <div className="entity-grid-autofill entity-grid-container"
               data-recordranges="" data-totalrecords="" data-pagesize=""
               data-grid-scope="" data-align-type="" data-align-offset=""
               data-initialized="true"
               data-ceiling-type="" data-type=""
               data-actions="" data-entity-query-uri="" data-parameter="" data-criteria-parameter="">
            <Toolbar infos={queryResult.infos} actions={queryResult.actions} links={queryResult.links}/>
            <Header infos={queryResult.infos} />
            <Body {...this.props} />
            <Spinner {...this.props} />
            <Footer {...this.props} />
          </div>);
      }
    });
    var Toolbar = React.createClass({
      render: function () {
        var gridInfo = this.props.infos.details.grid;
        return (
          <div className="toolbar row">
            <Search gridInfo={gridInfo} actions={this.props.actions} links={this.props.links}/>
            <Actions actions={this.props.actions} links={this.props.links}/>
            <form method="POST" className="post-agent" action="">
              <input type="hidden" name="_csrf" value="f9f562de-5b37-43ce-986e-8614b9737c75"/>
            </form>
          </div>
        );
      }
    });
    var Search = React.createClass({
      getInitialState: function () {
        return {searchText: ""};
      },
      handleDelClick: function (e) {
        var inputDom = this.refs.searchInput;
        var delDom = this.refs.deleteI;
        inputDom.value = "";
        inputDom.focus();
        this.setState({searchText: ""});
      },
      handleSearchTextChange: function (event) {
        var searchText = event.target.value;
        this.setState({searchText: searchText});
        var delDom = this.refs.deleteI;
        var delDisplay = (!!searchText ? "block" : "none");
      },
      render: function () {
        var gridinfo = this.props.gridInfo;
        if (gridinfo.primarySearchField) {
          var searchFieldName = gridinfo.primarySearchField;
          var searchField = _.find(gridinfo.fields, function (f) {
            return f.name == searchFieldName
          });
          var searchFieldNameFriendly = (searchField != null) ? searchField.friendlyName : searchFieldName;
          var searchText = this.state.searchText;
          var delStyle = {"display": (!!searchText ? "block" : "none")};

          return (
            <div className="search-group" data-search-column={searchFieldName}>
              <div className="input-group">
                <button className="btn search-btn" type="button"> <i className="fa fa-filter"></i> </button>
                <span className="search-text">
                  <span className="search-input-element">
                    <i className="fa fa-search embed-hint"></i>
                    <input className="search-input" ref="searchInput" data-name={searchFieldName}
                           placeholder={searchFieldNameFriendly} defaultValue={searchText}
                           onChange={this.handleSearchTextChange} type="text"/>
                    <i className="fa fa-times-circle embed-delete" ref="deleteI" onClick={this.handleDelClick}
                       style={delStyle}></i>
                  </span>
                </span>
              </div>
            </div>
          );
        } else {
          return (<div className="search-group"/>);
        }
      }
    });
    var GAS = {
      CREATE_ACTION:"create",
      READ_ACTION:"read",
      UPDATE_ACTION:"update",
      DELETE_ACTION:"delete"        
    };
    var Actions = React.createClass({
      actionObj : function(actionName){
        var actions=this.props.actions,
          links=this.props.links;
        var actionLink = _.find(links, function(l){return l.rel == actionName;});
        var actionUri = actionLink.href;
        var actionText = entitytext["GRID_ACTION_" + actionName];
        return {
          name:actionName,
          uri:actionUri,
          text:actionText};
      },
      makeActionButton: function (actionObject, isEntityAction, icon) {
        var ao = actionObject;
        var actionName = ao.name;
        var actionUri = ao.uri;
        var actionText = ao.text;
        var btn = (
          <button type="button" key={actionName} className={"btn btn-default action-control" + isEntityAction ? "entity-action":""}
                  data-action={actionName}
                  data-edit-in-modal="true" data-edit-success-redirect="false"
                  data-action-uri={actionUri}>
            <span className={"fa " + icon} aria-hidden="true"></span> {actionText}
          </button>);
        return btn;
      },
      render: function () {
        var actions=this.props.actions,
          links=this.props.links,
          btns = [];

        if(actions.includes(GAS.CREATE_ACTION)){
            var actionName = GAS.CREATE_ACTION;
            var ao = this.actionObj(actionName);
            var actionUri = ao.uri;
            var actionText = ao.text;
            var btn = (
              <button type="button" key={actionName} className="btn btn-default action-control" data-action={actionName}
                      data-edit-in-modal="true" data-edit-success-redirect="false"
                      data-action-uri={actionUri}>
                <span className="fa fa-plus" aria-hidden="true"></span> {actionText}
              </button>);
            btns.push(btn);
        }
        if(actions.includes(GAS.UPDATE_ACTION)){
            var actionName = GAS.UPDATE_ACTION;
            var ao = this.actionObj(actionName);
            var actionUri = ao.uri;
            var actionText = ao.text;
            var btn = (
                <button type="button" key={actionName} className="btn btn-default action-control entity-action" data-action={actionName}
                    data-edit-in-modal="true"
                    data-action-url="" data-edit-success-redirect="false" disabled="disabled"
                    data-action-uri={actionUri}>
                    <span className="fa fa-pencil-square-o" aria-hidden="true"></span> {actionText}
                </button>);
            btns.push(btn);
        }
        if(actions.includes(GAS.DELETE_ACTION)){
            var actionName = GAS.DELETE_ACTION;
            var ao = this.actionObj(actionName);
            var actionUri = ao.uri;
            var actionText = ao.text;
            var btn = (
              <button type="button" key={actionName} className="btn btn-default action-control entity-action" data-action={actionName}
                    data-action-url="" disabled="disabled"
                    data-action-uri={actionUri}>
                    <span className="fa fa-times" aria-hidden="true"></span> {actionText}</button>);
            btns.push(btn);
        }

        return (
          <div className="grid-action-group-container"><div className="action-group">{btns}</div></div>
        );
      }
    });
    var Header = React.createClass({
      render: function () {
        var gridinfo = this.props.infos.details.grid;
        var cols = _.map(gridinfo.fields, function (fi) {
          return TGridFilter.makeFilter(fi, gridinfo);
        });
//        var infos = this.props;
        return (
          <div className="header">
            <table className="table header-table table-condensed table-hover">
              <thead>
              <tr data-col-visible="0,1,1,1,1,1,1"
                  data-col-percents="0,0.16666666666666666,0.16666666666666666,0.16666666666666666,0.16666666666666666,0.16666666666666666,0.16666666666666666">
                {cols}
              </tr>
              </thead>
            </table>
          </div>);
      }
    });
    var Body = React.createClass({
      render: function () {
        return (<li></li>);
      }
    });
    var Row = React.createClass({
      render: function () {
        return (<li></li>);
      }
    });
    var PaddingRow = React.createClass({
      render: function () {
        return (<li></li>);
      }
    });
    var NoRecordRow = React.createClass({
      render: function () {
        return (<li></li>);
      }
    });
    var Spinner = React.createClass({
      render: function () {
        return (<span className="spinner">
      <i className="spinner-item fa fa-spin fa-spinner"></i>
    </span>);
      }
    });
    var Footer = React.createClass({
      render: function () {
        return (<div className="footer">
          <div>
          <span>
            <span className="screen-range-of-results">
              <span className="low-index">1</span>
              -
              <span className="high-index">3</span>
              of
              <span className="total-records">3</span>
              <span> records</span></span>
          </span>
          </div>
        </div>);
      }
    });

    function renderGrid(queryResult, div) {
      ReactDOM.render(
        <Grid {...this.props} queryResult={queryResult}/>, div
      );
    }

    return {
      renderGrid: renderGrid
    };
  });